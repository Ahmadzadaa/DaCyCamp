'use client';
import type { AttachmentView } from '@dacy/shared';

/** Pyodide: defolt CDN; oflayn/öz serveri üçün NEXT_PUBLIC_PYODIDE_URL (məs. /pyodide/ — yalnız nüvə, pandas üçün tam güzgü lazımdır) */
export const PYODIDE_URL = (
  process.env.NEXT_PUBLIC_PYODIDE_URL ?? 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/'
).replace(/\/?$/, '/');

interface PyodideLike {
  runPython(code: string, opts?: { globals?: unknown }): unknown;
  runPythonAsync(code: string, opts?: { globals?: unknown }): Promise<unknown>;
  loadPackagesFromImports(code: string): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): unknown };
  toPy(v: unknown): unknown;
  FS: { writeFile(path: string, data: Uint8Array | string): void; mkdirTree?(p: string): void };
}
declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideLike>;
  }
}

let pyPromise: Promise<PyodideLike> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-pyodide="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.pyodide = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Pyodide yüklənmədi: ${src}`));
    document.head.appendChild(s);
  });
}

/** Öz serverimizdəki nüvə (public/pyodide — scripts/copy-runtimes.mjs kopyalayır); CDN əlçatmaz olanda ehtiyat */
export const LOCAL_PYODIDE_URL = '/pyodide/';

async function loadFrom(url: string): Promise<PyodideLike> {
  await loadScript(`${url}pyodide.js`);
  if (!window.loadPyodide) throw new Error('loadPyodide tapılmadı');
  return window.loadPyodide({ indexURL: url });
}

export function getPyodide(): Promise<PyodideLike> {
  if (!pyPromise) {
    pyPromise = (async () => {
      try {
        return await loadFrom(PYODIDE_URL);
      } catch (e) {
        if (PYODIDE_URL === LOCAL_PYODIDE_URL) throw e;
        // CDN bloklanıbsa (oflayn, korporativ şəbəkə) nüvəni öz serverimizdən yüklə — yalnız standart kitabxana
        console.warn('[pyodide] CDN yüklənmədi, lokal nüvəyə keçilir', e);
        return loadFrom(LOCAL_PYODIDE_URL);
      }
    })().catch((e) => {
      pyPromise = null;
      throw e;
    });
  }
  return pyPromise;
}

export interface PyRunResult {
  stdout: string;
  stderr: string;
  error: string | null;
  passed: boolean | null; // testlər işlədilməyibsə null
  images: string[]; // base64 PNG (matplotlib)
  ms: number;
}

const PLOT_COLLECT = `
import sys
_imgs = []
if 'matplotlib' in sys.modules:
    import io, base64
    import matplotlib.pyplot as plt
    for _n in plt.get_fignums():
        _b = io.BytesIO()
        plt.figure(_n).savefig(_b, format='png', bbox_inches='tight', dpi=110)
        _imgs.append(base64.b64encode(_b.getvalue()).decode())
    plt.close('all')
_imgs
`;

/** Tələbə kodunu (və istəsə testləri) təmiz ad sahəsində işlədir */
export async function runPython(
  code: string,
  opts: { tests?: string; datasets?: AttachmentView[] } = {},
): Promise<PyRunResult> {
  const py = await getPyodide();
  const out: string[] = [];
  const err: string[] = [];
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => err.push(s) });
  for (const d of opts.datasets ?? []) {
    if (!d.url) continue;
    const res = await fetch(d.url, { credentials: 'include' });
    if (!res.ok) throw new Error(`Dataset yüklənmədi: ${d.filename}`);
    py.FS.writeFile(d.filename, new Uint8Array(await res.arrayBuffer()));
  }
  const t0 = performance.now();
  const all = `${code}\n${opts.tests ?? ''}`;
  if (/^\s*(import|from)\s+matplotlib/m.test(all)) {
    try {
      await py.loadPackagesFromImports('import matplotlib');
      py.runPython("import matplotlib\nmatplotlib.use('AGG')");
    } catch {
      /* paket tapılmadıqda aşağıda xəta olacaq */
    }
  }
  const ns = (py.globals.get('dict') as () => unknown)();
  let error: string | null = null;
  let passed: boolean | null = null;
  try {
    await py.loadPackagesFromImports(all);
    await py.runPythonAsync(code, { globals: ns });
    if (opts.tests?.trim()) {
      try {
        await py.runPythonAsync(opts.tests, { globals: ns });
        passed = true;
      } catch (e) {
        passed = false;
        error = pyError(e);
      }
    }
  } catch (e) {
    error = pyError(e);
    if (opts.tests?.trim()) passed = false;
  }
  let images: string[] = [];
  try {
    const r = py.runPython(PLOT_COLLECT, { globals: ns }) as { toJs?: () => string[] } | string[];
    images = Array.isArray(r) ? r : (r?.toJs?.() ?? []);
  } catch {
    images = [];
  }
  return {
    stdout: out.join('\n'),
    stderr: err.join('\n'),
    error,
    passed,
    images,
    ms: Math.round(performance.now() - t0),
  };
}

function pyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Pyodide traceback-in son sətirləri daha faydalıdır
  const lines = msg.trim().split('\n');
  const tail = lines.slice(-6).join('\n');
  return tail.length < msg.length ? `…\n${tail}` : msg;
}
