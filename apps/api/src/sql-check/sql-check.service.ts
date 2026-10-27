import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Prisma } from '@prisma/client';
import {
  splitSqlStatements,
  canonicalizeResult,
  sha256Hex,
  type CheckMode,
  type ResultTable,
  type SqlConfig,
  type SqlExpected,
} from '@dacy/shared';
import { executeJson, terminateExecutions } from '../common/execution-pool';
import { PrismaService } from '../prisma/prisma.service';
import { readFromStorage } from '../assets/storage';
import { conflict, unprocessable } from '../common/errors';
import { withRawContent } from '../common/i18n/request-locale';

export interface DatasetFile {
  name: string; // DuckDB-də qeydiyyat adı (fayl adı)
  path: string; // kurs daxilində yol
  buffer: Uint8Array;
}

/**
 * Executes author solutions and learner submissions in bounded, isolated child processes.
 * The API event loop stays responsive; grading uses the server's actual result.
 */
@Injectable()
export class SqlCheckService implements OnModuleDestroy {
  private readonly log = new Logger('SqlCheck');
  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    terminateExecutions();
  }

  /** Təmiz DuckDB nüsxəsində datasetləri yükləyib SQL-i işlədir; son ifadənin nəticəsini qaytarır */
  async run(datasets: DatasetFile[], sql: string, limit = 10_000): Promise<ResultTable> {
    if (datasets.reduce((bytes, d) => bytes + d.buffer.byteLength, 0) > 20 * 1024 * 1024)
      throw new Error('Datasetlərin ümumi ölçüsü 20 MB limitini keçir.');
    const root = [
      resolve(__dirname, '../../../..'),
      process.cwd(),
      resolve(process.cwd(), '../..'),
    ].find((dir) => existsSync(resolve(dir, 'pnpm-workspace.yaml')))!;
    const cwd = await mkdtemp(join(tmpdir(), 'dacy-sql-'));
    try {
      return await executeJson<ResultTable>({
        command: '/usr/bin/prlimit',
        args: [
          '--cpu=8:9',
          '--nofile=128',
          '--',
          process.execPath,
          '--permission',
          '--no-addons',
          '--max-old-space-size=256',
          `--allow-fs-read=${resolve(root, 'node_modules')}`,
          `--allow-fs-read=${resolve(root, 'apps/api/node_modules')}`,
          `--allow-fs-read=${resolve(root, 'packages/shared')}`,
          `--allow-fs-read=${cwd}`,
          `--allow-fs-read=${__dirname}`,
          resolve(__dirname, 'sql-runner.cjs'),
        ],
        input: {
          datasets: datasets.map((d) => ({
            name: d.name,
            path: d.path,
            base64: Buffer.from(d.buffer).toString('base64'),
          })),
          sql,
          limit,
        },
        timeoutMs: 10_000,
        cwd,
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
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
    // secret oxunub geri yazılır — tərcümə (ipucları və s.) mənbəyə düşməsin
    return withRawContent(() => this.computeAndStoreRaw(stepId));
  }

  private async computeAndStoreRaw(stepId: string): Promise<SqlExpected> {
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
    await this.prisma.step
      .update({ where: { id: stepId, updatedAt: step.updatedAt }, data: { secret } })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
          throw conflict('CONTENT_VERSION_CONFLICT');
        throw error;
      });
    return expected;
  }
}

/** The browser and publishing checker use the same statement boundaries. */
export const splitStatements = splitSqlStatements;
