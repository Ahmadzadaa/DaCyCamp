'use client';
import { t } from '@/lib/i18n';
import * as duckdb from '@duckdb/duckdb-wasm';
import {
  arrowToResult,
  duckdbLoadSql,
  tableNameFromPath,
  type ArrowLikeTable,
  type AttachmentView,
  type ResultTable,
} from '@dacy/shared';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

/** Brauzerdə DuckDB-WASM (bir dəfə yüklənir; fayllar /public/duckdb-dən) */
export function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await duckdb.selectBundle({
        mvp: {
          mainModule: '/duckdb/duckdb-mvp.wasm',
          mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
        },
        eh: {
          mainModule: '/duckdb/duckdb-eh.wasm',
          mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
        },
      });
      const worker = new Worker(bundle.mainWorker!);
      const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

export interface SqlSession {
  conn: duckdb.AsyncDuckDBConnection;
  tables: Array<{ name: string; path: string; filename: string }>;
}

export function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--.*\n?)+$/.test(s));
}

/** Datasetləri yükləyib cədvəl kimi qeydiyyatdan keçirir (fayl adı → cədvəl adı) */
export async function openSession(datasets: AttachmentView[]): Promise<SqlSession> {
  const db = await getDuckDB();
  const conn = await db.connect();
  const tables: SqlSession['tables'] = [];
  for (const d of datasets) {
    if (!d.url) continue;
    const res = await fetch(d.url, { credentials: 'include' });
    if (!res.ok) throw new Error(`${t('ws.datasetFailed', { name: d.filename })} (${res.status})`);
    const buf = new Uint8Array(await res.arrayBuffer());
    await db.registerFileBuffer(d.filename, buf);
    const table = tableNameFromPath(d.path);
    const load = duckdbLoadSql(d.filename, table);
    if (load) {
      await conn.query(load);
      tables.push({ name: table, path: d.path, filename: d.filename });
    } else if (d.filename.toLowerCase().endsWith('.sql')) {
      const script = new TextDecoder().decode(buf);
      for (const st of splitStatements(script)) await conn.query(st);
    }
  }
  return { conn, tables };
}

export interface RunResult {
  result: ResultTable;
  ms: number;
  truncated: boolean;
}

/** Tələbənin SQL-i: son ifadənin nəticəsi (hash üçün 10 000 sətirə qədər, göstərmək üçün ayrıca kəsilir) */
export async function runSql(session: SqlSession, sql: string, limit = 10_000): Promise<RunResult> {
  const t0 = performance.now();
  let table: ArrowLikeTable | null = null;
  for (const st of splitStatements(sql))
    table = (await session.conn.query(st)) as unknown as ArrowLikeTable;
  const ms = Math.round(performance.now() - t0);
  if (!table) return { result: { columns: [], rows: [] }, ms, truncated: false };
  return { result: arrowToResult(table, limit), ms, truncated: table.numRows > limit };
}
