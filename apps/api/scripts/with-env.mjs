// Kök .env faylını yükləyib verilən əmri işə salır: node scripts/with-env.mjs prisma migrate dev
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
for (const p of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) {
    try { process.loadEnvFile(p); } catch {}
  }
}
const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
process.exit(r.status ?? 1);
