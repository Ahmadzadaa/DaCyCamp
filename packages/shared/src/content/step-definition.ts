import { z } from 'zod';
import {
  DEFAULT_HINT_PENALTY_XP,
  DEFAULT_LAB_MINUTES,
  DEFAULT_PASS_SCORE,
  MAX_TITLE,
} from '../constants';
import { SLUG_RE } from '../keys';

/**
 * Step "definition" = müəllimin gördüyü tam forma (spesifikasiya §4 YAML açarları ilə, snake_case).
 * API onu splitStep() ilə Step.config (ictimai) + Step.secret (server) + CtfTask sətirlərinə bölür.
 * Hər tip üçün iki sxem: *Strict (dərc üçün) və *Draft (qaralama kimi yadda saxlamaq üçün).
 */

const title = z.string().trim().min(1, 'Başlıq boş ola bilməz').max(MAX_TITLE);
const xp = z.number().int().min(0).max(10000);
const minutes = z.number().int().min(0).max(100000);
const assetPath = z.string().trim().min(1).max(300);
const md = z.string().max(200_000);
const code = z.string().max(200_000);
const lines = z.array(z.string().max(2000)).max(50);

const base = { title, xp: xp.optional(), estimated_minutes: minutes.optional() };
const baseDraft = { title, xp: xp.optional(), estimated_minutes: minutes.optional() };

// ── theory ──────────────────────────────────────────────────────────────────
export const theoryStrict = z.object({
  type: z.literal('theory'),
  ...base,
  content: md.refine((s) => s.trim().length > 0, 'Məzmun boş ola bilməz'),
  video_url: z.string().trim().max(2000).optional(),
});
export const theoryDraft = z.object({
  type: z.literal('theory'),
  ...baseDraft,
  content: md.optional(),
  video_url: z.string().trim().max(2000).optional(),
});

// ── quiz ────────────────────────────────────────────────────────────────────
export const quizQuestionStrict = z
  .object({
    text: z.string().trim().min(1, 'Sual mətni boş ola bilməz').max(5000),
    type: z.enum(['single', 'multiple']).default('single'),
    options: z
      .array(z.string().trim().min(1, 'Variant boş ola bilməz').max(1000))
      .min(2, 'Ən azı 2 variant')
      .max(12),
    /** 0-dan sayılır (daxili forma). YAML idxalında 1-dən sayılan dəyərlər çevrilir. */
    correct: z.array(z.number().int().min(0)).min(1, 'Düzgün cavab seçilməyib'),
    explanation: z.string().max(5000).optional(),
  })
  .superRefine((q, ctx) => {
    const uniq = new Set(q.correct);
    if (uniq.size !== q.correct.length)
      ctx.addIssue({ code: 'custom', path: ['correct'], message: 'Təkrar indeks' });
    for (const i of q.correct) {
      if (i >= q.options.length)
        ctx.addIssue({
          code: 'custom',
          path: ['correct'],
          message: `Variant indeksi ${i} mövcud deyil`,
        });
    }
    if (q.type === 'single' && q.correct.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'Tək cavablı sualda yalnız bir düzgün variant olmalıdır',
      });
    }
  });
export const quizQuestionDraft = z.object({
  text: z.string().max(5000).default(''),
  type: z.enum(['single', 'multiple']).default('single'),
  options: z.array(z.string().max(1000)).max(12).default([]),
  correct: z.array(z.number().int().min(0)).default([]),
  explanation: z.string().max(5000).optional(),
});
export const quizStrict = z.object({
  type: z.literal('quiz'),
  ...base,
  pass_score: z.number().int().min(0).max(100).default(DEFAULT_PASS_SCORE),
  shuffle_questions: z.boolean().default(false),
  questions: z.array(quizQuestionStrict).min(1, 'Ən azı bir sual lazımdır').max(100),
});
export const quizDraft = z.object({
  type: z.literal('quiz'),
  ...baseDraft,
  pass_score: z.number().int().min(0).max(100).default(DEFAULT_PASS_SCORE),
  shuffle_questions: z.boolean().default(false),
  questions: z.array(quizQuestionDraft).max(100).default([]),
});

// ── sql ─────────────────────────────────────────────────────────────────────
const datasetField = z.union([assetPath, z.array(assetPath).max(10)]).optional();
export const CHECK_MODES = ['result_match', 'result_match_unordered'] as const;
export const sqlStrict = z.object({
  type: z.literal('sql'),
  ...base,
  instructions: md.refine((s) => s.trim().length > 0, 'Təlimat boş ola bilməz'),
  dataset: datasetField,
  starter_code: code.default(''),
  solution: code.refine((s) => s.trim().length > 0, 'Həll boş ola bilməz'),
  check: z.enum(CHECK_MODES).default('result_match'),
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
});
export const sqlDraft = z.object({
  type: z.literal('sql'),
  ...baseDraft,
  instructions: md.optional(),
  dataset: datasetField,
  starter_code: code.optional(),
  solution: code.optional(),
  check: z.enum(CHECK_MODES).default('result_match'),
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
});

