"""Kurs paketi generatoru: dərslər (Markdown + front matter) və testlər (YAML)."""
import os
import shutil
import textwrap

import yaml

REPO = '/home/user/DaCyCamp/content/courses'


class Str(str):
    pass


def _str_presenter(dumper, data):
    style = '|' if '\n' in data else None
    return dumper.represent_scalar('tag:yaml.org,2002:str', data, style=style)


yaml.add_representer(str, _str_presenter)
yaml.add_representer(Str, _str_presenter)


def dump(obj):
    return yaml.dump(obj, allow_unicode=True, sort_keys=False, width=100, default_flow_style=False)


def _t(text):
    return textwrap.dedent(text).strip()


def single(text, options, correct, explanation):
    """correct — 1-dən sayılır"""
    return {'text': _t(text), 'options': options, 'correct': [correct], 'explanation': _t(explanation)}


def multiple(text, options, correct, explanation):
    return {
        'text': _t(text),
        'type': 'multiple',
        'options': options,
        'correct': list(correct),
        'explanation': _t(explanation),
    }


def classify(text, buckets, explanation):
    """buckets: [(ad, [elementlər]), ...]"""
    return {
        'text': _t(text),
        'type': 'classify',
        'buckets': [{'name': n, 'items': items} for n, items in buckets],
        'explanation': _t(explanation),
    }


def pass_score_for(n):
    if n <= 2:
        return 100
    return min(80, (100 * (n - 1)) // n)


class Course:
    def __init__(self, slug, meta):
        self.root = os.path.join(REPO, slug)
        if os.path.isdir(self.root):
            shutil.rmtree(self.root)
        os.makedirs(os.path.join(self.root, 'modules'))
        header = meta.pop('_comment', None)
        with open(os.path.join(self.root, 'course.yaml'), 'w') as f:
            if header:
                f.write(''.join(f'# {l}\n' for l in header.strip().splitlines()))
            f.write(dump({'slug': slug, **meta}))
        self.modules = 0
        self.steps = 0

    def module(self, key, title, description):
        self.modules += 1
        return Module(self, f'{self.modules:02d}-{key}', title, description)


class Module:
    def __init__(self, course, dirname, title, description):
        self.course = course
        self.dir = os.path.join(course.root, 'modules', dirname)
        os.makedirs(self.dir)
        with open(os.path.join(self.dir, 'module.yaml'), 'w') as f:
            f.write(dump({'title': title, 'description': description}))
        self.n = 0

    def _name(self, key, ext):
        self.n += 1
        self.course.steps += 1
        return os.path.join(self.dir, f'{self.n:02d}-{key}.{ext}')

    def lesson(self, key, title, minutes, body, xp=10):
        body = textwrap.dedent(body).strip() + '\n'
        fm = dump({'title': title, 'xp': xp, 'estimated_minutes': minutes})
        with open(self._name(key, 'md'), 'w') as f:
            f.write(f'---\n{fm}---\n\n{body}')

    def quiz(self, key, title, questions, xp=None, pass_score=None, minutes=None):
        n = len(questions)
        data = {
            'type': 'quiz',
            'title': title,
            'xp': xp if xp is not None else 10 + 5 * n,
            'estimated_minutes': minutes if minutes is not None else 2 + n,
            'pass_score': pass_score if pass_score is not None else pass_score_for(n),
            'questions': questions,
        }
        with open(self._name(key, 'yaml'), 'w') as f:
            f.write(dump(data))


def _code(s):
    return textwrap.dedent(s).strip('\n') + '\n'


def _python(self, key, title, minutes, instructions, tasks, starter, solution, tests, hints, dataset=None, xp=40):
    data = {
        'type': 'python',
        'title': title,
        'xp': xp,
        'estimated_minutes': minutes,
        'instructions': textwrap.dedent(instructions).strip() + '\n',
        'tasks': tasks,
    }
    if dataset:
        data['dataset'] = dataset
    data.update({
        'starter_code': _code(starter),
        'solution': _code(solution),
        'tests': _code(tests),
        'hints': hints,
    })
    with open(self._name(key, 'yaml'), 'w') as f:
        f.write(dump(data))


Module.python = _python
