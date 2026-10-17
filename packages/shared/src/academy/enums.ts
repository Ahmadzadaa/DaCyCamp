// Akademiya (müəllim rəhbərliyi ilə təhsil) — enum-lar. Prisma enum-ları ilə eyni dəyərlər.

export const ACADEMY_PROGRAM_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type AcademyProgramStatus = (typeof ACADEMY_PROGRAM_STATUSES)[number];

export const ACADEMY_GROUP_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
] as const;
export type AcademyGroupStatus = (typeof ACADEMY_GROUP_STATUSES)[number];

export const ACADEMY_LEARNING_FORMATS = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
export type AcademyLearningFormat = (typeof ACADEMY_LEARNING_FORMATS)[number];

export const ACADEMY_INSTRUCTOR_ROLES = ['LEAD', 'ASSISTANT'] as const;
export type AcademyInstructorRole = (typeof ACADEMY_INSTRUCTOR_ROLES)[number];

export const ACADEMY_ENROLLMENT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'WITHDRAWN',
] as const;
export type AcademyEnrollmentStatus = (typeof ACADEMY_ENROLLMENT_STATUSES)[number];

export const ACADEMY_ASSIGNMENT_TYPES = [
  'EXISTING_CHALLENGE',
  'CUSTOM_TASK',
  'CODING_TASK',
  'FILE_BASED',
  'LAB',
  'PROJECT',
] as const;
export type AcademyAssignmentType = (typeof ACADEMY_ASSIGNMENT_TYPES)[number];

export const ACADEMY_ASSIGNMENT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
  'CANCELLED',
] as const;
export type AcademyAssignmentStatus = (typeof ACADEMY_ASSIGNMENT_STATUSES)[number];

export const ACADEMY_GRADING_TYPES = ['AUTOMATIC', 'MANUAL', 'HYBRID'] as const;
export type AcademyGradingType = (typeof ACADEMY_GRADING_TYPES)[number];

/** REJECT — gecikmiş göndəriş qəbul olunmur; ACCEPT — qəbul olunur, «gecikmiş» işarələnir; ACCEPT_WITH_PENALTY — üstəlik bal cəriməsi */
export const ACADEMY_LATE_POLICIES = ['REJECT', 'ACCEPT', 'ACCEPT_WITH_PENALTY'] as const;
export type AcademyLatePolicy = (typeof ACADEMY_LATE_POLICIES)[number];

export const ACADEMY_ATTEMPT_SELECTIONS = [
  'LATEST_ATTEMPT',
  'HIGHEST_SCORE',
  'INSTRUCTOR_SELECTED',
] as const;
export type AcademyAttemptSelection = (typeof ACADEMY_ATTEMPT_SELECTIONS)[number];

/** Tapşırıq elementinin cavab növü: mövcud platforma tapşırığı və ya akademiyaya xas cavab */
export const ACADEMY_ITEM_KINDS = ['LEARNING_STEP', 'TEXT', 'CODE', 'FILE', 'LINK'] as const;
export type AcademyItemKind = (typeof ACADEMY_ITEM_KINDS)[number];

/**
 * Mövcud qiymətləndirmə nəticəsinə nə qədər etibar olunur:
 * SERVER_VERIFIED — serverdə yoxlanılıb (test, CTF, terminal); SERVER_CHECKED — sorğu brauzerdə,
 * nəticənin heşi serverdə müqayisə olunub (SQL); CLIENT_ATTESTED — nəticəni brauzer bildirib (Python);
 * COMPLETION — yalnız tamamlanma (nəzəri dərs).
 */
export const ACADEMY_EVALUATION_TRUST = [
  'SERVER_VERIFIED',
  'SERVER_CHECKED',
  'CLIENT_ATTESTED',
  'COMPLETION',
] as const;
export type AcademyEvaluationTrust = (typeof ACADEMY_EVALUATION_TRUST)[number];

