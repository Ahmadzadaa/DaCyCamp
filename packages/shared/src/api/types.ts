import type { PathItemInput } from '../content/path';
import type { AssetKind, Level, PathItemType, Role, StepState, StepType } from '../enums';
import type { CourseMap } from '../progress/unlock';
import type { StepStudentView } from '../content/step-config';
import type { StepDefinitionDraft } from '../content/step-definition';
import type { Issue } from '../content/step-definition';

export interface ApiError {
  code: string;
  message: string;
  details?: Issue[] | Record<string, unknown>;
  statusCode?: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale: string;
  xpTotal: number;
  /** həftəlik hədəf — tapşırıq sayı */
  weeklyGoal: number;
  showOnLeaderboard: boolean;
  createdAt: string;
}

export type NotificationKind =
  'certificate' | 'project_passed' | 'project_returned' | 'new_course' | 'reviews_pending';
/** Zəng menyusu: mövcud məlumatdan törədilir (ayrıca cədvəl yoxdur) */
export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  url: string;
  at: string;
  unread: boolean;
}

/** Qabıq (sidebar «Həftəlik hədəf», zəng) üçün yüngül xülasə */
export interface MeSummaryDto {
  xpTotal: number;
  streakDays: number;
  /** bu həftə (B.e–B, APP_TIMEZONE) tamamlanan addımlar */
  weekTasks: number;
  weeklyGoal: number;
  unreadNotifications: number;
  /** yalnız heyət: yoxlama gözləyən layihələr (admin sidebar sayğacı) */
  pendingReviews?: number;
}

/** Mövzu (Qeyd 5): istiqamətdən əlavə başlıq — «Python», «Excel», «Linux» */
export interface TopicDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  color: string;
  order: number;
  isPublished: boolean;
  courseCount?: number;
}
export type TopicRefDto = Pick<TopicDto, 'id' | 'slug' | 'title' | 'color'>;

export interface TrackDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  color: string;
  icon: string | null;
  order: number;
  isPublished: boolean;
  courseCount?: number;
}

export interface CourseCardDto {
  id: string;
  slug: string;
  title: string;
  level: Level;
  description: string;
  coverUrl: string | null;
  estimatedHours: number | null;
  sequential: boolean;
  track: { slug: string; title: string; color: string; icon?: string | null };
  /** kataloqda «Ən yeni» sıralaması üçün */
  publishedAt?: string | null;
  /** dərc olunmuş mövzular */
  topics?: TopicRefDto[];
  moduleCount: number;
  stepCount: number;
  stepTypeCounts: Partial<Record<StepType, number>>;
  datasetCount: number;
  enrolled?: boolean;
  percent?: number;
  completed?: boolean;
  instructor: CourseInstructorDto | null;
  /** arxivdədir (yalnız yazılmış tələbə görür) */
  archived?: boolean;
}
export interface CourseInstructorDto {
  name: string;
  title: string | null;
  avatarUrl: string | null;
}

export interface CourseOutlineDto extends CourseCardDto {
  modules: Array<{
    id: string;
    key: string;
    title: string;
    order: number;
    steps: Array<{
      id: string;
      key: string;
      type: StepType;
      title: string;
      xp: number;
      order: number;
    }>;
  }>;
}

export interface CourseMapDto {
  course: CourseCardDto;
  enrolled: boolean;
  map: Omit<CourseMap, 'flat'>;
  continueUrl: string | null;
  completedAt: string | null;
  /** kurs bitibsə sertifikatın ictimai id-si */
  certificateId: string | null;
}

export interface StepViewDto {
  id: string;
  key: string;
  type: StepType;
  title: string;
  xp: number;
  order: number;
  state: StepState;
  attempts: number;
  score: number | null;
  module: { id: string; key: string; title: string; order: number };
  course: {
    slug: string;
    title: string;
    sequential: boolean;
    track: { slug: string; title: string; color: string };
  };
  position: { index: number; total: number; typeIndex: number; typeTotal: number };
  prev: { moduleKey: string; stepKey: string } | null;
  next: { moduleKey: string; stepKey: string; locked: boolean } | null;
  coursePercent: number;
  userXp: number;
  preview: boolean;
  /** kursun fayl xəritəsi: path → url (Markdown-dakı nisbi şəkillər üçün) */
  assets: Record<string, string>;
  view: StepStudentView;
}

