#!/usr/bin/env node
/**
 * DaCy Academy — BİR ƏMR: pnpm dev
 *  1. .env yoxdursa .env.example-dan yaradır
 *  2. DATABASE_URL-ə qoşulmağa çalışır; alınmasa və Docker daemon varsa `docker compose up -d db`
 *  3. prisma migrate deploy + seed (idempotent)
 *  4. turbo run dev → shared (watch) + api (:4000) + web (:3000)
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
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

log(`PostgreSQL yoxlanılır: ${host}:${port}`);
if (!(await probe(host, port))) {
  const docker = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  if (docker.status === 0) {
    log('DB əlçatmazdır → docker compose up -d db');
    const r = run('docker', ['compose', 'up', '-d', 'db']);
    if (r.status !== 0) fail('docker compose up alınmadı.');
    log('DB-nin hazır olması gözlənilir…');
    if (!(await waitForDb(60))) fail('DB 60 saniyə ərzində açılmadı.');
  } else {
    fail(
      [
        `PostgreSQL ${host}:${port} ünvanında cavab vermir və Docker daemon işləmir.`,
        'Seçimlər:',
        '  A) Docker Desktop-u açın və yenidən `pnpm dev` yazın (db avtomatik qalxacaq)',
        '  B) Mövcud PostgreSQL-də rol/baza yaradın və .env-dəki DATABASE_URL-i uyğunlaşdırın:',
        "       CREATE ROLE dacy LOGIN PASSWORD 'dacy' CREATEDB;",
        '       CREATE DATABASE dacy OWNER dacy;  CREATE DATABASE dacy_test OWNER dacy;',
        '     (Linux-da lokal klaster üçün: sudo pg_ctlcluster 16 main start)',
      ].join('\n'),
    );
  }
}
log('DB hazırdır ✓');

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
const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
