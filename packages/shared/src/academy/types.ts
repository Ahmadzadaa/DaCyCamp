// Akademiya API cavabları (DTO). Bütün vaxtlar ISO (UTC), ballar bal ilə (2 onluq).
import type {
  AcademyAssignmentStatus,
  AcademyAssignmentType,
  AcademyAttemptSelection,
  AcademyAttendanceStatus,
  AcademyClassStatus,
  AcademyEnrollmentStatus,
  AcademyEvaluationStatus,
  AcademyEvaluationTrust,
  AcademyGradeStatus,
  AcademyGradingType,
  AcademyGroupStatus,
  AcademyInstructorRole,
  AcademyItemKind,
  AcademyLatePolicy,
  AcademyLearningFormat,
  AcademyProgramStatus,
  AcademyStudentStatus,
} from './enums';
import type { AcademyAction } from './permissions';

export interface AcademyPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AcademyUserRef {
  id: string;
  name: string;
  email?: string;
}

/** /me/summary-də: akademiya menyusunu göstərmək üçün */
export interface AcademySummaryDto {
  enabled: true;
  student: boolean;
  instructor: boolean;
  admin: boolean;
}

export interface AcademyProgramDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: AcademyProgramStatus;
  groupCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyGroupInstructorDto {
  user: AcademyUserRef;
  role: AcademyInstructorRole;
  assignedAt: string;
}

