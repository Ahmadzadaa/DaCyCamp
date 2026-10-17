import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeFinalScore,
  deriveStudentStatus,
  effectiveDueAt,
  fromCenti,
  groupIsReadOnly,
  percent,
  selectAttempt,
  toCenti,
  type AcademyEnrollmentStatus,
  type AcademyGradeDto,
  type AcademyGradeHistoryDto,
  type AcademyGradeInput,
  type AcademyGradebookDto,
  type AcademyReturnInput,
  type AcademySubmissionDetailDto,
  type AcademySubmissionDto,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound, unprocessable } from '../../common/errors';
import { AcademyAccessService, academyForbidden, type GroupAccess } from '../access/academy-access.service';
import { AcademyAssignmentsService, STUDENT_VISIBLE } from '../assignments/assignments.service';
import { attemptDto, attemptInclude } from '../me/student.service';
import { emitAcademyEvent } from '../notifications/academy-events';

type Tx = Prisma.TransactionClient;

const gradeInclude = {
  itemScores: true,
  rubricScores: true,
  gradedBy: { select: { id: true, name: true } },
} satisfies Prisma.AcademyGradeInclude;
type GradeRow = Prisma.AcademyGradeGetPayload<{ include: typeof gradeInclude }>;

/** Gradebook və siyahılarda göstərilən yazılışlar (PENDING — hələ qrupda deyil) */
const ROSTER_STATUSES: AcademyEnrollmentStatus[] = ['ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN'];

/** Seçilmiş cəhddən sonra yeni cəhd varmı (müəllim yenidən baxmalıdır) */
function isStale(
  grade: { selectedAttemptId: string | null } | null | undefined,
  attempts: ReadonlyArray<{ id: string; attemptNumber: number }>,
): boolean {
  if (!grade?.selectedAttemptId || !attempts.length) return false;
  const sel = attempts.find((a) => a.id === grade.selectedAttemptId);
  const latest = Math.max(...attempts.map((a) => a.attemptNumber));
  return !!sel && latest > sel.attemptNumber;
}

export function staffGradeDto(g: GradeRow, maxScoreCenti: number, stale: boolean): AcademyGradeDto {
  return {
    id: g.id,
    status: g.status,
    rawScore: fromCenti(g.rawScoreCenti),
    latePenalty: fromCenti(g.latePenaltyCenti),
    finalScore: fromCenti(g.finalScoreCenti),
    maxScore: fromCenti(maxScoreCenti),
    feedback: g.feedback,
    selectedAttemptId: g.selectedAttemptId,
    itemScores: g.itemScores.map((x) => ({ itemId: x.itemId, score: fromCenti(x.scoreCenti), comment: x.comment })),
    rubricScores: g.rubricScores.map((x) => ({ criterionId: x.criterionId, score: fromCenti(x.scoreCenti), comment: x.comment })),
    gradedBy: g.gradedBy,
    gradedAt: g.gradedAt?.toISOString() ?? null,
    releasedAt: g.releasedAt?.toISOString() ?? null,
    version: g.version,
    stale,
  };
}

/**
 * Qiymətləndirmə: element / rubrika balları, gecikmə cəriməsi, cəhd seçimi, optimistik versiya, tarixçə,
 * açıqlama (yalnız aparıcı / admin) və qaytarma. Akademik bal XP-dən tam ayrıdır — burada XP-yə toxunulmur.
 * Avtomatik bal həmişə qaralamadır; tələbə qiyməti yalnız açıq «buraxılış»dan sonra görür.
 */
