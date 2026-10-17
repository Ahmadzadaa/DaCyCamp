import { Injectable } from '@nestjs/common';
import { Prisma, type AcademyAssignment, type AcademyAssignmentItem } from '@prisma/client';
import {
  attemptLimitReached,
  deriveStudentStatus,
  evaluateSubmissionWindow,
  groupAcceptsSubmissions,
  scaleScore,
  type AcademyAnswerInput,
  type AcademyDraftInput,
  type AcademySubmitInput,
  type AcademySubmitReceiptDto,
  type StepType,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound, unprocessable } from '../../common/errors';
import { academyForbidden } from '../access/academy-access.service';
import { STUDENT_VISIBLE } from '../assignments/assignments.service';
import type { StepSnapshot } from '../integrations/content.adapter';
import { AcademyEvaluationAdapter, type StepEvidence } from '../integrations/evaluation.adapter';
import { AcademyGradingService } from '../grading/grading.service';
import { emitAcademyEvent } from '../notifications/academy-events';

type Assignment = AcademyAssignment & { group: { status: string } };

/** Normallaşdırılmış cavab: hər element üçün bir sətir (platforma tapşırıqları avtomatik daxil edilir) */
interface NormalizedAnswer {
  item: AcademyAssignmentItem;
  text: string | null;
  code: string | null;
  link: string | null;
  fileIds: string[];
}

const blank = (s: string | undefined | null) => !s || !s.trim();

/**
 * Göndərişlər: konteyner (tələbə × tapşırıq) + dəyişməz cəhdlər. Cəhd nömrəsi göndəriş sətri kilidlənərək
 * (SELECT … FOR UPDATE) tranzaksiyada verilir; eyni idempotency açarı ilə təkrar sorğu əvvəlki cəhdi qaytarır.
 * Son tarix, cəhd limiti, qrup və yazılış vəziyyəti serverdə (server vaxtı ilə) yoxlanılır; platforma
 * tapşırıqlarının nəticəsini server özü seçir — müştəridən bal qəbul edilmir.
 */
