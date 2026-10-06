"""
Kurs paketlərinin ingiliscə tərcüməsi üçün alətlər (i18n/en/<fəsil>.yaml).

  python3 i18n_tools.py extract <kurs> <fəsil qovluğu>   — fəslin tərcümə olunacaq mətnləri (YAML skeleti)
  python3 i18n_tools.py check <kurs>                     — əhatə + ingiliscə mətndə azərbaycan hərfi qalmayıb
                                                           (kod blokları/inline kod və kod sahələri istisna)

Birləşmə qaydası API ilə eynidir (packages/shared/src/content/i18n.ts → mergeTranslation).
"""
import os
import re
import sys

import yaml

AZ = re.compile(r'[əğışçöüƏĞİŞÇÖÜ]')
CODE_FIELDS = {'starter_code', 'solution', 'tests', 'check_script', 'dataset', 'answer'}
TEXT_FIELDS = ['title', 'instructions', 'tasks', 'hints', 'content', 'questions', 'explanation']


def merge(base, tr):
    if tr is None or tr == '':
        return base
    if isinstance(base, dict) and isinstance(tr, dict):
        out = dict(base)
        for k, v in tr.items():
            out[k] = merge(base[k], v) if k in base else v
        return out
    if isinstance(base, list) and isinstance(tr, list):
        if tr and all(isinstance(x, dict) for x in tr):
            return [merge(x, tr[i]) if i < len(tr) else x for i, x in enumerate(base)]
        return tr if len(tr) == len(base) or not base else base
    return tr


def front_matter(text):
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', text, re.S)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, m.group(2)


def load_step(path):
    """Paketdəki addım faylı → xam dict (md: title + content)"""
    text = open(path, encoding='utf-8').read()
    if path.endswith('.md'):
        fm, body = front_matter(text)
        h1 = re.search(r'^#\s+(.+)$', body, re.M)
        return {'type': 'theory', 'title': fm.get('title') or (h1.group(1).strip() if h1 else ''), **fm, 'content': body}
    return yaml.safe_load(text) or {}


def step_key(fname):
    return re.sub(r'^\d+-', '', os.path.splitext(fname)[0])


def steps_of(course, mod):
    md = os.path.join(course, 'modules', mod)
    for f in sorted(os.listdir(md)):
        if f in ('module.yaml', 'module.yml') or not re.search(r'\.(ya?ml|md)$', f):
            continue
        yield step_key(f), f, load_step(os.path.join(md, f))


def load_en(course, mod):
    p = os.path.join(course, 'i18n', 'en', f'{mod}.yaml')
    return yaml.safe_load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def translatable(d):
    """Addımın tərcümə olunan sahələri (kod sahələri — şərh/mesaj üçün — ayrıca göstərilir)"""
    t = d.get('type')
    out = {'title': d.get('title')}
    if t == 'theory':
        out['content'] = d.get('content')
    elif t == 'quiz':
        qs = []
        for q in d.get('questions') or []:
            x = {'text': q.get('text')}
            if q.get('options'):
                x['options'] = q['options']
            if q.get('buckets'):
                x['buckets'] = q['buckets']
            if q.get('explanation'):
                x['explanation'] = q['explanation']
            qs.append(x)
        out['questions'] = qs
    else:
        for k in ('instructions', 'tasks', 'hints'):
            if d.get(k):
                out[k] = d[k]
        if t == 'ctf':
            out['tasks'] = [{k: v for k, v in tk.items() if k in ('question', 'hint', 'answer')} for tk in d.get('tasks') or []]
        for k in ('starter_code', 'solution', 'tests'):
            if d.get(k) and AZ.search(str(d[k])):
                out[k] = d[k]
    return out


class Lit(str):
    pass


def _lit(dumper, data):
    return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|' if '\n' in data else None)


yaml.add_representer(str, _lit)


def extract(course, mod):
    mm = yaml.safe_load(open(os.path.join(course, 'modules', mod, 'module.yaml'), encoding='utf-8')) or {}
    doc = {'title': mm.get('title'), 'description': mm.get('description'), 'steps': {}}
    for key, f, d in steps_of(course, mod):
        doc['steps'][key] = translatable(d)
    print(yaml.dump(doc, allow_unicode=True, sort_keys=False, width=1000))


