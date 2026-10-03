import { describe, expect, it } from 'vitest';
import { definitionToYamlStep, stepYamlSchema, yamlStepToDefinition } from '../content/package';
import { assessmentStrictSchema } from '../content/path';
import { splitStep, toStudentView } from '../content/step-config';
import { isQuizAnswerCorrect, stepDefinitionStrict } from '../content/step-definition';

const yaml = {
  type: 'quiz',
  title: 'Kimin işidir?',
  questions: [
    {
      type: 'classify',
      text: 'Elementləri qruplara ayırın',
      buckets: [
        { name: 'Data engineering', items: ['Pipeline qurmaq', 'Bazanı optimallaşdırmaq'] },
        { name: 'Aid deyil', items: ['Biznes qərarı vermək'] },
      ],
      explanation: 'İzah',
    },
    { text: 'Tək seçim', options: ['A', 'B'], correct: [2] },
  ],
};

describe('classify sualı', () => {
  it('YAML qrupları → options/buckets/correct (növbə ilə), geri YAML-a', () => {
    const def = yamlStepToDefinition(stepYamlSchema.parse(yaml) as never);
    if (def.type !== 'quiz') throw new Error('quiz gözlənilirdi');
    const q = def.questions[0]!;
    expect(q.type).toBe('classify');
    expect(q.buckets).toEqual(['Data engineering', 'Aid deyil']);
    expect(q.options).toEqual([
      'Pipeline qurmaq',
      'Biznes qərarı vermək',
      'Bazanı optimallaşdırmaq',
    ]);
    expect(q.correct).toEqual([0, 1, 0]);
    expect(def.questions[1]!.correct).toEqual([1]);
    expect(stepDefinitionStrict.safeParse(def).success).toBe(true);

    const back = definitionToYamlStep(def, true) as { questions: Array<Record<string, unknown>> };
    expect(back.questions[0]).toEqual(yaml.questions[0]);
    expect(back.questions[1]!.correct).toEqual([2]);
  });

  it('tələbə görünüşündə qruplar var, düzgün cavab yoxdur', () => {
    const def = yamlStepToDefinition(stepYamlSchema.parse(yaml) as never);
    const split = splitStep(def);
    const view = toStudentView('QUIZ', split.config);
    expect(JSON.stringify(view)).not.toContain('correct');
    expect(view).toMatchObject({
      kind: 'quiz',
      questions: [
        { type: 'classify', buckets: ['Data engineering', 'Aid deyil'] },
        { type: 'single' },
      ],
    });
    expect(
      (view as { questions: Array<{ buckets?: unknown }> }).questions[1]!.buckets,
    ).toBeUndefined();
  });

  it('dərc yoxlaması: qrupsuz, boş qrup, uyğunsuz say rədd edilir', () => {
    const base = { type: 'quiz' as const, title: 'T' };
    const bad = (q: Record<string, unknown>) =>
      stepDefinitionStrict.safeParse({
        ...base,
        questions: [{ text: 's', type: 'classify', ...q }],
      }).success;
    expect(bad({ options: ['a', 'b'], buckets: ['X'], correct: [0, 0] })).toBe(false);
    expect(bad({ options: ['a', 'b'], buckets: ['X', 'Y'], correct: [0, 0] })).toBe(false);
    expect(bad({ options: ['a', 'b'], buckets: ['X', 'Y'], correct: [0] })).toBe(false);
    expect(bad({ options: ['a', 'b'], buckets: ['X', 'Y'], correct: [0, 2] })).toBe(false);
    expect(bad({ options: ['a', 'b'], buckets: ['X', 'Y'], correct: [1, 0] })).toBe(true);
  });

  it('qiymətləndirmə: classify sıraya həssasdır, variant sualları dəst kimi', () => {
    expect(isQuizAnswerCorrect('classify', [0, 1, 0], [0, 1, 0])).toBe(true);
    expect(isQuizAnswerCorrect('classify', [0, 1, 0], [0, 0, 1])).toBe(false);
    expect(isQuizAnswerCorrect('classify', [0, 1, 0], [0, 1])).toBe(false);
    expect(isQuizAnswerCorrect('multiple', [0, 2], [2, 0])).toBe(true);
    expect(isQuizAnswerCorrect('single', [1], [0])).toBe(false);
    expect(isQuizAnswerCorrect('single', [1], undefined)).toBe(false);
  });

  it('path imtahanında classify qəbul edilmir', () => {
    const r = assessmentStrictSchema.safeParse({
      questions: [
        { text: 's', type: 'classify', options: ['a', 'b'], buckets: ['X', 'Y'], correct: [0, 1] },
      ],
    });
    expect(r.success).toBe(false);
  });
});
