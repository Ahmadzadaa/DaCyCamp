// Akademiya API girişləri (zod) — server ZodPipe ilə yoxlayır, web formalar eyni şəmaları istifadə edir.
import { z } from 'zod';
import { idSchema, registerSchema, slugSchema, titleSchema } from '../api/dto';
import {
  ACADEMY_ASSIGNMENT_TYPES,
  ACADEMY_ATTEMPT_SELECTIONS,
  ACADEMY_ATTENDANCE_STATUSES,
  ACADEMY_CLASS_STATUSES,
  ACADEMY_ENROLLMENT_STATUSES,
  ACADEMY_GRADING_TYPES,
  ACADEMY_GROUP_STATUSES,
  ACADEMY_INSTRUCTOR_ROLES,
  ACADEMY_ITEM_KINDS,
  ACADEMY_LATE_POLICIES,
  ACADEMY_LEARNING_FORMATS,
  ACADEMY_PROGRAM_STATUSES,
  ACADEMY_DEFAULTS,
} from './enums';
import { isJoinCodeShape, isValidTimeZone, normalizeJoinCode } from './rules';

const isoDate = z
  .string()
  .datetime({ offset: true, message: 'Tarix ISO formatında olmalıdır' })
  .transform((v) => new Date(v));
const longText = (max: number) => z.string().trim().max(max);
/** Yalnız https:// (və test üçün http://localhost) — javascript: və s. sxemlər qəbul olunmur */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(500)
  .url('Düzgün link daxil edin')
  .refine((v) => /^https:\/\//i.test(v) || /^http:\/\/localhost(:\d+)?\//i.test(v), {
    message: 'Link https:// ilə başlamalıdır',
  });
/** Bal (0–10 000), 2 onluğa qədər */
export const pointsSchema = z.number().min(0).max(10_000);
export const groupCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,23}$/, 'Kod: böyük hərf, rəqəm və tire (məs. DE-001)');
export const timezoneSchema = z
  .string()
  .trim()
  .max(64)
  .refine(isValidTimeZone, { message: 'Vaxt zonası tanınmadı' });

// ───────────────────────── proqramlar və qruplar

