/**
 * Learning Path (Mərhələ 4): path.yaml sxemi, admin giriş sxemləri, imtahanın public/secret bölünməsi, dərc yoxlaması.
 * Kurs tipli addım yalnız mövcud kursa istinad edir (kursun özündə yol FK-sı yoxdur → bir kurs bir neçə yolda ola bilər).
 */
import { z } from 'zod';
import { LEVELS, LEVEL_SLUGS, type Level, type PathItemType } from '../enums';
import { DEFAULT_PASS_SCORE } from '../constants';
import { quizQuestionDraft, quizQuestionStrict } from './step-definition';
import type { Issue } from './step-definition';

export const PATH_ITEM_TYPE_SLUGS = ['course', 'project', 'assessment', 'milestone'] as const;
export type PathItemTypeSlug = (typeof PATH_ITEM_TYPE_SLUGS)[number];
export const pathItemTypeToSlug = (t: PathItemType): PathItemTypeSlug =>
  t.toLowerCase() as PathItemTypeSlug;
export const pathItemTypeFromSlug = (s: PathItemTypeSlug): PathItemType =>
  s.toUpperCase() as PathItemType;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const md = z.string().max(100_000);
const hours = z.number().min(0).max(10_000).nullable().optional();

// ── addım konfiqurasiyaları ────────────────────────────────────────────────
export const projectConfigSchema = z.object({
  instructions: md.default(''),
  /** təhvil veriləcək maddələr (hər sətir bir maddə) */
  deliverables: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  /** manual — müəllim yoxlayır; auto — təhvil verilən kimi qəbul */
  review_mode: z.enum(['manual', 'auto']).default('manual'),
  allow_link: z.boolean().default(true),
  max_files: z.number().int().min(0).max(10).default(5),
});
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

/** Qaralama: suallar boş ola bilər; dərcdə strict yoxlanır */
export const assessmentDraftSchema = z.object({
  pass_score: z.number().int().min(0).max(100).default(DEFAULT_PASS_SCORE),
  questions: z.array(quizQuestionDraft).max(100).default([]),
});
export const assessmentStrictSchema = z.object({
  pass_score: z.number().int().min(0).max(100).default(DEFAULT_PASS_SCORE),
  questions: z.array(quizQuestionStrict).min(1, 'Ən azı bir sual lazımdır').max(100),
});
export type AssessmentDraft = z.infer<typeof assessmentDraftSchema>;

export const milestoneConfigSchema = z.object({
  certificate_title: z.string().trim().max(200).default(''),
  description: md.default(''),
});
export type MilestoneConfig = z.infer<typeof milestoneConfigSchema>;

// ── admin / API giriş ──────────────────────────────────────────────────────
const itemBase = {
  /** sabit açar (URL və path.yaml üçün); kurs addımında kursun slug-ı */
  key: z.string().regex(SLUG_RE, 'Açar yalnız a-z, 0-9 və tire').max(80).optional(),
  title: z.string().trim().max(200).optional(),
  optional: z.boolean().default(false),
  hours,
  xp: z.number().int().min(0).max(10_000).default(0),
};
export const pathItemInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('course'), course_slug: z.string().regex(SLUG_RE), ...itemBase }),
  z.object({
    type: z.literal('project'),
    ...itemBase,
    config: projectConfigSchema.default(() => projectConfigSchema.parse({})),
  }),
  z.object({
    type: z.literal('assessment'),
    ...itemBase,
    config: assessmentDraftSchema.default(() => assessmentDraftSchema.parse({})),
  }),
  z.object({
    type: z.literal('milestone'),
    ...itemBase,
    config: milestoneConfigSchema.default(() => milestoneConfigSchema.parse({})),
  }),
]);
export type PathItemInput = z.infer<typeof pathItemInputSchema>;

