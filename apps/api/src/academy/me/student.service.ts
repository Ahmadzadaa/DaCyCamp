import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  academyCan,
  attemptLimitReached,
  deriveStudentStatus,
  effectiveDueAt,
  fromCenti,
  type AcademyAnswerDto,
  type AcademyAttemptDto,
  type AcademyEnrollmentStatus,
  type AcademyGradeDto,
  type AcademyItemProgressDto,
  type AcademyMyAssignmentDetailDto,
  type AcademyMyAssignmentDto,
  type AcademyMyGradeDto,
  type AcademyStudentOverviewDto,
  type StepType,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound } from '../../common/errors';
import { academyForbidden } from '../access/academy-access.service';
import { AcademyContentAdapter, type StepSnapshot } from '../integrations/content.adapter';
import { AcademyEvaluationAdapter } from '../integrations/evaluation.adapter';
import { AcademyAssignmentsService, fileDto, STUDENT_VISIBLE } from '../assignments/assignments.service';
import { AcademyClassesService } from '../classes/classes.service';

/** Tələbənin akademiya görünüşü: məzmun ACTIVE (və bitirmiş — yalnız oxu) yazılışda, qiymət yalnız buraxılandan sonra */
const CONTENT_STATUSES: AcademyEnrollmentStatus[] = ['ACTIVE', 'COMPLETED'];