@Injectable()
export class AcademySubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluation: AcademyEvaluationAdapter,
    private readonly grading: AcademyGradingService,
  ) {}

  /** Tələbə bu tapşırığa indi göndərə bilərmi — bütün yoxlamalar; bağlıdırsa səbəb kodu ilə xəta */
  private async openContext(user: AuthUser, assignmentId: string) {
    const a = await this.prisma.academyAssignment.findUnique({
      where: { id: assignmentId },
      include: { group: { select: { status: true } } },
    });
    if (!a) throw notFound('ACADEMY_ASSIGNMENT_NOT_FOUND', 'Tapşırıq tapılmadı');
    const enr = await this.prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: a.groupId, studentId: user.id } },
      select: { status: true },
    });
    // göndəriş yalnız ACTIVE yazılışda (PAUSED / WITHDRAWN / PENDING — 403)
    if (enr?.status !== 'ACTIVE' || !STUDENT_VISIBLE.includes(a.status)) throw academyForbidden();
    if (a.status !== 'PUBLISHED') throw conflict('ACADEMY_ASSIGNMENT_CLOSED', 'Tapşırıq bağlıdır');
    if (!groupAcceptsSubmissions(a.group.status)) throw conflict('ACADEMY_GROUP_CLOSED', 'Qrup göndəriş qəbul etmir');
    const ext = await this.prisma.academyAssignmentExtension.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      select: { extendedDueAt: true },
    });
    this.assertWindow(a, ext?.extendedDueAt ?? null, new Date());
    return { a, extendedDueAt: ext?.extendedDueAt ?? null };
  }

  private assertWindow(a: Assignment, extendedDueAt: Date | null, now: Date) {
    const w = evaluateSubmissionWindow({
      now,
      availableAt: a.availableAt,
      dueAt: a.dueAt,
      extendedDueAt,
      latePolicy: a.latePolicy,
      lateCutoffAt: a.lateCutoffAt,
    });
    if (!w.allowed) {
      const msg = {
        NOT_OPEN: 'Tapşırıq hələ açılmayıb',
        DEADLINE_PASSED: 'Son tarix keçib',
        CUTOFF_PASSED: 'Gecikmiş göndəriş müddəti də bitib',
      }[w.reason];
      throw conflict(`ACADEMY_${w.reason}`, msg, { effectiveDueAt: w.effectiveDueAt.toISOString() });
    }
    return w;
  }

  /**
   * Cavabları elementlərlə yoxlayır: başqa tapşırığın elementi, təkrar element, növə uyğun olmayan sahə — 422.
   * `requireAll`: göndərişdə hər mətn / kod / link / fayl elementinin cavabı olmalıdır.
   */
  private normalize(items: AcademyAssignmentItem[], answers: AcademyAnswerInput[], requireAll: boolean): NormalizedAnswer[] {
    const byId = new Map(items.map((i) => [i.id, i]));
    const given = new Map<string, AcademyAnswerInput>();
    for (const ans of answers) {
      if (!byId.has(ans.itemId)) throw unprocessable('ACADEMY_ITEM_MISMATCH', 'Cavab bu tapşırığın elementinə aid deyil', { itemId: ans.itemId });
      if (given.has(ans.itemId)) throw unprocessable('ACADEMY_DUPLICATE_ANSWER', 'Eyni elementə iki cavab', { itemId: ans.itemId });
      given.set(ans.itemId, ans);
    }
    const missing: string[] = [];
    const out = items.map((item): NormalizedAnswer => {
      const ans = given.get(item.id);
      const provided = {
        text: !blank(ans?.text),
        code: !blank(ans?.code),
        link: !blank(ans?.link),
        files: (ans?.fileIds?.length ?? 0) > 0,
      };
      const allowedField = { LEARNING_STEP: null, TEXT: 'text', CODE: 'code', LINK: 'link', FILE: 'files' }[item.kind];
      for (const [field, has] of Object.entries(provided))
        if (has && field !== allowedField)
          throw unprocessable('ACADEMY_ANSWER_KIND_MISMATCH', 'Cavab elementin növünə uyğun deyil', { itemId: item.id, field });
      if (requireAll && allowedField && !provided[allowedField as keyof typeof provided]) missing.push(item.id);
      return {
        item,
        text: provided.text ? ans!.text! : null,
        code: provided.code ? ans!.code! : null,
        link: provided.link ? ans!.link! : null,
        fileIds: [...new Set(ans?.fileIds ?? [])],
      };
    });
    if (missing.length) throw unprocessable('ACADEMY_ANSWER_REQUIRED', 'Bütün elementlərə cavab verin', { itemIds: missing });
    return out;
  }

  /** Fayllar: tələbənin özünün, bu tapşırıq üçün yüklənmiş və hələ heç nəyə bağlanmamış */
  private async assertOwnStagedFiles(userId: string, assignmentId: string, fileIds: string[]) {
    if (!fileIds.length) return;
    const n = await this.prisma.academyFile.count({
      where: { id: { in: fileIds }, ownerId: userId, assignmentId, purpose: 'SUBMISSION', status: 'STAGED' },
    });
    if (n !== fileIds.length) throw unprocessable('ACADEMY_FILE_INVALID', 'Fayl tapılmadı və ya artıq istifadə olunub');
  }

  /**
   * Yeni cəhd mümkündürmü: açıqlanmış qiymətdən sonra yox; limit dolubsa yox (qaytarılmış göndərişə bir düzəliş
   * cəhdi istisnadır). Kilid altında tranzaksiyada təkrar yoxlanılır — burada erkən və aydın xəta üçündür.
   */
  private assertAttemptAllowed(
    state: { attempts: Array<{ submittedAt: Date }>; grade: { status: string; updatedAt: Date } | null } | null,
    maxAttempts: number,
  ) {
    const attempts = state?.attempts ?? [];
    const grade = state?.grade ?? null;
    if (grade?.status === 'RELEASED') throw conflict('ACADEMY_ALREADY_GRADED', 'Qiymət artıq açıqlanıb — yeni cəhd edilə bilməz');
    const latest = attempts.reduce<Date | null>((d, x) => (!d || x.submittedAt > d ? x.submittedAt : d), null);
    const returnedAwaitingResubmission = grade?.status === 'RETURNED' && !(latest && latest > grade.updatedAt);
    if (attemptLimitReached({ attemptsUsed: attempts.length, maxAttempts, returnedAwaitingResubmission }))
      throw conflict('ACADEMY_ATTEMPT_LIMIT', 'Cəhd limiti bitib', { maxAttempts });
  }

  private submissionState(assignmentId: string, studentId: string) {
    return this.prisma.academySubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { attempts: { select: { submittedAt: true } }, grade: { select: { status: true, updatedAt: true } } },
    });
  }

  // ───────────────────────── qaralama

  async saveDraft(user: AuthUser, assignmentId: string, input: AcademyDraftInput): Promise<{ updatedAt: string }> {
    const { a } = await this.openContext(user, assignmentId);
    this.assertAttemptAllowed(await this.submissionState(assignmentId, user.id), a.maxAttempts);
    const items = await this.prisma.academyAssignmentItem.findMany({ where: { assignmentId } });
    const normalized = this.normalize(items, input.answers, false);
    const fileIds = normalized.flatMap((x) => x.fileIds);
    if (new Set(fileIds).size !== fileIds.length) throw unprocessable('ACADEMY_FILE_INVALID', 'Eyni fayl iki elementdə');
    await this.assertOwnStagedFiles(user.id, assignmentId, fileIds);
    // yalnız doldurulmuş cavablar saxlanılır
    const answers = normalized
      .filter((x) => x.text !== null || x.code !== null || x.link !== null || x.fileIds.length > 0)
      .map((x) => ({
        itemId: x.item.id,
        ...(x.text !== null ? { text: x.text } : {}),
        ...(x.code !== null ? { code: x.code } : {}),
        ...(x.link !== null ? { link: x.link } : {}),
        ...(x.fileIds.length ? { fileIds: x.fileIds } : {}),
      }));
    const d = await this.prisma.academySubmissionDraft.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      create: { assignmentId, groupId: a.groupId, studentId: user.id, answers },
      update: { answers },
    });
    return { updatedAt: d.updatedAt.toISOString() };
  }

  async deleteDraft(user: AuthUser, assignmentId: string): Promise<{ ok: true }> {
    await this.prisma.academySubmissionDraft.deleteMany({ where: { assignmentId, studentId: user.id } });
    return { ok: true };
  }

  // ───────────────────────── göndəriş

  /** Konteyner tranzaksiyadan əvvəl yaradılır (paralel ilk göndərişdə unikal açar toqquşması tranzaksiyanı pozmasın) */
  private async ensureContainer(a: Assignment, studentId: string): Promise<string> {
    const where = { assignmentId_studentId: { assignmentId: a.id, studentId } };
    const found = await this.prisma.academySubmission.findUnique({ where, select: { id: true } });
    if (found) return found.id;
    try {
      const created = await this.prisma.academySubmission.create({
        data: { assignmentId: a.id, groupId: a.groupId, studentId },
        select: { id: true },
      });
      return created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.academySubmission.findUnique({ where, select: { id: true } });
        if (again) return again.id;
      }
      throw e;
    }
  }

  private findReplay(studentId: string, assignmentId: string, idempotencyKey: string) {
    return this.prisma.academySubmissionAttempt.findFirst({
      where: { idempotencyKey, submission: { assignmentId, studentId } },
      select: { id: true },
    });
  }

  async submit(user: AuthUser, assignmentId: string, input: AcademySubmitInput): Promise<AcademySubmitReceiptDto> {
    // təkrar sorğu (iki klik, şəbəkə xətası): yoxlamalardan ƏVVƏL — artıq qəbul olunmuş cəhd yenidən rədd edilməsin
    const previous = await this.findReplay(user.id, assignmentId, input.idempotencyKey);
    if (previous) return this.receipt(user.id, assignmentId, previous.id, true);
    try {
      const r = await this.createAttempt(user, assignmentId, input);
      return this.receipt(user.id, assignmentId, r.attemptId, r.replayed);
    } catch (e) {
      // paralel eyni sorğu: digəri bu arada qəbul olunubsa (fayllar bağlanıb, limit dolub) — xəta yox, onun qəbzi
      const raced = await this.findReplay(user.id, assignmentId, input.idempotencyKey);
      if (raced) return this.receipt(user.id, assignmentId, raced.id, true);
      throw e;
    }
  }

  private async createAttempt(
    user: AuthUser,
    assignmentId: string,
    input: AcademySubmitInput,
  ): Promise<{ attemptId: string; replayed: boolean }> {
    const { a, extendedDueAt } = await this.openContext(user, assignmentId);
    this.assertAttemptAllowed(await this.submissionState(assignmentId, user.id), a.maxAttempts);
    const items = await this.prisma.academyAssignmentItem.findMany({
      where: { assignmentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const answers = this.normalize(items, input.answers, true);
    const fileIds = answers.flatMap((x) => x.fileIds);
    if (new Set(fileIds).size !== fileIds.length) throw unprocessable('ACADEMY_FILE_INVALID', 'Eyni fayl iki elementdə');
    await this.assertOwnStagedFiles(user.id, assignmentId, fileIds);

    // platforma nəticəsi — server seçir (tapşırıq açılandan indiyədək, yalnız bu tələbənin qeydləri)
    const stepItems = items.filter((i) => i.kind === 'LEARNING_STEP' && i.sourceSnapshot);
    const evidence: Map<string, StepEvidence> = stepItems.length
      ? await this.evaluation.evidence(
          user.id,
          stepItems.map((i) => {
            const s = i.sourceSnapshot as unknown as StepSnapshot;
            return { stepId: s.stepId, type: s.type as StepType };
          }),
          a.availableAt,
          new Date(),
        )
      : new Map();

    const submissionId = await this.ensureContainer(a, user.id);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AcademySubmission" WHERE id = ${submissionId} FOR UPDATE`;
      const dup = await tx.academySubmissionAttempt.findUnique({
        where: { submissionId_idempotencyKey: { submissionId, idempotencyKey: input.idempotencyKey } },
        select: { id: true },
      });
      if (dup) return { attemptId: dup.id, replayed: true };
      const prior = await tx.academySubmissionAttempt.findMany({
        where: { submissionId },
        select: { attemptNumber: true, submittedAt: true },
        orderBy: { attemptNumber: 'desc' },
      });
      const grade = await tx.academyGrade.findUnique({ where: { submissionId }, select: { status: true, updatedAt: true } });
      this.assertAttemptAllowed({ attempts: prior, grade }, a.maxAttempts);

      // son tarix kilid altında, qəbul anının server vaxtı ilə
      const now = new Date();
      const w = this.assertWindow(a, extendedDueAt, now);
      const isLate = w.allowed && w.late;

      let autoScoreCenti = 0;
      const rows = answers.map((x) => {
        const s = x.item.sourceSnapshot as StepSnapshot | null;
        if (x.item.kind !== 'LEARNING_STEP' || !s) return { x, ev: null as StepEvidence | null, score: null as number | null };
        const ev = evidence.get(s.stepId) ?? null;
        const score = ev ? scaleScore(x.item.maxScoreCenti, ev.ratio) : 0;
        autoScoreCenti += score;
        return { x, ev, score };
      });
      const hasSteps = rows.some((r) => r.score !== null);

      const attempt = await tx.academySubmissionAttempt.create({
        data: {
          submissionId,
          assignmentId,
          attemptNumber: (prior[0]?.attemptNumber ?? 0) + 1,
          assignmentVersion: a.version,
          submittedAt: now,
          isLate,
          idempotencyKey: input.idempotencyKey,
          evaluationStatus: hasSteps ? 'COMPLETED' : 'NOT_APPLICABLE',
          autoScoreCenti: hasSteps ? autoScoreCenti : null,
          evaluatedAt: hasSteps ? now : null,
        },
      });
      for (const { x, ev, score } of rows) {
        const isStep = score !== null;
        const answer = await tx.academySubmissionItem.create({
          data: {
            attemptId: attempt.id,
            assignmentId,
            itemId: x.item.id,
            kind: x.item.kind,
            textAnswer: x.text,
            codeAnswer: x.code,
            linkUrl: x.link,
            learningSubmissionId: ev?.learningSubmissionId ?? null,
            evaluationStatus: isStep ? 'COMPLETED' : 'NOT_APPLICABLE',
            evaluationTrust: isStep ? (ev?.trust ?? null) : null,
            evaluationPassed: isStep ? (ev?.passed ?? false) : null,
            evaluationScoreCenti: score,
            evidenceAt: ev?.at ?? null,
          },
        });
        if (x.fileIds.length) {
          const bound = await tx.academyFile.updateMany({
            where: { id: { in: x.fileIds }, ownerId: user.id, assignmentId, purpose: 'SUBMISSION', status: 'STAGED' },
            data: { status: 'ATTACHED', submissionItemId: answer.id, attachedAt: now },
          });
          if (bound.count !== x.fileIds.length)
            throw unprocessable('ACADEMY_FILE_INVALID', 'Fayl tapılmadı və ya artıq istifadə olunub');
        }
      }
      await tx.academySubmissionDraft.deleteMany({ where: { assignmentId, studentId: user.id } });
      // AUTOMATIC: qaralama qiymət eyni tranzaksiyada (tələbəyə görünmür — açıqlama müəllimdədir)
      await this.grading.syncAutoDraft(tx, submissionId);
      await emitAcademyEvent(tx, { type: 'SUBMISSION_RECEIVED', attemptId: attempt.id });
      return { attemptId: attempt.id, replayed: false };
    });
  }

  /** Qəbz: cəhd + tələbənin indiki vəziyyəti */
  async receipt(studentId: string, assignmentId: string, attemptId: string, replayed: boolean): Promise<AcademySubmitReceiptDto> {
    const attempt = await this.prisma.academySubmissionAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    const [a, ext, sub] = await Promise.all([
      this.prisma.academyAssignment.findUniqueOrThrow({ where: { id: assignmentId }, include: { group: { select: { status: true } } } }),
      this.prisma.academyAssignmentExtension.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        select: { extendedDueAt: true },
      }),
      this.prisma.academySubmission.findUniqueOrThrow({
        where: { id: attempt.submissionId },
        include: {
          attempts: { select: { submittedAt: true, isLate: true }, orderBy: { attemptNumber: 'desc' } },
          grade: { select: { status: true, updatedAt: true } },
        },
      }),
    ]);
    const latest = sub.attempts[0];
    const st = deriveStudentStatus({
      now: new Date(),
      availableAt: a.availableAt,
      dueAt: a.dueAt,
      extendedDueAt: ext?.extendedDueAt ?? null,
      latePolicy: a.latePolicy,
      lateCutoffAt: a.lateCutoffAt,
      attemptCount: sub.attempts.length,
      latestAttemptLate: latest?.isLate ?? false,
      latestAttemptAt: latest?.submittedAt ?? null,
      hasDraft: false,
      grade: sub.grade,
      closed: a.status !== 'PUBLISHED' || a.group.status !== 'ACTIVE',
    });
    return {
      submissionId: sub.id,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      maxAttempts: a.maxAttempts,
      submittedAt: attempt.submittedAt.toISOString(),
      isLate: attempt.isLate,
      status: st.status,
      replayed,
    };
  }
}
