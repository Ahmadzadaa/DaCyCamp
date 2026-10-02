import { describe, expect, it } from 'vitest';
import {
  computePathMap,
  mergeAssessment,
  pathInputToYaml,
  pathYamlSchema,
  scoreAssessment,
  splitAssessment,
  validatePathForPublish,
  yamlToPathInput,
} from '../index';

const YAML = {
  type: 'path',
  track: 'data-analytics',
  title: 'Data Analyst ol',
  slug: 'data-analyst',
  level: 'beginner',
  skills: ['SQL', 'Python'],
  target_audience: 'Təcrübəsizlər',
  sequential: true,
  items: [
    { course: 'sql-ile-analiz' },
    {
      assessment: 'sql-imtahan',
      title: 'SQL yoxlaması',
      pass_score: 60,
      questions: [{ text: 'q', type: 'single', options: ['a', 'b'], correct: [2] }],
    },
    { course: 'python-pandas', optional: true, hours: 4 },
    {
      project: 'layihe',
      title: 'Layihə',
      instructions: 'Edin',
      deliverables: ['CSV'],
      review_mode: 'auto',
    },
    { milestone: 'final', title: 'Final', certificate_title: 'Data Analyst' },
  ],
};

describe('path.yaml', () => {
  it('parse → admin giriş: test cavabları 0-dan, kurs açarı = slug', () => {
    const y = pathYamlSchema.parse(YAML);
    const { path, items } = yamlToPathInput(y);
    expect(path.level).toBe('BEGINNER');
    expect(items[0]).toMatchObject({
      type: 'course',
      course_slug: 'sql-ile-analiz',
      key: 'sql-ile-analiz',
    });
    expect(items[1].type).toBe('assessment');
    if (items[1].type === 'assessment') {
      expect(items[1].config.pass_score).toBe(60);
      expect(items[1].config.questions[0]!.correct).toEqual([1]);
    }
    expect(items[2]).toMatchObject({ optional: true, hours: 4 });
    if (items[3].type === 'project') expect(items[3].config.review_mode).toBe('auto');
  });

  it('path-items/<key>.yaml faylı inline dəyərlərlə birləşir (inline üstündür)', () => {
    const y = pathYamlSchema.parse({ ...YAML, items: [{ assessment: 'x', pass_score: 80 }] });
    const { items } = yamlToPathInput(y, (key) =>
      key === 'x'
        ? {
            title: 'Fayldan',
            pass_score: 50,
            questions: [{ text: 't', type: 'single', options: ['a'], correct: [1] }],
          }
        : null,
    );
    expect(items[0]!.title).toBe('Fayldan');
    if (items[0]!.type === 'assessment') {
      expect(items[0]!.config.pass_score).toBe(80);
      expect(items[0]!.config.questions).toHaveLength(1);
    }
  });

  it('round-trip: giriş → yaml → giriş', () => {
    const y = pathYamlSchema.parse(YAML);
    const a = yamlToPathInput(y);
    const back = pathInputToYaml(
      a.path,
      a.items.map((i) => ({ ...i, key: i.key! })),
    );
    expect(back.level).toBe('beginner');
    const again = yamlToPathInput(pathYamlSchema.parse(back));
    expect(again.items).toEqual(a.items);
  });

  it('boş items rədd edilir', () => {
    expect(pathYamlSchema.safeParse({ ...YAML, items: [] }).success).toBe(false);
  });
});

describe('imtahan', () => {
  it('split/merge və bal', () => {
    const draft = {
      pass_score: 70,
      questions: [
        { text: 'a', type: 'single' as const, options: ['x', 'y'], correct: [0], explanation: 'e' },
        { text: 'b', type: 'multiple' as const, options: ['x', 'y', 'z'], correct: [0, 2] },
      ],
    };
    const { config, secret } = splitAssessment(draft);
    expect(JSON.stringify(config)).not.toContain('correct');
    expect(mergeAssessment(config, secret)).toEqual(draft);
    expect(scoreAssessment(secret, [[0], [2, 0]]).score).toBe(100);
    expect(scoreAssessment(secret, [[1], [0]]).score).toBe(0);
    expect(scoreAssessment(secret, [[0]]).score).toBe(50);
  });
});

describe('computePathMap', () => {
  const items = [
    {
      id: '1',
      key: 'a',
      order: 1,
      type: 'COURSE' as const,
      isOptional: false,
      courseCompleted: true,
    },
    {
      id: '2',
      key: 'b',
      order: 2,
      type: 'ASSESSMENT' as const,
      isOptional: false,
      status: 'PASSED' as const,
    },
    {
      id: '3',
      key: 'c',
      order: 3,
      type: 'COURSE' as const,
      isOptional: false,
      courseCompleted: false,
    },
    {
      id: '4',
      key: 'd',
      order: 4,
      type: 'COURSE' as const,
      isOptional: true,
      courseCompleted: false,
    },
    {
      id: '5',
      key: 'e',
      order: 5,
      type: 'PROJECT' as const,
      isOptional: false,
      status: 'SUBMITTED' as const,
    },
    { id: '6', key: 'f', order: 6, type: 'MILESTONE' as const, isOptional: false, status: null },
  ];
  it('ardıcıl: tamamlanan, cari, kilidli; seçmə heç vaxt kilidlənmir və nömrələnmir', () => {
    const m = computePathMap({ sequential: true, items });
    expect(m.items.map((x) => x.state)).toEqual([
      'completed',
      'completed',
      'current',
      'available',
      'submitted',
      'locked',
    ]);
    expect(m.items.map((x) => x.number)).toEqual([1, 2, 3, null, 4, 5]);
    expect(m).toMatchObject({ done: 2, total: 5, percent: 40, isComplete: false });
    expect(m.continueItem?.key).toBe('c');
  });
  it('sərbəst rejim: kilid yoxdur, cari yenə ilk tamamlanmamış məcburidir', () => {
    const m = computePathMap({ sequential: false, items });
    expect(m.items.map((x) => x.state)).toEqual([
      'completed',
      'completed',
      'current',
      'available',
      'submitted',
      'available',
    ]);
  });
  it('hamısı bitəndə isComplete, seçmə sayılmır', () => {
    const all = items.map((i) => ({
      ...i,
      courseCompleted: i.type === 'COURSE' ? true : undefined,
      status: i.type === 'COURSE' ? undefined : ('PASSED' as const),
    }));
    all[3] = { ...all[3]!, courseCompleted: false };
    const m = computePathMap({ sequential: true, items: all });
    expect(m.isComplete).toBe(true);
    expect(m.percent).toBe(100);
    expect(m.continueItem).toBeNull();
  });
});

describe('validatePathForPublish', () => {
  it('dərc olunmamış kurs, boş imtahan və layihə təlimatı xətadır', () => {
    const issues = validatePathForPublish({
      title: 'Y',
      items: [
        {
          key: 'k',
          type: 'COURSE',
          title: null,
          isOptional: false,
          config: {},
          secret: null,
          course: { slug: 'k', isPublished: false },
        },
        {
          key: 'i',
          type: 'ASSESSMENT',
          title: 'İ',
          isOptional: false,
          config: { pass_score: 70, questions: [] },
          secret: { questions: [] },
          course: null,
        },
        {
          key: 'p',
          type: 'PROJECT',
          title: '',
          isOptional: false,
          config: { instructions: '' },
          secret: null,
          course: null,
        },
      ],
    });
    expect(issues.map((i) => i.path)).toEqual(
      expect.arrayContaining([
        'items.0',
        'items.1.questions',
        'items.2.title',
        'items.2.instructions',
      ]),
    );
  });
});
