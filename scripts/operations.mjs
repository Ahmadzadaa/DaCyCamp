#!/usr/bin/env node
/** Runs independently of API requests; keeps backups and health evidence on persistent storage. */
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  appendFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const dir = join(root, '.local/operations');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = join(dir, 'status.json');
let state = {
  health: null,
  backup: null,
  remoteConfigured: !!process.env.BACKUP_REMOTE,
  failures: 0,
  lastBackupAttempt: null,
};
try {
  state = {
    ...state,
    ...JSON.parse(readFileSync(file, 'utf8')),
    remoteConfigured: !!process.env.BACKUP_REMOTE,
  };
} catch {}
function save() {
  // The monitor and a manual backup are separate processes. Merge newer
  // evidence instead of letting a health tick overwrite a completed backup.
  try {
    const disk = JSON.parse(readFileSync(file, 'utf8'));
    const time = (value) => Date.parse(value ?? '') || 0;
    if (time(disk.health?.at) > time(state.health?.at)) {
      state.health = disk.health;
      state.failures = disk.failures;
    }
    if (
      time(disk.backup?.updatedAt ?? disk.backup?.failedAt ?? disk.backup?.at) >
      time(state.backup?.updatedAt ?? state.backup?.failedAt ?? state.backup?.at)
    )
      state.backup = disk.backup;
    if (time(disk.lastBackupAttempt) > time(state.lastBackupAttempt))
      state.lastBackupAttempt = disk.lastBackupAttempt;
  } catch {}
  const tmp = file + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify({ ...state, checkedAt: new Date().toISOString() }, null, 2), {
    mode: 0o600,
  });
  renameSync(tmp, file);
}
const backupLock = join(dir, 'backup.lock');
function claimBackup() {
  try {
    if (existsSync(backupLock)) {
      const pid = Number(readFileSync(backupLock, 'utf8'));
      let alive = false;
      if (Number.isInteger(pid) && pid > 1) {
        try {
          process.kill(pid, 0);
          alive = readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('scripts/operations.mjs');
        } catch {}
      }
      if (alive) return false;
      unlinkSync(backupLock);
    }
    writeFileSync(backupLock, String(process.pid), { flag: 'wx', mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}
async function alert(event, message) {
  appendFileSync(
    join(dir, 'alerts.jsonl'),
    JSON.stringify({ event, message, at: new Date().toISOString() }) + '\n',
    { mode: 0o600 },
  );
  // External delivery is explicitly configured; private local evidence is always retained.
  if (
    process.env.OPERATIONS_ALERT_EMAIL &&
    process.env.MAIL_TRANSPORT === 'smtp' &&
    process.env.SMTP_HOST
  ) {
    const req = createRequire(join(root, 'apps/api/package.json'));
    const mail = req('nodemailer');
    const transport = mail.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? 'DaCy <noreply@localhost>',
        to: process.env.OPERATIONS_ALERT_EMAIL,
        subject: `DaCy: ${event}`,
        text: message,
      });
    } catch {
      /* local alert remains available; never log SMTP credentials */
    } finally {
      transport.close();
    }
  }
}
function command(program, args, env = {}) {
  return new Promise((resolveJob, reject) => {
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let error = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (chunk) => {
      if (error.length < 1000) error += chunk;
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 15 * 60_000);
    child.once('error', () => {
      clearTimeout(timer);
      reject(new Error('Proqram başladıla bilmədi.'));
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolveJob()
        : reject(new Error('Əməliyyat uğursuz oldu. Servis və hədəf konfiqurasiyasını yoxlayın.'));
    });
  });
}
let backingUp = false;
async function backup() {
  if (backingUp || !claimBackup()) {
    if (process.argv.includes('--backup-now')) {
      console.error(
        'Backup artıq icra olunur və ya kilid yaradıla bilmədi. Statusu və qovluq icazələrini yoxlayın.',
      );
      process.exitCode = 1;
    }
    return;
  }
  backingUp = true;
  state.lastBackupAttempt = new Date().toISOString();
  save();
  try {
    const pgDir =
      process.env.PG_BIN || join(root, '.local/postgres/root/usr/lib/postgresql/17/bin');
    const env = existsSync(pgDir) ? { PATH: `${pgDir}:${process.env.PATH}` } : {};
    await command(process.execPath, [join(root, 'scripts/backup.mjs')], env);
    const folder = readdirSync(join(root, 'backups'))
      .filter((name) => /^dacy-\d/.test(name))
      .sort()
      .at(-1);
    if (!folder) throw new Error('Backup manifest tapılmadı.');
    const backupDir = join(root, 'backups', folder);
    const manifest = JSON.parse(readFileSync(join(backupDir, 'manifest.json'), 'utf8'));
    state.backup = {
      ok: true,
      at: manifest.createdAt,
      folder,
      tables: Object.keys(manifest.tables).length,
      files: manifest.storage?.files ?? 0,
      remote: process.env.BACKUP_REMOTE ? 'pending' : 'not_configured',
      updatedAt: new Date().toISOString(),
    };
    save();
    if (process.env.BACKUP_REMOTE) {
      const destination = process.env.BACKUP_REMOTE.replace(/\/$/, '') + '/' + basename(backupDir);
      await command(process.env.RCLONE_BIN || 'rclone', [
        'copy',
        backupDir,
        destination,
        '--checksum',
      ]);
      state.backup.remote = 'copied';
      state.backup.updatedAt = new Date().toISOString();
      save();
    }
  } catch {
    const copiedLocally =
      state.backup?.at && Date.parse(state.backup.at) >= Date.parse(state.lastBackupAttempt);
    state.backup = {
      ...state.backup,
      ok: !!copiedLocally,
      remote: copiedLocally && process.env.BACKUP_REMOTE ? 'failed' : state.backup?.remote,
      failedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    save();
    await alert(
      'backup_failed',
      'Ehtiyat nüsxə və ya xarici hədəfə ötürmə uğursuz oldu. Son uğurlu nüsxəni yoxlayın.',
    );
    if (process.argv.includes('--backup-now')) process.exitCode = 1;
  } finally {
    backingUp = false;
    try {
      if (readFileSync(backupLock, 'utf8') === String(process.pid)) unlinkSync(backupLock);
    } catch {}
  }
}
let checking = false;
async function health() {
  if (checking) return;
  checking = true;
  try {
    const results = await Promise.all(
      [
        ['web', `http://127.0.0.1:${process.env.WEB_PORT ?? 3000}/giris`],
        ['api', `http://127.0.0.1:${process.env.API_PORT ?? 4000}/health`],
      ].map(async ([name, url]) => {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
          return [name, response.ok];
        } catch {
          return [name, false];
        }
      }),
    );
    const status = Object.fromEntries(results);
    const ok = Object.values(status).every(Boolean);
    const previous = state.health?.ok;
    state.health = { ...status, ok, at: new Date().toISOString() };
    state.failures = ok ? 0 : state.failures + 1;
    save();
    if (state.failures === 3)
      await alert(
        'service_unhealthy',
        'Web və ya API ardıcıl üç yoxlamadan keçmədi. Servis loglarını yoxlayın.',
      );
    if (ok && previous === false) await alert('service_recovered', 'Web və API yenidən işləyir.');
    const pg = join(root, '.local/start-postgres.sh');
    if (
      !status.api &&
      existsSync(pg) &&
      /^(localhost|127\.0\.0\.1)$/.test(new URL(process.env.DATABASE_URL).hostname)
    )
      await command(pg, []).catch(() => {});
  } finally {
    checking = false;
  }
}
if (process.argv.includes('--backup-now')) await backup();
else {
  await health();
  const interval = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS ?? 24)) * 3600_000;
  const due = () => {
    if (
      (!state.lastBackupAttempt || Date.now() - Date.parse(state.lastBackupAttempt) >= 3600_000) &&
      (!state.backup?.ok || Date.now() - Date.parse(state.backup.at) >= interval)
    )
      void backup();
  };
  setTimeout(due, 10_000);
  setInterval(due, 60_000);
  setInterval(() => void health(), 20_000);
}
