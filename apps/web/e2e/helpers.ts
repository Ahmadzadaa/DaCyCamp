import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const ROOT = resolve(__dirname, '../../..');
export const SHOTS = resolve(ROOT, 'docs/screenshots');
export const REF = resolve(ROOT, 'docs/DACY_DESIGN_REFERENCE.html');

/** Seed hesabları yalnız .env-dən (process.env üstündür) — kodda e-poçt/şifrə saxlanılmır */
function envOf(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const v = new RegExp(`^${key}=(.*)$`, 'm').exec(env)?.[1]?.trim();
    if (v) return v;
  } catch {
    /* aşağıda aydın xəta */
  }
  throw new Error(`${key} .env-də təyin olunmayıb (README → «Test hesabları»)`);
}
const account = (prefix: 'SEED_STUDENT' | 'SEED_ADMIN') => ({
  get email() {
    return envOf(`${prefix}_EMAIL`);
  },
  get password() {
    return envOf(`${prefix}_PASSWORD`);
  },
});
export const STUDENT = account('SEED_STUDENT');
export const ADMIN = account('SEED_ADMIN');

export async function login(page: Page, who: { email: string; password: string }) {
  const r = await page.request.post('/api/auth/login', {
    data: { email: who.email, password: who.password },
  });
  if (!r.ok()) throw new Error(`login failed ${r.status()}`);
}

/** Referans HTML Google Fonts-a baxır; oflayn mühitdə eyni lokal şriftləri inject edirik */
export function localFontCss(): string {
  const base = resolve(ROOT, 'node_modules/.pnpm/node_modules/@fontsource');
  const face = (family: string, pkg: string, w: number) =>
    ['latin', 'latin-ext']
      .map(
        (sub) =>
          `@font-face{font-family:"${family}";font-weight:${w};font-style:normal;src:url("file://${base}/${pkg}/files/${pkg}-${sub}-${w}-normal.woff2") format("woff2");}`,
      )
      .join('');
  return (
    [400, 500, 600, 700].map((w) => face('IBM Plex Sans', 'ibm-plex-sans', w)).join('') +
    [400, 500].map((w) => face('JetBrains Mono', 'jetbrains-mono', w)).join('')
  );
}
