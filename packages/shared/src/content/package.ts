import { z } from 'zod';
import { SLUG_RE } from '../keys';
import { LEVEL_SLUGS, type Level, type StepType } from '../enums';
import {
  ctfStrict,
  MAX_QUIZ_BUCKETS,
  MAX_QUIZ_OPTIONS,
  pythonStrict,
  quizStrict,
  sqlStrict,
  terminalStrict,
  theoryStrict,
  type QuizDef,
  type QuizQuestion,
  type StepDefinition,
} from './step-definition';

/**
 * Kurs paketi (ZIP) formatı — spesifikasiya §3.2. YAML faylları bu sxemlərlə yoxlanılır.
 *   kurs/
 *   ├── course.yaml
 *   ├── datasets/ images/ files/ checks/ videos/   (fayllar, yol olduğu kimi saxlanılır)
 *   └── modules/NN-key/module.yaml + NN-key.yaml | NN-key.md
 * Quiz-də `correct` YAML-da 1-dən sayılır (1 = A); daxildə 0-dan saxlanılır. classify sualları qruplar üzrə yazılır.
 */

const slug = z.string().regex(SLUG_RE, 'slug yalnız a-z, 0-9 və tire');

export const courseYamlSchema = z.object({
  track: slug,
  title: z.string().trim().min(1).max(200),
  slug,
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  description: z.string().default(''),
  cover: z.string().optional(),
  sequential: z.boolean().default(true),
  estimated_hours: z.number().min(0).optional(),
  published: z.boolean().default(false),
  /** mövzuların slug-ları (Qeyd 5) — bazada olmayanlar xəbərdarlıqla ötürülür */
  topics: z.array(slug).max(20).optional(),
});
export type CourseYaml = z.infer<typeof courseYamlSchema>;

export const moduleYamlSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  published: z.boolean().default(true),
});
export type ModuleYaml = z.infer<typeof moduleYamlSchema>;

const published = { published: z.boolean().default(true) };

/** theory: `content` və ya `content_file` (modul qovluğuna nisbi) */
const theoryYaml = theoryStrict
  .omit({ content: true })
  .extend({ content: z.string().optional(), content_file: z.string().optional(), ...published })
  .refine((v) => (v.content && v.content.trim()) || v.content_file || v.video_url, {
    message: 'content, content_file və ya video_url lazımdır',
    path: ['content'],
  });

/** quiz: correct 1-dən sayılır */
const choiceQuestionYaml = z.object({
  text: z.string().trim().min(1),
  type: z.enum(['single', 'multiple']).default('single'),
  options: z.array(z.string().trim().min(1)).min(2).max(MAX_QUIZ_OPTIONS),
  correct: z.array(z.number().int().min(1, 'correct 1-dən sayılır (1 = birinci variant)')).min(1),
  explanation: z.string().optional(),
});
/**
 * classify YAML-da qruplar üzrə yazılır (oxunaqlı):
 *   buckets:
 *     - name: Data engineering tapşırıqları
 *       items: [Pipeline qurmaq, ...]
 *     - name: Data engineering-ə aid deyil
 *       items: [...]
 * Daxildə: options = elementlər (qruplar növbə ilə qarışdırılır), correct[i] = qrup indeksi.
 */
const classifyQuestionYaml = z.object({
  text: z.string().trim().min(1),
  type: z.literal('classify'),
  buckets: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        items: z.array(z.string().trim().min(1).max(1000)).min(1),
      }),
    )
    .min(2)
    .max(MAX_QUIZ_BUCKETS),
  explanation: z.string().optional(),
});
type ClassifyQuestionYaml = z.infer<typeof classifyQuestionYaml>;

const quizYaml = quizStrict.omit({ questions: true }).extend({
  ...published,
  questions: z.array(z.union([classifyQuestionYaml, choiceQuestionYaml])).min(1),
});