def strip_code(s):
    s = re.sub(r'```.*?```', '', s, flags=re.S)
    s = re.sub(r'`[^`\n]*`', '', s)
    # dırnaq içində qısa data dəyəri (açar, etiket, şəhər: "yaş", "Bakı") — tapşırıq/variant düz mətndir
    s = re.sub(r'"[^"\n]{1,60}"', '', s)
    # SQL sətir literalı: tək dırnaqda boşluqsuz bir söz ('Bakı', '2024'); don't kimi apostroflar düşmür
    return re.sub(r"(?<!\w)'[^'\s]{1,30}'(?!\w)", '', s)


def az_left(node, path, out, code=False):
    if isinstance(node, dict):
        for k, v in node.items():
            az_left(v, f'{path}.{k}', out, code or k in CODE_FIELDS)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            az_left(v, f'{path}[{i}]', out, code)
    elif isinstance(node, str):
        if code:
            # kodda: şərhlər və assert mesajları — identifikator/data (satislar, Bakı) icazəlidir.
            # Şərhdəki söz kodda sətir literalı kimi işlənirsə (gözlənilən nəticə: # Müsbət) — datadır
            lits = {w for q in re.findall(r'"([^"\n]*)"|\'([^\'\n]*)\'', node) for x in q for w in re.findall(r'\w+', x)}
            for line in node.splitlines():
                c = line.split('#', 1)[1] if '#' in line else ''
                # şərhdə dırnaq/backtick içindəki data (məs. "yaş" açarı) icazəlidir
                c = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '', c)
                c = ' '.join(w for w in re.findall(r'\S+', c) if re.sub(r'\W', '', w) not in lits)
                if AZ.search(c):
                    out.append(f'{path}: şərh — {c.strip()[:70]}')
                m = re.match(r'''\s*assert\b.*,\s*f?((["'])(?:(?!\2).)*\2)\s*$''', line)
                if path.endswith('.tests') and m:
                    # mesajın içində dırnaqlı data ("Aysel Məmmədova") icazəlidir
                    inner = re.sub(r'\\?"[^"\n]{1,60}?\\?"', '', m.group(1)[1:-1])
                    inner = re.sub(r"\[[^\]\n]*\]|'[^'\s]{1,30}'", '', inner)
                    if AZ.search(inner):
                        out.append(f'{path}: assert mesajı — {m.group(1).strip()[:70]}')
        elif AZ.search(strip_code(node)):
            out.append(f'{path}: {strip_code(node).strip()[:90]}')


def check(course):
    cy = os.path.join(course, 'i18n', 'en', 'course.yaml')
    probs = []
    if not os.path.exists(cy):
        probs.append('i18n/en/course.yaml yoxdur')
    else:
        az_left(yaml.safe_load(open(cy, encoding='utf-8')), 'course', probs)
    total = done = 0
    for mod in sorted(os.listdir(os.path.join(course, 'modules'))):
        en = load_en(course, mod)
        keys = [k for k, _, _ in steps_of(course, mod)]
        total += len(keys)
        if not en:
            probs.append(f'{mod}: tərcümə yoxdur ({len(keys)} addım)')
            continue
        if not en.get('title'):
            probs.append(f'{mod}: fəslin başlığı tərcümə olunmayıb')
        az_left({k: v for k, v in en.items() if k != 'steps'}, mod, probs)
        steps = en.get('steps') or {}
        for k in keys:
            if k not in steps:
                probs.append(f'{mod}/{k}: addım tərcümə olunmayıb')
            else:
                done += 1
        for k, v in steps.items():
            if k not in keys:
                probs.append(f'{mod}/{k}: mənbədə belə addım yoxdur')
            az_left(v, f'{mod}/{k}', probs)
    for p in probs:
        print('✗', p)
    print(f'{os.path.basename(course.rstrip("/"))}: {done}/{total} addım tərcümə olunub, {len(probs)} problem')
    return not probs


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'extract':
        extract(sys.argv[2], sys.argv[3])
    elif cmd == 'check':
        sys.exit(0 if all([check(c) for c in sys.argv[2:]]) else 1)
