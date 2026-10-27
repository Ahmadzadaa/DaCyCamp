#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const req = createRequire(resolve(root, 'apps/api/package.json'));
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const checks = {
  node: Number(process.versions.node.split('.')[0]) >= 22,
  database: false,
  isolatedPython: false,
  isolatedSql: false,
  mailTransport: process.env.MAIL_TRANSPORT ?? 'disabled',
  externalBackupConfigured: !!process.env.BACKUP_REMOTE,
};
try {
  await db.$queryRaw`SELECT 1`;
  checks.database = true;
  const { SqlCheckService } = await import(
    resolve(root, 'apps/api/dist/sql-check/sql-check.service.js')
  );
  const { PythonCheckService } = await import(
    resolve(root, 'apps/api/dist/python-check/python-check.service.js')
  );
  checks.isolatedSql =
    (await new SqlCheckService(db).run([], 'SELECT 42 AS answer')).rows[0]?.[0] === '42';
  const checked = await new PythonCheckService(db).run(
    'doctor',
    { dataset: [], tests: 'assert total == 6' },
    'import pandas as pd\ntotal=int(pd.Series([1,2,3]).sum())',
  );
  checks.isolatedPython = checked.passed;
} catch {
  /* only capability status is printed; database URLs and private configuration stay private */
} finally {
  await db.$disconnect();
}
console.log(JSON.stringify(checks, null, 2));
if (!checks.node || !checks.database || !checks.isolatedPython || !checks.isolatedSql)
  process.exitCode = 1;
