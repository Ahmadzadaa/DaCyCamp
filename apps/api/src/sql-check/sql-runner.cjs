'use strict';
const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs');
const { dirname, resolve } = require('node:path');
const {
  splitSqlStatements,
  arrowToResult,
  duckdbLoadSql,
  tableNameFromPath,
  normalizeCell,
} = require('@dacy/shared');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  source += chunk;
  if (source.length > 32 * 1024 * 1024) process.exit(1);
});
process.stdin.on('end', async () => {
  let db, conn;
  try {
    const { datasets, sql, limit } = JSON.parse(source);
    const dist = dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
    db = await duckdb.createDuckDB(
      {
        mvp: {
          mainModule: resolve(dist, 'duckdb-mvp.wasm'),
          mainWorker: resolve(dist, 'duckdb-node-mvp.worker.cjs'),
        },
        eh: {
          mainModule: resolve(dist, 'duckdb-eh.wasm'),
          mainWorker: resolve(dist, 'duckdb-node-eh.worker.cjs'),
        },
      },
      new duckdb.VoidLogger(),
      duckdb.NODE_RUNTIME,
    );
    await db.instantiate(() => {});
    conn = db.connect();
    conn.query("SET memory_limit = '128MB'");
    conn.query('SET threads = 1');
    for (const file of datasets) {
      db.registerFileBuffer(file.name, Buffer.from(file.base64, 'base64'));
      const load = duckdbLoadSql(file.name, tableNameFromPath(file.path));
      if (load) conn.query(load);
    }
    // Disable external files, networks and extensions before any authored SQL executes.
    conn.query('SET enable_external_access = false');
    conn.query('SET lock_configuration = true');
    for (const file of datasets)
      if (file.name.toLowerCase().endsWith('.sql'))
        for (const statement of splitSqlStatements(
          Buffer.from(file.base64, 'base64').toString('utf8'),
        ))
          conn.query(statement);
    let table;
    for (const statement of splitSqlStatements(sql)) table = conn.query(statement);
    if (table && table.numRows > limit)
      throw new Error(`Nəticə ${limit} sətir limitini keçir. Sorğunu daraldın.`);
    const result = table ? arrowToResult(table, limit) : { columns: [], rows: [] };
    result.rows = result.rows.map((row) => row.map(normalizeCell));
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stdout.write(
      JSON.stringify({ failure: String(error.message || error).slice(0, 1500) }),
    );
  } finally {
    try {
      conn?.close();
      db?.reset?.();
    } catch {}
  }
});
