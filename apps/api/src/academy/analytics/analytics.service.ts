import { Injectable } from '@nestjs/common';
import {
  ACADEMY_GROUP_STATUSES,
  attendanceRate,
  deriveStudentStatus,
  percent,
  riskFlags,
  type AcademyAdminOverviewDto,
  type AcademyGroupAnalyticsDto,
  type AcademyGroupStatus,
  type AcademyInstructorOverviewDto,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators';
import { AcademyAccessService } from '../access/academy-access.service';
import { STUDENT_VISIBLE } from '../assignments/assignments.service';

type GradeLite = {
  status: string;
  gradedById: string | null;
  selectedAttemptId: string | null;
  updatedAt: Date;
};
type AttemptLite = { id: string; attemptNumber: number; submittedAt: Date };

/** Müəllimin baxması lazım olan göndəriş (siyahıdakı «needsReview» ilə eyni qayda) */
export function needsReview(attempts: AttemptLite[], g: GradeLite | null): boolean {
  if (!attempts.length) return false;
  if (!g) return true;
  const latest = attempts.reduce((m, a) => (a.attemptNumber > m.attemptNumber ? a : m));
  if (g.status === 'DRAFT') {
    const sel = attempts.find((a) => a.id === g.selectedAttemptId);
    return !g.gradedById || (!!sel && latest.attemptNumber > sel.attemptNumber);
  }
  return g.status === 'RETURNED' && latest.submittedAt > g.updatedAt;
}

/**
 * Analitika — sənədləşdirilmiş düsturlar (docs/academy-management/BUSINESS_RULES.md):
 * - gözlənilən: açılmış (availableAt ≤ indi) görünən tapşırıqlar; tamamlanmış: ən azı bir cəhd;
 * - tamamlanma = Σ tamamlanmış / Σ gözlənilən (ACTIVE tələbələr);
 * - orta qiymət = Σ açıqlanmış yekun bal / Σ həmin tapşırıqların maksimumu (bala görə çəkili);
 * - buraxılmış (missed) = göndəriş pəncərəsi bağlanıb, cəhd yoxdur; gecikmiş (overdue) = effektiv son tarix keçib, cəhd yoxdur;
 * - davamiyyət = (iştirak + gecikmə) / (iştirak + gecikmə + qayıb); üzrlü və ləğv olunmuş dərs məxrəcə daxil deyil.
 * Məlumat yoxdursa faiz null-dır (0 % deyil). İşarələr yalnız diqqət üçündür — avtomatik qərar verilmir.
 */
@Injectable()
export class AcademyAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
  ) {}

  async group(user: AuthUser, groupId: string): Promise<AcademyGroupAnalyticsDto> {
    const access = await this.access.require(user, groupId, 'analytics.view');
    const now = new Date();
    const [enrollments, assignments, subs, exts, attendance] = await Promise.all([
      this.prisma.academyEnrollment.findMany({
        where: { groupId, status: 'ACTIVE' },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: 'asc' } },
      }),
      this.prisma.academyAssignment.findMany({
        where: { groupId, status: { in: STUDENT_VISIBLE }, availableAt: { lte: now } },
      }),
      this.prisma.academySubmission.findMany({
        where: { groupId },
        include: {
          attempts: { select: { id: true, attemptNumber: true, submittedAt: true, isLate: true } },
          grade: {
            select: {
              status: true,
              gradedById: true,
              selectedAttemptId: true,
              updatedAt: true,
              finalScoreCenti: true,
            },
          },
        },
      }),
      this.prisma.academyAssignmentExtension.findMany({ where: { assignment: { groupId } } }),
      this.prisma.academyAttendance.findMany({
        where: { groupId, session: { status: { not: 'CANCELLED' } } },
        select: { studentId: true, status: true },
      }),
    ]);
    const maxById = new Map(assignments.map((a) => [a.id, a.maxScoreCenti]));
    let sumCompleted = 0;
    let sumExpected = 0;
    let earned = 0;
    let possible = 0;
    let overdue = 0;
    const att = { present: 0, late: 0, absent: 0, excused: 0 };
    const count = (rows: Array<{ status: string }>) => ({
      present: rows.filter((r) => r.status === 'PRESENT').length,
      late: rows.filter((r) => r.status === 'LATE').length,
      absent: rows.filter((r) => r.status === 'ABSENT').length,
      excused: rows.filter((r) => r.status === 'EXCUSED').length,
    });

    const students = enrollments.map((e) => {
      let completed = 0;
      let missed = 0;
      let sEarned = 0;
      let sPossible = 0;
      for (const a of assignments) {
        const sub = subs.find((s) => s.assignmentId === a.id && s.studentId === e.studentId);
        const ext = exts.find((x) => x.assignmentId === a.id && x.studentId === e.studentId);
        const attempts = sub?.attempts ?? [];
        if (attempts.length) completed++;
        else {
          const st = deriveStudentStatus({
            now,
            availableAt: a.availableAt,
            dueAt: a.dueAt,
            extendedDueAt: ext?.extendedDueAt ?? null,
            latePolicy: a.latePolicy,
            lateCutoffAt: a.lateCutoffAt,
            attemptCount: 0,
            latestAttemptLate: false,
            latestAttemptAt: null,
            hasDraft: false,
            grade: null,
            closed: a.status !== 'PUBLISHED',
          });
          if (st.status === 'MISSED') {
            missed++;
            overdue++;
          } else if (st.overdue) overdue++;
        }
        if (sub?.grade?.status === 'RELEASED') {
          sEarned += sub.grade.finalScoreCenti;
          sPossible += maxById.get(a.id) ?? 0;
        }
      }
      const c = count(attendance.filter((r) => r.studentId === e.studentId));
      att.present += c.present;
      att.late += c.late;
      att.absent += c.absent;
      att.excused += c.excused;
      sumCompleted += completed;
      sumExpected += assignments.length;
      earned += sEarned;
      possible += sPossible;
      const rate = attendanceRate(c);
      return {
        student: e.student,
        completed,
        expected: assignments.length,
        averageGrade: percent(sEarned, sPossible),
        attendanceRate: rate,
        missed,
        flags: riskFlags({ missed, attendanceRate: rate }),
      };
    });
    const pendingReviews = subs.filter((s) => needsReview(s.attempts, s.grade)).length;
    return {
      groupId: access.group.id,
      activeStudents: enrollments.length,
      completionRate: percent(sumCompleted, sumExpected),
      averageGrade: percent(earned, possible),
      pendingReviews,
      overdue,
      attendanceRate: attendanceRate(att),
      students,
      generatedAt: now.toISOString(),
    };
  }

  /** Müəllim paneli: müəllimin aktiv qrupları (admin — arxivlənməmiş bütün qruplar) */
  async instructorOverview(user: AuthUser): Promise<AcademyInstructorOverviewDto> {
    const ids = await this.access.instructorGroupIds(user);
    const groups = await this.prisma.academyGroup.findMany({
      where: ids === null ? { status: { notIn: ['ARCHIVED', 'CANCELLED'] } } : { id: { in: ids } },
      include: {
        program: { select: { title: true } },
        instructors: { where: { userId: user.id, removedAt: null }, select: { role: true } },
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
            assignments: { where: { status: 'PUBLISHED' } },
          },
        },
      },
      orderBy: [{ startAt: 'desc' }, { code: 'asc' }],
    });
    const subs = await this.prisma.academySubmission.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: {
        groupId: true,
        attempts: { select: { id: true, attemptNumber: true, submittedAt: true } },
        grade: {
          select: { status: true, gradedById: true, selectedAttemptId: true, updatedAt: true },
        },
      },
    });
    const rows = groups.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      programTitle: g.program.title,
      status: g.status,
      role: (g.instructors[0]?.role ?? 'ADMIN') as 'ADMIN' | 'LEAD' | 'ASSISTANT',
      activeStudents: g._count.enrollments,
      activeAssignments: g._count.assignments,
      pendingReviews: subs.filter((s) => s.groupId === g.id && needsReview(s.attempts, s.grade))
        .length,
    }));
    return {
      groups: rows,
      totals: {
        groups: rows.length,
        students: rows.reduce((s, r) => s + r.activeStudents, 0),
        pendingReviews: rows.reduce((s, r) => s + r.pendingReviews, 0),
        activeAssignments: rows.reduce((s, r) => s + r.activeAssignments, 0),
      },
    };
  }

  async adminOverview(user: AuthUser): Promise<AcademyAdminOverviewDto> {
    this.access.requireAdmin(user);
    const now = new Date();
    const [
      programs,
      byStatus,
      activeEnrollments,
      instructors,
      publishedAssignments,
      subs,
      upcomingSessions,
      pending,
      failed,
    ] = await Promise.all([
      this.prisma.academyProgram.count(),
      this.prisma.academyGroup.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.academyEnrollment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.academyGroupInstructor.findMany({
        where: { removedAt: null },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.academyAssignment.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.academySubmission.findMany({
        select: {
          attempts: { select: { id: true, attemptNumber: true, submittedAt: true } },
          grade: {
            select: { status: true, gradedById: true, selectedAttemptId: true, updatedAt: true },
          },
        },
      }),
      this.prisma.academyClassSession.count({
        where: {
          startsAt: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.academyOutboxEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.academyOutboxEvent.count({ where: { status: 'FAILED' } }),
    ]);
    const groups = Object.fromEntries(ACADEMY_GROUP_STATUSES.map((s) => [s, 0])) as Record<
      AcademyGroupStatus,
      number
    >;
    for (const r of byStatus) groups[r.status] = r._count._all;
    return {
      programs,
      groups,
      activeEnrollments,
      instructors: instructors.length,
      publishedAssignments,
      pendingReviews: subs.filter((s) => needsReview(s.attempts, s.grade)).length,
      upcomingSessions,
      outbox: { pending, failed },
    };
  }
}