export interface CompleteResultDto {
  xpAwarded: number;
  coursePercent: number;
  courseCompleted: boolean;
  next: { moduleKey: string; stepKey: string } | null;
  /** kurs indicə bitibsə — verilən sertifikat (Mərhələ 3) */
  certificateId?: string | null;
}

export interface QuizResultDto extends CompleteResultDto {
  score: number;
  passed: boolean;
  perQuestion: Array<{ correct: boolean; correctIndices: number[]; explanation?: string }>;
  attempts: number;
}

export interface HintResultDto {
  index: number;
  hint: string;
  xpPenalty: number;
  unlocked: string[];
}

export interface CtfAnswerResultDto extends CompleteResultDto {
  correct: boolean;
  taskId: string;
  solvedAll: boolean;
  attempts: number;
}

export interface CodeSubmitResultDto extends CompleteResultDto {
  passed: boolean;
  /** uğursuz olanda səbəb: columns | row_count | values | error */
  reason?: 'columns' | 'row_count' | 'values' | 'error';
  message?: string;
  attempts: number;
}

export interface DashboardDto {
  user: PublicUser;
  continue: {
    courseSlug: string;
    courseTitle: string;
    moduleTitle: string;
    stepTitle: string;
    stepType: StepType;
    /** 1-dən: «Fəsil 2 · Addım 4» */
    moduleNumber: number;
    stepNumber: number;
    url: string;
    trackColor: string;
  } | null;
  courses: Array<{
    slug: string;
    title: string;
    trackColor: string;
    trackTitle: string;
    trackSlug: string;
    trackIcon: string | null;
    percent: number;
    done: number;
    total: number;
    completedAt: string | null;
    lastActivityAt: string;
  }>;
  xpTotal: number;
  streakDays: number;
  stepsCompleted: number;
  certificates: number;
  /** son sertifikatlar (panel üçün) */
  certificateItems: CertificateSummaryDto[];
  week: boolean[];
  /** bu həftə tamamlanan addımlar və həftəlik hədəf */
  weekTasks: number;
  weeklyGoal: number;
  activePath: ActivePathDto | null;
}

export interface AdminStepNode {
  id: string;
  key: string;
  type: StepType;
  title: string;
  xp: number;
  order: number;
  isPublished: boolean;
  hasProgress: boolean;
}
export interface AdminModuleNode {
  id: string;
  key: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  steps: AdminStepNode[];
}
export interface AdminCourseDto {
  id: string;
  slug: string;
  title: string;
  level: Level;
  description: string;
  sequential: boolean;
  estimatedHours: number | null;
  order: number;
  isPublished: boolean;
  trackId: string;
  track: { id: string; slug: string; title: string; color: string };
  coverAssetId: string | null;
  coverUrl: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  instructorAvatarId: string | null;
  instructorAvatarUrl: string | null;
  status: CourseStatus;
  topics: TopicRefDto[];
  archivedAt: string | null;
  deletedAt: string | null;
  /** soft delete-dən sonra həmişəlik silinmə tarixi */
  purgeAt: string | null;
  enrollmentCount: number;
  moduleCount: number;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}
export type CourseStatus = 'published' | 'draft' | 'archived' | 'deleted';
export type CourseStatusCounts = Record<CourseStatus | 'all', number>;
export interface AdminCourseListDto {
  courses: AdminCourseDto[];
  counts: CourseStatusCounts;
  /** başlıqdakı xülasə: «24 kurs · 3 istiqamət · 1 284 yazılma» (filtrsiz) */
  totals?: { tracks: number; enrollments: number };
}

/** Admin header axtarışı: kurslar, tələbələr, fayllar, yollar */
export interface AdminSearchDto {
  q: string;
  courses: Array<{
    slug: string;
    title: string;
    trackTitle: string;
    trackColor: string;
    status: CourseStatus;
  }>;
  users: Array<{ id: string; name: string; email: string; role: Role }>;
  assets: Array<{
    id: string;
    path: string;
    filename: string;
    kind: AssetKind;
    courseSlug: string;
    courseTitle: string;
  }>;
  paths: Array<{ slug: string; title: string; trackColor: string; isPublished: boolean }>;
}

