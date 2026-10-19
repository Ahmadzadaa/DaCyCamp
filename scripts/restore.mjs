#!/usr/bin/env node
/**
 * scripts/backup.mjs ilə alınmış nüsxəni bərpa edir və yoxlayır (cədvəl sayları + sonuncu miqrasiya manifestlə eyni).
 *
 *   pnpm db:restore -- backups/dacy-20261018-120000 --target-url postgresql://…/dacy_restore --create-db \
 *     --storage-dir /tmp/dacy-storage-restore
 *
 * Təhlükəsizlik qaydaları (səhvən işlək bazanı silməmək üçün):
 *  - hədəf baza həmişə açıq göstərilir (--target-url); .env-dəki DATABASE_URL avtomatik götürülmür;
 *  - hədəf .env-dəki DATABASE_URL ilə eynidirsə və ya bazada artıq cədvəl varsa — yalnız --force ilə;
 *  - NODE_ENV=production olanda — yalnız --allow-production ilə;
 *  - fayllar yalnız boş qovluğa açılır (--force olmadan);
 *  - bərpadan əvvəl yoxlama cəmləri (sha256) yoxlanılır.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  lastMigration,
  loadEnv,
  parseArgs,
  pgEnv,
  redact,
  run,
  sha256,
  tableCounts,
  exitOnError,
} from './backup-lib.mjs';

exitOnError();
const { pos, flags } = parseArgs(process.argv.slice(2));
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const src = pos[0] && resolve(pos[0]);
if (!src || !existsSync(join(src, 'manifest.json')))
  fail(
    'İstifadə: restore.mjs <nüsxə-qovluğu> --target-url <postgresql://…> [--create-db] [--storage-dir <qovluq>] [--force]',
  );
const target = typeof flags['target-url'] === 'string' ? flags['target-url'] : null;
if (!target) fail('--target-url mütləqdir (hədəf baza heç vaxt avtomatik seçilmir)');

const cfg = loadEnv();
if (cfg.NODE_ENV === 'production' && !flags['allow-production'])
  fail('NODE_ENV=production — bərpa yalnız --allow-production ilə');
const same = (a, b) => {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return (
      x.hostname === y.hostname &&
      (x.port || '5432') === (y.port || '5432') &&
      x.pathname === y.pathname
    );
  } catch {
    return false;
  }
};
if (cfg.DATABASE_URL && same(cfg.DATABASE_URL, target) && !flags.force)
  fail(
    'Hədəf .env-dəki işlək baza ilə eynidir — üzərinə yazmaq üçün --force (əvvəlcə ondan nüsxə alın)',
  );

const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
console.log(`Nüsxə: ${src} (${manifest.createdAt}, miqrasiya ${manifest.lastMigration ?? '—'})`);
console.log(`Hədəf: ${redact(target)}`);

// 1) bütövlük: fayllar dəyişməyib
for (const [name, f] of Object.entries(manifest.files)) {
  const file = join(src, name);
  if (!existsSync(file)) fail(`${name} yoxdur`);
  if ((await sha256(file)) !== f.sha256)
    fail(`${name}: sha256 manifestlə uyğun gəlmir (fayl zədələnib və ya dəyişdirilib)`);
}
console.log('✓ yoxlama cəmləri uyğundur');

// 2) hədəf baza: lazımdırsa yarat, boş olmalıdır
const { env, schema } = pgEnv(target);
if (flags['create-db']) {
  const exists = run(
    'psql',
    [
      '-XAt',
      '-d',
      'postgres',
      '-c',
      `select 1 from pg_database where datname = '${env.PGDATABASE.replace(/'/g, "''")}'`,
    ],
    { env },
  ).trim();
  if (!exists) {
    run('createdb', [env.PGDATABASE], { env });
    console.log(`✓ baza yaradıldı: ${env.PGDATABASE}`);
  }
}
const existing = Object.keys(tableCounts(env, schema)).length;
if (existing && !flags.force)
  fail(`Hədəf bazada artıq ${existing} cədvəl var — üzərinə yazmaq üçün --force`);

run(
  'pg_restore',
  [
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    ...(existing ? ['--clean', '--if-exists'] : []),
    '--dbname',
    env.PGDATABASE,
    join(src, 'db.dump'),
  ],
  { env },
);
console.log('✓ baza bərpa olundu');

// 3) fayllar
if (typeof flags['storage-dir'] === 'string') {
  if (!manifest.files['storage.tar.gz'])
    fail('Nüsxədə fayl arxivi yoxdur (--no-storage ilə alınıb)');
  const dir = resolve(flags['storage-dir']);
  mkdirSync(dir, { recursive: true });
  if (readdirSync(dir).length && !flags.force)
    fail(`${dir} boş deyil — üzərinə yazmaq üçün --force`);
  run('tar', ['-xzf', join(src, 'storage.tar.gz'), '-C', dir, '--strip-components=1']);
  console.log(`✓ fayllar açıldı: ${dir}`);
}

// 4) yoxlama: cədvəl sayları və miqrasiya nüsxədəki kimidir
const now = tableCounts(env, schema);
const diff = Object.entries(manifest.tables)
  .filter(([t, n]) => now[t] !== n)
  .map(([t, n]) => `${t}: gözlənilən ${n}, var ${now[t] ?? 'yoxdur'}`);
const mig = lastMigration(env, schema);
if (mig !== manifest.lastMigration)
  diff.push(`miqrasiya: gözlənilən ${manifest.lastMigration}, var ${mig}`);
if (diff.length) fail(`Bərpa yoxlaması uğursuz:\n  ${diff.join('\n  ')}`);
const rows = Object.values(now).reduce((a, b) => a + b, 0);
console.log(
  `✓ yoxlandı: ${Object.keys(now).length} cədvəl, ${rows} sətir, miqrasiya ${mig ?? '—'} — nüsxə ilə eynidir`,
);
