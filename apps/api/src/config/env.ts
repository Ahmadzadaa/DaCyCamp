import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Kök .env (monorepo) və lokal .env — mövcud dəyişənlər üstün tutulur
for (const p of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p);
    } catch {
      /* ignore */
    }
  }
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().optional(),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().default(30),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  CTF_PEPPER: z.string().min(8),
  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_MB: z.coerce.number().default(50),
  SEED_ADMIN_EMAIL: z.string().default('admin@dacy.local'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin123!'),
  SEED_STUDENT_EMAIL: z.string().default('telebe@dacy.local'),
  SEED_STUDENT_PASSWORD: z.string().default('Telebe123!'),
  APP_TIMEZONE: z.string().default('Asia/Baku'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    '❌ .env konfiqurasiyası səhvdir:',
    parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  );
  process.exit(1);
}
export const env = parsed.data;
/** STORAGE_DIR nisbi verilibsə — monorepo kökünə görə */
export const storageDir = (() => {
  const d = env.STORAGE_DIR;
  if (d.startsWith('/')) return d;
  const root = resolve(process.cwd(), '../../');
  return existsSync(resolve(root, 'pnpm-workspace.yaml'))
    ? resolve(root, d)
    : resolve(process.cwd(), d);
})();