/** Admin «Ümumi baxış» */
export interface AdminOverviewDto {
  courses: CourseStatusCounts;
  tracks: number;
  students: number;
  newStudents7d: number;
  enrollments: number;
  activeLearners7d: number;
  certificates: number;
  pendingReviews: number;
  activeLabs: number;
  /** son 14 gün: tamamlanan addımlar (gün üzrə) */
  activity: Array<{ date: string; steps: number }>;
  topCourses: Array<{
    slug: string;
    title: string;
    trackColor: string;
    trackTitle: string;
    enrollments: number;
    completed: number;
  }>;
}
export interface AdminCourseStatsDto {
  enrollments: number;
  completed: number;
  progressRows: number;
  assets: number;
  pathItems: number;
  modules: number;
  steps: number;
}
export interface AdminCourseStudentDto {
  userId: string;
  name: string;
  email: string;
  percent: number;
  enrolledAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  /** admin tərəfindən əl ilə açılmış addımlar */
  unlockedStepIds: string[];
  /** hazırda bu tələbə üçün kilidli olan (dərc olunmuş) addımlar */
  lockedStepIds: string[];
  done: number;
  total: number;
}
export interface AuditLogDto {
  id: string;
  actor: { id: string | null; email: string; name: string | null };
  action: string;
  entityType: string;
  entityId: string | null;
  entityTitle: string | null;
  courseId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
export interface AuditPageDto {
  items: AuditLogDto[];
  nextCursor: string | null;
}
export interface AdminCourseTreeDto extends AdminCourseDto {
  modules: AdminModuleNode[];
}
export interface AdminStepDto {
  id: string;
  moduleId: string;
  key: string;
  type: StepType;
  isPublished: boolean;
  hasProgress: boolean;
  order: number;
  definition: StepDefinitionDraft;
  issues: Issue[];
  updatedAt: string;
}
export interface AssetDto {
  id: string;
  courseId: string;
  path: string;
  kind: AssetKind;
  filename: string;
  mime: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}
export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  xpTotal: number;
  createdAt: string;
  lastActiveAt: string | null;
  enrollmentCount: number;
}
export interface CourseImportDto {
  id: string;
  slug: string;
  filename: string;
  status: 'VALIDATED' | 'FAILED' | 'APPLIED';
  createdAt: string;
  courseId: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ───────────────────────── Mərhələ 3: terminal lab-ları və sertifikat ─────────────────────────

export const LAB_STATUSES = [
  'STARTING',
  'RUNNING',
  'PASSED',
  'EXPIRED',
  'STOPPED',
  'FAILED',
] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

export interface LabSessionDto {
  id: string;
  stepId: string;
  status: LabStatus;
  image: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  passedAt: string | null;
  /** qalan saniyə (RUNNING/STARTING üçün) */
  remainingSec: number;
  /** FAILED üçün səbəb, PASSED/FAILED yoxlama çıxışı */
  message: string | null;
  driver: 'docker' | 'mock';
}

export interface LabTicketDto {
  token: string;
  /** WebSocket yolu (host brauzerdə müəyyənləşir) */
  path: string;
}

export interface LabCheckResultDto {
  passed: boolean;
  exitCode: number;
  output: string;
  timedOut: boolean;
  complete: CompleteResultDto | null;
}

export interface AdminLabSessionDto extends LabSessionDto {
  user: { id: string; name: string; email: string };
  step: { id: string; title: string; courseSlug: string; courseTitle: string };
  containerId: string | null;
}

export interface CertificateSummaryDto {
  id: string;
  /** kurs sertifikatı və ya karyera yolu sertifikatı */
  kind: 'course' | 'path';
  serial: string;
  /** kursun və ya yolun (sertifikat başlığının) adı */
  courseTitle: string;
  /** kurs slug-ı və ya yol slug-ı */
  courseSlug: string | null;
  trackTitle: string;
  trackColor: string;
  issuedAt: string;
  revokedAt: string | null;
}

export interface CertificateDto extends CertificateSummaryDto {
  studentName: string;
  hours: number | null;
  xp: number;
  verifyUrl: string;
  /** QR kod (data:image/png;base64,…) — verifyUrl-ə işarə edir */
  qrDataUrl: string;
  pdfUrl: string;
}

// ───────────────────────── Mərhələ 4: Learning Path ─────────────────────────

export interface PathCardDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: Level;
  track: { slug: string; title: string; color: string; icon?: string | null };
  skills: string[];
  targetAudience: string | null;
  estimatedHours: number | null;
  sequential: boolean;
  isPublished: boolean;
  courseCount: number;
  projectCount: number;
  assessmentCount: number;
  itemCount: number;
  /** giriş edilibsə */
  enrolled?: boolean;
  isActive?: boolean;
  percent?: number;
  completedAt?: string | null;
}