export const pathInputSchema = z.object({
  track: z.string().regex(SLUG_RE),
  title: z.string().trim().min(2, 'Başlıq ən azı 2 simvol').max(200),
  slug: z.string().regex(SLUG_RE, 'Slug yalnız a-z, 0-9 və tire').max(80),
  level: z.enum(LEVELS).default('BEGINNER'),
  description: z.string().max(5000).default(''),
  target_audience: z.string().max(1000).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  estimated_hours: hours,
  sequential: z.boolean().default(true),
});
export type PathInput = z.infer<typeof pathInputSchema>;
export const pathItemsOrderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

// ── path.yaml ──────────────────────────────────────────────────────────────
const yamlItemBase = {
  title: z.string().trim().max(200).optional(),
  optional: z.boolean().default(false),
  hours: z.number().min(0).optional(),
  xp: z.number().int().min(0).optional(),
};
/** YAML-da test `correct` 1-dən sayılır (kurs paketindəki kimi) */
const yamlQuestion = quizQuestionDraft.extend({
  correct: z.array(z.number().int().min(1)).default([]),
});
export const pathYamlItemSchema = z.union([
  z.object({ course: z.string().regex(SLUG_RE), ...yamlItemBase }),
  z.object({
    assessment: z.string().regex(SLUG_RE),
    ...yamlItemBase,
    pass_score: z.number().int().min(0).max(100).optional(),
    questions: z.array(yamlQuestion).optional(),
  }),
  z.object({
    project: z.string().regex(SLUG_RE),
    ...yamlItemBase,
    instructions: md.optional(),
    deliverables: z.array(z.string()).optional(),
    review_mode: z.enum(['manual', 'auto']).optional(),
    allow_link: z.boolean().optional(),
    max_files: z.number().int().min(0).max(10).optional(),
  }),
  z.object({
    milestone: z.string().regex(SLUG_RE),
    ...yamlItemBase,
    certificate_title: z.string().optional(),
    description: md.optional(),
  }),
]);
export type PathYamlItem = z.infer<typeof pathYamlItemSchema>;

export const pathYamlSchema = z.object({
  type: z.literal('path'),
  track: z.string().regex(SLUG_RE),
  title: z.string().trim().min(2).max(200),
  slug: z.string().regex(SLUG_RE).max(80),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  description: z.string().default(''),
  skills: z.array(z.string()).default([]),
  target_audience: z.string().optional(),
  estimated_hours: z.number().min(0).optional(),
  sequential: z.boolean().default(true),
  published: z.boolean().optional(),
  items: z.array(pathYamlItemSchema).min(1, 'Ən azı bir addım lazımdır').max(200),
});
export type PathYaml = z.infer<typeof pathYamlSchema>;

/** path-items/<key>.yaml əlavə faylı (eyni sahələr, inline dəyərlər üstündür) */
export const pathItemFileSchema = z
  .object({
    title: z.string().optional(),
    pass_score: z.number().int().optional(),
    questions: z.array(yamlQuestion).optional(),
    instructions: md.optional(),
    deliverables: z.array(z.string()).optional(),
    review_mode: z.enum(['manual', 'auto']).optional(),
    allow_link: z.boolean().optional(),
    max_files: z.number().int().optional(),
    certificate_title: z.string().optional(),
    description: md.optional(),
  })
  .partial();
export type PathItemFile = z.infer<typeof pathItemFileSchema>;