export interface AcademyGroupDto {
  id: string;
  code: string;
  name: string;
  description: string;
  status: AcademyGroupStatus;
  format: AcademyLearningFormat;
  timezone: string;
  capacity: number | null;
  startAt: string | null;
  endAt: string | null;
  program: { id: string; title: string; slug: string };
  instructors: AcademyGroupInstructorDto[];
  activeStudents: number;
  /** cari istifadəçinin bu qrupdakı icazələri (UI üçün; server yenə yoxlayır) */
  permissions: AcademyAction[];
  myRole: 'ADMIN' | AcademyInstructorRole | 'STUDENT' | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyEnrollmentDto {
  id: string;
  groupId: string;
  student: AcademyUserRef;
  status: AcademyEnrollmentStatus;
  enrolledAt: string;
  endedAt: string | null;
}

export interface AcademyEnrollmentEventDto {
  fromStatus: AcademyEnrollmentStatus | null;
  toStatus: AcademyEnrollmentStatus;
  reason: string | null;
  actor: AcademyUserRef | null;
  createdAt: string;
}

export interface AcademyCourseLinkDto {
  courseId: string;
  slug: string;
  title: string;
}

// ───────────────────────── tapşırıqlar

export interface AcademyStepRefDto {
  stepId: string;
  type: string;
  title: string;
  courseSlug: string;
  courseTitle: string;
  moduleKey: string;
  moduleTitle: string;
  stepKey: string;
  level: string;
  /** addım hələ dərc olunubmu (silinən / gizlədilən mənbə üçün false) */
  available: boolean;
  trust: AcademyEvaluationTrust;
}

export interface AcademyItemDto {
  id: string;
  kind: AcademyItemKind;
  title: string;
  description: string;
  maxScore: number;
  sortOrder: number;
  step: AcademyStepRefDto | null;
}

export interface AcademyFileDto {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

export interface AcademyAssignmentDto {
  id: string;
  groupId: string;
  groupCode: string;
  title: string;
  description: string;
  type: AcademyAssignmentType;
  status: AcademyAssignmentStatus;
  availableAt: string;
  dueAt: string;
  lateCutoffAt: string | null;
  latePolicy: AcademyLatePolicy;
  latePenaltyPercent: number;
  maxAttempts: number;
  maxScore: number;
  gradingType: AcademyGradingType;
  attemptSelection: AcademyAttemptSelection;
  deliverables: string[];
  version: number;
  publishedAt: string | null;
  items: AcademyItemDto[];
  resources: AcademyFileDto[];
  rubric: AcademyRubricDto | null;
  createdBy: AcademyUserRef | null;
  createdAt: string;
  updatedAt: string;
}

/** Müəllim siyahısı üçün qısa forma + statistik */
export interface AcademyAssignmentListItemDto {
  id: string;
  title: string;
  type: AcademyAssignmentType;
  status: AcademyAssignmentStatus;
  availableAt: string;
  dueAt: string;
  maxScore: number;
  itemCount: number;
  submittedCount: number;
  pendingReview: number;
  expectedCount: number;
}

export interface AcademyExtensionDto {
  id: string;
  student: AcademyUserRef;
  extendedDueAt: string;
  reason: string;
  approvedBy: AcademyUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyRevisionDto {
  version: number;
  reason: string | null;
  editedBy: AcademyUserRef | null;
  changes: string[];
  createdAt: string;
}

export interface AcademyRubricDto {
  id: string;
  title: string;
  maxScore: number;
  criteria: Array<{ id: string; title: string; description: string; maxScore: number; sortOrder: number }>;
}

// ───────────────────────── tələbə görünüşü

export interface AcademyItemProgressDto {
  itemId: string;
  /** LEARNING_STEP: platformada keçilib (bu tapşırığın açılışından sonra) */
  evidence: {
    passed: boolean;
    at: string | null;
    trust: AcademyEvaluationTrust;
  } | null;
  /** addımı mövcud redaktorda açmaq üçün keçid */
  openUrl: string | null;
}

export interface AcademyMyAssignmentDto {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  title: string;
  type: AcademyAssignmentType;
  availableAt: string;
  dueAt: string;
  effectiveDueAt: string;
  extended: boolean;
  maxScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  status: AcademyStudentStatus;
  overdue: boolean;
  canSubmit: boolean;
  /** buraxılmış qiymət (yalnız RELEASED) */
  finalScore: number | null;
}

export interface AcademyMyAssignmentDetailDto extends AcademyMyAssignmentDto {
  description: string;
  latePolicy: AcademyLatePolicy;
  latePenaltyPercent: number;
  lateCutoffAt: string | null;
  deliverables: string[];
  items: AcademyItemDto[];
  itemProgress: AcademyItemProgressDto[];
  resources: AcademyFileDto[];
  draft: {
    answers: Array<{ itemId: string; text?: string; code?: string; link?: string; fileIds?: string[] }>;
    updatedAt: string;
  } | null;
  /** bu tapşırıq üçün yüklənmiş, hələ göndərişə bağlanmamış fayllarım */
  stagedFiles: AcademyFileDto[];
  attempts: AcademyAttemptDto[];
  grade: AcademyGradeDto | null;
  serverTime: string;
}

export interface AcademyAnswerDto {
  itemId: string;
  kind: AcademyItemKind;
  text: string | null;
  code: string | null;
  link: string | null;
  files: AcademyFileDto[];
  /** mövcud platforma nəticəsi (yoxlanılmış) */
  evaluation: {
    status: AcademyEvaluationStatus;
    passed: boolean | null;
    score: number | null;
    trust: AcademyEvaluationTrust | null;
    learningSubmissionId: string | null;
    evaluatedAt: string | null;
  } | null;
}

export interface AcademyAttemptDto {
  id: string;
  attemptNumber: number;
  assignmentVersion: number;
  submittedAt: string;
  isLate: boolean;
  evaluationStatus: AcademyEvaluationStatus;
  autoScore: number | null;
  answers: AcademyAnswerDto[];
}

export interface AcademySubmitReceiptDto {
  submissionId: string;
  attemptId: string;
  attemptNumber: number;
  maxAttempts: number;
  submittedAt: string;
  isLate: boolean;
  status: AcademyStudentStatus;
  /** eyni idempotency açarı ilə təkrar sorğu → əvvəlki cəhd qaytarılır */
  replayed: boolean;
}

// ───────────────────────── qiymətlər

export interface AcademyGradeDto {
  id: string;
  status: AcademyGradeStatus;
  rawScore: number;
  latePenalty: number;
  finalScore: number;
  maxScore: number;
  feedback: string | null;
  selectedAttemptId: string | null;
  itemScores: Array<{ itemId: string; score: number; comment: string | null }>;
  rubricScores: Array<{ criterionId: string; score: number; comment: string | null }>;
  gradedBy: AcademyUserRef | null;
  gradedAt: string | null;
  releasedAt: string | null;
  version: number;
  /** müəllim üçün: seçilmiş cəhddən sonra yeni cəhd var */
  stale?: boolean;
}

export interface AcademyGradeHistoryDto {
  previousScore: number | null;
  newScore: number | null;
  previousStatus: AcademyGradeStatus | null;
  newStatus: AcademyGradeStatus;
  reason: string | null;
  changedBy: AcademyUserRef | null;
  changedAt: string;
}

/** Müəllim: göndəriş (tələbə × tapşırıq) */
export interface AcademySubmissionDto {
  id: string | null;
  assignmentId: string;
  student: AcademyUserRef;
  enrollmentStatus: AcademyEnrollmentStatus;
  effectiveDueAt: string;
  extended: boolean;
  status: AcademyStudentStatus;
  attemptCount: number;
  latestSubmittedAt: string | null;
  latestIsLate: boolean;
  grade: Pick<AcademyGradeDto, 'id' | 'status' | 'finalScore' | 'maxScore' | 'version'> | null;
  needsReview: boolean;
}

export interface AcademySubmissionDetailDto {
  id: string;
  assignment: AcademyAssignmentDto;
  student: AcademyUserRef;
  effectiveDueAt: string;
  attempts: AcademyAttemptDto[];
  grade: AcademyGradeDto | null;
  history: AcademyGradeHistoryDto[];
  permissions: AcademyAction[];
}

export interface AcademyGradebookDto {
  group: { id: string; code: string; name: string };
  assignments: Array<{ id: string; title: string; maxScore: number; dueAt: string; status: AcademyAssignmentStatus }>;
  rows: Array<{
    student: AcademyUserRef;
    enrollmentStatus: AcademyEnrollmentStatus;
    cells: Array<{
      assignmentId: string;
      status: AcademyStudentStatus;
      finalScore: number | null;
      gradeStatus: AcademyGradeStatus | null;
    }>;
    /** buraxılmış qiymətlərin orta faizi */
    average: number | null;
  }>;
}

export interface AcademyMyGradeDto {
  assignmentId: string;
  assignmentTitle: string;
  groupCode: string;
  finalScore: number;
  maxScore: number;
  rawScore: number;
  latePenalty: number;
  feedback: string | null;
  releasedAt: string;
}

// ───────────────────────── dərslər

export interface AcademySessionDto {
  id: string;
  groupId: string;
  groupCode: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: AcademyClassStatus;
  /** yalnız səlahiyyətli istifadəçiyə (aktiv tələbə, qrup müəllimi, admin) */
  meetingUrl: string | null;
  instructor: AcademyUserRef | null;
  seriesId: string | null;
  attendanceMarked: number;
}

export interface AcademyAttendanceRowDto {
  student: AcademyUserRef;
  enrollmentStatus: AcademyEnrollmentStatus;
  status: AcademyAttendanceStatus | null;
  note: string | null;
  markedAt: string | null;
}

export interface AcademyMyAttendanceDto {
  sessionId: string;
  title: string;
  groupCode: string;
  startsAt: string;
  status: AcademyAttendanceStatus;
}

// ───────────────────────── analitika

export interface AcademyGroupAnalyticsDto {
  groupId: string;
  activeStudents: number;
  /** tamamlanma faizi (null — gözlənilən tapşırıq yoxdur) */
  completionRate: number | null;
  /** buraxılmış qiymətlərin orta faizi */
  averageGrade: number | null;
  pendingReviews: number;
  overdue: number;
  attendanceRate: number | null;
  students: Array<{
    student: AcademyUserRef;
    completed: number;
    expected: number;
    averageGrade: number | null;
    attendanceRate: number | null;
    missed: number;
    flags: { attention: boolean; attendanceWarning: boolean };
  }>;
  generatedAt: string;
}

export interface AcademyInstructorOverviewDto {
  groups: Array<{
    id: string;
    code: string;
    name: string;
    programTitle: string;
    status: AcademyGroupStatus;
    role: 'ADMIN' | AcademyInstructorRole;
    activeStudents: number;
    activeAssignments: number;
    pendingReviews: number;
  }>;
  totals: { groups: number; students: number; pendingReviews: number; activeAssignments: number };
}

export interface AcademyStudentOverviewDto {
  groups: Array<{
    id: string;
    code: string;
    name: string;
    programTitle: string;
    status: AcademyGroupStatus;
    enrollmentStatus: AcademyEnrollmentStatus;
    instructors: string[];
  }>;
  upcoming: AcademyMyAssignmentDto[];
  nextSession: AcademySessionDto | null;
  recentGrades: AcademyMyGradeDto[];
}

export interface AcademyNotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface AcademyAdminOverviewDto {
  programs: number;
  groups: Record<AcademyGroupStatus, number>;
  activeEnrollments: number;
  instructors: number;
  publishedAssignments: number;
  pendingReviews: number;
  upcomingSessions: number;
  outbox: { pending: number; failed: number };
}