export type PathItemStateDto = 'completed' | 'current' | 'available' | 'locked' | 'submitted';

export interface PathItemDto {
  id: string;
  key: string;
  order: number;
  type: PathItemType;
  title: string;
  isOptional: boolean;
  estimatedHours: number | null;
  xp: number;
  state: PathItemStateDto;
  /** məcburi addımların sıra nömrəsi (seçmə addımda null) */
  number: number | null;
  url: string;
  course?: {
    slug: string;
    title: string;
    level: Level;
    enrolled: boolean;
    percent: number;
    done: number;
    total: number;
    completedAt: string | null;
  };
  progress?: {
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED';
    score: number | null;
    attempts: number;
    submittedAt: string | null;
    completedAt: string | null;
  } | null;
}

export interface PathDetailDto {
  path: PathCardDto;
  enrolled: boolean;
  isActive: boolean;
  map: { done: number; total: number; percent: number; isComplete: boolean };
  items: PathItemDto[];
  continueUrl: string | null;
  completedAt: string | null;
  certificateId: string | null;
  otherPaths: PathCardDto[];
}

export interface PathRefDto {
  slug: string;
  title: string;
  /** kursun yoldakı sıra nömrəsi */
  number: number;
  trackColor: string;
  trackTitle: string;
}

export interface PathItemViewDto {
  item: PathItemDto;
  path: { slug: string; title: string; track: { slug: string; title: string; color: string } };
  enrolled: boolean;
  project?: {
    instructions: string;
    deliverables: string[];
    reviewMode: 'manual' | 'auto';
    allowLink: boolean;
    maxFiles: number;
    submission: {
      files: Array<{ filename: string; size: number; url: string }>;
      link: string | null;
      note: string | null;
      status: 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED';
      feedback: string | null;
      submittedAt: string | null;
    } | null;
  };
  assessment?: {
    passScore: number;
    questions: Array<{ text: string; type: 'single' | 'multiple'; options: string[] }>;
    attempts: number;
    bestScore: number | null;
    status: 'IN_PROGRESS' | 'PASSED' | 'FAILED' | null;
  };
  milestone?: {
    description: string;
    certificateTitle: string;
    missing: Array<{ key: string; title: string; url: string }>;
    claimable: boolean;
    certificateId: string | null;
  };
}

export interface PathProgressResultDto {
  pathPercent: number;
  pathCompleted: boolean;
  certificateId: string | null;
  xpAwarded: number;
}
export interface AssessmentResultDto extends PathProgressResultDto {
  score: number;
  passed: boolean;
  perQuestion: Array<{ correct: boolean; correctIndices: number[]; explanation?: string }>;
}
export interface ProjectSubmitResultDto extends PathProgressResultDto {
  status: 'SUBMITTED' | 'PASSED';
}

export interface ActivePathDto {
  slug: string;
  title: string;
  trackTitle: string;
  trackColor: string;
  percent: number;
  done: number;
  total: number;
  completedAt: string | null;
  next: { title: string; type: PathItemType; url: string } | null;
}

