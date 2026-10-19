#!/usr/bin/env node
/**
 * Ehtiyat nüsxə: PostgreSQL (pg_dump, custom format) + yüklənmiş fayllar (STORAGE_DIR → tar.gz) + manifest
 * (yoxlama cəmləri, cədvəl sayları, sonuncu miqrasiya). Bərpa: scripts/restore.mjs.
 *
 *   pnpm db:backup                       # → backups/dacy-YYYYMMDD-HHMMSS/
 *   pnpm db:backup -- --out /mnt/backup  # başqa qovluğa
 *   pnpm db:backup -- --no-storage       # yalnız baza
 *
 * Nüsxədə şəxsi məlumat var (e-poçtlar, parol hash-ləri, göndərişlər): qovluq 0700, fayllar 0600 yaradılır.
 * Nüsxəni serverdən kənarda (şifrələnmiş) saxlayın və bərpanı vaxtaşırı sınayın (README → «Ehtiyat nüsxə»).
 */
import { chmodSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  ROOT,
  consistentDump,
  exitOnError,
  loadEnv,
  parseArgs,
  pgEnv,
  redact,
  run,
  sha256,
  storagePath,
} from './backup-lib.mjs';

exitOnError();
const { flags } = parseArgs(process.argv.slice(2));
const cfg = loadEnv();
if (!cfg.DATABASE_URL) {
  console.error('DATABASE_URL təyin olunmayıb (.env və ya mühit dəyişəni)');
  process.exit(1);
}
const { env, schema } = pgEnv(cfg.DATABASE_URL);
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const out = resolve(
  flags.out && flags.out !== true ? flags.out : join(ROOT, 'backups'),
  `dacy-${stamp}`,
);
mkdirSync(out, { recursive: true, mode: 0o700 });
chmodSync(out, 0o700);

console.log(`Baza: ${redact(cfg.DATABASE_URL)}`);
console.log(`Hədəf: ${out}`);

// 1) baza — sxem + məlumat; sahiblik / icazələr bərpa olunan mühitə uyğunlaşsın deyə yazılmır.
// Sayt işləyərkən də ardıcıl: dump və manifestdəki sətir sayları eyni snapshot-dandır.
// `--schema public` dump-a «CREATE SCHEMA public» əlavə edir — təzə bazada bu sxem artıq var və bərpa dayanır;
// ona görə yalnız defolt olmayan sxem açıq göstərilir
const dump = join(out, 'db.dump');
const { tables, migration } = await consistentDump(env, schema, (snapshot) =>
  run(
    'pg_dump',
    [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--snapshot',
      snapshot,
      ...(schema === 'public' ? [] : ['--schema', schema]),
      '--file',
      dump,
    ],
    { env },
  ),
);
chmodSync(dump, 0o600);

// 2) fayllar (kurs aktivləri, akademiya göndərişləri)
const files = { 'db.dump': { bytes: statSync(dump).size, sha256: await sha256(dump) } };
let storage = null;
const dir = storagePath(cfg.STORAGE_DIR || './apps/api/storage');
if (!flags['no-storage'] && existsSync(dir)) {
  const tgz = join(out, 'storage.tar.gz');
  run('tar', ['-czf', tgz, '-C', dirname(dir), basename(dir)]);
  chmodSync(tgz, 0o600);
  files['storage.tar.gz'] = { bytes: statSync(tgz).size, sha256: await sha256(tgz) };
  const count = (d) =>
    readdirSync(d, { withFileTypes: true }).reduce(
      (n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1),
      0,
    );
  storage = { dir: basename(dir), files: count(dir) };
} else if (!flags['no-storage']) {
  console.warn(`⚠️ STORAGE_DIR tapılmadı (${dir}) — yalnız baza saxlanıldı`);
}

let commit = null;
try {
  commit = run('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).trim();
} catch {
  /* git yoxdur — vacib deyil */
}
const manifest = {
  format: 1,
  createdAt: new Date().toISOString(),
  database: redact(cfg.DATABASE_URL),
  schema,
  pgDump: run('pg_dump', ['--version']).trim(),
  gitCommit: commit,
  lastMigration: migration,
  tables,
  storage,
  files,
};
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
  mode: 0o600,
});

const rows = Object.values(tables).reduce((a, b) => a + b, 0);
console.log(
  `✓ ${Object.keys(tables).length} cədvəl, ${rows} sətir; sonuncu miqrasiya: ${migration ?? '—'}` +
    (storage ? `; ${storage.files} fayl` : ''),
);
for (const [name, f] of Object.entries(files))
  console.log(`  ${name}  ${(f.bytes / 1024).toFixed(1)} KB  sha256 ${f.sha256.slice(0, 16)}…`);
