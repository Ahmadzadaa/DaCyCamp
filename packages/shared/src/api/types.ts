import type { AssetKind, Level, Role, StepState, StepType } from '../enums';
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
  createdAt: string;
}

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
  track: { slug: string; title: string; color: string };
  moduleCount: number;
  stepCount: number;
  stepTypeCounts: Partial<Record<StepType, number>>;
  datasetCount: number;
  enrolled?: boolean;
  percent?: number;
  completed?: boolean;
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
    url: string;
    trackColor: string;
  } | null;
  courses: Array<{
    slug: string;
    title: string;
    trackColor: string;
    trackTitle: string;
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
  activePath: null;
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
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
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
  serial: string;
  courseTitle: string;
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
