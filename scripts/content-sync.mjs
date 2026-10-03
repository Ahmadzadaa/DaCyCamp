#!/usr/bin/env node
/**
 * content/courses/<kurs>/ paketlərini (docs/content-package.md) işləyən API-yə idxal edir:
 * qovluq ZIP-ə yığılır → /admin/import/validate → /admin/import/apply (admin paneldəki «İdxal» ilə eyni yol).
 * Qeyd: bazada OLMAYAN kursları API özü açılanda avtomatik əlavə edir (ContentSyncService) —
 * bu skript əsasən mövcud kursu paketdən YENİLƏMƏK üçündür.
 *
 *   pnpm content:sync --update python4business  — mövcud kursu paketdən yenilə (tələbə irəliləyişi qorunur)
 *   pnpm content:sync                           — bazada olmayan kursları əlavə et
 *   --wait                                      — API açılana qədər gözlə
 *
 * Giriş: .env-dəki SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AdmZip = createRequire(resolve(root, 'apps/api/package.json'))('adm-zip');
const log = (m) => console.log(`\x1b[36m[dacy:content]\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m[dacy:content]\x1b[0m ${m}`);

if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const args = process.argv.slice(2);
const update = args.includes('--update');
const wait = args.includes('--wait');
const only = args.filter((a) => !a.startsWith('--'));
const api = (
  process.env.API_INTERNAL_URL || `http://localhost:${process.env.API_PORT || 4000}`
).replace(/\/$/, '');

const coursesDir = resolve(root, 'content/courses');
const dirs = existsSync(coursesDir)
  ? readdirSync(coursesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(coursesDir, d.name, 'course.yaml')))
      .map((d) => d.name)
      .filter((n) => !only.length || only.includes(n))
  : [];
if (!dirs.length) {
  if (only.length) warn(`Kurs tapılmadı: ${only.join(', ')}`);
  process.exit(0);
}

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password) {
  warn(
    'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD .env-də boşdur — kurslar avtomatik idxal olunmadı. ' +
      'Admin paneldə «İdxal» bölməsindən content/courses/<kurs> qovluğunun ZIP-ini yükləyin.',
  );
  process.exit(0);
}

async function waitForApi(seconds) {
  for (let i = 0; i < seconds; i++) {
    try {
      if ((await fetch(`${api}/health`)).ok) return true;
    } catch {
      /* hələ açılmayıb */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

if (wait && !(await waitForApi(180))) {
  warn(`API ${api} ünvanında açılmadı — kurslar idxal olunmadı (sonra: pnpm content:sync)`);
  process.exit(0);
}

const login = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
}).catch((e) => ({ ok: false, status: 0, statusText: e.message }));
if (!login.ok) {
  warn(`Admin girişi alınmadı (${login.status} ${login.statusText}) — kurslar idxal olunmadı`);
  process.exit(wait ? 0 : 1);
}
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');

async function post(path, name, buf) {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: 'application/zip' }), `${name}.zip`);
  const res = await fetch(`${api}${path}`, { method: 'POST', headers: { cookie }, body: fd });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `${res.status} ${res.statusText}`);
  return body;
}

let failed = 0;
for (const name of dirs) {
  const zip = new AdmZip();
  zip.addLocalFolder(join(coursesDir, name), name, (p) => !/(^|\/)\.|Thumbs\.db$/.test(p));
  const buf = zip.toBuffer();
  try {
    const report = await post('/admin/import/validate', name, buf);
    if (!report.ok) {
      failed++;
      warn(`✗ ${name}: paket səhvlidir`);
      for (const e of report.errors ?? []) warn(`    ${e.file}: ${e.message}`);
      continue;
    }
    if (report.course?.exists && !update) {
      log(`· ${name}: artıq var (yeniləmək üçün: pnpm content:sync --update ${name})`);
      continue;
    }
    const applied = await post('/admin/import/apply', name, buf);
    if (!applied.ok) {
      failed++;
      warn(`✗ ${name}: idxal alınmadı`);
      for (const e of applied.errors ?? []) warn(`    ${e.file}: ${e.message}`);
      continue;
    }
    const s = applied.summary ?? {};
    log(
      `✓ ${name}: ${report.course.exists ? 'yeniləndi' : 'əlavə olundu'} — ${s.modules} fəsil, ${s.steps} addım`,
    );
    for (const w of applied.warnings ?? []) warn(`    ${w.file}: ${w.message}`);
  } catch (e) {
    failed++;
    warn(`✗ ${name}: ${e.message}`);
  }
}
process.exit(failed && !wait ? 1 : 0);
