import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('../../.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const B = 'http://localhost:3000', S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function shot(name, path, vp, cred) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.addCookies([{ name: 'dacy_locale', value: 'en', url: B }]);
  if (cred) await ctx.request.post(`${B}/api/auth/login`, { data: cred });
  const p = await ctx.newPage();
  await p.goto(B + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/en-${name}.png` });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'overflow', overflow);
  await ctx.close();
}
const st = { email: env.SEED_STUDENT_EMAIL, password: env.SEED_STUDENT_PASSWORD };
const ad = { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD };
const D = { width: 1440, height: 900 }, M = { width: 390, height: 844 };
await shot('landing', '/', D); await shot('landing-m', '/', M);
await shot('login', '/giris', D); await shot('login-m', '/giris', M);
await shot('panel', '/panel', D, st); await shot('panel-m', '/panel', M, st);
await shot('catalog', '/kurslar', D, st); await shot('activity', '/fealiyyetim', D, st);
await shot('admin', '/admin', D, ad);
await shot('lesson', '/kurs/numune/numune-fesil/sql?onizle=1', D, ad);
await b.close();
