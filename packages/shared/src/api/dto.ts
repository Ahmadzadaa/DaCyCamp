import { z } from 'zod';
import { LEVELS, ROLES, STEP_TYPES } from '../enums';
import { MAX_SLUG, MAX_TITLE } from '../constants';
import { SLUG_RE } from '../keys';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Düzgün e-poçt daxil edin')
  .max(200);
export const passwordSchema = z.string().min(8, 'Şifrə ən azı 8 simvol olmalıdır').max(200);
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_SLUG)
  .regex(SLUG_RE, 'Yalnız a-z, 0-9 və tire');
export const titleSchema = z.string().trim().min(1, 'Başlıq boş ola bilməz').max(MAX_TITLE);
export const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Hex rəng, məs. #6C7CF0');
export const idSchema = z.string().min(1).max(64);

// auth
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ad ən azı 2 simvol').max(120),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  locale: z.enum(['az', 'en']).optional(),
});
export const changePasswordSchema = z.object({
  current: z.string().min(1).max(200),
  next: passwordSchema,
});
export const updateRoleSchema = z.object({ role: z.enum(ROLES) });

// content
export const reorderSchema = z.object({ ids: z.array(idSchema).min(1).max(500) });
export const createTrackSchema = z.object({
  slug: slugSchema,
  title: titleSchema,
  color: colorSchema,
  icon: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
});
export const updateTrackSchema = createTrackSchema
  .partial()
  .extend({ isPublished: z.boolean().optional() });

export const createCourseSchema = z.object({
  trackId: idSchema,
  slug: slugSchema,
  title: titleSchema,
  level: z.enum(LEVELS).default('BEGINNER'),
  description: z.string().trim().max(5000).default(''),
  sequential: z.boolean().default(true),
  estimatedHours: z.number().min(0).max(10000).nullable().optional(),
});
export const updateCourseSchema = createCourseSchema
  .partial()
  .extend({ coverAssetId: idSchema.nullable().optional() });
export const publishSchema = z.object({ isPublished: z.boolean() });

export const createModuleSchema = z.object({
  title: titleSchema,
  key: slugSchema.optional(),
  description: z.string().trim().max(2000).optional(),
});
export const updateModuleSchema = createModuleSchema
  .partial()
  .extend({ isPublished: z.boolean().optional() });

export const createStepSchema = z.object({
  type: z.enum(STEP_TYPES),
  title: titleSchema,
  key: slugSchema.optional(),
});
export const moveStepSchema = z.object({ moduleId: idSchema, index: z.number().int().min(0) });
export const updateStepMetaSchema = z.object({ key: slugSchema.optional() });

// learn
export const quizSubmissionSchema = z.object({
  kind: z.literal('quiz').default('quiz'),
  answers: z.array(z.array(z.number().int().min(0).max(50)).max(12)).max(100),
});
export const sqlSubmissionSchema = z.object({
  kind: z.literal('sql'),
  query: z.string().max(50_000),
  row_hash: z.string().regex(/^[0-9a-f]{64}$/),
  row_count: z.number().int().min(0),
  columns: z.array(z.string().max(200)).max(200),
});
export const pythonSubmissionSchema = z.object({
  kind: z.literal('python'),
  code: z.string().max(100_000),
  passed: z.boolean(),
  stdout: z.string().max(50_000).optional(),
  error: z.string().max(5_000).optional(),
});
export const submissionSchema = z.discriminatedUnion('kind', [
  quizSubmissionSchema.extend({ kind: z.literal('quiz') }),
  sqlSubmissionSchema,
  pythonSubmissionSchema,
]);
export type SubmissionInput = z.infer<typeof submissionSchema>;
export const ctfAnswerSchema = z.object({ answer: z.string().trim().min(1).max(1000) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateStepInput = z.infer<typeof createStepSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;
export type SqlSubmissionInput = z.infer<typeof sqlSubmissionSchema>;
export type PythonSubmissionInput = z.infer<typeof pythonSubmissionSchema>;

// Mərhələ 3
export const labStartSchema = z.object({ reset: z.boolean().optional() });
export type LabStartInput = z.infer<typeof labStartSchema>;
