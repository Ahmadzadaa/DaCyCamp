import { Injectable, Logger } from '@nestjs/common';
import { dirname, resolve } from 'node:path';
import type { Prisma } from '@prisma/client';
import {
  arrowToResult,
  canonicalizeResult,
  duckdbLoadSql,
  sha256Hex,
  tableNameFromPath,
  type ArrowLikeTable,
  type CheckMode,
  type ResultTable,
  type SqlConfig,
  type SqlExpected,
} from '@dacy/shared';
import type * as DuckBlocking from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking';
import { PrismaService } from '../prisma/prisma.service';
import { readFromStorage } from '../assets/storage';
import { unprocessable } from '../common/errors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const duckdb: typeof DuckBlocking = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs');

export interface DatasetFile {
  name: string; // DuckDB-də qeydiyyat adı (fayl adı)
  path: string; // kurs daxilində yol
  buffer: Uint8Array;
}

/**
 * Müəllimin HƏLLİNİ serverdə DuckDB-WASM (Node) ilə işlədib gözlənilən nəticənin hash-ini hesablayır.
 * Tələbə kodu serverdə heç vaxt işləmir — o, brauzerdə DuckDB-WASM ilə işləyir və yalnız hash göndərir.
 */
@Injectable()
export class SqlCheckService {
  private readonly log = new Logger('SqlCheck');
  constructor(private readonly prisma: PrismaService) {}

  private bundles() {
    const dist = dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
    return {
      mvp: {
        mainModule: resolve(dist, 'duckdb-mvp.wasm'),
        mainWorker: resolve(dist, 'duckdb-node-mvp.worker.cjs'),
      },
      eh: {
        mainModule: resolve(dist, 'duckdb-eh.wasm'),
        mainWorker: resolve(dist, 'duckdb-node-eh.worker.cjs'),
      },
    };
  }

  /** Təmiz DuckDB nüsxəsində datasetləri yükləyib SQL-i işlədir; son ifadənin nəticəsini qaytarır */
  async run(datasets: DatasetFile[], sql: string, limit = 10_000): Promise<ResultTable> {
    const db = await duckdb.createDuckDB(
      this.bundles(),
      new duckdb.VoidLogger(),
      duckdb.NODE_RUNTIME,
    );
    await db.instantiate(() => {});
    const conn = db.connect();
    try {
      for (const d of datasets) {
        db.registerFileBuffer(d.name, d.buffer);
        const load = duckdbLoadSql(d.name, tableNameFromPath(d.path));
        if (load) conn.query(load);
        else if (d.name.toLowerCase().endsWith('.sql')) {
          for (const st of splitStatements(Buffer.from(d.buffer).toString('utf8'))) conn.query(st);
        }
      }
      let table: ArrowLikeTable | null = null;
      for (const st of splitStatements(sql)) table = conn.query(st) as unknown as ArrowLikeTable;
      if (!table) return { columns: [], rows: [] };
      return arrowToResult(table, limit);
    } finally {
      conn.close();
      try {
        db.reset?.();
      } catch {
        /* ignore */
      }
    }
  }

  async datasetsOf(courseId: string, paths: string[]): Promise<DatasetFile[]> {
    const out: DatasetFile[] = [];
    for (const p of paths) {
      const a = await this.prisma.asset.findUnique({
        where: { courseId_path: { courseId, path: p } },
      });
      if (!a)
        throw unprocessable('PUBLISH_ISSUES', 'Dataset tapılmadı', [
          { path: 'dataset', message: `Fayl tapılmadı: ${p}` },
        ]);
      out.push({
        name: a.filename,
        path: a.path,
        buffer: new Uint8Array(await readFromStorage(a.storageKey)),
      });
    }
    return out;
  }

  /** Addımın həllini işlədib SqlExpected qaytarır (xəta → 422 PUBLISH_ISSUES) */
  async computeExpected(step: {
    id: string;
    config: unknown;
    secret: unknown;
    courseId: string;
  }): Promise<SqlExpected> {
    const cfg = step.config as SqlConfig;
    const sec = (step.secret ?? {}) as { solution?: string };
    if (!sec.solution?.trim())
      throw unprocessable('PUBLISH_ISSUES', 'Həll boşdur', [
        { path: 'solution', message: 'Həll boş ola bilməz' },
      ]);
    const datasets = await this.datasetsOf(step.courseId, cfg.dataset ?? []);
    const mode: CheckMode =
      cfg.check === 'result_match_unordered' ? 'result_match_unordered' : 'result_match';
    let result: ResultTable;
    try {
      result = await this.run(datasets, sec.solution);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
      this.log.warn(`SQL həlli işləmədi (step ${step.id}): ${msg}`);
      throw unprocessable('PUBLISH_ISSUES', 'Həll işləmədi', [
        { path: 'solution', message: `SQL xətası: ${msg}` },
      ]);
    }
    return {
      columns: result.columns,
      row_count: result.rows.length,
      row_hash: await sha256Hex(canonicalizeResult(result, mode)),
      mode,
      computed_at: new Date().toISOString(),
    };
  }

  /** Hesablayıb Step.secret.expected-ə yazır */
  async computeAndStore(stepId: string): Promise<SqlExpected> {
    const step = await this.prisma.step.findUniqueOrThrow({
      where: { id: stepId },
      include: { module: { select: { courseId: true } } },
    });
    const expected = await this.computeExpected({
      id: step.id,
      config: step.config,
      secret: step.secret,
      courseId: step.module.courseId,
    });
    const secret = {
      ...((step.secret ?? {}) as Record<string, unknown>),
      expected,
    } as unknown as Prisma.InputJsonValue;
    await this.prisma.step.update({ where: { id: stepId }, data: { secret } });
    return expected;
  }
}

/** Sadə ifadə ayırıcı: `;` + sətir sonu / mətn sonu (sətir içi string-lərdə `;` nəzərə alınmır) */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--.*\n?)+$/.test(s));
}
