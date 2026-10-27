#!/usr/bin/env node
/** Persistent supervisor. No seed, reset or Docker is executed. */
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  writeFileSync,
  renameSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const apiDir = join(root, 'apps/api');
const webDir = join(root, 'apps/web');
const standaloneDir = join(webDir, '.next/standalone/apps/web');
const server = join(standaloneDir, 'server.js');
if (
  !existsSync(join(apiDir, 'dist/main.js')) ||
  !existsSync(join(webDir, '.next/BUILD_ID')) ||
  !existsSync(server)
) {
  console.error('Əvvəl corepack pnpm build işlədin.');
  process.exit(1);
}
const runDir = join(root, '.local/run');
const logDir = join(root, '.local/logs');
mkdirSync(runDir, { recursive: true, mode: 0o700 });
mkdirSync(logDir, { recursive: true, mode: 0o700 });
const lockFile = join(runDir, 'supervisor.lock');
try {
  if (existsSync(lockFile)) {
    const previous = Number(readFileSync(lockFile, 'utf8'));
    let alive = false;
    try {
      process.kill(previous, 0);
      alive = readFileSync(`/proc/${previous}/cmdline`, 'utf8').includes('scripts/start.mjs');
    } catch {}
    if (alive) {
      console.error('Pilot artıq işləyir. pilot:status və ya pilot:restart istifadə edin.');
      process.exit(1);
    }
    unlinkSync(lockFile);
  }
  writeFileSync(lockFile, String(process.pid), { flag: 'wx', mode: 0o600 });
} catch {
  console.error('Servis kilidi yaradıla bilmədi. .local/run icazələrini yoxlayın.');
  process.exit(1);
}
process.once('exit', () => {
  try {
    if (readFileSync(lockFile, 'utf8') === String(process.pid)) unlinkSync(lockFile);
  } catch {}
});
const log = process.argv.includes('--daemon')
  ? openSync(join(logDir, 'pilot.log'), 'a', 0o600)
  : null;
cpSync(join(webDir, '.next/static'), join(standaloneDir, '.next/static'), { recursive: true });
if (existsSync(join(webDir, 'public')))
  cpSync(join(webDir, 'public'), join(standaloneDir, 'public'), { recursive: true });
let stopping = false;
const services = new Map();
function save() {
  const tmp = join(runDir, 'services.json.tmp');
  writeFileSync(
    tmp,
    JSON.stringify(
      {
        supervisor: process.pid,
        services: [...services].map(([name, s]) => ({
          name,
          pid: s.child?.pid,
          restarts: s.restarts,
          status: s.status,
          lastStartedAt: s.started,
          lastExit: s.lastExit,
        })),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(tmp, join(runDir, 'services.json'));
}
function launch(name, args, cwd, extraEnv = {}) {
  const entry = services.get(name) ?? { restarts: 0, delay: 500 };
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: log === null ? 'inherit' : ['ignore', log, log],
    env: { ...process.env, NODE_ENV: 'production', ...extraEnv },
  });
  Object.assign(entry, { child, status: 'running', started: new Date().toISOString() });
  services.set(name, entry);
  save();
  let handled = false;
  const restart = (code) => {
    if (handled || stopping) return;
    handled = true;
    const stable = Date.now() - Date.parse(entry.started) > 30_000;
    entry.restarts++;
    entry.status = 'restarting';
    entry.lastExit = code;
    entry.delay = stable ? 500 : Math.min(10_000, entry.delay * 2);
    save();
    entry.timer = setTimeout(() => {
      if (!stopping) launch(name, args, cwd, extraEnv);
    }, entry.delay);
  };
  child.once('error', () => restart('start_failed'));
  child.once('exit', (code, signal) => restart(signal ?? code));
}
function stop() {
  if (stopping) return;
  stopping = true;
  const children = [...services.values()].map((s) => {
    clearTimeout(s.timer);
    s.status = 'stopping';
    if (s.child?.exitCode === null) s.child.kill('SIGTERM');
    return s.child;
  });
  save();
  const timer = setTimeout(() => {
    for (const child of children) if (child?.exitCode === null) child.kill('SIGKILL');
    process.exit(0);
  }, 7000);
  Promise.all(
    children.map((child) =>
      child?.exitCode === null
        ? new Promise((done) => child.once('exit', done))
        : Promise.resolve(),
    ),
  ).then(() => {
    clearTimeout(timer);
    process.exit(0);
  });
}
launch('api', [join(apiDir, 'dist/main.js')], apiDir);
launch('web', [server], standaloneDir, {
  PORT: process.env.WEB_PORT ?? '3000',
  HOSTNAME: '0.0.0.0',
});
launch('operations', [join(root, 'scripts/operations.mjs')], root);
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
