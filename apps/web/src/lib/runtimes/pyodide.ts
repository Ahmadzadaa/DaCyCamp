'use client';
import type { AttachmentView } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { formatPyError } from './py-errors';

/** Pyodide: defolt CDN; oflayn/öz serveri üçün NEXT_PUBLIC_PYODIDE_URL (məs. /pyodide/ — yalnız nüvə, pandas üçün tam güzgü lazımdır) */
export const PYODIDE_URL = (
  process.env.NEXT_PUBLIC_PYODIDE_URL ?? 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/'
).replace(/\/?$/, '/');

interface LoadOpts {
  messageCallback?: (msg: string) => void;
  errorCallback?: (msg: string) => void;
}
/** «Loading numpy, pandas…» mesajları tələbənin konsoluna (və dacy.lines-a) düşməsin */
const QUIET: LoadOpts = { messageCallback: () => {}, errorCallback: (m) => console.warn(m) };

interface PyodideLike {
  runPython(code: string, opts?: { globals?: unknown }): unknown;
  runPythonAsync(code: string, opts?: { globals?: unknown; filename?: string }): Promise<unknown>;
  loadPackagesFromImports(code: string, opts?: LoadOpts): Promise<unknown>;
  loadPackage(names: string | string[], opts?: LoadOpts): Promise<unknown>;
  pyimport(name: string): { install(pkgs: string[]): Promise<unknown> };
  setStdout(opts: { write: (buf: Uint8Array) => number }): void;
  setStderr(opts: { write: (buf: Uint8Array) => number }): void;
  setStdin(opts: { stdin: () => string | null }): void;
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
    s.onerror = () => reject(new Error(t('ws.pyodideFailed', { src })));
    document.head.appendChild(s);
  });
}

/** Öz serverimizdəki nüvə (public/pyodide — scripts/copy-runtimes.mjs kopyalayır); CDN əlçatmaz olanda ehtiyat */
export const LOCAL_PYODIDE_URL = '/pyodide/';

async function loadFrom(url: string): Promise<PyodideLike> {
  await loadScript(`${url}pyodide.js`);
  if (!window.loadPyodide) throw new Error(t('ws.pyodideFailed', { src: 'loadPyodide' }));
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
  /** tələbə kodunda xəta sətri (redaktorda işarələmək üçün) */
  errorLine: number | null;
  passed: boolean | null; // testlər işlədilməyibsə null
  images: string[]; // base64 PNG (matplotlib)
  ms: number;
}

/** Bir icranın (kod və ya testlər) vaxt limiti — sonsuz dövr səhifəni dondurmasın */
export const PY_TIME_LIMIT_S = 10;

/**
 * Gözətçi: yalnız tələbə kodunun (<exec>) sətirlərini sayır, limit keçəndə TimeoutError atır.
 * Kitabxana kodu izlənmir — pandas və s. yavaşımır.
 */
const WATCHDOG = `
import sys as _sys, time as _time
def _dacy_watch(limit, msg=None):
    end = _time.monotonic() + limit
    n = [0]
    def local(frame, event, arg):
        n[0] += 1
        if n[0] % 2000 == 0 and _time.monotonic() > end:
            raise TimeoutError(msg or f"Kod {limit:g} saniyədən çox işlədi — sonsuz dövr ola bilər")
        return local
    def glob(frame, event, arg):
        return local if frame.f_code.co_filename == "<exec>" else None
    _sys.settrace(glob)
def _dacy_unwatch():
    _sys.settrace(None)
`;

/**
 * Qrafik kitabxanaları (matplotlib, seaborn, pandas .plot): ekransız AGG backend, plt.show() — heç nə etmir
 * (şəkillər icradan sonra toplanır), əvvəlki icranın qrafikləri bağlanır.
 */
const PLOT_SETUP = `
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as _dacy_plt
_dacy_plt.show = lambda *a, **k: None
_dacy_plt.close("all")
del _dacy_plt
`;

/**
 * Jupyter kimi: kodun son sətri ifadədirsə (məs. df.head()), nəticəsi konsola yazılır; display() da var.
 * Qrafik obyektləri (Line2D, Axes...) yazılmır — onlar şəkil kimi göstərilir.
 */
const DISPLAY = `
def _dacy_show(v):
    if v is None or v is Ellipsis:
        return
    _m = lambda o: type(o).__module__.split(".")[0]
    if _m(v) in ("matplotlib", "seaborn", "wordcloud", "plotly"):
        return
    if isinstance(v, (list, tuple)) and v and all(_m(o) == "matplotlib" for o in v):
        return
    print(repr(v))
def display(*objs):
    for _o in objs:
        print(repr(_o))
`;

/** Tələbə kodu: fayl adı «<exec>» qalır (gözətçi və xəta mətni ona baxır), son ifadə göstərilir */
const RUN_USER = `
from pyodide.code import eval_code_async as _dacy_eval
_dacy_show(await _dacy_eval(_dacy_src, globals(), filename="<exec>"))
del _dacy_eval, _dacy_src
`;