export function yamlToPathInput(
  y: PathYaml,
  extra: (key: string) => PathItemFile | null = () => null,
): { path: PathInput; items: PathItemInput[] } {
  const path: PathInput = {
    track: y.track,
    title: y.title,
    slug: y.slug,
    level: LEVEL_SLUGS[y.level],
    description: y.description,
    target_audience: y.target_audience ?? null,
    skills: y.skills,
    estimated_hours: y.estimated_hours ?? null,
    sequential: y.sequential,
  };
  const items = y.items.map((it): PathItemInput => {
    const base = { optional: it.optional, hours: it.hours ?? null, xp: it.xp ?? 0 };
    if ('course' in it) return { type: 'course', course_slug: it.course, key: it.course, ...base };
    if ('assessment' in it) {
      const f = extra(it.assessment) ?? {};
      const questions = (it.questions ?? f.questions ?? []).map((q) => ({
        ...q,
        correct: (q.correct ?? []).map((c) => c - 1),
      }));
      return {
        type: 'assessment',
        key: it.assessment,
        title: it.title ?? f.title,
        ...base,
        config: assessmentDraftSchema.parse({
          pass_score: it.pass_score ?? f.pass_score,
          questions,
        }),
      };
    }
    if ('project' in it) {
      const f = extra(it.project) ?? {};
      return {
        type: 'project',
        key: it.project,
        title: it.title ?? f.title,
        ...base,
        config: projectConfigSchema.parse({
          instructions: it.instructions ?? f.instructions,
          deliverables: it.deliverables ?? f.deliverables,
          review_mode: it.review_mode ?? f.review_mode,
          allow_link: it.allow_link ?? f.allow_link,
          max_files: it.max_files ?? f.max_files,
        }),
      };
    }
    const f = extra(it.milestone) ?? {};
    return {
      type: 'milestone',
      key: it.milestone,
      title: it.title ?? f.title,
      ...base,
      config: milestoneConfigSchema.parse({
        certificate_title: it.certificate_title ?? f.certificate_title,
        description: it.description ?? f.description,
      }),
    };
  });
  return { path, items };
}

/** İxrac: admin məlumatı → path.yaml (test cavabları 1-dən) */
export function pathInputToYaml(
  path: PathInput & { published?: boolean },
  items: Array<PathItemInput & { key: string }>,
): PathYaml {
  const levelSlug = (Object.keys(LEVEL_SLUGS) as Array<keyof typeof LEVEL_SLUGS>).find(
    (k) => LEVEL_SLUGS[k] === path.level,
  )!;
  const base = (it: PathItemInput) => ({
    ...(it.title ? { title: it.title } : {}),
    optional: it.optional,
    ...(it.hours != null ? { hours: it.hours } : {}),
    ...(it.xp ? { xp: it.xp } : {}),
  });
  return {
    type: 'path',
    track: path.track,
    title: path.title,
    slug: path.slug,
    level: levelSlug,
    description: path.description,
    skills: path.skills,
    ...(path.target_audience ? { target_audience: path.target_audience } : {}),
    ...(path.estimated_hours != null ? { estimated_hours: path.estimated_hours } : {}),
    sequential: path.sequential,
    ...(path.published != null ? { published: path.published } : {}),
    items: items.map((it): PathYamlItem => {
      switch (it.type) {
        case 'course':
          return { course: it.course_slug, ...base(it) };
        case 'assessment':
          return {
            assessment: it.key,
            ...base(it),
            pass_score: it.config.pass_score,
            questions: it.config.questions.map((q) => ({
              ...q,
              correct: (q.correct ?? []).map((c) => c + 1),
            })),
          };
        case 'project':
          return { project: it.key, ...base(it), ...it.config };
        case 'milestone':
          return { milestone: it.key, ...base(it), ...it.config };
      }
    }),
  };
}

