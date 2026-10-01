export const ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: readonly Role[] = ['INSTRUCTOR', 'ADMIN'];

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type Level = (typeof LEVELS)[number];
/** YAML-da işlənən kiçik hərfli forma */
export const LEVEL_SLUGS = {
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  advanced: 'ADVANCED',
} as const;

export const STEP_TYPES = ['THEORY', 'QUIZ', 'SQL', 'PYTHON', 'TERMINAL', 'CTF'] as const;
export type StepType = (typeof STEP_TYPES)[number];
export const STEP_TYPE_SLUGS = ['theory', 'quiz', 'sql', 'python', 'terminal', 'ctf'] as const;
export type StepTypeSlug = (typeof STEP_TYPE_SLUGS)[number];
export const stepTypeToSlug = (t: StepType): StepTypeSlug => t.toLowerCase() as StepTypeSlug;
export const stepTypeFromSlug = (s: StepTypeSlug): StepType => s.toUpperCase() as StepType;

export const PROGRESS_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

/** Tələbə üçün hesablanan addım vəziyyəti */
export const STEP_STATES = ['locked', 'available', 'in_progress', 'completed'] as const;
export type StepState = (typeof STEP_STATES)[number];

export const ASSET_KINDS = [
  'IMAGE',
  'VIDEO',
  'PDF',
  'DATASET',
  'ATTACHMENT',
  'CHECK_SCRIPT',
  'OTHER',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const PATH_ITEM_TYPES = ['COURSE', 'PROJECT', 'ASSESSMENT', 'MILESTONE'] as const;
export type PathItemType = (typeof PATH_ITEM_TYPES)[number];

export const XP_REASONS = [
  'STEP_COMPLETED',
  'CTF_TASK_SOLVED',
  'HINT_USED',
  'COURSE_COMPLETED',
  'PATH_ITEM_COMPLETED',
  'PATH_COMPLETED',
  'MANUAL',
] as const;
export type XpReason = (typeof XP_REASONS)[number];
