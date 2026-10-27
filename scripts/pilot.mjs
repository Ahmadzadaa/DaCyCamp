#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const run = join(root, '.local/run');
mkdirSync(run, { recursive: true, mode: 0o700 });
const pidFile = join(run, 'pilot.pid');
const script = join(root, 'scripts/start.mjs');
function current() {
  try {
    const pid = Number(readFileSync(pidFile, 'utf8'));
    if (!Number.isInteger(pid) || pid < 2) return null;
    process.kill(pid, 0);
    if (!readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(script)) return null;
    return pid;
  } catch {
    return null;
  }
}
async function stop() {
  const pid = current();
  if (!pid) return;
  process.kill(pid, 'SIGTERM');
  for (let i = 0; i < 40 && current(); i++) await new Promise((r) => setTimeout(r, 200));
  if (current()) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {}
  }
  try {
    unlinkSync(pidFile);
  } catch {}
}
const command = process.argv[2] ?? 'status';
if (command === 'stop' || command === 'restart') await stop();
if (command === 'start' || command === 'restart') {
  if (current()) {
    console.log(`Pilot artıq işləyir (PID ${current()}).`);
    process.exit(0);
  }
  const pg = join(root, '.local/start-postgres.sh');
  if (
    existsSync(pg) &&
    /^(localhost|127\.0\.0\.1)$/.test(new URL(process.env.DATABASE_URL).hostname)
  ) {
    const r = spawnSync(pg, [], { cwd: root, stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);
  }
  const child = spawn(process.execPath, [script, '--daemon'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
  });
  if (!child.pid) process.exit(1);
  writeFileSync(pidFile, String(child.pid), { mode: 0o600 });
  child.unref();
  console.log(`Pilot başlayır (PID ${child.pid}). Log: .local/logs/pilot.log`);
} else if (command === 'status') {
  console.log(current() ? `Pilot işləyir (PID ${current()}).` : 'Pilot işləmir.');
  const state = join(run, 'services.json');
  if (existsSync(state)) console.log(readFileSync(state, 'utf8'));
} else if (command !== 'stop') {
  console.error('İstifadə: node scripts/pilot.mjs start|stop|restart|status');
  process.exitCode = 1;
}