/** Qrupları növbə ilə birləşdirir (A1, B1, A2, B2, …) — saxlanılan sıra cavabı göstərməsin */
function classifyFromYaml(q: ClassifyQuestionYaml): QuizQuestion {
  const options: string[] = [];
  const correct: number[] = [];
  const longest = Math.max(...q.buckets.map((b) => b.items.length));
  for (let k = 0; k < longest; k++)
    q.buckets.forEach((b, bi) => {
      const item = b.items[k];
      if (item === undefined) return;
      options.push(item);
      correct.push(bi);
    });
  return {
    text: q.text,
    type: 'classify',
    options,
    buckets: q.buckets.map((b) => b.name),
    correct,
    ...(q.explanation ? { explanation: q.explanation } : {}),
  };
}

export const stepYamlSchema = z.discriminatedUnion('type', [
  theoryYaml as unknown as typeof theoryStrict,
  quizYaml as unknown as typeof quizStrict,
  sqlStrict.extend(published),
  pythonStrict.extend(published),
  terminalStrict.extend(published),
  ctfStrict.extend(published),
]);
export type StepYaml = z.infer<typeof stepYamlSchema> & {
  published?: boolean;
  content_file?: string;
};

export const levelFromYaml = (l: CourseYaml['level']): Level => LEVEL_SLUGS[l];
export const levelToYaml = (l: Level): CourseYaml['level'] =>
  l.toLowerCase() as CourseYaml['level'];

/** YAML addımı → daxili tərif (content_file artıq oxunub `content`-ə yazılmalıdır) */
export function yamlStepToDefinition(y: StepYaml): StepDefinition {
  const { published: _p, ...rest } = y as Record<string, unknown> & { published?: boolean };
  if (y.type === 'quiz') {
    const q = rest as Omit<QuizDef, 'questions'> & {
      questions: Array<ClassifyQuestionYaml | z.infer<typeof choiceQuestionYaml>>;
    };
    return {
      ...q,
      questions: q.questions.map((qq) =>
        qq.type === 'classify'
          ? classifyFromYaml(qq)
          : { ...qq, correct: qq.correct.map((c) => c - 1) },
      ),
    };
  }
  if (y.type === 'theory') {
    const { content_file: _cf, ...t } = rest as Record<string, unknown> & { content_file?: string };
    return t as StepDefinition;
  }
  return rest as StepDefinition;
}

/** Daxili tərif → YAML obyekti (quiz correct +1; ctf cavablar yalnız answer_hash) */
export function definitionToYamlStep(
  def: StepDefinition,
  isPublished: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...def };
  if (def.type === 'quiz')
    base.questions = def.questions.map((q) =>
      q.type === 'classify'
        ? {
            text: q.text,
            type: q.type,
            buckets: (q.buckets ?? []).map((name, b) => ({
              name,
              items: q.options.filter((_, i) => q.correct[i] === b),
            })),
            ...(q.explanation ? { explanation: q.explanation } : {}),
          }
        : (({ buckets: _b, ...rest }) => ({ ...rest, correct: q.correct.map((c) => c + 1) }))(q),
    );
  if (def.type === 'ctf') base.tasks = def.tasks.map(({ answer: _a, ...t }) => t);
  if (!isPublished) base.published = false;
  for (const k of Object.keys(base))
    if (
      base[k] === undefined ||
      base[k] === '' ||
      (Array.isArray(base[k]) && (base[k] as unknown[]).length === 0)
    )
      delete base[k];
  return base;
}

/** Markdown front-matter: `---\\n…\\n---` bloku (YAML mətni ayrıca parse olunur) */
export function splitFrontMatter(md: string): { front: string | null; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  if (!m) return { front: null, body: md };
  return { front: m[1] ?? '', body: md.slice(m[0].length) };
}

export const STEP_FILE_EXTENSIONS = ['yaml', 'yml', 'md'] as const;

export interface ImportIssue {
  file: string;
  message: string;
}
export interface ImportReport {
  ok: boolean;
  course: { slug: string; title: string; track: string; exists: boolean } | null;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  summary: {
    modules: number;
    steps: number;
    assets: number;
    byType: Partial<Record<StepType, number>>;
    willUnpublish: string[];
  };
  /** path.yaml varsa (Mərhələ 4) */
  path?: { slug: string; title: string; track: string; exists: boolean; items: number } | null;
  applied?: {
    courseId: string | null;
    courseSlug: string | null;
    importId: string;
    pathId?: string | null;
    pathSlug?: string | null;
  };
}
