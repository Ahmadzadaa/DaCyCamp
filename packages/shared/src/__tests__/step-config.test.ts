import { describe, expect, it } from 'vitest';
import {
  emptyDefinition,
  mergeStep,
  splitStep,
  toStudentView,
  validateForPublish,
} from '../content/step-config';
import { stepDefinitionStrict, type StepDefinition } from '../content/step-definition';

const defs: StepDefinition[] = [
  { type: 'theory', title: 'T', content: '# salam', video_url: 'https://youtu.be/x' },
  {
    type: 'quiz',
    title: 'Q',
    pass_score: 70,
    shuffle_questions: false,
    questions: [
      { text: 's?', type: 'single', options: ['a', 'b'], correct: [1], explanation: 'çünki' },
    ],
  },
  {
    type: 'sql',
    hint_penalty_xp: 10,
    title: 'S',
    instructions: 'yaz',
    dataset: 'datasets/x.csv',
    starter_code: 'SELECT',
    solution: 'SELECT 1',
    check: 'result_match',
    hints: ['h1'],
    tasks: ['t1'],
  },
  {
    type: 'python',
    hint_penalty_xp: 10,
    title: 'P',
    instructions: 'yaz',
    starter_code: '',
    tests: 'assert True',
    solution: 'x=1',
    hints: [],
    tasks: [],
  },
  {
    type: 'terminal',
    hint_penalty_xp: 0,
    title: 'L',
    instructions: 'yaz',
    docker_image: 'img',
    time_limit_minutes: 30,
    check_script: 'checks/c.sh',
    network: false,
    hints: ['h'],
    tasks: [],
  },
  {
    type: 'ctf',
    title: 'C',
    instructions: 'tap',
    attachments: ['logs/a.log'],
    hint_penalty_xp: 10,
    tasks: [
      {
        key: 't1',
        question: 'neçə?',
        answer: '147',
        hint: 'bax',
        points: 50,
        case_sensitive: false,
      },
    ],
  },
];

describe('splitStep / mergeStep', () => {
  for (const def of defs) {
    it(`${def.type}: gizli sahələr config-ə düşmür və round-trip işləyir`, () => {
      const s = splitStep(def);
      const cfg = JSON.stringify(s.config);
      expect(cfg).not.toContain('"correct"');
      expect(cfg).not.toContain('"solution"');
      expect(cfg).not.toContain('"hints"');
      expect(cfg).not.toContain('"check_script"');
      expect(cfg).not.toContain('"answer"');
      expect(cfg).not.toContain('147');
      const rows = s.ctfTasks.map((t) => ({ ...t, answerHash: 'HASH' }));
      const merged = mergeStep(s.type, s.title, s.xp, s.estimatedMinutes, s.config, s.secret, rows);
      const parsed = stepDefinitionStrict.safeParse(merged);
      expect(parsed.success).toBe(true);
      if (def.type === 'ctf') {
        const m = merged as Extract<typeof merged, { type: 'ctf' }>;
        expect(m.tasks[0]!.answer_hash).toBe('HASH');
        expect(JSON.stringify(m)).not.toContain('147');
      } else {
        const { xp: _x, ...rest } = merged as Record<string, unknown>;
        const { xp: _y, ...orig } = { ...def } as Record<string, unknown>;
        expect(rest).toEqual(orig);
      }
    });
  }
  it('ctf: açıq cavab yalnız ctfTasks.answer-də olur', () => {
    const s = splitStep(defs[5]!);
    expect(s.ctfTasks[0]!.answer).toBe('147');
    expect(s.secret).toBeNull();
  });
});

describe('toStudentView', () => {
  it('quiz: düzgün cavablar görünmür', () => {
    const s = splitStep(defs[1]!);
    const v = toStudentView('QUIZ', s.config);
    expect(JSON.stringify(v)).not.toContain('correct');
  });
  it('sql: hint sayı var, mətn yoxdur', () => {
    const s = splitStep(defs[2]!);
    const v = toStudentView('SQL', s.config);
    expect(v.kind === 'sql' && v.hint_count).toBe(1);
    expect(JSON.stringify(v)).not.toContain('h1');
  });
});

describe('validateForPublish', () => {
  it('boş məzmunu rədd edir', () => {
    expect(
      validateForPublish({ type: 'theory', title: 'x', content: '  ' }).length,
    ).toBeGreaterThan(0);
  });
  it('olmayan dataset faylını göstərir', () => {
    const issues = validateForPublish(defs[2], new Set());
    expect(issues[0]!.message).toContain('datasets/x.csv');
    expect(validateForPublish(defs[2], new Set(['datasets/x.csv']))).toEqual([]);
  });
  it('tək cavablı sualda iki düzgün variant xətadır', () => {
    const q = {
      ...defs[1]!,
      questions: [{ text: 's', type: 'single', options: ['a', 'b'], correct: [0, 1] }],
    };
    expect(validateForPublish(q).length).toBeGreaterThan(0);
  });
  it('emptyDefinition hər tip üçün qaralama kimi keçərlidir', () => {
    for (const t of ['THEORY', 'QUIZ', 'SQL', 'PYTHON', 'TERMINAL', 'CTF'] as const) {
      expect(splitStep(emptyDefinition(t, 'x')).type).toBe(t);
    }
  });
});