export interface AdminPathItemDto {
  id: string;
  key: string;
  order: number;
  type: PathItemType;
  title: string;
  isOptional: boolean;
  estimatedHours: number | null;
  xp: number;
  course: { id: string; slug: string; title: string; isPublished: boolean; level: Level } | null;
  /** redaktə üçün tam məlumat (imtahanda cavablar daxil — yalnız admin) */
  input: PathItemInput;
}
export interface AdminPathDto extends PathCardDto {
  order: number;
  enrollmentCount: number;
  items: AdminPathItemDto[];
  issues: Issue[];
  updatedAt: string;
}
export interface AdminProjectReviewDto {
  id: string;
  user: { id: string; name: string; email: string };
  path: { slug: string; title: string };
  item: { id: string; key: string; title: string };
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED';
  submittedAt: string | null;
  feedback: string | null;
  files: Array<{ filename: string; size: number; url: string }>;
  link: string | null;
  note: string | null;
}

// ───────── Öyrənmə mərkəzi (sidebar bölmələri) ─────────

/** Fəaliyyətim */
export interface ActivityDto {
  /** son 53 həftə (köhnədən yeniyə), APP_TIMEZONE günləri */
  days: Array<{ date: string; steps: number; xp: number }>;
  totals: {
    xp: number;
    steps: number;
    activeDays: number;
    currentStreak: number;
    bestStreak: number;
    certificates: number;
  };
  byTrack: Array<{ title: string; color: string; steps: number }>;
  events: Array<{
    id: string;
    at: string;
    amount: number;
    reason: string;
    title: string | null;
    context: string | null;
    url: string | null;
  }>;
}

export type LeaderboardPeriod = 'week' | 'month' | 'all';
/** Liderlər cədvəli — ad qısaldılır («Orxan R.»), cədvəldə görünmək istəməyənlər çıxarılır */
export interface LeaderboardDto {
  period: LeaderboardPeriod;
  rows: Array<{ rank: number; name: string; initials: string; xp: number; me: boolean }>;
  me: { rank: number | null; xp: number; hidden: boolean } | null;
  participants: number;
}

/** Təcrübə: yazıldığı kurslardakı praktiki tapşırıqlar (SQL, Python, Terminal, CTF) */
export interface PracticeDto {
  courses: Array<{
    slug: string;
    title: string;
    trackTitle: string;
    trackColor: string;
    trackIcon: string | null;
    tasks: Array<{
      id: string;
      title: string;
      type: StepType;
      xp: number;
      state: StepState;
      attempts: number;
      moduleTitle: string;
      url: string;
    }>;
  }>;
  counts: { total: number; done: number; byType: Partial<Record<StepType, number>> };
}

/** İmtahanlar: yol imtahanları + kurs testləri */
export interface ExamsDto {
  assessments: Array<{
    id: string;
    title: string;
    pathSlug: string;
    pathTitle: string;
    trackColor: string;
    state: PathItemStateDto;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED' | null;
    score: number | null;
    attempts: number;
    passScore: number | null;
    xp: number;
    url: string;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    courseSlug: string;
    courseTitle: string;
    trackColor: string;
    state: StepState;
    score: number | null;
    attempts: number;
    xp: number;
    url: string;
  }>;
}

/** Layihələr: yollardakı layihə addımları və təhvil vəziyyəti */
export interface ProjectsDto {
  items: Array<{
    id: string;
    title: string;
    pathSlug: string;
    pathTitle: string;
    trackColor: string;
    state: PathItemStateDto;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED' | null;
    submittedAt: string | null;
    completedAt: string | null;
    feedback: string | null;
    reviewMode: 'manual' | 'auto';
    deliverables: number;
    estimatedHours: number | null;
    xp: number;
    url: string;
  }>;
}

/** Yarışlar: CTF otaqları və onların xal cədvəli */
export interface ContestDto {
  stepId: string;
  title: string;
  courseSlug: string;
  courseTitle: string;
  trackTitle: string;
  trackColor: string;
  trackIcon: string | null;
  tasks: number;
  points: number;
  participants: number;
  finishers: number;
  mine: { solved: number; points: number } | null;
  enrolled: boolean;
  url: string;
}
export interface ContestBoardDto {
  contest: ContestDto;
  rows: Array<{
    rank: number;
    name: string;
    initials: string;
    solved: number;
    points: number;
    lastSolveAt: string;
    me: boolean;
  }>;
}