// Diqqət: zod 4-də `.partial()` sahələrin defoltlarını saxlayır — yeniləmə şəmaları defoltsuz bazadan qurulur,
// əks halda qismən yeniləmə ötürülməyən sahəni defolta qaytarardı.
const programFields = {
  title: titleSchema,
  slug: slugSchema,
  description: longText(4000),
  status: z.enum(ACADEMY_PROGRAM_STATUSES),
};
export const academyProgramCreateSchema = z.object({
  ...programFields,
  description: programFields.description.optional().default(''),
  status: programFields.status.default('DRAFT'),
});
export const academyProgramUpdateSchema = z
  .object(programFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Heç bir sahə verilməyib');

const groupFields = {
  programId: idSchema,
  code: groupCodeSchema,
  name: titleSchema,
  description: longText(4000),
  status: z.enum(ACADEMY_GROUP_STATUSES),
  format: z.enum(ACADEMY_LEARNING_FORMATS),
  timezone: timezoneSchema,
  capacity: z.number().int().min(1).max(10_000).nullable(),
  startAt: isoDate.nullable(),
  endAt: isoDate.nullable(),
  /** qoşulma kodu ilə özü yazılmaq açıqdır */
  joinEnabled: z.boolean(),
};
const groupBase = z.object({
  ...groupFields,
  description: groupFields.description.optional().default(''),
  status: groupFields.status.default('PLANNED'),
  format: groupFields.format.default('ONLINE'),
  timezone: groupFields.timezone.default(ACADEMY_DEFAULTS.timezone),
  capacity: groupFields.capacity.optional(),
  startAt: groupFields.startAt.optional(),
  endAt: groupFields.endAt.optional(),
  joinEnabled: groupFields.joinEnabled.default(true),
});
export const academyGroupCreateSchema = groupBase
  .extend({
    leadInstructorId: idSchema.nullable().optional(),
    assistantInstructorIds: z.array(idSchema).max(20).optional().default([]),
  })
  .refine((v) => !v.startAt || !v.endAt || v.endAt >= v.startAt, {
    message: 'Bitmə tarixi başlanğıcdan əvvəl ola bilməz',
    path: ['endAt'],
  });
export const academyGroupUpdateSchema = z
  .object(groupFields)
  .omit({ programId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Heç bir sahə verilməyib')
  .refine((v) => !v.startAt || !v.endAt || v.endAt >= v.startAt, {
    message: 'Bitmə tarixi başlanğıcdan əvvəl ola bilməz',
    path: ['endAt'],
  });

export const academyInstructorAssignSchema = z.object({
  userId: idSchema,
  role: z.enum(ACADEMY_INSTRUCTOR_ROLES),
});

export const academyEnrollmentCreateSchema = z
  .object({
    userId: idSchema.optional(),
    email: z.string().trim().toLowerCase().email().max(200).optional(),
    status: z.enum(['PENDING', 'ACTIVE']).default('ACTIVE'),
    /** tutum dolu olsa da yaz (yalnız admin, auditdə qeyd olunur) */
    overrideCapacity: z.boolean().default(false),
  })
  .refine((v) => !!v.userId !== !!v.email, 'İstifadəçi ID-si və ya e-poçt (yalnız biri)');
/** Qoşulma kodu: «k7q4-xp9m», «K7Q4 XP9M» də qəbul olunur */
export const academyJoinCodeSchema = z
  .string()
  .max(40)
  .transform(normalizeJoinCode)
  .refine(isJoinCodeShape, { message: 'Kod 8 simvoldan ibarətdir (məs. K7Q4-XP9M)' });
export const academyJoinSchema = z.object({ code: academyJoinCodeSchema });
/** Akademiyaya qeydiyyat: adi qeydiyyat sahələri + qrupun qoşulma kodu */
export const academyJoinRegisterSchema = registerSchema.extend({ code: academyJoinCodeSchema });

export const academyEnrollmentUpdateSchema = z.object({
  status: z.enum(ACADEMY_ENROLLMENT_STATUSES),
  reason: longText(500).optional(),
});

// ───────────────────────── tapşırıqlar

export const academyItemInputSchema = z
  .object({
    /** mövcud element (redaktə) */
    id: idSchema.optional(),
    kind: z.enum(ACADEMY_ITEM_KINDS),
    /** LEARNING_STEP üçün mövcud platforma addımı */
    stepId: idSchema.optional(),
    title: titleSchema.optional(),
    description: longText(20_000).optional().default(''),
    maxScore: pointsSchema,
  })
  .refine((v) => (v.kind === 'LEARNING_STEP' ? !!v.stepId : !!v.title), {
    message: 'Platforma tapşırığı üçün addım, digərləri üçün başlıq lazımdır',
  });

const assignmentFields = {
  title: titleSchema,
  description: longText(20_000),
  type: z.enum(ACADEMY_ASSIGNMENT_TYPES),
  availableAt: isoDate,
  dueAt: isoDate,
  lateCutoffAt: isoDate.nullable(),
  latePolicy: z.enum(ACADEMY_LATE_POLICIES),
  latePenaltyPercent: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(20),
  gradingType: z.enum(ACADEMY_GRADING_TYPES),
  attemptSelection: z.enum(ACADEMY_ATTEMPT_SELECTIONS),
  /** laboratoriya üçün gözlənilən nəticələr (siyahı) */
  deliverables: z.array(z.string().trim().min(1).max(300)).max(30),
  items: z.array(academyItemInputSchema).min(1, 'Ən azı bir element lazımdır').max(50),
};
const assignmentBase = z.object({
  ...assignmentFields,
  description: assignmentFields.description.optional().default(''),
  lateCutoffAt: assignmentFields.lateCutoffAt.optional(),
  latePolicy: assignmentFields.latePolicy.default(ACADEMY_DEFAULTS.latePolicy),
  latePenaltyPercent: assignmentFields.latePenaltyPercent.default(0),
  maxAttempts: assignmentFields.maxAttempts.default(ACADEMY_DEFAULTS.maxAttempts),
  gradingType: assignmentFields.gradingType.default('MANUAL'),
  attemptSelection: assignmentFields.attemptSelection.default(ACADEMY_DEFAULTS.attemptSelection),
  deliverables: assignmentFields.deliverables.optional().default([]),
});
const datesOk = (v: { availableAt?: Date; dueAt?: Date; lateCutoffAt?: Date | null }) =>
  !v.availableAt || !v.dueAt || v.dueAt > v.availableAt;
export const academyAssignmentCreateSchema = assignmentBase
  .refine(datesOk, { message: 'Son tarix açılış tarixindən sonra olmalıdır', path: ['dueAt'] })
  .refine((v) => !v.lateCutoffAt || v.lateCutoffAt >= v.dueAt, {
    message: 'Gecikmə həddi son tarixdən əvvəl ola bilməz',
    path: ['lateCutoffAt'],
  });
export const academyAssignmentUpdateSchema = z
  .object(assignmentFields)
  .partial()
  .extend({
    /** dərc olunmuş tapşırıqda dəyişikliyin səbəbi (tarixçədə saxlanılır) */
    reason: longText(500).optional(),
    /** optimistik bloklama: redaktə edilən versiya */
    expectedVersion: z.number().int().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Heç bir sahə verilməyib')
  .refine(datesOk, { message: 'Son tarix açılış tarixindən sonra olmalıdır', path: ['dueAt'] });

export const academyExtensionSchema = z.object({
  studentId: idSchema,
  extendedDueAt: isoDate,
  reason: z.string().trim().min(1, 'Səbəb yazın').max(500),
});

export const academyRubricSchema = z.object({
  title: titleSchema,
  criteria: z
    .array(
      z.object({
        title: titleSchema,
        description: longText(2000).optional().default(''),
        maxScore: pointsSchema.positive(),
      }),
    )
    .min(1)
    .max(30),
});

// ───────────────────────── göndərişlər

export const academyAnswerSchema = z.object({
  itemId: idSchema,
  text: longText(50_000).optional(),
  code: longText(100_000).optional(),
  link: safeUrlSchema.optional(),
  fileIds: z.array(idSchema).max(10).optional(),
});
export const academySubmitSchema = z.object({
  /** təkrar sorğu (iki klik, şəbəkə xətası) yeni cəhd yaratmır */
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/),
  answers: z.array(academyAnswerSchema).max(50).default([]),
});
/** Qaralama: cavablar və yüklənmiş (hələ bağlanmamış) faylların elementlərə bölgüsü — cəhd sayılmır */
export const academyDraftSchema = z.object({
  answers: z.array(academyAnswerSchema).max(50),
});

// ───────────────────────── qiymətləndirmə

export const academyGradeSchema = z.object({
  itemScores: z
    .array(z.object({ itemId: idSchema, score: pointsSchema, comment: longText(2000).optional() }))
    .max(50)
    .default([]),
  rubricScores: z
    .array(
      z.object({
        criterionId: idSchema,
        score: pointsSchema,
        comment: longText(2000).optional(),
      }),
    )
    .max(30)
    .optional(),
  feedback: longText(20_000).optional(),
  selectedAttemptId: idSchema.nullable().optional(),
  /** qiymət dəyişirsə səbəb (tarixçə) */
  reason: longText(500).optional(),
  /** optimistik bloklama — eyni anda iki müəllim */
  expectedVersion: z.number().int().min(0).optional(),
});
export const academyReturnSchema = z.object({
  feedback: z.string().trim().min(1, 'Rəy yazın').max(20_000),
  expectedVersion: z.number().int().min(0).optional(),
});

// ───────────────────────── dərslər və davamiyyət

export const academySessionCreateSchema = z
  .object({
    title: titleSchema,
    description: longText(4000).optional().default(''),
    startsAt: isoDate,
    endsAt: isoDate,
    meetingUrl: safeUrlSchema.nullable().optional(),
    instructorId: idSchema.nullable().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'Bitmə vaxtı başlanğıcdan sonra olmalıdır',
    path: ['endsAt'],
  });
export const academySessionUpdateSchema = z
  .object({
    title: titleSchema.optional(),
    description: longText(4000).optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    meetingUrl: safeUrlSchema.nullable().optional(),
    instructorId: idSchema.nullable().optional(),
    status: z.enum(ACADEMY_CLASS_STATUSES).optional(),
    reason: longText(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Heç bir sahə verilməyib');
export const academyScheduleSchema = z
  .object({
    title: titleSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().min(15).max(600),
    meetingUrl: safeUrlSchema.nullable().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'Bitmə tarixi başlanğıcdan əvvəl ola bilməz',
    path: ['endDate'],
  });
export const academyAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: idSchema,
        status: z.enum(ACADEMY_ATTENDANCE_STATUSES),
        note: longText(500).optional(),
      }),
    )
    .min(1)
    .max(500),
});

// ───────────────────────── siyahılar

export const academyPageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
});
export type AcademyPageQuery = z.infer<typeof academyPageQuery>;

