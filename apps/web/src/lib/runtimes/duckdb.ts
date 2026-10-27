'use client';
import { t } from '@/lib/i18n';
import * as duckdb from '@duckdb/duckdb-wasm';
import {
  splitSqlStatements,
  arrowToResult,
  duckdbLoadSql,
  tableNameFromPath,
  type ArrowLikeTable,
  type AttachmentView,
  type ResultTable,
} from '@dacy/shared';

/** A dedicated worker/database per lesson keeps dataset names and cancellation isolated. */
function interrupted<T>(work: Promise<T>, signal: AbortSignal, stop: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      stop();
      reject(
        new Error(
          signal.reason?.name === 'TimeoutError'
            ? t('ws.runtimeLoadTimeout')
            : t('ws.executionStopped'),
        ),
      );
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export async function getDuckDB(signal = AbortSignal.timeout(30_000)): Promise<duckdb.AsyncDuckDB> {
  const bundle = await duckdb.selectBundle({
    mvp: {
      mainModule: '/duckdb/duckdb-mvp.wasm',
      mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
    },
    eh: { mainModule: '/duckdb/duckdb-eh.wasm', mainWorker: '/duckdb/duckdb-browser-eh.worker.js' },
  });
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  try {
    await interrupted(db.instantiate(bundle.mainModule, bundle.pthreadWorker), signal, () =>
      worker.terminate(),
    );
    return db;
  } catch (e) {
    await db.terminate();
    throw e;
  }
}
export interface SqlSession {
  conn: duckdb.AsyncDuckDBConnection;
  db: duckdb.AsyncDuckDB;
  closed: boolean;
  cancel?: (reason: string) => void;
  tables: Array<{ name: string; path: string; filename: string }>;
}
export const splitStatements = splitSqlStatements;
export async function openSession(
  datasets: AttachmentView[],
  cancelled?: AbortSignal,
): Promise<SqlSession> {
  const signal = cancelled
    ? AbortSignal.any([cancelled, AbortSignal.timeout(30_000)])
    : AbortSignal.timeout(30_000);
  const db = await getDuckDB(signal);
  const terminate = () => {
    void db.terminate();
  };
  try {
    const conn = await interrupted(db.connect(), signal, terminate);
    const tables: SqlSession['tables'] = [];
    for (const d of datasets) {
      if (!d.url) continue;
      const res = await fetch(d.url, {
        credentials: 'include',
        signal,
      });
      if (!res.ok)
        throw new Error(`${t('ws.datasetFailed', { name: d.filename })} (${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      await interrupted(db.registerFileBuffer(d.filename, bytes), signal, terminate);
      const table = tableNameFromPath(d.path);
      const load = duckdbLoadSql(d.filename, table);
      if (load) {
        await interrupted(conn.query(load), signal, terminate);
        tables.push({ name: table, path: d.path, filename: d.filename });
      } else if (d.filename.toLowerCase().endsWith('.sql')) {
        for (const statement of splitStatements(new TextDecoder().decode(bytes)))
          await interrupted(conn.query(statement), signal, terminate);
      }
    }
    return { conn, db, tables, closed: false };
  } catch (e) {
    await db.terminate();
    throw e;
  }
}
export interface RunResult {
  result: ResultTable;
  ms: number;
  truncated: boolean;
}
export async function closeSession(session: SqlSession) {
  if (session.closed) return;
  session.closed = true;
  session.cancel?.(t('ws.executionStopped'));
  await session.db.terminate();
}
export async function runSql(session: SqlSession, sql: string, limit = 10_000): Promise<RunResult> {
  if (session.closed) throw new Error(t('ws.executionStopped'));
  const t0 = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    session.cancel = (reason) => reject(new Error(reason));
    timer = setTimeout(() => {
      session.cancel?.(t('ws.timeout', { s: 15 }));
      void closeSession(session);
    }, 15_000);
  });
  const execute = async () => {
    let table: ArrowLikeTable | null = null;
    for (const statement of splitStatements(sql))
      table = (await session.conn.query(statement)) as unknown as ArrowLikeTable;
    return {
      result: table ? arrowToResult(table, limit) : { columns: [], rows: [] },
      ms: Math.round(performance.now() - t0),
      truncated: !!table && table.numRows > limit,
    };
  };
  try {
    return await Promise.race([execute(), cancelled]);
  } finally {
    clearTimeout(timer);
    session.cancel = undefined;
  }
}
