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
}

export interface QuizResultDto extends CompleteResultDto {
  score: number;
  passed: boolean;
  perQuestion: Array<{ correct: boolean; correctIndices: number[]; explanation?: string }>;
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
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