export const academyStepSearchQuery = z.object({
  q: z.string().trim().max(100).optional(),
  courseId: idSchema.optional(),
  topicId: idSchema.optional(),
  type: z.enum(['THEORY', 'QUIZ', 'SQL', 'PYTHON', 'TERMINAL', 'CTF']).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type AcademyProgramCreateInput = z.infer<typeof academyProgramCreateSchema>;
export type AcademyProgramUpdateInput = z.infer<typeof academyProgramUpdateSchema>;
export type AcademyGroupCreateInput = z.infer<typeof academyGroupCreateSchema>;
export type AcademyGroupUpdateInput = z.infer<typeof academyGroupUpdateSchema>;
export type AcademyInstructorAssignInput = z.infer<typeof academyInstructorAssignSchema>;
export type AcademyEnrollmentCreateInput = z.infer<typeof academyEnrollmentCreateSchema>;
export type AcademyEnrollmentUpdateInput = z.infer<typeof academyEnrollmentUpdateSchema>;
export type AcademyJoinInput = z.infer<typeof academyJoinSchema>;
export type AcademyJoinRegisterInput = z.infer<typeof academyJoinRegisterSchema>;
export type AcademyItemInput = z.infer<typeof academyItemInputSchema>;
export type AcademyAssignmentCreateInput = z.infer<typeof academyAssignmentCreateSchema>;
export type AcademyAssignmentUpdateInput = z.infer<typeof academyAssignmentUpdateSchema>;
export type AcademyExtensionInput = z.infer<typeof academyExtensionSchema>;
export type AcademyRubricInput = z.infer<typeof academyRubricSchema>;
export type AcademyAnswerInput = z.infer<typeof academyAnswerSchema>;
export type AcademySubmitInput = z.infer<typeof academySubmitSchema>;
export type AcademyDraftInput = z.infer<typeof academyDraftSchema>;
export type AcademyGradeInput = z.infer<typeof academyGradeSchema>;
export type AcademyReturnInput = z.infer<typeof academyReturnSchema>;
export type AcademySessionCreateInput = z.infer<typeof academySessionCreateSchema>;
export type AcademySessionUpdateInput = z.infer<typeof academySessionUpdateSchema>;
export type AcademyScheduleInput = z.infer<typeof academyScheduleSchema>;
export type AcademyAttendanceInput = z.infer<typeof academyAttendanceSchema>;
export type AcademyStepSearchQuery = z.infer<typeof academyStepSearchQuery>;
