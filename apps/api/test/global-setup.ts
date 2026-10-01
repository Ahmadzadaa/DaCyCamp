import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default function globalSetup() {
  for (const p of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../.env')]) {
    if (existsSync(p)) {
      try {
        process.loadEnvFile(p);
      } catch {
        /* ignore */
      }
    }
  }
  const url = process.env.DATABASE_URL_TEST ?? 'postgresql://dacy:dacy@localhost:5432/dacy_test';
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
