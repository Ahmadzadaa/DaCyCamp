// Brauzer runtime-larını public/ qovluğuna kopyalayır (CDN-siz, oflayn işləyir): DuckDB-WASM, Pyodide nüvəsi, Monaco
import { cpSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../public');
const req = createRequire(import.meta.url);

function copy(src, dst) {
  if (!existsSync(src)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

// DuckDB-WASM
const duck = dirname(req.resolve('@duckdb/duckdb-wasm'));
for (const f of [
  'duckdb-mvp.wasm',
  'duckdb-eh.wasm',
  'duckdb-browser-mvp.worker.js',
  'duckdb-browser-eh.worker.js',
])
  copy(resolve(duck, f), resolve(pub, 'duckdb', f));

// Pyodide nüvəsi (paketlər — pandas, numpy — CDN-dən və ya NEXT_PUBLIC_PYODIDE_URL-dən)
try {
  const py = dirname(req.resolve('pyodide/package.json'));
  for (const f of [
    'pyodide.js',
    'pyodide.mjs',
    'pyodide.asm.js',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
  ])
    copy(resolve(py, f), resolve(pub, 'pyodide', f));
} catch {
  console.warn('[copy-runtimes] pyodide paketi tapılmadı — CDN istifadə olunacaq');
}

// Monaco (AMD, min/vs)
// exports xəritəsi package.json-u açmır — əsas giriş min/vs/index.js-dən qovluğu tapırıq
const vs = dirname(req.resolve('monaco-editor'));
if (existsSync(vs)) cpSync(vs, resolve(pub, 'monaco/vs'), { recursive: true });

console.log('[copy-runtimes] public/duckdb, public/pyodide, public/monaco hazırdır');