export const ACADEMY_EVALUATION_STATUSES = [
  'NOT_APPLICABLE',
  'PENDING',
  'COMPLETED',
  'FAILED',
] as const;
export type AcademyEvaluationStatus = (typeof ACADEMY_EVALUATION_STATUSES)[number];

/** Qiymət yoxdursa — NOT_GRADED (sətir yaradılmır). RETURNED — rəy göndərilib, yenidən göndəriş gözlənilir */
export const ACADEMY_GRADE_STATUSES = ['DRAFT', 'RELEASED', 'RETURNED'] as const;
export type AcademyGradeStatus = (typeof ACADEMY_GRADE_STATUSES)[number];

/** Tələbə üçün törədilən vəziyyət (bazada saxlanmır) */
export const ACADEMY_STUDENT_STATUSES = [
  'NOT_OPEN',
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'SUBMITTED_LATE',
  'UNDER_REVIEW',
  'RETURNED',
  'GRADED',
  'MISSED',
] as const;
export type AcademyStudentStatus = (typeof ACADEMY_STUDENT_STATUSES)[number];

export const ACADEMY_CLASS_STATUSES = [
  'SCHEDULED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
] as const;
export type AcademyClassStatus = (typeof ACADEMY_CLASS_STATUSES)[number];

export const ACADEMY_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
export type AcademyAttendanceStatus = (typeof ACADEMY_ATTENDANCE_STATUSES)[number];

export const ACADEMY_FILE_PURPOSES = ['ASSIGNMENT_RESOURCE', 'SUBMISSION'] as const;
export type AcademyFilePurpose = (typeof ACADEMY_FILE_PURPOSES)[number];

export const ACADEMY_NOTIFICATION_TYPES = [
  'ENROLLMENT_CREATED',
  'ASSIGNMENT_PUBLISHED',
  'ASSIGNMENT_UPDATED',
  'DEADLINE_EXTENDED',
  'DEADLINE_APPROACHING',
  'SUBMISSION_RECEIVED',
  'SUBMISSION_RETURNED',
  'GRADE_RELEASED',
  'CLASS_RESCHEDULED',
  'CLASS_CANCELLED',
] as const;
export type AcademyNotificationType = (typeof ACADEMY_NOTIFICATION_TYPES)[number];

/** Defolt siyasətlər (spesifikasiya §9.5) */
export const ACADEMY_DEFAULTS = {
  timezone: 'Asia/Baku',
  maxAttempts: 3,
  latePolicy: 'REJECT' as AcademyLatePolicy,
  attemptSelection: 'LATEST_ATTEMPT' as AcademyAttemptSelection,
  /** son tarixdən neçə saat əvvəl xatırlatma */
  reminderHours: [24, 3] as const,
  /** müvəqqəti (göndərişə bağlanmamış) fayllar bu qədər saatdan sonra silinir */
  stagedFileTtlHours: 24,
  /** bir faylın ən böyük ölçüsü (MB); server ACADEMY_MAX_FILE_MB ilə dəyişə bilər */
  maxFileMb: 20,
  /** bir istifadəçinin eyni anda saxlaya biləcəyi müvəqqəti fayl sayı */
  maxStagedFiles: 30,
} as const;

/**
 * Qəbul olunan fayl növləri (həm tələbə göndərişi, həm tapşırıq resursu). Uzantıya görə məzmun (sehrli baytlar,
 * UTF-8 / JSON) serverdə yoxlanılır; MIME növü müştəridən götürülmür. SVG və HTML (skript daşıya bilər) qəbul edilmir.
 */
export const ACADEMY_FILE_TYPES = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  py: 'text/x-python',
  sql: 'application/sql',
  json: 'application/json',
  ipynb: 'application/x-ipynb+json',
} as const;
export type AcademyFileExtension = keyof typeof ACADEMY_FILE_TYPES;
export const ACADEMY_FILE_EXTENSIONS = Object.keys(ACADEMY_FILE_TYPES) as AcademyFileExtension[];
