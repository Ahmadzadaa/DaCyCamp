import type {
  AcademyAssignmentStatus,
  AcademyAttendanceStatus,
  AcademyClassStatus,
  AcademyEnrollmentStatus,
  AcademyGradeStatus,
  AcademyGroupStatus,
  AcademyStudentStatus,
} from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'err' | 'muted' | 'mint';
const cls = (tone: Tone) => `badge badge-${tone}`;

const STUDENT_TONE: Record<AcademyStudentStatus, Tone> = {
  NOT_OPEN: 'muted',
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'mint',
  SUBMITTED: 'ok',
  SUBMITTED_LATE: 'warn',
  UNDER_REVIEW: 'mint',
  RETURNED: 'warn',
  GRADED: 'ok',
  MISSED: 'err',
};

export function StudentStatusBadge({
  status,
  overdue,
}: {
  status: AcademyStudentStatus;
  overdue?: boolean;
}) {
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5"
      data-testid="academy-status"
      data-status={status}
    >
      <span className={cls(STUDENT_TONE[status])}>{t(`academy.status.${status}`)}</span>
      {overdue ? <span className={cls('err')}>{t('academy.overdue')}</span> : null}
    </span>
  );
}

const ASSIGNMENT_TONE: Record<AcademyAssignmentStatus, Tone> = {
  DRAFT: 'muted',
  SCHEDULED: 'mint',
  PUBLISHED: 'ok',
  ARCHIVED: 'muted',
  CANCELLED: 'err',
};
export const AssignmentStatusBadge = ({ status }: { status: AcademyAssignmentStatus }) => (
  <span className={cls(ASSIGNMENT_TONE[status])} data-status={status}>
    {t(`academy.assignmentStatus.${status}`)}
  </span>
);

const GRADE_TONE: Record<AcademyGradeStatus, Tone> = {
  DRAFT: 'muted',
  RELEASED: 'ok',
  RETURNED: 'warn',
};
export const GradeStatusBadge = ({ status }: { status: AcademyGradeStatus }) => (
  <span className={cls(GRADE_TONE[status])}>{t(`academy.gradeStatus.${status}`)}</span>
);

const ENROLLMENT_TONE: Record<AcademyEnrollmentStatus, Tone> = {
  PENDING: 'muted',
  ACTIVE: 'ok',
  PAUSED: 'warn',
  COMPLETED: 'mint',
  WITHDRAWN: 'muted',
};
export const EnrollmentBadge = ({ status }: { status: AcademyEnrollmentStatus }) => (
  <span className={cls(ENROLLMENT_TONE[status])}>{t(`academy.enrollmentStatus.${status}`)}</span>
);

const GROUP_TONE: Record<AcademyGroupStatus, Tone> = {
  PLANNED: 'muted',
  ACTIVE: 'ok',
  COMPLETED: 'mint',
  ARCHIVED: 'muted',
  CANCELLED: 'err',
};
export const GroupStatusBadge = ({ status }: { status: AcademyGroupStatus }) => (
  <span className={cls(GROUP_TONE[status])}>{t(`academy.groupStatus.${status}`)}</span>
);

const CLASS_TONE: Record<AcademyClassStatus, Tone> = {
  SCHEDULED: 'ok',
  RESCHEDULED: 'warn',
  CANCELLED: 'err',
  COMPLETED: 'muted',
};
export const ClassStatusBadge = ({
  status,
  className,
}: {
  status: AcademyClassStatus;
  className?: string;
}) => (
  <span className={cn(cls(CLASS_TONE[status]), className)}>
    {t(`academy.classStatus.${status}`)}
  </span>
);

const ATT_TONE: Record<AcademyAttendanceStatus, Tone> = {
  PRESENT: 'ok',
  LATE: 'warn',
  ABSENT: 'err',
  EXCUSED: 'muted',
};
export const AttendanceBadge = ({ status }: { status: AcademyAttendanceStatus }) => (
  <span className={cls(ATT_TONE[status])}>{t(`academy.attendanceStatus.${status}`)}</span>
);