export const attemptInclude = {
  answers: {
    include: { files: { orderBy: { createdAt: 'asc' as const } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AcademySubmissionAttemptInclude;
type AttemptRow = Prisma.AcademySubmissionAttemptGetPayload<{ include: typeof attemptInclude }>;

export function attemptDto(a: AttemptRow): AcademyAttemptDto {
  return {
    id: a.id,
    attemptNumber: a.attemptNumber,
    assignmentVersion: a.assignmentVersion,
    submittedAt: a.submittedAt.toISOString(),
    isLate: a.isLate,
    evaluationStatus: a.evaluationStatus,
    autoScore: a.autoScoreCenti === null ? null : fromCenti(a.autoScoreCenti),
    answers: a.answers.map(
      (x): AcademyAnswerDto => ({
        itemId: x.itemId,
        kind: x.kind,
        text: x.textAnswer,
        code: x.codeAnswer,
        link: x.linkUrl,
        files: x.files.map(fileDto),
        evaluation:
          x.kind === 'LEARNING_STEP'
            ? {
                status: x.evaluationStatus,
                passed: x.evaluationPassed,
                score: x.evaluationScoreCenti === null ? null : fromCenti(x.evaluationScoreCenti),
                trust: x.evaluationTrust,
                learningSubmissionId: x.learningSubmissionId,
                evaluatedAt: x.evidenceAt?.toISOString() ?? null,
              }
            : null,
      }),
    ),
  };
}

@Injectable()
export class AcademyStudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: AcademyAssignmentsService,
    private readonly content: AcademyContentAdapter,
    private readonly evaluation: AcademyEvaluationAdapter,
    private readonly classes: AcademyClassesService,
  ) {}

  /** Tələbənin tapşırıq siyahısı (bir neçə qrup — nəticələr ayrı-ayrı) */
  async myAssignments(user: AuthUser, opts: { type?: string; groupId?: string } = {}): Promise<AcademyMyAssignmentDto[]> {
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { studentId: user.id, status: { in: CONTENT_STATUSES }, ...(opts.groupId ? { groupId: opts.groupId } : {}) },
      select: { groupId: true, status: true },
    });
    if (!enrollments.length) return [];
    const groupIds = enrollments.map((e) => e.groupId);
    const rows = await this.prisma.academyAssignment.findMany({
      where: {
        groupId: { in: groupIds },
        status: { in: STUDENT_VISIBLE },
        ...(opts.type ? { type: opts.type as never } : {}),
      },
      include: { group: { select: { code: true, name: true, status: true } } },
      orderBy: [{ dueAt: 'asc' }],
    });
    return this.summaries(user, rows, enrollments);
  }

  private async summaries(
    user: AuthUser,
    rows: Array<Prisma.AcademyAssignmentGetPayload<{ include: { group: { select: { code: true; name: true; status: true } } } }>>,
    enrollments: Array<{ groupId: string; status: string }>,
  ): Promise<AcademyMyAssignmentDto[]> {
    const ids = rows.map((r) => r.id);
    const [exts, subs, drafts] = await Promise.all([
      this.prisma.academyAssignmentExtension.findMany({ where: { assignmentId: { in: ids }, studentId: user.id } }),
      this.prisma.academySubmission.findMany({
        where: { assignmentId: { in: ids }, studentId: user.id },
        include: {
          attempts: { select: { submittedAt: true, isLate: true, attemptNumber: true }, orderBy: { attemptNumber: 'desc' } },
          grade: { select: { status: true, updatedAt: true, finalScoreCenti: true } },
        },
      }),
      this.prisma.academySubmissionDraft.findMany({
        where: { assignmentId: { in: ids }, studentId: user.id },
        select: { assignmentId: true },
      }),
    ]);
    const now = new Date();
    return rows.map((r) => {
      const ext = exts.find((e) => e.assignmentId === r.id);
      const sub = subs.find((s) => s.assignmentId === r.id);
      const latest = sub?.attempts[0];
      const enr = enrollments.find((e) => e.groupId === r.groupId);
      const closed =
        r.status !== 'PUBLISHED' || r.group.status !== 'ACTIVE' || enr?.status !== 'ACTIVE';
      const st = deriveStudentStatus({
        now,
        availableAt: r.availableAt,
        dueAt: r.dueAt,
        extendedDueAt: ext?.extendedDueAt ?? null,
        latePolicy: r.latePolicy,
        lateCutoffAt: r.lateCutoffAt,
        attemptCount: sub?.attempts.length ?? 0,
        latestAttemptLate: latest?.isLate ?? false,
        latestAttemptAt: latest?.submittedAt ?? null,
        hasDraft: drafts.some((d) => d.assignmentId === r.id),
        grade: sub?.grade ? { status: sub.grade.status, updatedAt: sub.grade.updatedAt } : null,
        closed,
      });
      const attemptsUsed = sub?.attempts.length ?? 0;
      const returnedAwaitingResubmission =
        sub?.grade?.status === 'RETURNED' && !(latest && latest.submittedAt > sub.grade.updatedAt);
      return {
        id: r.id,
        groupId: r.groupId,
        groupCode: r.group.code,
        groupName: r.group.name,
        title: r.title,
        type: r.type,
        availableAt: r.availableAt.toISOString(),
        dueAt: r.dueAt.toISOString(),
        effectiveDueAt: effectiveDueAt(r.dueAt, ext?.extendedDueAt).toISOString(),
        extended: !!ext && ext.extendedDueAt > r.dueAt,
        maxScore: fromCenti(r.maxScoreCenti),
        maxAttempts: r.maxAttempts,
        attemptsUsed,
        status: st.status,
        overdue: st.overdue,
        canSubmit:
          st.canSubmit && !attemptLimitReached({ attemptsUsed, maxAttempts: r.maxAttempts, returnedAwaitingResubmission }),
        finalScore: sub?.grade?.status === 'RELEASED' ? fromCenti(sub.grade.finalScoreCenti) : null,
      };
    });
  }

  /** Tələbə üçün tapşırıq: yalnız öz qrupunun görünən tapşırığı; başqasının məlumatı heç vaxt qayıtmır */
  async loadVisible(user: AuthUser, assignmentId: string) {
    const a = await this.prisma.academyAssignment.findUnique({
      where: { id: assignmentId },
      include: { group: { select: { code: true, name: true, status: true } } },
    });
    if (!a) throw notFound('ACADEMY_ASSIGNMENT_NOT_FOUND', 'Tapşırıq tapılmadı');
    const enr = await this.prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: a.groupId, studentId: user.id } },
    });
    const ctx = {
      isAdmin: false,
      instructorRole: null,
      enrollmentStatus: (enr?.status as AcademyEnrollmentStatus | undefined) ?? null,
    };
    if (!enr || !academyCan(ctx, 'group.view') || !STUDENT_VISIBLE.includes(a.status)) throw academyForbidden();
    return { a, enr };
  }

  async myAssignment(user: AuthUser, assignmentId: string): Promise<AcademyMyAssignmentDetailDto> {
    const { a, enr } = await this.loadVisible(user, assignmentId);
    const [summary] = await this.summaries(user, [a], [{ groupId: a.groupId, status: enr.status }]);
    const row = await this.assignments.loadRow(assignmentId);
    const dto = await this.assignments.toDto(row);
    const now = new Date();
    const stepItems = row.items.filter((i) => i.kind === 'LEARNING_STEP' && i.sourceSnapshot);
    const evidence = stepItems.length
      ? await this.evaluation.evidence(
          user.id,
          stepItems.map((i) => {
            const s = i.sourceSnapshot as unknown as StepSnapshot;
            return { stepId: s.stepId, type: s.type as StepType };
          }),
          row.availableAt,
          now,
        )
      : new Map();
    const itemProgress: AcademyItemProgressDto[] = row.items.map((i) => {
      const s = i.sourceSnapshot as StepSnapshot | null;
      if (i.kind !== 'LEARNING_STEP' || !s) return { itemId: i.id, evidence: null, openUrl: null };
      const ev = evidence.get(s.stepId);
      return {
        itemId: i.id,
        evidence: ev ? { passed: ev.passed, at: ev.at?.toISOString() ?? null, trust: ev.trust } : null,
        openUrl: i.stepId ? this.content.workspaceUrl(s) : null,
      };
    });
    const [sub, draft, stagedFiles] = await Promise.all([
      this.prisma.academySubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
        include: {
          attempts: { include: attemptInclude, orderBy: { attemptNumber: 'asc' } },
          grade: { include: { itemScores: true, rubricScores: true, gradedBy: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.academySubmissionDraft.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      }),
      this.prisma.academyFile.findMany({
        where: { ownerId: user.id, assignmentId, purpose: 'SUBMISSION', status: 'STAGED' },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const g = sub?.grade;
    // qaralama qiymət tələbəyə görünmür; RETURNED — yalnız rəy (bal yox)
    const grade: AcademyGradeDto | null =
      g && (g.status === 'RELEASED' || g.status === 'RETURNED')
        ? {
            id: g.id,
            status: g.status,
            rawScore: g.status === 'RELEASED' ? fromCenti(g.rawScoreCenti) : 0,
            latePenalty: g.status === 'RELEASED' ? fromCenti(g.latePenaltyCenti) : 0,
            finalScore: g.status === 'RELEASED' ? fromCenti(g.finalScoreCenti) : 0,
            maxScore: fromCenti(row.maxScoreCenti),
            feedback: g.feedback,
            selectedAttemptId: g.selectedAttemptId,
            itemScores:
              g.status === 'RELEASED'
                ? g.itemScores.map((x) => ({ itemId: x.itemId, score: fromCenti(x.scoreCenti), comment: x.comment }))
                : [],
            rubricScores:
              g.status === 'RELEASED'
                ? g.rubricScores.map((x) => ({ criterionId: x.criterionId, score: fromCenti(x.scoreCenti), comment: x.comment }))
                : [],
            gradedBy: g.gradedBy,
            gradedAt: g.gradedAt?.toISOString() ?? null,
            releasedAt: g.releasedAt?.toISOString() ?? null,
            version: g.version,
          }
        : null;
    return {
      ...summary!,
      description: dto.description,
      latePolicy: dto.latePolicy,
      latePenaltyPercent: dto.latePenaltyPercent,
      lateCutoffAt: dto.lateCutoffAt,
      deliverables: dto.deliverables,
      items: dto.items,
      itemProgress,
      resources: dto.resources,
      draft: draft
        ? {
            answers: draft.answers as Array<{ itemId: string; text?: string; code?: string; link?: string; fileIds?: string[] }>,
            updatedAt: draft.updatedAt.toISOString(),
          }
        : null,
      stagedFiles: stagedFiles.map(fileDto),
      attempts: (sub?.attempts ?? []).map(attemptDto),
      grade,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Platforma tapşırığını mövcud redaktorda açmaq: giriş yoxlanılır, sonra mövcud kursa yazılış və
   * (lazım olsa) StepUnlock. Qiymətləndirmə və XP mövcud mühərrikdə qalır.
   */
  async openItem(user: AuthUser, assignmentId: string, itemId: string): Promise<{ url: string }> {
    const { a, enr } = await this.loadVisible(user, assignmentId);
    if (enr.status !== 'ACTIVE') throw academyForbidden();
    if (a.status !== 'PUBLISHED') throw conflict('ACADEMY_ASSIGNMENT_CLOSED', 'Tapşırıq bağlıdır');
    if (new Date() < a.availableAt) throw conflict('ACADEMY_NOT_OPEN', 'Tapşırıq hələ açılmayıb');
    const item = await this.prisma.academyAssignmentItem.findFirst({ where: { id: itemId, assignmentId } });
    if (!item || item.kind !== 'LEARNING_STEP' || !item.stepId)
      throw notFound('ACADEMY_ITEM_NOT_FOUND', 'Element tapılmadı');
    const url = await this.content.ensureLearningAccess(user.id, item.stepId, a.createdById);
    return { url };
  }

  // ───────────────────────── qiymətlər və ümumi baxış

  /** Yalnız buraxılmış qiymətlər (qaralama gizlidir) */
  async myGrades(user: AuthUser): Promise<AcademyMyGradeDto[]> {
    const rows = await this.prisma.academyGrade.findMany({
      where: {
        status: 'RELEASED',
        submission: {
          studentId: user.id,
          enrollment: { status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN'] } },
        },
      },
      include: {
        submission: {
          select: { assignment: { select: { id: true, title: true, maxScoreCenti: true, group: { select: { code: true } } } } },
        },
      },
      orderBy: { releasedAt: 'desc' },
    });
    return rows.map((g) => ({
      assignmentId: g.submission.assignment.id,
      assignmentTitle: g.submission.assignment.title,
      groupCode: g.submission.assignment.group.code,
      finalScore: fromCenti(g.finalScoreCenti),
      maxScore: fromCenti(g.submission.assignment.maxScoreCenti),
      rawScore: fromCenti(g.rawScoreCenti),
      latePenalty: fromCenti(g.latePenaltyCenti),
      feedback: g.feedback,
      releasedAt: g.releasedAt!.toISOString(),
    }));
  }

  async overview(user: AuthUser): Promise<AcademyStudentOverviewDto> {
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { studentId: user.id, status: { not: 'PENDING' } },
      include: {
        group: {
          include: {
            program: { select: { title: true } },
            instructors: { where: { removedAt: null }, select: { user: { select: { name: true } }, role: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
    const all = await this.myAssignments(user);
    const upcoming = all
      .filter((x) => ['NOT_STARTED', 'IN_PROGRESS', 'NOT_OPEN', 'RETURNED'].includes(x.status))
      .sort((p, q) => p.effectiveDueAt.localeCompare(q.effectiveDueAt))
      .slice(0, 5);
    const grades = (await this.myGrades(user)).slice(0, 5);
    const nextSession = await this.classes.nextSession(user);
    return {
      groups: enrollments.map((e) => ({
        id: e.group.id,
        code: e.group.code,
        name: e.group.name,
        programTitle: e.group.program.title,
        status: e.group.status,
        enrollmentStatus: e.status,
        instructors: e.group.instructors
          .sort((a, b) => (a.role === 'LEAD' ? -1 : b.role === 'LEAD' ? 1 : 0))
          .map((i) => i.user.name),
      })),
      upcoming,
      nextSession,
      recentGrades: grades,
    };
  }
}
