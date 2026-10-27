#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const base = process.env.LOAD_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3000}`;
const concurrency = Math.min(100, Math.max(1, Number(process.env.LOAD_CONCURRENCY ?? 20)));
const total = Math.min(2000, Math.max(concurrency, Number(process.env.LOAD_REQUESTS ?? 200)));
let cookie;
if (process.env.SEED_STUDENT_EMAIL && process.env.SEED_STUDENT_PASSWORD) {
  const response = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SEED_STUDENT_EMAIL,
      password: process.env.SEED_STUDENT_PASSWORD,
    }),
  });
  if (!response.ok) throw new Error('Yük sınağına giriş alınmadı. Sınaq hesabını yoxlayın.');
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
}
const results = [];
let next = 0;
const start = performance.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < total) {
      const index = next++;
      const begin = performance.now();
      const path =
        index % 3 === 0
          ? '/api/health'
          : index % 3 === 1 || !cookie
            ? '/api/courses'
            : '/api/academy/me/overview';
      try {
        const response = await fetch(base + path, {
          headers: cookie ? { cookie } : {},
          signal: AbortSignal.timeout(10000),
        });
        await response.arrayBuffer();
        results.push({ ms: performance.now() - begin, status: response.status });
      } catch {
        results.push({ ms: performance.now() - begin, status: 0 });
      }
    }
  }),
);
const sorted = results.map((x) => x.ms).sort((a, b) => a - b);
const failures = results.filter((x) => x.status < 200 || x.status >= 400);
const percentile = (p) =>
  Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]);
console.log(
  JSON.stringify(
    {
      concurrency,
      requests: total,
      failures: failures.length,
      statusCounts: results.reduce(
        (out, x) => ({ ...out, [x.status]: (out[x.status] ?? 0) + 1 }),
        {},
      ),
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      maxMs: percentile(1),
      durationMs: Math.round(performance.now() - start),
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
