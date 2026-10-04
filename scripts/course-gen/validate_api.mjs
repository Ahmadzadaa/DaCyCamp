// Kurs paketlərini işləyən API-nin idxal yoxlamasından keçirir (tərcümələr daxil):
//   node scripts/course-gen/validate_api.mjs <kurs qovluğu>...   (.env-dəki SEED_ADMIN_* ilə)
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '../..');
const AdmZip = createRequire(join(root, 'apps/api/package.json'))('adm-zip');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const API = `http://localhost:${env.API_PORT || 4000}`;
const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD }),
});
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
let bad = 0;
for (const dir of process.argv.slice(2)) {
  const zip = new AdmZip();
  zip.addLocalFolder(resolve(dir), basename(resolve(dir)), (p) => !/(^|\/)\./.test(p));
  const fd = new FormData();
  fd.append('file', new Blob([zip.toBuffer()]), `${basename(dir)}.zip`);
  const r = await (await fetch(`${API}/admin/import/validate`, { method: 'POST', headers: { cookie }, body: fd })).json();
  const trWarn = (r.warnings ?? []).filter((w) => w.file.startsWith('i18n/'));
  console.log(`${r.ok ? '✓' : '✗'} ${basename(dir)}: ${r.errors?.length ?? '?'} xəta, tərcümə xəbərdarlığı ${trWarn.length}`);
  for (const e of [...(r.errors ?? []), ...trWarn]) console.log(`   ${e.file}: ${e.message}`);
  if (!r.ok) bad++;
}
process.exit(bad ? 1 : 0);
