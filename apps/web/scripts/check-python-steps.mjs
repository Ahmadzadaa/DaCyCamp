#!/usr/bin/env node
/**
 * Kurs paketindəki Python addımlarını brauzerdəki kimi Pyodide-də yoxlayır (Node, şəbəkəsiz):
 *   - solution + tests  → KEÇMƏLİDİR (testlər düzgün həlli qəbul edir)
 *   - starter_code + tests → KEÇMƏMƏLİDİR (tələbə heç nə yazmadan addım bitmir)
 * Gözətçi (vaxt limiti) və `dacy` obyekti src/lib/runtimes/pyodide.ts-dən götürülür — eyni məntiq.
 *
 * İstifadə: pnpm --filter @dacy/web check:python            — content/courses/* hamısı
 *          pnpm --filter @dacy/web check:python <qovluq>…  — yalnız göstərilən paket(lər)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const yaml = createRequire(resolve(here, '../../api/package.json'))('js-yaml');
const { loadPyodide } = await import(req.resolve('pyodide/pyodide.mjs'));

const coursesRoot = resolve(here, '../../../content/courses');
const dirs = process.argv.slice(2).length
  ? process.argv.slice(2).map((d) => resolve(process.cwd(), d))
  : existsSync(coursesRoot)
    ? readdirSync(coursesRoot).map((d) => join(coursesRoot, d))
    : [];
const packages = dirs.filter((d) => existsSync(join(d, 'course.yaml')));
for (const d of dirs) if (!packages.includes(d)) console.error(`course.yaml tapılmadı: ${d}`);
if (packages.length !== dirs.length) process.exit(2);

const src = readFileSync(resolve(here, '../src/lib/runtimes/pyodide.ts'), 'utf8');
const grab = (name) => {
  const m = new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`).exec(src);
  if (!m) throw new Error(`${name} pyodide.ts-də tapılmadı`);
  return m[1];
};
const WATCHDOG = grab('WATCHDOG');
const DACY_NS = grab('DACY_NS');
const FLUSH = grab('FLUSH');
const LIMIT = Number(/PY_TIME_LIMIT_S = (\d+)/.exec(src)?.[1] ?? 10);

const py = await loadPyodide({ indexURL: dirname(req.resolve('pyodide/package.json')) + '/' });
py.runPython(WATCHDOG);

const lastLine = (e) =>
  String(e instanceof Error ? e.message : e)
    .trim()
    .split('\n')
    .pop();

async function run(dir, code, tests, datasets) {
  const dec = new TextDecoder();
  let out = '';
  py.setStdout({
    write: (buf) => {
      out += dec.decode(buf, { stream: true });
      return buf.length;
    },
  });
  py.setStderr({ write: (buf) => buf.length });
  for (const d of datasets) py.FS.writeFile(basename(d), readFileSync(join(dir, d)));
  const ns = py.globals.get('dict')();
  try {
    await py.loadPackagesFromImports(`${code}\n${tests}`);
    py.runPython(`_dacy_watch(${LIMIT})`);
    await py.runPythonAsync(code, { globals: ns });
    py.runPython(FLUSH);
    ns.set('_dacy_out', out.replace(/\n$/, ''));
    ns.set('_dacy_code', code);
    py.runPython(DACY_NS, { globals: ns });
    py.runPython(`_dacy_watch(${LIMIT})`);
    await py.runPythonAsync(tests, { globals: ns });
    return { passed: true, error: null };
  } catch (e) {
    return { passed: false, error: lastLine(e) };
  } finally {
    py.runPython('_dacy_unwatch()');
    py.runPython(FLUSH);
  }
}

const steps = [];
for (const dir of packages) {
  const modDir = join(dir, 'modules');
  if (!existsSync(modDir)) continue;
  for (const m of readdirSync(modDir).sort()) {
    for (const f of readdirSync(join(modDir, m)).sort()) {
      if (!/\.ya?ml$/.test(f) || /^module\.ya?ml$/.test(f)) continue;
      const def = yaml.load(readFileSync(join(modDir, m, f), 'utf8'));
      if (def?.type === 'python') steps.push({ dir, file: `${basename(dir)}/${m}/${f}`, def });
    }
  }
}

let bad = 0;
for (const { dir, file, def } of steps) {
  const ds = [def.dataset ?? []].flat();
  const problems = [];
  if (!def.solution?.trim()) problems.push('solution yoxdur — testləri yoxlamaq olmur');
  else {
    const sol = await run(dir, def.solution, def.tests ?? '', ds);
    if (!sol.passed) problems.push(`həll testdən keçmir: ${sol.error}`);
  }
  const st = await run(dir, def.starter_code ?? '', def.tests ?? '', ds);
  if (st.passed)
    problems.push('starter kod testdən keçir — tələbə heç nə yazmadan addımı bitirə bilər');
  if (problems.length) {
    bad++;
    console.log(`✗ ${file} — ${def.title}`);
    for (const p of problems) console.log(`    ${p}`);
  } else {
    console.log(`✓ ${file} — ${def.title}`);
    console.log(`    starter: ${st.error}`);
  }
}
console.log(`\n${steps.length} Python addımı, ${bad} problem`);
process.exit(bad ? 1 : 0);
