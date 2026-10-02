// e2e: test bazasına yönləndir (modullar yüklənməzdən əvvəl)
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
for (const p of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../.env')]) {
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p);
    } catch {
      /* ignore */
    }
  }
}
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://dacy:dacy@localhost:5432/dacy_test';
process.env.STORAGE_DIR = process.env.STORAGE_DIR_TEST ?? '/tmp/dacy-test-storage';
// testlər Docker-dən asılı olmasın
process.env.LAB_DRIVER = 'mock';