// ── python ──────────────────────────────────────────────────────────────────
export const pythonStrict = z.object({
  type: z.literal('python'),
  ...base,
  instructions: md.refine((s) => s.trim().length > 0, 'Təlimat boş ola bilməz'),
  starter_code: code.default(''),
  dataset: datasetField,
  solution: code.optional(),
  tests: code.refine((s) => s.trim().length > 0, 'Testlər boş ola bilməz'),
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
});
export const pythonDraft = z.object({
  type: z.literal('python'),
  ...baseDraft,
  instructions: md.optional(),
  starter_code: code.optional(),
  dataset: datasetField,
  solution: code.optional(),
  tests: code.optional(),
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
});

// ── terminal ────────────────────────────────────────────────────────────────
export const terminalStrict = z.object({
  type: z.literal('terminal'),
  ...base,
  instructions: md.refine((s) => s.trim().length > 0, 'Təlimat boş ola bilməz'),
  docker_image: z.string().trim().min(1, 'Docker imici lazımdır').max(300),
  time_limit_minutes: z.number().int().min(1).max(600).default(DEFAULT_LAB_MINUTES),
  check_script: assetPath,
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(0),
});
export const terminalDraft = z.object({
  type: z.literal('terminal'),
  ...baseDraft,
  instructions: md.optional(),
  docker_image: z.string().trim().max(300).optional(),
  time_limit_minutes: z.number().int().min(1).max(600).default(DEFAULT_LAB_MINUTES),
  check_script: assetPath.optional(),
  hints: lines.default([]),
  tasks: lines.default([]),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(0),
});

// ── ctf ─────────────────────────────────────────────────────────────────────
const ctfTaskBase = {
  key: z.string().regex(SLUG_RE, 'Açar yalnız a-z, 0-9 və tire').max(60).optional(),
  question: z.string().trim().max(5000),
  /** Açıq cavab — yalnız yazarkən; API dərhal hash-ləyir və atır */
  answer: z.string().max(1000).optional(),
  /** İxrac/yenidən idxal üçün; mövcud hash-i saxlayır */
  answer_hash: z.string().max(200).optional(),
  hint: z.string().max(5000).optional(),
  points: z.number().int().min(0).max(10000).optional(),
  case_sensitive: z.boolean().default(false),
};
export const ctfTaskStrict = z
  .object({ ...ctfTaskBase, question: z.string().trim().min(1, 'Sual boş ola bilməz').max(5000) })
  .superRefine((t, ctx) => {
    const hasAnswer = !!t.answer && t.answer.trim().length > 0;
    const hasHash = !!t.answer_hash;
    if (!hasAnswer && !hasHash)
      ctx.addIssue({ code: 'custom', path: ['answer'], message: 'Cavab daxil edilməyib' });
  });
export const ctfTaskDraft = z.object(ctfTaskBase);
export const ctfStrict = z.object({
  type: z.literal('ctf'),
  ...base,
  instructions: md.refine((s) => s.trim().length > 0, 'Təlimat boş ola bilməz'),
  attachments: z.array(assetPath).max(20).default([]),
  docker_image: z.string().trim().max(300).optional(),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
  tasks: z.array(ctfTaskStrict).min(1, 'Ən azı bir sual lazımdır').max(30),
});
export const ctfDraft = z.object({
  type: z.literal('ctf'),
  ...baseDraft,
  instructions: md.optional(),
  attachments: z.array(assetPath).max(20).default([]),
  docker_image: z.string().trim().max(300).optional(),
  hint_penalty_xp: z.number().int().min(0).max(1000).default(DEFAULT_HINT_PENALTY_XP),
  tasks: z.array(ctfTaskDraft).max(30).default([]),
});

// ── unions ──────────────────────────────────────────────────────────────────
export const stepDefinitionStrict = z.discriminatedUnion('type', [
  theoryStrict,
  quizStrict,
  sqlStrict,
  pythonStrict,
  terminalStrict,
  ctfStrict,
]);
export const stepDefinitionDraft = z.discriminatedUnion('type', [
  theoryDraft,
  quizDraft,
  sqlDraft,
  pythonDraft,
  terminalDraft,
  ctfDraft,
]);

export type TheoryDef = z.infer<typeof theoryStrict>;
export type QuizDef = z.infer<typeof quizStrict>;
export type QuizQuestion = z.infer<typeof quizQuestionStrict>;
export type SqlDef = z.infer<typeof sqlStrict>;
export type PythonDef = z.infer<typeof pythonStrict>;
export type TerminalDef = z.infer<typeof terminalStrict>;
export type CtfDef = z.infer<typeof ctfStrict>;
export type CtfTaskDef = z.infer<typeof ctfTaskStrict>;
export type StepDefinition = z.infer<typeof stepDefinitionStrict>;
export type StepDefinitionDraft = z.infer<typeof stepDefinitionDraft>;

export interface Issue {
  path: string;
  message: string;
}
export function zodIssues(err: z.ZodError): Issue[] {
  return err.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
}
