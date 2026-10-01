import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const ROOT = resolve(__dirname, '../../..');
export const SHOTS = resolve(ROOT, 'docs/screenshots');
export const REF = resolve(ROOT, 'docs/DACY_DESIGN_REFERENCE.html');

function envOf(key: string, fallback: string) {
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const m = new RegExp(`^${key}=(.*)$`, 'm').exec(env);
    return m?.[1]?.trim() || fallback;
  } catch {
    return fallback;
  }
}
export const STUDENT = {
  email: envOf('SEED_STUDENT_EMAIL', 'telebe@dacy.local'),
  password: envOf('SEED_STUDENT_PASSWORD', 'Telebe123!'),
};
export const ADMIN = {
  email: envOf('SEED_ADMIN_EMAIL', 'admin@dacy.local'),
  password: envOf('SEED_ADMIN_PASSWORD', 'Admin123!'),
};

export async function login(page: Page, who: { email: string; password: string }) {
  const r = await page.request.post('/api/auth/login', { data: who });
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
