// Resurs səviyyəli icazələr: qlobal admin, qrup müəllimi (aparıcı / köməkçi), qrup tələbəsi.
// Server hər əməliyyatda konteksti bazadan oxuyub bu cədvəllə yoxlayır; web yalnız düymələri gizlətmək üçün istifadə edir.
import type { AcademyEnrollmentStatus, AcademyInstructorRole } from './enums';

export interface AcademyActorContext {
  /** yalnız etibarlı qlobal ADMIN rolu (qlobal INSTRUCTOR rolu akademiya hüququ vermir) */
  isAdmin: boolean;
  /** bu qrupda aktiv müəllim əlaqəsi */
  instructorRole: AcademyInstructorRole | null;
  /** bu qrupda tələbə yazılışının vəziyyəti */
  enrollmentStatus: AcademyEnrollmentStatus | null;
}

export const ACADEMY_ACTIONS = [
  // təşkilat — yalnız admin
  'program.manage',
  'group.manage',
  'group.manageStaff',
  'group.manageEnrollments',
  // qrup
  'group.view',
  'group.viewRoster',
  // tapşırıqlar
  'assignment.viewAll',
  'assignment.createDraft',
  'assignment.editDraft',
  'assignment.publish',
  'assignment.editPublished',
  'assignment.changeDeadline',
  'assignment.extend',
  'assignment.cancel',
  // göndərişlər və qiymətlər
  'submission.review',
  'grade.write',
  'grade.release',
  // dərslər
  'session.manage',
  'attendance.manage',
  'analytics.view',
  // tələbə
  'student.viewContent',
  'student.submit',
  'student.viewOwnRecords',
] as const;
export type AcademyAction = (typeof ACADEMY_ACTIONS)[number];

const LEAD: ReadonlySet<AcademyAction> = new Set<AcademyAction>([
  'group.view',
  'group.viewRoster',
  'assignment.viewAll',
  'assignment.createDraft',
  'assignment.editDraft',
  'assignment.publish',
  'assignment.editPublished',
  'assignment.changeDeadline',
  'assignment.extend',
  'assignment.cancel',
  'submission.review',
  'grade.write',
  'grade.release',
  'session.manage',
  'attendance.manage',
  'analytics.view',
]);

/**
 * Köməkçi müəllim siyasəti: baxır, qaralama tapşırıq hazırlayır, göndərişləri yoxlayır, qaralama qiymət yazır,
 * davamiyyət qeyd edir. Dərc etmək, son tarixi dəyişmək, uzadılma vermək, qiyməti tələbəyə açmaq və
 * dərs cədvəlini dəyişmək — yalnız aparıcı müəllim və admin.
 */
const ASSISTANT: ReadonlySet<AcademyAction> = new Set<AcademyAction>([
  'group.view',
  'group.viewRoster',
  'assignment.viewAll',
  'assignment.createDraft',
  'assignment.editDraft',
  'submission.review',
  'grade.write',
  'attendance.manage',
  'analytics.view',
]);

/** Tələbə: məzmun və göndəriş yalnız ACTIVE yazılışda; öz qeydləri (qiymət, davamiyyət) PENDING-dən başqa hər vəziyyətdə */
function studentCan(action: AcademyAction, s: AcademyEnrollmentStatus): boolean {
  switch (action) {
    case 'group.view':
      return s === 'ACTIVE' || s === 'COMPLETED';
    case 'student.viewContent':
    case 'student.submit':
      return s === 'ACTIVE';
    case 'student.viewOwnRecords':
      return s !== 'PENDING';
    default:
      return false;
  }
}

export function academyCan(ctx: AcademyActorContext, action: AcademyAction): boolean {
  if (ctx.isAdmin) return !action.startsWith('student.');
  if (ctx.instructorRole === 'LEAD' && LEAD.has(action)) return true;
  if (ctx.instructorRole === 'ASSISTANT' && ASSISTANT.has(action)) return true;
  if (ctx.enrollmentStatus && studentCan(action, ctx.enrollmentStatus)) return true;
  return false;
}

/** Qrup vəziyyəti: tələbə göndərişi yalnız ACTIVE qrupda; arxiv / ləğv olunmuş qrup yalnız oxunur */
export function groupAcceptsSubmissions(status: string): boolean {
  return status === 'ACTIVE';
}
export function groupIsReadOnly(status: string): boolean {
  return status === 'ARCHIVED' || status === 'CANCELLED';
}