// ── imtahan: public config / gizli cavablar ────────────────────────────────
export interface AssessmentPublic {
  pass_score: number;
  questions: Array<{ text: string; type: 'single' | 'multiple'; options: string[] }>;
}
export interface AssessmentSecret {
  questions: Array<{ correct: number[]; explanation?: string }>;
}
export function splitAssessment(d: AssessmentDraft): {
  config: AssessmentPublic;
  secret: AssessmentSecret;
} {
  return {
    config: {
      pass_score: d.pass_score,
      questions: d.questions.map((q) => ({
        text: q.text ?? '',
        type: q.type ?? 'single',
        options: q.options ?? [],
      })),
    },
    secret: {
      questions: d.questions.map((q) => ({
        correct: q.correct ?? [],
        ...(q.explanation ? { explanation: q.explanation } : {}),
      })),
    },
  };
}
export function mergeAssessment(
  config: Partial<AssessmentPublic> | null | undefined,
  secret: Partial<AssessmentSecret> | null | undefined,
): AssessmentDraft {
  const qs = config?.questions ?? [];
  return {
    pass_score: config?.pass_score ?? DEFAULT_PASS_SCORE,
    questions: qs.map((q, i) => ({
      text: q.text,
      type: q.type,
      options: q.options,
      correct: secret?.questions?.[i]?.correct ?? [],
      explanation: secret?.questions?.[i]?.explanation,
    })),
  };
}

/** İmtahan balı (quiz ilə eyni qayda: hər sualın cavab dəsti tam uyğun olmalıdır) */
export function scoreAssessment(
  secret: AssessmentSecret,
  answers: number[][],
): { score: number; perQuestion: Array<{ correct: boolean; correctIndices: number[] }> } {
  const per = secret.questions.map((q, i) => {
    const given = [...new Set(answers[i] ?? [])].sort((a, b) => a - b);
    const want = [...new Set(q.correct)].sort((a, b) => a - b);
    const ok = given.length === want.length && given.every((v, k) => v === want[k]);
    return { correct: ok, correctIndices: want };
  });
  const n = per.length;
  const score = n ? Math.round((100 * per.filter((p) => p.correct).length) / n) : 0;
  return { score, perQuestion: per };
}

// ── dərc yoxlaması ─────────────────────────────────────────────────────────
export interface PathPublishItem {
  key: string;
  type: PathItemType;
  title: string | null;
  isOptional: boolean;
  config: unknown;
  secret: unknown;
  course: { slug: string; isPublished: boolean } | null;
}
export function validatePathForPublish(path: { title: string; items: PathPublishItem[] }): Issue[] {
  const issues: Issue[] = [];
  if (!path.title.trim()) issues.push({ path: 'title', message: 'Başlıq boş ola bilməz' });
  if (path.items.length === 0) issues.push({ path: 'items', message: 'Ən azı bir addım lazımdır' });
  if (!path.items.some((i) => !i.isOptional))
    issues.push({ path: 'items', message: 'Ən azı bir məcburi addım lazımdır' });
  path.items.forEach((it, idx) => {
    const p = `items.${idx}`;
    switch (it.type) {
      case 'COURSE':
        if (!it.course) issues.push({ path: p, message: 'Kurs tapılmadı' });
        else if (!it.course.isPublished)
          issues.push({ path: p, message: `Kurs dərc olunmayıb: ${it.course.slug}` });
        break;
      case 'ASSESSMENT': {
        if (!it.title?.trim())
          issues.push({ path: `${p}.title`, message: 'İmtahan başlığı lazımdır' });
        const merged = mergeAssessment(
          it.config as Partial<AssessmentPublic>,
          it.secret as Partial<AssessmentSecret>,
        );
        const r = assessmentStrictSchema.safeParse(merged);
        if (!r.success)
          for (const i of r.error.issues)
            issues.push({ path: `${p}.${i.path.join('.')}`, message: i.message });
        break;
      }
      case 'PROJECT': {
        if (!it.title?.trim())
          issues.push({ path: `${p}.title`, message: 'Layihə başlığı lazımdır' });
        const c = it.config as Partial<ProjectConfig> | null;
        if (!c?.instructions?.trim())
          issues.push({ path: `${p}.instructions`, message: 'Layihə təlimatı boş ola bilməz' });
        break;
      }
      case 'MILESTONE':
        if (!it.title?.trim())
          issues.push({ path: `${p}.title`, message: 'Final başlığı lazımdır' });
        break;
    }
  });
  return issues;
}

export const levelLabelKey = (l: Level) => `level.${l}` as const;
