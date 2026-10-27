#!/usr/bin/env node
/** Integration check against a running pilot: real backups, no DB reset or restore. */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const statusFile = '.local/operations/status.json';
const services = JSON.parse(readFileSync('.local/run/services.json', 'utf8'));
const monitor = services.services.find((s) => s.name === 'operations' && s.status === 'running');
if (
  !monitor?.pid ||
  !readFileSync(`/proc/${monitor.pid}/cmdline`, 'utf8').includes('scripts/operations.mjs')
)
  throw new Error('Əvvəl pilot:start işlədin; monitor aktiv olmalıdır.');
const backups = () => readdirSync('backups').filter((name) => /^dacy-\d/.test(name)).length;
const initial = backups();
const run = () =>
  new Promise((resolveJob) => {
    let error = '';
    const child = spawn(process.execPath, ['scripts/operations.mjs', '--backup-now'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    child.stderr.on('data', (value) => {
      if (error.length < 1000) error += value;
    });
    child.once('error', () => resolveJob({ code: -1, error: 'Backup başlatmaq alınmadı.' }));
    child.once('exit', (code) => resolveJob({ code, error: error.trim() }));
  });
const jobs = await Promise.all([run(), run()]);
const snapshot = JSON.parse(readFileSync(statusFile, 'utf8'));
// Wait across a complete monitor interval; a stale monitor must not revert the backup status.
await new Promise((done) => setTimeout(done, 22_000));
const after = JSON.parse(readFileSync(statusFile, 'utf8'));
const result = {
  jobs,
  newBackups: backups() - initial,
  folder: snapshot.backup.folder,
  preservedAfterHealthTick: after.backup.folder === snapshot.backup.folder,
  healthUpdated: Date.parse(after.health.at) > Date.parse(snapshot.health.at),
  lockReleased: !existsSync('.local/operations/backup.lock'),
};
mkdirSync('.local/qa', { recursive: true, mode: 0o700 });
writeFileSync('.local/qa/backup-concurrency.json', JSON.stringify(result, null, 2), {
  mode: 0o600,
});
console.log(JSON.stringify(result, null, 2));
if (
  jobs.filter((job) => job.code === 0).length !== 1 ||
  result.newBackups !== 1 ||
  !result.preservedAfterHealthTick ||
  !result.healthUpdated ||
  !result.lockReleased
)
  process.exitCode = 1;
