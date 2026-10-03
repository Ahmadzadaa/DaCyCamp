#!/usr/bin/env node
/**
 * DaCy Academy — BİR ƏMR: pnpm dev
 *  1. .env yoxdursa .env.example-dan yaradır
 *  2. DATABASE_URL-ə qoşulmağa çalışır; alınmasa və Docker daemon varsa `docker compose up -d db`
 *  3. prisma migrate deploy + seed (idempotent)
 *  4. turbo run dev → shared (watch) + api (:4000) + web (:3000)
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const log = (m) => console.log(`\x1b[36m[dacy]\x1b[0m ${m}`);
const fail = (m) => {
  console.error(`\x1b[31m[dacy] ${m}\x1b[0m`);
  process.exit(1);
};

if (!existsSync(envPath)) {
  copyFileSync(resolve(root, '.env.example'), envPath);
  log('.env yaradıldı (.env.example-dan). Lazım olsa redaktə edin.');
}
process.loadEnvFile(envPath);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) fail('DATABASE_URL təyin olunmayıb (.env faylına baxın).');
let host = 'localhost';
let port = 5432;
try {
  const u = new URL(dbUrl);
  host = u.hostname || host;
  port = Number(u.port || 5432);
} catch {
  fail(`DATABASE_URL oxunmadı: ${dbUrl}`);
}
for (const p of [
  Number(process.env.WEB_PORT || 3000),
  Number(process.env.API_PORT || 4000),
  port,
]) {
  if (p === 3100 || p === 5433)
    fail(`${p} portu bu kompüterdə başqa layihəyə aiddir — .env-də dəyişin.`);
}

const probe = (h, p, ms = 1500) =>
  new Promise((res) => {
    const s = net.createConnection({ host: h, port: p });
    const done = (ok) => {
      s.destroy();
      res(ok);
    };
    s.setTimeout(ms, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    shell: process.platform === 'win32',
    ...opts,
  });

async function waitForDb(seconds) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await probe(host, port)) return true;
    await sleep(500);
  }
  return false;
}

/** prisma CLI-ni birbaşa çağırır (pnpm exec stdin-i etibarlı ötürmür) — SQL müvəqqəti fayldan oxunur */
function prismaSql(url, sql) {
  const apiDir = resolve(root, 'apps/api');
  const bin = resolve(
    apiDir,
    'node_modules/.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
  );
  const file = resolve(mkdtempSync(resolve(tmpdir(), 'dacy-')), 'q.sql');
  writeFileSync(file, sql);
  const r = spawnSync(bin, ['db', 'execute', '--url', url, '--file', file], {
    cwd: apiDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (process.env.DACY_DEBUG)
    console.error('[dacy:debug] prisma', {
      bin,
      status: r.status,
      error: r.error?.message,
      out: out.slice(0, 300),
    });
  return {
    ok: r.status === 0,
    code: /P1\d{3}/.exec(out)?.[0] ?? (r.status === 0 ? 'OK' : 'UNKNOWN'),
    out,
  };
}

/** Həqiqi giriş yoxlaması (rol/şifrə/baza) */
const dbAuth = (url) => prismaSql(url, 'SELECT 1;');

/** 5433 başqa layihəyə aiddir — 5434-dən başlayaraq boş port */
async function freePort() {
  for (let p = 5434; p < 5460; p++) if (!(await probe('127.0.0.1', p, 500))) return p;
  return null;
}

/** .env-də DB portunu dəyişir (localhost ünvanları üçün) */
function rewriteEnvPort(newPort) {
  let txt = readFileSync(envPath, 'utf8');
  const sub = (key) => {
    const re = new RegExp(
      `^(${key}=postgresql://[^@\\n]+@(?:localhost|127\\.0\\.0\\.1)):\\d+`,
      'm',
    );
    txt = re.test(txt) ? txt.replace(re, `$1:${newPort}`) : txt;
  };
  sub('DATABASE_URL');
  sub('DATABASE_URL_TEST');
  txt = /^DB_PORT=/m.test(txt)
    ? txt.replace(/^DB_PORT=.*$/m, `DB_PORT=${newPort}`)
    : `${txt}\nDB_PORT=${newPort}\n`;
  writeFileSync(envPath, txt);
  for (const k of ['DATABASE_URL', 'DATABASE_URL_TEST']) {
    if (process.env[k])
      process.env[k] = process.env[k].replace(/@(localhost|127\.0\.0\.1):\d+/, `@$1:${newPort}`);
  }
  process.env.DB_PORT = String(newPort);
}

/** Rol var, baza yoxdur (P1003) → eyni hesabla "postgres" bazasına qoşulub yaradırıq */
function createDatabase(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const name = u.pathname.replace(/^\//, '').split('?')[0];
  if (!name) return false;
  u.pathname = '/postgres';
  return prismaSql(u.toString(), `CREATE DATABASE "${name.replace(/"/g, '')}";`).ok;
}

const SQL_HELP = [
  '  B) Mövcud PostgreSQL-də rol/baza yaradın (psql ilə, superuser kimi):',
  "       CREATE ROLE dacy LOGIN PASSWORD 'dacy' CREATEDB;",
  '       CREATE DATABASE dacy OWNER dacy;  CREATE DATABASE dacy_test OWNER dacy;',
  '     və ya .env-dəki DATABASE_URL-i öz istifadəçi/şifrənizlə yazın.',
];
const hasDocker = () =>
  spawnSync('docker', ['info'], { stdio: 'ignore', shell: process.platform === 'win32' }).status ===
  0;

log(`PostgreSQL yoxlanılır: ${host}:${port}`);
const isLocal = host === 'localhost' || host === '127.0.0.1';
if (!(await probe(host, port))) {
  if (hasDocker()) {
    log('DB əlçatmazdır → docker compose up -d db');
    const r = run('docker', ['compose', 'up', '-d', 'db']);
    if (r.status !== 0) fail('docker compose up alınmadı.');
    log('DB-nin hazır olması gözlənilir…');
    if (!(await waitForDb(60))) fail('DB 60 saniyə ərzində açılmadı.');
    await sleep(1500);
  } else {
    fail(
      [
        `PostgreSQL ${host}:${port} ünvanında cavab vermir və Docker daemon işləmir.`,
        'Seçimlər:',
        '  A) Docker Desktop-u açın və yenidən `pnpm dev` yazın (db avtomatik qalxacaq)',
        ...SQL_HELP,
        '     (Linux-da lokal klaster üçün: sudo pg_ctlcluster 16 main start)',
      ].join('\n'),
    );
  }
}
// Port açıqdır — amma rol/şifrə düzgündürmü? (kompüterdə başqa PostgreSQL ola bilər)
let auth = dbAuth(process.env.DATABASE_URL);
if (!auth.ok && auth.code === 'P1000' && isLocal && hasDocker()) {
  const np = await freePort();
  if (!np) fail('Boş port tapılmadı (5434–5459).');
  log(
    `${host}:${port} portunda başqa PostgreSQL var ("dacy" rolu yoxdur) → Docker bazası ${np} portunda qaldırılır, .env yenilənir`,
  );
  rewriteEnvPort(np);
  port = np;
  const r = run('docker', ['compose', 'up', '-d', 'db']);
  if (r.status !== 0) fail('docker compose up alınmadı.');
  if (!(await waitForDb(60))) fail(`DB ${np} portunda 60 saniyə ərzində açılmadı.`);
  await sleep(1500);
  auth = dbAuth(process.env.DATABASE_URL);
}
if (!auth.ok && auth.code === 'P1003') {
  log('Rol var, baza yoxdur → yaradılır');
  if (createDatabase(process.env.DATABASE_URL)) {
    if (process.env.DATABASE_URL_TEST) createDatabase(process.env.DATABASE_URL_TEST);
    auth = dbAuth(process.env.DATABASE_URL);
  }
}
if (!auth.ok) {
  fail(
    [
      `Bazaya giriş alınmadı (${auth.code}): ${process.env.DATABASE_URL}`,
      'Seçimlər:',
      '  A) Docker Desktop-u açın və yenidən `pnpm dev` yazın (baza boş portda avtomatik qalxacaq)',
      ...SQL_HELP,
    ].join('\n'),
  );
}
log('DB hazırdır ✓');

log('Prisma Client generasiya olunur…');
if (run('pnpm', ['--filter', '@dacy/api', 'prisma:generate']).status !== 0)
  fail('prisma generate alınmadı.');
log('Ortaq paket (@dacy/shared) build olunur…');
if (run('pnpm', ['--filter', '@dacy/shared', 'build']).status !== 0)
  fail('@dacy/shared build alınmadı.');
log('Migrasiyalar tətbiq olunur…');
if (run('pnpm', ['--filter', '@dacy/api', 'prisma:deploy']).status !== 0)
  fail('prisma migrate deploy alınmadı.');
log('Seed (idempotent)…');
if (run('pnpm', ['--filter', '@dacy/api', 'prisma:seed']).status !== 0) fail('seed alınmadı.');

const webPort = process.env.WEB_PORT || '3000';
const apiPort = process.env.API_PORT || '4000';
log(`Başladılır → web http://localhost:${webPort}  ·  api http://localhost:${apiPort}`);
const child = spawn('pnpm', ['turbo', 'run', 'dev'], {
  stdio: 'inherit',
  cwd: root,
  shell: process.platform === 'win32',
  env: { ...process.env, PORT: webPort, WEB_PORT: webPort, API_PORT: apiPort },
});
// content/courses/* — bazada olmayan kurs paketləri API açılan kimi idxal olunur (pnpm content:sync)
spawn(process.execPath, [resolve(root, 'scripts/content-sync.mjs'), '--wait'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, API_PORT: apiPort },
});
const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
