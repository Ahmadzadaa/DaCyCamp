"""
CPython-da (Pyodide ilə eyni paket versiyaları) kurs paketlərinin Python addımlarını yoxlayır:
solution + tests KEÇMƏLİ, starter_code + tests KEÇMƏMƏLİDİR. Brauzer runtime-ı (pyodide.ts) kimi:
datasetlər iş qovluğuna yazılır, `dacy` obyekti, son ifadənin göstərilməsi, matplotlib AGG, plt.show — no-op.

İstifadə: pyenv/bin/python gen/pyverify.py <kurs qovluğu> [fayl filtri] [--en]
  --en — ingiliscə tərcümə (i18n/en) mənbənin üzərinə birləşdirilib yoxlanılır; qiymətləndirmə
         dildən asılı olmasın deyə çarpaz yoxlama da aparılır: AZ həll EN testlərindən, EN həll AZ
         testlərindən keçməlidir (tələbə dili dəyişəndə yazdığı kod eyni nəticə verir).
         EN testlərində `# i18n-superset` şərhi: tələbənin yazdığı mətn (mesaj, etiket) EN-də
         ingiliscədir və EN testləri AZ variantı da qəbul edir — onda yalnız AZ həll → EN test
         yoxlanılır (EN həll AZ testindən keçməyə bilər)
"""
import ast
import contextlib
import io
import os
import shutil
import sys
import tempfile
import time
import traceback
import types

import yaml

import matplotlib

matplotlib.use('AGG')
import matplotlib.pyplot as plt  # noqa: E402

plt.show = lambda *a, **k: None


def show_last(code, ns):
    tree = ast.parse(code, '<exec>')
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr) and not code.rstrip().endswith(';'):
        last = ast.Expression(tree.body.pop().value)
    exec(compile(tree, '<exec>', 'exec'), ns)
    if last is not None:
        v = eval(compile(last, '<exec>', 'eval'), ns)
        if v is None or v is Ellipsis:
            return
        m = lambda o: type(o).__module__.split('.')[0]  # noqa: E731
        if m(v) in ('matplotlib', 'seaborn', 'wordcloud', 'plotly'):
            return
        if isinstance(v, (list, tuple)) and v and all(m(o) == 'matplotlib' for o in v):
            return
        print(repr(v))


def run(course_dir, code, tests, datasets, tmp):
    plt.close('all')
    for d in datasets:
        shutil.copy(os.path.join(course_dir, d), os.path.join(tmp, os.path.basename(d)))
    ns = {'__name__': '__main__', 'display': lambda *o: [print(repr(x)) for x in o] and None}
    out = io.StringIO()
    cwd = os.getcwd()
    os.chdir(tmp)
    sys.path.insert(0, tmp)  # Pyodide-də iş qovluğu sys.path-dadır (öz modulunu import etmək)
    before = set(sys.modules)
    t0 = time.time()
    try:
        with contextlib.redirect_stdout(out):
            show_last(code, ns)
        text = out.getvalue().rstrip('\n')
        ns['dacy'] = types.SimpleNamespace(
            stdout=text, lines=[l.strip() for l in text.splitlines() if l.strip()], code=code
        )
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(tests, '<tests>', 'exec'), ns)
        return True, None, time.time() - t0, out.getvalue()
    except Exception as e:  # noqa: BLE001
        msg = f'{type(e).__name__}: {e}'.strip().splitlines()
        return False, msg[-1] if msg else type(e).__name__, time.time() - t0, out.getvalue()
    finally:
        os.chdir(cwd)
        sys.path.remove(tmp)
        for k in set(sys.modules) - before:
            if getattr(sys.modules[k], '__file__', '') and str(sys.modules[k].__file__).startswith(tmp):
                del sys.modules[k]
        plt.close('all')


def main():
    args = [a for a in sys.argv[1:] if a != '--en']
    use_en = '--en' in sys.argv
    course = os.path.abspath(args[0])
    filt = args[1] if len(args) > 1 else ''
    if use_en:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from i18n_tools import load_en, merge, step_key
    bad = n = 0
    for m in sorted(os.listdir(os.path.join(course, 'modules'))):
        md = os.path.join(course, 'modules', m)
        for f in sorted(os.listdir(md)):
            if not f.endswith('.yaml') or f == 'module.yaml' or filt not in f'{m}/{f}':
                continue
            d = yaml.safe_load(open(os.path.join(md, f)))
            if d.get('type') != 'python':
                continue
            if use_en:
                en = ((load_en(course, m) or {}).get('steps') or {}).get(step_key(f))
                if not en:
                    print(f'✗ {m}/{f} — tərcümə yoxdur')
                    bad += 1
                    n += 1
                    continue
                az = d
                d = merge(d, en)
            n += 1
            ds = d.get('dataset') or []
            ds = [ds] if isinstance(ds, str) else ds
            probs = []
            with tempfile.TemporaryDirectory() as tmp:
                ok, err, dt, out = run(course, d.get('solution', ''), d['tests'], ds, tmp)
                if not ok:
                    probs.append(f'həll keçmir: {err}')
                if dt > 6:
                    probs.append(f'həll yavaşdır: {dt:.1f}s')
            with tempfile.TemporaryDirectory() as tmp:
                sok, serr, _, _ = run(course, d.get('starter_code', ''), d['tests'], ds, tmp)
                if sok:
                    probs.append('starter keçir')
            if use_en:
                with tempfile.TemporaryDirectory() as tmp:
                    ok, err, _, _ = run(course, az.get('solution', ''), d['tests'], ds, tmp)
                    if not ok:
                        probs.append(f'AZ həll EN testlərindən keçmir: {err}')
                if 'i18n-superset' not in d['tests']:
                    with tempfile.TemporaryDirectory() as tmp:
                        ok, err, _, _ = run(course, d.get('solution', ''), az['tests'], ds, tmp)
                        if not ok:
                            probs.append(f'EN həll AZ testlərindən keçmir: {err}')
            if probs:
                bad += 1
                print(f'✗ {m}/{f} — {d["title"]}')
                for p in probs:
                    print('   ', p)
            else:
                print(f'✓ {m}/{f} — starter: {serr}')
    print(f'\n{n} Python addımı, {bad} problem')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
