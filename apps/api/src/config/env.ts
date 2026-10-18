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

/** Boş sətir → undefined (`.env.example`-dakı boş dəyərlər) */
const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

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
  // video dərslər diskə axınla yazılır (yaddaşa yüklənmir)
  MAX_VIDEO_MB: z.coerce.number().default(2048),
  // Test/ilkin hesablar — boş buraxılsa seed hesab yaratmır (dəyərlər yalnız .env-də saxlanılır)
  SEED_ADMIN_EMAIL: optionalStr,
  SEED_ADMIN_PASSWORD: optionalStr,
  SEED_STUDENT_EMAIL: optionalStr,
  SEED_STUDENT_PASSWORD: optionalStr,
  APP_TIMEZONE: z.string().default('Asia/Baku'),
  // Mərhələ 3 — terminal lab-ları
  // lab-lar defolt söndürülüb: docker driver host Docker socket-i tələb edir (SEC-06)
  LAB_DRIVER: z.enum(['docker', 'mock', 'off']).default('off'),
  DOCKER_SOCKET: z.string().optional(),
  LAB_MAX_SESSIONS: z.coerce.number().int().min(1).default(20),
  LAB_MEMORY_MB: z.coerce.number().int().min(64).default(512),
  LAB_CPUS: z.coerce.number().min(0.1).default(0.5),
  LAB_PIDS_LIMIT: z.coerce.number().int().min(16).default(256),
  LAB_PULL: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  LAB_CHECK_TIMEOUT_SEC: z.coerce.number().int().min(5).max(600).default(60),
  // Repo-dakı kurs paketləri (content/courses/*): API açılanda bazada olmayanlar idxal olunur
  CONTENT_SYNC: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  CONTENT_DIR: optionalStr,
  // Akademiya modulu (qruplar, tapşırıqlar, qiymətlər). false — endpoint-lər 404, menyu gizlənir; platforma dəyişmir
  ACADEMY_MANAGEMENT_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  // bildiriş işçisi (outbox + xatırlatmalar) neçə saniyədən bir işləsin; 0 — söndürülüb (testlərdə əl ilə çağırılır)
  ACADEMY_WORKER_INTERVAL_SEC: z.coerce.number().int().min(0).default(30),
  /** akademiya faylının (göndəriş / resurs) ən böyük ölçüsü, MB */
  ACADEMY_MAX_FILE_MB: z.coerce.number().int().min(1).max(200).default(20),
});

/** `.env.example`-dakı açıq (repo-da hamıya görünən) dəyərlər */
const EXAMPLE_SECRETS = new Set([
  'deyisin-access-gizli-acar',
  'deyisin-refresh-gizli-acar',
  'deyisin-ctf-pepper',
]);

/**
 * Production-da zəif açarlar: nümunə dəyər, 32 simvoldan qısa və ya access = refresh.
 * Bu açarlarla istənilən istifadəçinin (admin daxil) token-i saxtalaşdırıla bilər.
 */
export function productionSecretProblems(
  e: Pick<z.infer<typeof schema>, 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'CTF_PEPPER'>,
): string[] {
  const out: string[] = [];
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CTF_PEPPER'] as const) {
    if (EXAMPLE_SECRETS.has(e[k])) out.push(`${k}: .env.example-dakı nümunə dəyərdir`);
    else if (e[k].length < 32) out.push(`${k}: ən azı 32 simvol olmalıdır`);
  }
  if (e.JWT_ACCESS_SECRET === e.JWT_REFRESH_SECRET)
    out.push('JWT_REFRESH_SECRET: JWT_ACCESS_SECRET ilə eyni olmamalıdır');
  return out;
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    '❌ .env konfiqurasiyası səhvdir:',
    parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  );
  process.exit(1);
}
if (parsed.data.NODE_ENV === 'production') {
  const problems = productionSecretProblems(parsed.data);
  if (problems.length) {
    console.error(
      `❌ Production üçün təhlükəsiz olmayan açarlar (yaratmaq üçün: openssl rand -hex 32): ${problems.join('; ')}`,
    );
    process.exit(1);
  }
  if (!parsed.data.COOKIE_SECURE)
    console.warn('⚠️ COOKIE_SECURE=false — sayt HTTPS ilə işləyirsə true edin');
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
