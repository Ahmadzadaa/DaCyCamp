// Initialize only an empty local Docker database. Existing users/content stay intact.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const req = createRequire(resolve(root, 'apps/api/package.json'));
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
let empty;
try {
  empty = (await db.user.count()) === 0;
} finally {
  await db.$disconnect();
}
if (empty) {
  const result = spawnSync('corepack', ['pnpm', 'db:seed'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}
