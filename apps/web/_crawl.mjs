import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('../../.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const B = 'http://localhost:3000';
const AZ = /[əğışçöüƏĞİŞÇÖÜ]/;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function session(cred) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: 'dacy_locale', value: 'en', url: B }]);
  if (cred) {
    const r = await ctx.request.post(`${B}/api/auth/login`, { data: cred });
    if (!r.ok()) throw new Error('login ' + r.status());
  }
  return ctx;
}
const only = process.argv[2];
const groups = {
  guest: [null, ['/', '/giris', '/qeydiyyat', '/kurslar', '/yollar', '/kurs/python-basics', '/nonexistent-page']],
  student: [{ email: env.SEED_STUDENT_EMAIL, password: env.SEED_STUDENT_PASSWORD }, ['/panel', '/kurslar', '/kurs/python-basics', '/kurs/python-basics/giris/isinma', '/fealiyyetim', '/liderler', '/tecrube', '/imtahanlar', '/layiheler', '/yarislar', '/sertifikatlar', '/profil', '/destek', '/baslangic', '/yollar']],
  admin: [{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD }, ['/admin', '/admin/kurslar', '/admin/movzular', '/admin/istiqametler', '/admin/fayllar', '/admin/idxal', '/admin/telebeler', '/admin/yollar', '/admin/karyera', '/admin/layiheler', '/admin/lablar', '/admin/tarixce', '/admin/destek', '/admin/axtar?q=py']],
};
for (const [name, [cred, pages]] of Object.entries(groups)) {
  if (only && only !== name) continue;
  const ctx = await session(cred);
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  for (const path of pages) {
    await p.goto(B + path, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(400);
    const lang = await p.evaluate(() => document.documentElement.lang);
    const lines = (await p.evaluate(() => document.body.innerText)).split('\n').map((s) => s.trim()).filter((s) => s && AZ.test(s));
    const attrs = await p.evaluate((re) => [...document.querySelectorAll('[aria-label],[placeholder],[title]')].flatMap((e) => ['aria-label', 'placeholder', 'title'].map((a) => e.getAttribute(a)).filter(Boolean)).filter((v) => new RegExp(re).test(v)), AZ.source);
    const title = await p.title();
    console.log(`\n[${name}] ${path}  lang=${lang}  title="${title}"  url=${p.url().replace(B, '')}`);
    for (const l of [...new Set(lines)].slice(0, 25)) console.log('   T: ' + l.slice(0, 140));
    for (const a of [...new Set(attrs)]) console.log('   A: ' + a.slice(0, 140));
    if (AZ.test(title)) console.log('   TITLE has AZ');
  }
  if (errs.length) console.log(`  console errors (${name}):`, [...new Set(errs)].slice(0, 8));
  await ctx.close();
}
await browser.close();