@Injectable()
export class AcademyGradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly assignments: AcademyAssignmentsService,
    private readonly audit: AuditService,
  ) {}

  private async loadSubmission(user: AuthUser, submissionId: string) {
    const sub = await this.prisma.academySubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
            rubric: { include: { criteria: { orderBy: { sortOrder: 'asc' } } } },
            group: { select: { code: true, status: true } },
          },
        },
        student: { select: { id: true, name: true } },
        attempts: { include: attemptInclude, orderBy: { attemptNumber: 'asc' } },
        grade: { include: gradeInclude },
      },
    });
    if (!sub) throw notFound('ACADEMY_SUBMISSION_NOT_FOUND', 'Göndəriş tapılmadı');
    const access = await this.access.groupAccess(user, sub.groupId);
    return { sub, access };
  }

  private assertWritable(a: { status: string; group: { status: string } }) {
    if (a.status === 'CANCELLED') throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Ləğv olunmuş tapşırıq qiymətləndirilmir');
    if (groupIsReadOnly(a.group.status)) throw conflict('ACADEMY_GROUP_READ_ONLY', 'Qrup yalnız oxunur');
  }

  private assertVersion(current: number | undefined, expected: number | undefined) {
    if (expected !== undefined && (current ?? 0) !== expected)
      throw conflict('ACADEMY_VERSION_CONFLICT', 'Qiymət başqa müəllim tərəfindən dəyişdirilib — səhifəni yeniləyin', {
        currentVersion: current ?? 0,
      });
  }

  // ───────────────────────── siyahı və detal

  /** Tapşırığın göndərişləri — qrupun bütün tələbələri (göndərməyənlər də, «id: null») */
  async listForAssignment(user: AuthUser, assignmentId: string): Promise<AcademySubmissionDto[]> {
    const { assignment, access } = await this.access.assignmentAccess(user, assignmentId);
    if (!this.access.can(access, 'submission.review')) throw academyForbidden();
    const a = await this.prisma.academyAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { group: { select: { status: true } } },
    });
    const [enrollments, subs, exts] = await Promise.all([
      this.prisma.academyEnrollment.findMany({
        where: { groupId: a.groupId, status: { in: ROSTER_STATUSES } },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: 'asc' } },
      }),
      this.prisma.academySubmission.findMany({
        where: { assignmentId },
        include: {
          attempts: { select: { id: true, attemptNumber: true, submittedAt: true, isLate: true }, orderBy: { attemptNumber: 'desc' } },
          grade: {
            select: { id: true, status: true, finalScoreCenti: true, version: true, updatedAt: true, selectedAttemptId: true, gradedById: true },
          },
        },
      }),
      this.prisma.academyAssignmentExtension.findMany({ where: { assignmentId } }),
    ]);
    const now = new Date();
    return enrollments
      .filter((e) => e.status !== 'WITHDRAWN' || subs.some((s) => s.studentId === e.studentId))
      .map((e) => {
        const sub = subs.find((s) => s.studentId === e.studentId);
        const ext = exts.find((x) => x.studentId === e.studentId);
        const latest = sub?.attempts[0];
        const g = sub?.grade;
        const st = deriveStudentStatus({
          now,
          availableAt: a.availableAt,
          dueAt: a.dueAt,
          extendedDueAt: ext?.extendedDueAt ?? null,
          latePolicy: a.latePolicy,
          lateCutoffAt: a.lateCutoffAt,
          attemptCount: sub?.attempts.length ?? 0,
          latestAttemptLate: latest?.isLate ?? false,
          latestAttemptAt: latest?.submittedAt ?? null,
          hasDraft: false,
          grade: g ? { status: g.status, updatedAt: g.updatedAt } : null,
          closed: a.status !== 'PUBLISHED' || a.group.status !== 'ACTIVE' || e.status !== 'ACTIVE',
        });
        const attempts = sub?.attempts ?? [];
        const resubmitted = g?.status === 'RETURNED' && latest && latest.submittedAt > g.updatedAt;
        // yoxlanılmalıdır: qiymət yoxdur, avtomatik (təsdiqlənməmiş) və ya köhnəlmiş qaralama, qaytarılandan sonra yeni cəhd
        const needsReview =
          attempts.length > 0 && (!g || (g.status === 'DRAFT' && (!g.gradedById || isStale(g, attempts))) || !!resubmitted);
        return {
          id: sub?.id ?? null,
          assignmentId,
          student: e.student,
          enrollmentStatus: e.status,
          effectiveDueAt: effectiveDueAt(a.dueAt, ext?.extendedDueAt).toISOString(),
          extended: !!ext && ext.extendedDueAt > a.dueAt,
          status: st.status,
          attemptCount: attempts.length,
          latestSubmittedAt: latest?.submittedAt.toISOString() ?? null,
          latestIsLate: latest?.isLate ?? false,
          grade: g
            ? { id: g.id, status: g.status, finalScore: fromCenti(g.finalScoreCenti), maxScore: fromCenti(a.maxScoreCenti), version: g.version }
            : null,
          needsReview,
        };
      });
  }

  async detail(user: AuthUser, submissionId: string): Promise<AcademySubmissionDetailDto> {
    const { sub, access } = await this.loadSubmission(user, submissionId);
    if (!this.access.can(access, 'submission.review')) throw academyForbidden();
    const [assignment, ext, history] = await Promise.all([
      this.assignments.loadRow(sub.assignmentId).then((r) => this.assignments.toDto(r)),
      this.prisma.academyAssignmentExtension.findUnique({
        where: { assignmentId_studentId: { assignmentId: sub.assignmentId, studentId: sub.studentId } },
      }),
      this.history(sub.grade?.id),
    ]);
    return {
      id: sub.id,
      assignment,
      student: sub.student,
      effectiveDueAt: effectiveDueAt(sub.assignment.dueAt, ext?.extendedDueAt).toISOString(),
      attempts: sub.attempts.map(attemptDto),
      grade: sub.grade ? staffGradeDto(sub.grade, sub.assignment.maxScoreCenti, isStale(sub.grade, sub.attempts)) : null,
      history,
      permissions: this.access.permissions(access),
    };
  }

  private async history(gradeId: string | undefined): Promise<AcademyGradeHistoryDto[]> {
    if (!gradeId) return [];
    const rows = await this.prisma.academyGradeHistory.findMany({
      where: { gradeId },
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
    return rows.map((h) => ({
      previousScore: h.previousScoreCenti === null ? null : fromCenti(h.previousScoreCenti),
      newScore: h.newScoreCenti === null ? null : fromCenti(h.newScoreCenti),
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      changedBy: h.changedBy,
      changedAt: h.changedAt.toISOString(),
    }));
  }

  // ───────────────────────── qiymət yazmaq

  async grade(user: AuthUser, submissionId: string, input: AcademyGradeInput): Promise<AcademyGradeDto> {
    const { sub, access } = await this.loadSubmission(user, submissionId);
    if (!this.access.can(access, 'grade.write')) throw academyForbidden();
    const a = sub.assignment;
    this.assertWritable(a);
    if (!sub.attempts.length) throw conflict('ACADEMY_NO_ATTEMPTS', 'Göndərilmiş cəhd yoxdur');
    const prev = sub.grade;
    // açıqlanmış qiyməti dəyişmək — tələbənin gördüyünü dəyişir: yalnız aparıcı / admin və səbəblə
    if (prev?.status === 'RELEASED') {
      if (!this.access.can(access, 'grade.release')) throw academyForbidden();
      if (!input.reason?.trim()) throw unprocessable('ACADEMY_REASON_REQUIRED', 'Açıqlanmış qiyməti dəyişməyin səbəbini yazın');
    }
    this.assertVersion(prev?.version, input.expectedVersion);

    // cəhd seçimi: siyasətə görə; müəllim seçimi yalnız INSTRUCTOR_SELECTED-də
    let selected;
    try {
      const wanted =
        a.attemptSelection === 'INSTRUCTOR_SELECTED' ? (input.selectedAttemptId ?? prev?.selectedAttemptId ?? null) : null;
      selected = selectAttempt(sub.attempts, a.attemptSelection, wanted);
    } catch {
      throw unprocessable('ACADEMY_ATTEMPT_NOT_FOUND', 'Seçilmiş cəhd bu göndərişə aid deyil');
    }
    if (!selected) throw conflict('ACADEMY_NO_ATTEMPTS', 'Göndərilmiş cəhd yoxdur');
    if (a.attemptSelection !== 'INSTRUCTOR_SELECTED' && input.selectedAttemptId && input.selectedAttemptId !== selected.id)
      throw unprocessable('ACADEMY_SELECTION_NOT_ALLOWED', 'Bu tapşırıqda cəhd siyasətlə seçilir');

    const { itemScores, rubricScores, rawCenti } = this.scores(a, selected, input);
    const fin = computeFinalScore({
      rawCenti,
      maxCenti: a.maxScoreCenti,
      isLate: selected.isLate,
      latePolicy: a.latePolicy,
      latePenaltyPercent: a.latePenaltyPercent,
    });
    const now = new Date();
    const newStatus = prev?.status === 'RELEASED' ? 'RELEASED' : 'DRAFT';

    const gradeId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AcademySubmission" WHERE id = ${sub.id} FOR UPDATE`;
      const cur = await tx.academyGrade.findUnique({ where: { submissionId: sub.id }, select: { version: true, status: true } });
      this.assertVersion(cur?.version, input.expectedVersion ?? prev?.version ?? 0);
      const data = {
        selectedAttemptId: selected.id,
        rawScoreCenti: fin.rawCenti,
        latePenaltyCenti: fin.penaltyCenti,
        finalScoreCenti: fin.finalCenti,
        feedback: input.feedback ?? prev?.feedback ?? null,
        status: newStatus,
        gradedById: user.id,
        gradedAt: now,
        ...(newStatus === 'RELEASED' ? { releasedAt: now } : {}),
        version: (cur?.version ?? 0) + 1,
      } as const;
      const g = cur
        ? await tx.academyGrade.update({ where: { submissionId: sub.id }, data })
        : await tx.academyGrade.create({ data: { submissionId: sub.id, assignmentId: a.id, ...data } });
      await tx.academyGradeItem.deleteMany({ where: { gradeId: g.id } });
      await tx.academyRubricScore.deleteMany({ where: { gradeId: g.id } });
      if (itemScores.length)
        await tx.academyGradeItem.createMany({
          data: itemScores.map((x) => ({ gradeId: g.id, assignmentId: a.id, itemId: x.itemId, scoreCenti: x.scoreCenti, comment: x.comment })),
        });
      if (rubricScores.length)
        await tx.academyRubricScore.createMany({
          data: rubricScores.map((x) => ({ gradeId: g.id, assignmentId: a.id, criterionId: x.criterionId, scoreCenti: x.scoreCenti, comment: x.comment })),
        });
      await tx.academyGradeHistory.create({
        data: {
          gradeId: g.id,
          previousScoreCenti: prev ? prev.finalScoreCenti : null,
          newScoreCenti: fin.finalCenti,
          previousStatus: prev?.status ?? null,
          newStatus,
          reason: input.reason?.trim() || null,
          snapshot: { selectedAttemptId: selected.id, rawScoreCenti: fin.rawCenti, latePenaltyCenti: fin.penaltyCenti, itemScores, rubricScores },
          changedById: user.id,
        },
      });
      if (newStatus === 'RELEASED') await emitAcademyEvent(tx, { type: 'GRADE_RELEASED', gradeId: g.id, version: g.version });
      return g.id;
    });

    await this.audit.record(user, {
      action: prev?.status === 'RELEASED' ? 'academy.grade.change' : 'academy.grade.write',
      entityType: 'ACADEMY',
      entityId: gradeId,
      entityTitle: `${a.group.code} · ${a.title} · ${sub.student.name}`,
      details: {
        submissionId: sub.id,
        before: prev ? { finalScore: fromCenti(prev.finalScoreCenti), status: prev.status } : null,
        after: { finalScore: fromCenti(fin.finalCenti), status: newStatus },
        reason: input.reason?.trim() || null,
      },
    });
    return this.gradeDto(sub.id);
  }

  /**
   * Ballar: rubrika varsa — bütün meyarlar tələb olunur, xam bal = rubrika cəmi (rubrika cəmi = tapşırığın maksimumu).
   * Rubrika yoxdursa — element balları: platforma tapşırıqları defolt olaraq seçilmiş cəhdin avtomatik balı
   * (müəllim dəyişə bilər), qalan elementlər müəllimdən tələb olunur.
   */
  private scores(
    a: {
      items: Array<{ id: string; kind: string; maxScoreCenti: number }>;
      rubric: { criteria: Array<{ id: string; maxScoreCenti: number }> } | null;
    },
    selected: { answers: Array<{ itemId: string; evaluationScoreCenti: number | null }> },
    input: AcademyGradeInput,
  ) {
    const itemById = new Map(a.items.map((i) => [i.id, i]));
    const givenItems = new Map<string, { scoreCenti: number; comment: string | null }>();
    for (const x of input.itemScores ?? []) {
      const item = itemById.get(x.itemId);
      if (!item) throw unprocessable('ACADEMY_ITEM_MISMATCH', 'Element bu tapşırığa aid deyil', { itemId: x.itemId });
      if (givenItems.has(x.itemId)) throw unprocessable('ACADEMY_DUPLICATE_SCORE', 'Eyni elementə iki bal', { itemId: x.itemId });
      const c = toCenti(x.score);
      if (c < 0 || c > item.maxScoreCenti)
        throw unprocessable('ACADEMY_SCORE_OUT_OF_RANGE', 'Bal elementin maksimumundan böyükdür', { itemId: x.itemId, max: fromCenti(item.maxScoreCenti) });
      givenItems.set(x.itemId, { scoreCenti: c, comment: x.comment?.trim() || null });
    }

    if (a.rubric) {
      if (!input.rubricScores) throw unprocessable('ACADEMY_RUBRIC_REQUIRED', 'Rubrika üzrə balları daxil edin');
      const critById = new Map(a.rubric.criteria.map((c) => [c.id, c]));
      const rubricScores: Array<{ criterionId: string; scoreCenti: number; comment: string | null }> = [];
      for (const x of input.rubricScores) {
        const c = critById.get(x.criterionId);
        if (!c) throw unprocessable('ACADEMY_CRITERION_MISMATCH', 'Meyar bu rubrikaya aid deyil', { criterionId: x.criterionId });
        if (rubricScores.some((r) => r.criterionId === x.criterionId))
          throw unprocessable('ACADEMY_DUPLICATE_SCORE', 'Eyni meyara iki bal', { criterionId: x.criterionId });
        const s = toCenti(x.score);
        if (s < 0 || s > c.maxScoreCenti)
          throw unprocessable('ACADEMY_SCORE_OUT_OF_RANGE', 'Bal meyarın maksimumundan böyükdür', { criterionId: c.id, max: fromCenti(c.maxScoreCenti) });
        rubricScores.push({ criterionId: c.id, scoreCenti: s, comment: x.comment?.trim() || null });
      }
      const missing = a.rubric.criteria.filter((c) => !rubricScores.some((r) => r.criterionId === c.id)).map((c) => c.id);
      if (missing.length) throw unprocessable('ACADEMY_SCORE_REQUIRED', 'Bütün meyarları qiymətləndirin', { criterionIds: missing });
      // element balları rubrika rejimində məlumat xarakterlidir (cəmə daxil deyil)
      const itemScores = [...givenItems].map(([itemId, v]) => ({ itemId, ...v }));
      return { itemScores, rubricScores, rawCenti: rubricScores.reduce((s, r) => s + r.scoreCenti, 0) };
    }
    if (input.rubricScores?.length) throw unprocessable('ACADEMY_RUBRIC_NOT_SET', 'Bu tapşırığın rubrikası yoxdur');

    const missing: string[] = [];
    const itemScores = a.items.flatMap((item) => {
      const given = givenItems.get(item.id);
      if (given) return [{ itemId: item.id, ...given }];
      if (item.kind === 'LEARNING_STEP') {
        const auto = selected.answers.find((x) => x.itemId === item.id)?.evaluationScoreCenti ?? 0;
        return [{ itemId: item.id, scoreCenti: Math.min(auto, item.maxScoreCenti), comment: null }];
      }
      missing.push(item.id);
      return [];
    });
    if (missing.length) throw unprocessable('ACADEMY_SCORE_REQUIRED', 'Bütün elementləri qiymətləndirin', { itemIds: missing });
    return { itemScores, rubricScores: [], rawCenti: itemScores.reduce((s, x) => s + x.scoreCenti, 0) };
  }

  private async gradeDto(submissionId: string): Promise<AcademyGradeDto> {
    const g = await this.prisma.academyGrade.findUniqueOrThrow({
      where: { submissionId },
      include: { ...gradeInclude, submission: { select: { attempts: { select: { id: true, attemptNumber: true } } } } },
    });
    const max = await this.prisma.academyAssignment.findUniqueOrThrow({ where: { id: g.assignmentId }, select: { maxScoreCenti: true } });
    return staffGradeDto(g, max.maxScoreCenti, isStale(g, g.submission.attempts));
  }

  // ───────────────────────── açıqlama və qaytarma

  async release(user: AuthUser, submissionId: string, expectedVersion?: number): Promise<AcademyGradeDto> {
    const { sub, access } = await this.loadSubmission(user, submissionId);
    if (!this.access.can(access, 'grade.release')) throw academyForbidden();
    this.assertWritable(sub.assignment);
    const g = sub.grade;
    if (!g) throw conflict('ACADEMY_NOT_GRADED', 'Əvvəlcə qiymət yazın');
    if (g.status !== 'DRAFT') throw conflict('ACADEMY_GRADE_NOT_DRAFT', 'Qiymət artıq açıqlanıb və ya qaytarılıb');
    if (isStale(g, sub.attempts)) throw conflict('ACADEMY_GRADE_STALE', 'Seçilmiş cəhddən sonra yeni cəhd var — yenidən qiymətləndirin');
    this.assertVersion(g.version, expectedVersion);
    await this.transition(user, sub, g, 'RELEASED', null);
    return this.gradeDto(sub.id);
  }

  /** Bütün hazır qaralamaları açıqlamaq (köhnəlmiş / qiymətsiz olanlar keçilir) */
  async releaseAll(user: AuthUser, assignmentId: string): Promise<{ released: number; skipped: Array<{ submissionId: string; reason: string }> }> {
    const { assignment, access } = await this.access.assignmentAccess(user, assignmentId);
    if (!this.access.can(access, 'grade.release')) throw academyForbidden();
    const subs = await this.prisma.academySubmission.findMany({
      where: { assignmentId: assignment.id, grade: { status: 'DRAFT' } },
      select: { id: true },
    });
    let released = 0;
    const skipped: Array<{ submissionId: string; reason: string }> = [];
    for (const s of subs) {
      try {
        await this.release(user, s.id);
        released++;
      } catch (e) {
        const code = (e as { code?: string }).code ?? 'ERROR';
        skipped.push({ submissionId: s.id, reason: code });
      }
    }
    return { released, skipped };
  }

  /** Düzəliş üçün qaytarmaq: tələbə rəyi görür (bal yox) və bir düzəliş cəhdi edə bilər */
  async returnForRevision(user: AuthUser, submissionId: string, input: AcademyReturnInput): Promise<AcademyGradeDto> {
    const { sub, access } = await this.loadSubmission(user, submissionId);
    if (!this.access.can(access, 'grade.release')) throw academyForbidden();
    this.assertWritable(sub.assignment);
    if (!sub.attempts.length) throw conflict('ACADEMY_NO_ATTEMPTS', 'Göndərilmiş cəhd yoxdur');
    const g = sub.grade;
    if (g && g.status !== 'DRAFT') throw conflict('ACADEMY_GRADE_NOT_DRAFT', 'Açıqlanmış / qaytarılmış qiymət qaytarılmır');
    this.assertVersion(g?.version, input.expectedVersion);
    await this.transition(user, sub, g, 'RETURNED', input.feedback);
    return this.gradeDto(sub.id);
  }

  private async transition(
    user: AuthUser,
    sub: { id: string; assignmentId: string; student: { name: string }; assignment: { title: string; group: { code: string } } },
    g: GradeRow | null,
    to: 'RELEASED' | 'RETURNED',
    feedback: string | null,
  ) {
    const now = new Date();
    const gradeId = await this.prisma.$transaction(async (tx: Tx) => {
      await tx.$queryRaw`SELECT id FROM "AcademySubmission" WHERE id = ${sub.id} FOR UPDATE`;
      const cur = await tx.academyGrade.findUnique({ where: { submissionId: sub.id }, select: { version: true, status: true } });
      if ((cur?.version ?? 0) !== (g?.version ?? 0) || (cur?.status ?? null) !== (g?.status ?? null))
        throw conflict('ACADEMY_VERSION_CONFLICT', 'Qiymət bu arada dəyişdirilib — səhifəni yeniləyin');
      const data = {
        status: to,
        version: (cur?.version ?? 0) + 1,
        ...(to === 'RELEASED' ? { releasedAt: now } : { feedback, gradedById: user.id, gradedAt: now }),
      };
      const row = cur
        ? await tx.academyGrade.update({ where: { submissionId: sub.id }, data })
        : await tx.academyGrade.create({ data: { submissionId: sub.id, assignmentId: sub.assignmentId, ...data } });
      await tx.academyGradeHistory.create({
        data: {
          gradeId: row.id,
          previousScoreCenti: g ? g.finalScoreCenti : null,
          newScoreCenti: to === 'RELEASED' ? row.finalScoreCenti : null,
          previousStatus: g?.status ?? null,
          newStatus: to,
          reason: to === 'RETURNED' ? 'Düzəliş üçün qaytarıldı' : null,
          changedById: user.id,
        },
      });
      await emitAcademyEvent(
        tx,
        to === 'RELEASED'
          ? { type: 'GRADE_RELEASED', gradeId: row.id, version: row.version }
          : { type: 'SUBMISSION_RETURNED', gradeId: row.id, version: row.version },
      );
      return row.id;
    });
    await this.audit.record(user, {
      action: to === 'RELEASED' ? 'academy.grade.release' : 'academy.grade.return',
      entityType: 'ACADEMY',
      entityId: gradeId,
      entityTitle: `${sub.assignment.group.code} · ${sub.assignment.title} · ${sub.student.name}`,
      details: { submissionId: sub.id, finalScore: g ? fromCenti(g.finalScoreCenti) : null },
    });
  }

  // ───────────────────────── avtomatik qaralama

  /**
   * AUTOMATIC tapşırıqda yeni cəhddən sonra qaralama qiymət (siyasətlə seçilmiş cəhdin platforma balları) —
   * göndərişlə eyni tranzaksiyada. Müəllim əl ilə qiymət yazıbsa, açıqlanıb / qaytarılıbsa toxunulmur
   * (müəllim «köhnəlmiş» işarəsini görür). HYBRID / MANUAL-da avtomatik ballar yalnız cəhddə saxlanılır.
   */
  async syncAutoDraft(tx: Tx, submissionId: string): Promise<void> {
    const sub = await tx.academySubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        assignment: { include: { items: true } },
        attempts: { include: { answers: true }, orderBy: { attemptNumber: 'asc' } },
        grade: true,
      },
    });
    const a = sub.assignment;
    if (a.gradingType !== 'AUTOMATIC') return;
    const g = sub.grade;
    if (g && (g.status !== 'DRAFT' || g.gradedById)) return;
    const policy = a.attemptSelection === 'INSTRUCTOR_SELECTED' ? 'LATEST_ATTEMPT' : a.attemptSelection;
    const selected = selectAttempt(sub.attempts, policy);
    if (!selected) return;
    const itemScores = a.items.map((item) => ({
      itemId: item.id,
      scoreCenti: Math.min(selected.answers.find((x) => x.itemId === item.id)?.evaluationScoreCenti ?? 0, item.maxScoreCenti),
    }));
    const fin = computeFinalScore({
      rawCenti: itemScores.reduce((s, x) => s + x.scoreCenti, 0),
      maxCenti: a.maxScoreCenti,
      isLate: selected.isLate,
      latePolicy: a.latePolicy,
      latePenaltyPercent: a.latePenaltyPercent,
    });
    const data = {
      selectedAttemptId: selected.id,
      rawScoreCenti: fin.rawCenti,
      latePenaltyCenti: fin.penaltyCenti,
      finalScoreCenti: fin.finalCenti,
      status: 'DRAFT' as const,
      gradedAt: new Date(),
      version: (g?.version ?? 0) + 1,
    };
    const row = g
      ? await tx.academyGrade.update({ where: { id: g.id }, data })
      : await tx.academyGrade.create({ data: { submissionId, assignmentId: a.id, ...data } });
    await tx.academyGradeItem.deleteMany({ where: { gradeId: row.id } });
    await tx.academyGradeItem.createMany({ data: itemScores.map((x) => ({ gradeId: row.id, assignmentId: a.id, ...x })) });
    await tx.academyGradeHistory.create({
      data: {
        gradeId: row.id,
        previousScoreCenti: g ? g.finalScoreCenti : null,
        newScoreCenti: fin.finalCenti,
        previousStatus: g?.status ?? null,
        newStatus: 'DRAFT',
        reason: 'Avtomatik qiymətləndirmə',
        snapshot: { selectedAttemptId: selected.id, itemScores },
      },
    });
  }

  // ───────────────────────── jurnal

  async gradebook(user: AuthUser, groupId: string): Promise<AcademyGradebookDto> {
    const access: GroupAccess = await this.access.requireAny(user, groupId, ['submission.review', 'analytics.view']);
    const [assignments, enrollments, subs, exts] = await Promise.all([
      this.prisma.academyAssignment.findMany({
        where: { groupId, status: { in: STUDENT_VISIBLE } },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.academyEnrollment.findMany({
        where: { groupId, status: { in: ROSTER_STATUSES } },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: 'asc' } },
      }),
      this.prisma.academySubmission.findMany({
        where: { groupId },
        include: {
          attempts: { select: { submittedAt: true, isLate: true }, orderBy: { attemptNumber: 'desc' } },
          grade: { select: { status: true, finalScoreCenti: true, updatedAt: true } },
        },
      }),
      this.prisma.academyAssignmentExtension.findMany({ where: { assignment: { groupId } } }),
    ]);
    const now = new Date();
    return {
      group: { id: access.group.id, code: access.group.code, name: access.group.name },
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        maxScore: fromCenti(a.maxScoreCenti),
        dueAt: a.dueAt.toISOString(),
        status: a.status,
      })),
      rows: enrollments.map((e) => {
        let earned = 0;
        let possible = 0;
        const cells = assignments.map((a) => {
          const sub = subs.find((s) => s.assignmentId === a.id && s.studentId === e.studentId);
          const ext = exts.find((x) => x.assignmentId === a.id && x.studentId === e.studentId);
          const latest = sub?.attempts[0];
          const g = sub?.grade;
          const st = deriveStudentStatus({
            now,
            availableAt: a.availableAt,
            dueAt: a.dueAt,
            extendedDueAt: ext?.extendedDueAt ?? null,
            latePolicy: a.latePolicy,
            lateCutoffAt: a.lateCutoffAt,
            attemptCount: sub?.attempts.length ?? 0,
            latestAttemptLate: latest?.isLate ?? false,
            latestAttemptAt: latest?.submittedAt ?? null,
            hasDraft: false,
            grade: g ? { status: g.status, updatedAt: g.updatedAt } : null,
            closed: a.status !== 'PUBLISHED' || access.group.status !== 'ACTIVE' || e.status !== 'ACTIVE',
          });
          if (g?.status === 'RELEASED') {
            earned += g.finalScoreCenti;
            possible += a.maxScoreCenti;
          }
          return {
            assignmentId: a.id,
            status: st.status,
            finalScore: g && g.status !== 'RETURNED' ? fromCenti(g.finalScoreCenti) : null,
            gradeStatus: g?.status ?? null,
          };
        });
        return { student: e.student, enrollmentStatus: e.status, cells, average: percent(earned, possible) };
      }),
    };
  }

  /** CSV ixracı: Excel-də düstur kimi icra olunmasın deyə =, +, -, @ ilə başlayan xanalar qorunur */
  async gradebookCsv(user: AuthUser, groupId: string): Promise<{ filename: string; csv: string }> {
    const gb = await this.gradebook(user, groupId);
    const cell = (v: string | number | null) => {
      let s = v === null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Tələbə', 'Vəziyyət', ...gb.assignments.map((a) => `${a.title} (${a.maxScore})`), 'Orta %'];
    const lines = [header.map(cell).join(',')];
    for (const r of gb.rows)
      lines.push(
        [r.student.name, r.enrollmentStatus, ...r.cells.map((c) => (c.gradeStatus === 'RELEASED' ? c.finalScore : null)), r.average]
          .map(cell)
          .join(','),
      );
    return { filename: `${gb.group.code}-jurnal.csv`, csv: `﻿${lines.join('\r\n')}\r\n` };
  }
}
