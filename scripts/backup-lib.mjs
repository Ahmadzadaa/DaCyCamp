/**
 * backup.mjs / restore.mjs üçün ortaq köməkçilər.
 * Parol heç vaxt əmr sətrinə (ps-də görünər) və ya loga düşmür: pg_dump / pg_restore / psql PG* mühit
 * dəyişənləri ilə çağırılır, URL loglarda `***` ilə gizlədilir.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');

/** process.env üstündür; olmayanlar kökdəki .env-dən oxunur */
export function loadEnv() {
  const out = { ...process.env };
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m || out[m[1]] !== undefined) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** postgresql://user:pass@host:port/db?schema=… → PG* mühit dəyişənləri (+ Prisma-nın `schema` parametri) */
export function pgEnv(url) {
  const u = new URL(url);
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('PostgreSQL URL gözlənilirdi');
  const env = {
    PGHOST: u.hostname || 'localhost',
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
  const ssl = u.searchParams.get('sslmode');
  if (ssl) env.PGSSLMODE = ssl;
  return { env, schema: u.searchParams.get('schema') || 'public' };
}

export const redact = (url) => {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<yanlış URL>';
  }
};

/** STORAGE_DIR nisbi verilibsə — monorepo kökünə görə (apps/api/src/config/env.ts ilə eyni qayda) */
export const storagePath = (dir) => (isAbsolute(dir) ? dir : resolve(ROOT, dir));

/** Proqramı işlət; xətada stderr-i (parolsuz) göstər və dayan */
export function run(cmd, args, { env = {}, input } = {}) {
  const r = spawnSync(cmd, args, {
    env: { ...process.env, ...env },
    input,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${r.status} ilə bitdi:\n${(r.stderr || '').trim()}`);
  return r.stdout;
}

export function sha256(file) {
  return new Promise((ok, fail) => {
    const h = createHash('sha256');
    createReadStream(file)
      .on('data', (d) => h.update(d))
      .on('error', fail)
      .on('end', () => ok(h.digest('hex')));
  });
}

const ident = (s) => `"${s.replace(/"/g, '""')}"`;
const lit = (s) => `'${s.replace(/'/g, "''")}'`;

const namesSql = (schema) =>
  `select tablename from pg_tables where schemaname = ${lit(schema)} order by 1`;
const countsSql = (names, schema) =>
  names
    .map((n) => `select ${lit(n)}, count(*) from ${ident(schema)}.${ident(n)}`)
    .join(' union all ');
const migrationSql = (schema) =>
  `select migration_name from ${ident(schema)}."_prisma_migrations" where finished_at is not null order by finished_at desc, migration_name desc limit 1`;
const lines = (out) => out.split('\n').filter(Boolean);
const parseCounts = (out) =>
  Object.fromEntries(
    lines(out).map((l) => {
      const [n, c] = l.split('\t');
      return [n, Number(c)];
    }),
  );
const psql = (env, sql) =>
  run('psql', ['-XAt', '-F', '\t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env });

/** Sxemdəki hər cədvəlin dəqiq sətir sayı (bərpadan sonra müqayisə üçün) */
export function tableCounts(env, schema) {
  const names = lines(psql(env, namesSql(schema)));
  return names.length ? parseCounts(psql(env, countsSql(names, schema))) : {};
}

/** Tətbiq olunmuş sonuncu Prisma miqrasiyası (cədvəl yoxdursa null) */
export function lastMigration(env, schema) {
  try {
    return psql(env, migrationSql(schema)).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Bir tranzaksiya daxilində bir neçə sorğu üçün açıq psql sessiyası. İşlək saytda nüsxə alınarkən sətir sayları
 * dump ilə eyni anı göstərsin deyə: `pg_export_snapshot()` → `pg_dump --snapshot` → saylar eyni snapshot-da.
 */
function psqlSession(env) {
  const p = spawn('psql', ['-XAtq', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const MARK = '__dacy_end__';
  let out = '';
  let err = '';
  let exited = null;
  const waiting = [];
  p.stdout.on('data', (d) => {
    out += d;
    let i;
    while (waiting.length && (i = out.indexOf(`${MARK}\n`)) >= 0) {
      const chunk = out.slice(0, i);
      out = out.slice(i + MARK.length + 1);
      waiting.shift().ok(chunk);
    }
  });
  p.stderr.on('data', (d) => (err += d));
  const done = new Promise((ok) =>
    p.on('exit', (code) => {
      exited = code;
      for (const w of waiting.splice(0))
        w.fail(new Error(`psql ${code} ilə bitdi:\n${err.trim()}`));
      ok(code);
    }),
  );
  return {
    query: (sql) =>
      new Promise((ok, fail) => {
        if (exited !== null) return fail(new Error(`psql bağlıdır:\n${err.trim()}`));
        waiting.push({ ok, fail });
        // `;` mütləqdir: psql meta-əmri (`\echo`) sorğu buferini icra etmir — nəticələr qarışardı
        p.stdin.write(`${sql.replace(/;?\s*$/, ';')}\n\\echo ${MARK}\n`);
      }),
    end: async () => {
      p.stdin.end('commit;\n');
      if ((await done) !== 0) throw new Error(`psql xəta ilə bitdi:\n${err.trim()}`);
    },
  };
}

/**
 * Ardıcıl nüsxə: pg_dump və cədvəl sayları / sonuncu miqrasiya eyni snapshot-dan oxunur (REPEATABLE READ).
 * `dump(snapshotId)` pg_dump-ı işlədir.
 */
export async function consistentDump(env, schema, dump) {
  const s = psqlSession(env);
  await s.query('begin isolation level repeatable read read only;');
  const snapshot = (await s.query('select pg_export_snapshot();')).trim();
  dump(snapshot);
  const names = lines(await s.query(namesSql(schema)));
  const tables = names.length ? parseCounts(await s.query(countsSql(names, schema))) : {};
  const migration = names.includes('_prisma_migrations')
    ? (await s.query(migrationSql(schema))).trim() || null
    : null;
  await s.end();
  return { snapshot, tables, migration };
}

/** Gözlənilməz xəta: stack trace əvəzinə qısa mesaj (mesajlarda parol yoxdur — PG* mühitdən ötürülür) */
export function exitOnError() {
  const handler = (e) => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  };
  process.on('uncaughtException', handler);
  process.on('unhandledRejection', handler);
}

export function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // `pnpm db:restore -- …` sətri `--`-u olduğu kimi ötürür — onu keçirik
    if (a === '--') continue;
    if (!a.startsWith('--')) pos.push(a);
    else if (a.includes('=')) flags[a.slice(2, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[a.slice(2)] = argv[++i];
    else flags[a.slice(2)] = true;
  }
  return { pos, flags };
}
