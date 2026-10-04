import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('../../.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const B = 'http://localhost:3000', AZ = /[əğışçöüƏĞİŞÇÖÜ]/;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'dacy_locale', value: 'en', url: B }]);
await ctx.request.post(`${B}/api/auth/login`, { data: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD } });
const p = await ctx.newPage();
for (const path of process.argv.slice(2)) {
  await p.goto(`${B}/kurs/${path}?onizle=1`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const lines = (await p.evaluate(() => document.body.innerText)).split('\n').map((s) => s.trim()).filter((s) => s);
  const ui = lines.filter((l) => !AZ.test(l)).slice(0, 40);
  console.log(`\n== ${path} (${p.url().replace(B, '')})\n  UI sample: ${ui.join(' | ').slice(0, 900)}`);
}
// python xətası
await p.goto(`${B}/kurs/python-basics/giris/isinma?onizle=1`, { waitUntil: 'networkidle' });
const ed = p.locator('.cm-content').first();
if (await ed.count()) {
  await ed.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('x = 1\nprint(y)\n');
  await p.getByRole('button', { name: 'Run' }).first().click();
  await p.waitForTimeout(20000);
  console.log('\n== python error output:\n' + (await p.locator('.console, .ws-console, [data-testid=console]').first().innerText().catch(() => '(console not found)')).slice(0, 800));
}
await b.close();