/** Pyodide paylamasında olmayan, saf Python paketləri — micropip ilə PyPI-dan (bir dəfə) */
const MICROPIP: Array<[RegExp, string]> = [
  [/^\s*(import|from)\s+seaborn\b/m, 'seaborn'],
  [/^\s*(import|from)\s+plotly\b/m, 'plotly'],
  [/read_excel|to_excel|ExcelWriter|^\s*(import|from)\s+openpyxl\b/m, 'openpyxl'],
];
export const NEEDS_PLOT = /\b(matplotlib|seaborn|wordcloud)\b|\.plot\b|\.hist\(|\.boxplot\(/;
const installed = new Set<string>();

async function ensurePackages(py: PyodideLike, src: string) {
  const want = MICROPIP.filter(([re, name]) => re.test(src) && !installed.has(name)).map(
    ([, name]) => name,
  );
  if (want.length) {
    await py.loadPackage('micropip', QUIET);
    try {
      await py.pyimport('micropip').install(want);
    } catch (e) {
      throw new Error(t('ws.pkgFailed', { pkgs: want.join(', '), err: rawError(e) }));
    }
    for (const w of want) installed.add(w);
  }
  if (NEEDS_PLOT.test(src)) {
    await py.loadPackage('matplotlib', QUIET);
    py.runPython(PLOT_SETUP);
  }
}

/** Sonu yeni sətirsiz çap (print(x, end=" ")) Python bufferində qalmasın */
const FLUSH = `
import sys as _sys
_sys.stdout.flush()
_sys.stderr.flush()
`;

/**
 * Testlər üçün `dacy` obyekti: tələbənin çap etdiyi mətn və kodu.
 * «Ekrana yazdırın» tipli tapşırıqlar belə yoxlanılır: `assert "12" in dacy.lines`.
 */
const DACY_NS = `
from types import SimpleNamespace as _SN
dacy = _SN(stdout=_dacy_out, lines=[_l.strip() for _l in _dacy_out.splitlines() if _l.strip()], code=_dacy_code)
del _SN, _dacy_out, _dacy_code
`;

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

/** Xam baytları toplayır — `batched`-dən fərqli olaraq sonu yeni sətirsiz çapı da itirmir */
function sink() {
  const dec = new TextDecoder();
  let text = '';
  return {
    write: (buf: Uint8Array) => {
      text += dec.decode(buf, { stream: true });
      return buf.length;
    },
    text: () => text.replace(/\n$/, ''),
  };
}

/** Tələbə kodunu (və istəsə testləri) təmiz ad sahəsində işlədir */
export async function runPython(
  code: string,
  opts: { tests?: string; datasets?: AttachmentView[]; stdin?: string } = {},
): Promise<PyRunResult> {
  const py = await getPyodide();
  const out = sink();
  const err = sink();
  // paket yüklənərkən (micropip daxil) çıxan mesajlar tələbənin konsoluna düşməsin
  const discard = { write: (buf: Uint8Array) => buf.length };
  py.setStdout(discard);
  py.setStderr(discard);
  // input(): «Giriş» sekməsindəki sətirlər növbə ilə; dəyər sorğudan sonra konsola yazılır (terminal kimi).
  // Bitəndə EOF → EOFError (brauzerin prompt() pəncərəsi açılmır)
  const lines = opts.stdin?.trim()
    ? opts.stdin.replace(/\r/g, '').replace(/\n$/, '').split('\n')
    : [];
  const enc = new TextEncoder();
  py.setStdin({
    stdin: () => {
      const v = lines.shift();
      if (v === undefined) return null;
      out.write(enc.encode(`${v}\n`));
      return v;
    },
  });
  for (const d of opts.datasets ?? []) {
    if (!d.url) continue;
    const res = await fetch(d.url, { credentials: 'include' });
    if (!res.ok) throw new Error(t('ws.datasetFailed', { name: d.filename }));
    py.FS.writeFile(d.filename, new Uint8Array(await res.arrayBuffer()));
  }
  const t0 = performance.now();
  const all = `${code}\n${opts.tests ?? ''}`;
  const ns = (py.globals.get('dict') as () => { set(k: string, v: unknown): void })();
  py.runPython(WATCHDOG);
  const watch = () =>
    py.runPython(
      `_dacy_watch(${PY_TIME_LIMIT_S}, ${JSON.stringify(t('ws.timeout', { s: PY_TIME_LIMIT_S }))})`,
    );
  let error: string | null = null;
  let errorLine: number | null = null;
  let passed: boolean | null = null;
  try {
    await ensurePackages(py, all);
    await py.loadPackagesFromImports(all, QUIET);
    py.setStdout({ write: out.write });
    py.setStderr({ write: err.write });
    py.runPython(DISPLAY, { globals: ns });
    ns.set('_dacy_src', code);
    watch();
    await py.runPythonAsync(RUN_USER, { globals: ns, filename: '<dacy>' });
    py.runPython(FLUSH);
    if (opts.tests?.trim()) {
      try {
        ns.set('_dacy_out', out.text());
        ns.set('_dacy_code', code);
        py.runPython(DACY_NS, { globals: ns });
        watch();
        await py.runPythonAsync(opts.tests, { globals: ns });
        passed = true;
      } catch (e) {
        passed = false;
        error = formatPyError(rawError(e), { tests: true }).text;
      }
    }
  } catch (e) {
    const v = formatPyError(rawError(e));
    error = v.text;
    errorLine = v.line;
    if (opts.tests?.trim()) passed = false;
  } finally {
    py.runPython('_dacy_unwatch()');
    py.runPython(FLUSH);
  }
  let images: string[] = [];
  try {
    const r = py.runPython(PLOT_COLLECT, { globals: ns }) as { toJs?: () => string[] } | string[];
    images = Array.isArray(r) ? r : (r?.toJs?.() ?? []);
  } catch {
    images = [];
  }
  if (error && /EOFError/.test(error)) error += `\n\n💡 ${t('ws.stdinEof')}`;
  return {
    stdout: out.text(),
    stderr: err.text(),
    error,
    errorLine,
    passed,
    images,
    ms: Math.round(performance.now() - t0),
  };
}

const rawError = (e: unknown) => (e instanceof Error ? e.message : String(e));
