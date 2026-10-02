import { describe, expect, it } from 'vitest';
import {
  courseYamlSchema,
  definitionToYamlStep,
  splitFrontMatter,
  stepYamlSchema,
  yamlStepToDefinition,
} from '../content/package';
import { stepDefinitionStrict } from '../content/step-definition';

describe('kurs paketi sxemləri', () => {
  it('course.yaml defoltları', () => {
    const c = courseYamlSchema.parse({
      track: 'data-analytics',
      title: 'SQL',
      slug: 'sql-ile-analiz',
    });
    expect(c.level).toBe('beginner');
    expect(c.published).toBe(false);
  });
  it('quiz correct 1-dən sayılır və daxildə 0-dan olur', () => {
    const y = stepYamlSchema.parse({
      type: 'quiz',
      title: 'T',
      questions: [{ text: 's', options: ['A', 'B', 'C'], correct: [1] }],
    });
    const def = yamlStepToDefinition(y as never);
    expect(def.type === 'quiz' && def.questions[0]!.correct).toEqual([0]);
    expect(stepDefinitionStrict.safeParse(def).success).toBe(true);
    const back = definitionToYamlStep(def, true) as { questions: Array<{ correct: number[] }> };
    expect(back.questions[0]!.correct).toEqual([1]);
  });
  it('correct: [0] rədd edilir', () => {
    expect(
      stepYamlSchema.safeParse({
        type: 'quiz',
        title: 'T',
        questions: [{ text: 's', options: ['A', 'B'], correct: [0] }],
      }).success,
    ).toBe(false);
  });
  it('theory content_file qəbul olunur', () => {
    const r = stepYamlSchema.safeParse({
      type: 'theory',
      title: 'N',
      content_file: '01-nezeri.md',
    });
    expect(r.success).toBe(true);
  });
  it('ctf ixracda açıq cavab yoxdur', () => {
    const y = definitionToYamlStep(
      {
        type: 'ctf',
        title: 'C',
        instructions: 'x',
        attachments: [],
        hint_penalty_xp: 10,
        tasks: [
          {
            key: 't1',
            question: 'q',
            answer: 'secret',
            answer_hash: 'abc',
            points: 1,
            case_sensitive: false,
          },
        ],
      },
      false,
    ) as { tasks: Array<Record<string, unknown>>; published?: boolean };
    expect(y.tasks[0]!.answer).toBeUndefined();
    expect(y.tasks[0]!.answer_hash).toBe('abc');
    expect(y.published).toBe(false);
  });
  it('front-matter ayrılır', () => {
    const { front, body } = splitFrontMatter('---\ntitle: Salam\nxp: 10\n---\n# Başlıq\nmətn');
    expect(front).toBe('title: Salam\nxp: 10');
    expect(body).toBe('# Başlıq\nmətn');
    expect(splitFrontMatter('# yox').front).toBeNull();
  });
});
