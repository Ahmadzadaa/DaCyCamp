import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  toStudentView,
  type CodeSubmitResultDto,
  type CourseMapDto,
  type CtfAnswerResultDto,
  type HintResultDto,
  type PythonSubmissionInput,
  isQuizAnswerCorrect,
  type QuizConfig,
  type QuizResultDto,
  type QuizSecret,
  type SqlExpected,
  type SqlSubmissionInput,
  type StepType,
  type StepViewDto,
  type SubmissionInput,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { CatalogService } from '../catalog/catalog.service';
import { AssetsService } from '../assets/assets.service';
import { SqlCheckService } from '../sql-check/sql-check.service';
import { hashAnswer } from '../content/ctf-hash';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../common/errors';

const TYPE_INDEX_GROUP: Record<StepType, StepType[]> = {
  THEORY: ['THEORY'],
  QUIZ: ['QUIZ'],
  SQL: ['SQL', 'PYTHON'],
  PYTHON: ['SQL', 'PYTHON'],
  TERMINAL: ['TERMINAL'],
  CTF: ['CTF'],
};

const lower = (xs: string[]) => xs.map((x) => x.trim().toLowerCase());
const sameCols = (a: string[], b: string[]) =>
  a.length === b.length && lower(a).every((x, i) => x === lower(b)[i]);

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly catalog: CatalogService,
    private readonly assets: AssetsService,
    private readonly sqlCheck: SqlCheckService,
  ) {}

  async enroll(userId: string, slug: string) {
    const c = await this.prisma.course.findUnique({ where: { slug } });
    if (!c || !c.isPublished || c.deletedAt)
      throw notFound('COURSE_UNPUBLISHED', 'Bu kurs dərc olunmayıb');
    if (c.archivedAt) {
      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: c.id } },
        select: { id: true },
      });
      if (!existing) throw conflict('COURSE_ARCHIVED', 'Bu kurs arxivdədir, yeni yazılma yoxdur');
    }
    const e = await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: c.id } },
      create: { userId, courseId: c.id },
      update: {},
    });
    return { id: e.id, courseId: c.id, enrolledAt: e.enrolledAt.toISOString(), percent: e.percent };
  }

  async myEnrollments(userId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId, course: { deletedAt: null } },
      include: { course: { select: { slug: true, title: true } } },
      orderBy: { lastActivityAt: 'desc' },
    });
    return rows.map((e) => ({
      courseSlug: e.course.slug,
      courseTitle: e.course.title,
      percent: e.percent,
      completedAt: e.completedAt?.toISOString() ?? null,
      lastActivityAt: e.lastActivityAt.toISOString(),
    }));
  }

  private async loadCourseBySlug(slug: string, preview: boolean) {
    const c = await this.prisma.course.findUnique({
      where: { slug },
      select: { id: true, isPublished: true, deletedAt: true },
    });
    if (!c || ((!c.isPublished || c.deletedAt) && !preview))
      throw notFound('COURSE_UNPUBLISHED', 'Bu kurs dərc olunmayıb');
    return this.progress.loadCourseShape(c.id);
  }

  async courseMap(userId: string, slug: string, preview: boolean): Promise<CourseMapDto> {
    const course = await this.loadCourseBySlug(slug, preview);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    const map = await this.progress.mapFor(userId, course, preview);
    const outline = await this.catalog.outline(slug, { userId, staff: preview });
    const { flat: _f, ...rest } = map;
    const cont = map.continueStep;
    const cert = enrollment?.completedAt
      ? await this.prisma.certificate.findUnique({
          where: { userId_courseId: { userId, courseId: course.id } },
          select: { id: true },
        })
      : null;
    return {
      course: outline,
      enrolled: !!enrollment,
      map: rest,
      certificateId: cert?.id ?? null,
      continueUrl: cont
        ? `/kurs/${slug}/${cont.moduleKey}/${cont.stepKey}${preview ? '?onizle=1' : ''}`
        : null,
      completedAt: enrollment?.completedAt?.toISOString() ?? null,
    };
  }

  /** Dizayndakı /kurs/x/2/4 forması: 1-dən sayılan mövqe → açarlar */
  async resolvePosition(userId: string, slug: string, m: number, n: number, preview: boolean) {
    const course = await this.loadCourseBySlug(slug, preview);
    const map = await this.progress.mapFor(userId, course, preview);
    const mod = map.modules[m - 1];
    const step = mod?.steps[n - 1];
    if (!mod || !step) throw notFound();
    return { moduleKey: mod.key, stepKey: step.key };
  }

  async stepView(
    userId: string,
    slug: string,
    moduleKey: string,
    stepKey: string,
    preview: boolean,
  ): Promise<StepViewDto> {
    const course = await this.loadCourseBySlug(slug, preview);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (!enrollment && !preview) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
    const map = await this.progress.mapFor(userId, course, preview);
    const idx = map.flat.findIndex((s) => s.moduleKey === moduleKey && s.key === stepKey);
    if (idx < 0) throw notFound();
    const s = map.flat[idx]!;
    if (s.state === 'locked' && !preview) throw forbidden('STEP_LOCKED', 'Bu addım kilidlidir');
    const step = await this.prisma.step.findUnique({
      where: { id: s.id },
      include: { module: true, ctfTasks: { orderBy: { order: 'asc' } } },
    });
    if (!step) throw notFound();
    const [courseRow, user, hints, solves] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: course.id },
        include: { track: { select: { slug: true, title: true, color: true } } },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { xpTotal: true } }),
      this.prisma.hintUsage.findMany({ where: { userId, stepId: step.id } }),
      this.prisma.ctfSolve.findMany({
        where: { userId, ctfTask: { stepId: step.id } },
        select: { ctfTaskId: true },
      }),
    ]);
    const secret = (step.secret ?? {}) as Record<string, unknown>;
    const allHints = (secret.hints as string[] | undefined) ?? [];
    const unlockedHints = hints
      .filter((h) => h.hintKey.startsWith('h:'))
      .map((h) => Number(h.hintKey.slice(2)))
      .sort((a, b) => a - b)
      .map((i) => allHints[i])
      .filter((x): x is string => typeof x === 'string');
    const solved = new Set(solves.map((x) => x.ctfTaskId));
    const unlockedTaskHints = new Set(
      hints.filter((h) => h.hintKey.startsWith('t:')).map((h) => h.hintKey.slice(2)),
    );
    const resolveAsset = await this.assets.resolverFor(course.id);
    const view = toStudentView(step.type as StepType, step.config, {
      unlockedHints,
      resolveAsset,
      ctfTasks: step.ctfTasks.map((t) => ({
        ...t,
        solved: solved.has(t.id),
        hintUnlocked: unlockedTaskHints.has(t.key),
      })),
    });
    const group = TYPE_INDEX_GROUP[step.type as StepType];
    const sameType = map.flat.filter((x) => group.includes(x.type));
    const prev = idx > 0 ? map.flat[idx - 1]! : null;
    const next = idx < map.flat.length - 1 ? map.flat[idx + 1]! : null;
    return {
      id: step.id,
      key: step.key,
      type: step.type as StepType,
      title: step.title,
      xp: step.xp,
      order: step.order,
      state: s.state,
      attempts: s.attempts,
      score: s.score,
      module: {
        id: step.module.id,
        key: step.module.key,
        title: step.module.title,
        order: step.module.order,
      },
      course: {
        slug: course.slug,
        title: courseRow!.title,
        sequential: course.sequential,
        track: courseRow!.track,
      },
      position: {
        index: idx + 1,
        total: map.flat.length,
        typeIndex: sameType.findIndex((x) => x.id === step.id) + 1,
        typeTotal: sameType.length,
      },
      prev: prev ? { moduleKey: prev.moduleKey, stepKey: prev.key } : null,
      next: next
        ? { moduleKey: next.moduleKey, stepKey: next.key, locked: next.state === 'locked' }
        : null,
      coursePercent: map.percent,
      userXp: user?.xpTotal ?? 0,
      preview,
      assets: resolveAsset.assetMap,
      view,
    };
  }

  async start(userId: string, stepId: string, preview: boolean) {
    if (preview) return { ok: true };
    return this.progress.start(userId, stepId);
  }

  private async loadStep(stepId: string) {
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { module: { select: { id: true, courseId: true } } },
    });
    if (!step) throw notFound();
    return step;
  }

  private async assertUnlocked(userId: string, stepId: string, preview: boolean) {
    if (preview) return;
    const step = await this.loadStep(stepId);
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: step.module.courseId } },
    });
    if (!enrolled) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
    const course = await this.progress.loadCourseShape(step.module.courseId);
    if (course.deletedAt) throw notFound();
    const map = await this.progress.mapFor(userId, course);
    const s = map.flat.find((x) => x.id === stepId);
    if (!s) throw notFound();
    if (s.state === 'locked') throw forbidden('STEP_LOCKED', 'Bu addım kilidlidir');
  }

  private async stateAfterAttempt(userId: string, courseId: string, stepId: string) {
    const course = await this.progress.loadCourseShape(courseId);
    const map = await this.progress.mapFor(userId, course);
    const p = await this.prisma.stepProgress.findUnique({
      where: { userId_stepId: { userId, stepId } },
    });
    return {
      coursePercent: map.percent,
      courseCompleted: map.isComplete,
      attempts: p?.attempts ?? 0,
    };
  }

  async completeTheory(userId: string, stepId: string, preview: boolean) {
    const step = await this.loadStep(stepId);
    if (step.type !== 'THEORY') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    if (preview)
      return { xpAwarded: step.xp, coursePercent: 0, courseCompleted: false, next: null };
    return this.progress.completeStep(userId, stepId);
  }

  /** Göndəriş: quiz (serverdə qiymətləndirilir), sql (hash müqayisəsi), python (brauzer testləri) */
  async submit(userId: string, stepId: string, input: SubmissionInput, preview: boolean) {
    switch (input.kind) {
      case 'quiz':
        return this.submitQuiz(userId, stepId, input.answers, preview);
      case 'sql':
        return this.submitSql(userId, stepId, input, preview);
      case 'python':
        return this.submitPython(userId, stepId, input, preview);
    }
  }

  async submitQuiz(
    userId: string,
    stepId: string,
    answers: number[][],
    preview: boolean,
  ): Promise<QuizResultDto> {
    const step = await this.loadStep(stepId);
    if (step.type !== 'QUIZ') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    const cfg = step.config as unknown as QuizConfig;
    const sec = (step.secret ?? { questions: [] }) as unknown as QuizSecret;
    const total = cfg.questions.length;
    if (total === 0) throw badRequest('VALIDATION_FAILED', 'Testdə sual yoxdur');
    let correctCount = 0;
    const perQuestion = cfg.questions.map((q, i) => {
      const raw = sec.questions[i]?.correct ?? [];
      // classify: hər elementin qrupu (sıra vacibdir); single/multiple: düzgün variantlar dəsti
      const correct = q.type === 'classify' ? raw : [...raw].sort((a, b) => a - b);
      const ok = isQuizAnswerCorrect(q.type, raw, answers[i]);
      if (ok) correctCount++;
      return {
        correct: ok,
        correctIndices: correct,
        ...(sec.questions[i]?.explanation ? { explanation: sec.questions[i]!.explanation } : {}),
      };
    });
    const score = Math.round((100 * correctCount) / total);
    const passed = score >= cfg.pass_score;
    if (preview) {
      return {
        score,
        passed,
        perQuestion,
        attempts: 0,
        xpAwarded: passed ? step.xp : 0,
        coursePercent: 0,
        courseCompleted: false,
        next: null,
      };
    }
    await this.prisma.submission.create({
      data: {
        userId,
        stepId,
        type: 'QUIZ',
        payload: { answers } as unknown as Prisma.InputJsonValue,
        result: { score, passed } as unknown as Prisma.InputJsonValue,
        passed,
        score,
      },
    });
    if (passed) {
      const r = await this.progress.completeStep(userId, stepId, { score, attemptsDelta: 1 });
      const p = await this.prisma.stepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
      });
      return { ...r, score, passed, perQuestion, attempts: p?.attempts ?? 1 };
    }
    await this.progress.recordAttempt(userId, stepId, score);
    const st = await this.stateAfterAttempt(userId, step.module.courseId, stepId);
    return {
      score,
      passed,
      perQuestion,
      attempts: st.attempts,
      xpAwarded: 0,
      coursePercent: st.coursePercent,
      courseCompleted: st.courseCompleted,
      next: null,
    };
  }

  async submitSql(
    userId: string,
    stepId: string,
    input: SqlSubmissionInput,
    preview: boolean,
  ): Promise<CodeSubmitResultDto> {
    const step = await this.loadStep(stepId);
    if (step.type !== 'SQL') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    const secret = (step.secret ?? {}) as { expected?: SqlExpected };
    let expected = secret.expected;
    if (!expected) {
      // dərc zamanı hesablanmamışsa (köhnə məlumat) — indi hesabla
      try {
        expected = await this.sqlCheck.computeAndStore(step.id);
      } catch {
        throw unprocessable(
          'SQL_NOT_READY',
          'Bu tapşırığın yoxlaması hazır deyil, müəllimə bildirin',
        );
      }
    }
    const colsOk = sameCols(expected.columns, input.columns);
    const countOk = expected.row_count === input.row_count;
    const hashOk = expected.row_hash === input.row_hash;
    const passed = colsOk && countOk && hashOk;
    const reason = passed ? undefined : !colsOk ? 'columns' : !countOk ? 'row_count' : 'values';
    const message = passed
      ? undefined
      : reason === 'columns'
        ? `Gözlənilən sütunlar: ${expected.columns.join(', ')} (sizdə: ${input.columns.join(', ') || '—'})`
        : reason === 'row_count'
          ? `Gözlənilən sətir sayı: ${expected.row_count}, sizdə: ${input.row_count}`
          : 'Sütunlar və sətir sayı düzgündür, amma dəyərlər fərqlidir';
    if (preview)
      return {
        passed,
        reason,
        message,
        attempts: 0,
        xpAwarded: passed ? step.xp : 0,
        coursePercent: 0,
        courseCompleted: false,
        next: null,
      };
    await this.prisma.submission.create({
      data: {
        userId,
        stepId,
        type: 'SQL',
        payload: {
          query: input.query.slice(0, 20_000),
          row_hash: input.row_hash,
          row_count: input.row_count,
          columns: input.columns,
        } as unknown as Prisma.InputJsonValue,
        result: { passed, reason: reason ?? null } as unknown as Prisma.InputJsonValue,
        passed,
      },
    });
    if (passed) {
      const r = await this.progress.completeStep(userId, stepId, { attemptsDelta: 1 });
      const p = await this.prisma.stepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
      });
      return { ...r, passed: true, attempts: p?.attempts ?? 1 };
    }
    await this.progress.recordAttempt(userId, stepId, null);
    const st = await this.stateAfterAttempt(userId, step.module.courseId, stepId);
    return {
      passed: false,
      reason,
      message,
      attempts: st.attempts,
      xpAwarded: 0,
      coursePercent: st.coursePercent,
      courseCompleted: st.courseCompleted,
      next: null,
    };
  }

  /** Python: testlər brauzerdə (Pyodide) işləyir; nəticə client tərəfindən bildirilir (spesifikasiya: server xərci yoxdur) */
  async submitPython(
    userId: string,
    stepId: string,
    input: PythonSubmissionInput,
    preview: boolean,
  ): Promise<CodeSubmitResultDto> {
    const step = await this.loadStep(stepId);
    if (step.type !== 'PYTHON') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    const passed = input.passed;
    const reason = passed ? undefined : 'error';
    if (preview)
      return {
        passed,
        reason,
        message: input.error,
        attempts: 0,
        xpAwarded: passed ? step.xp : 0,
        coursePercent: 0,
        courseCompleted: false,
        next: null,
      };
    await this.prisma.submission.create({
      data: {
        userId,
        stepId,
        type: 'PYTHON',
        payload: {
          code: input.code.slice(0, 50_000),
          stdout: input.stdout?.slice(0, 10_000),
          error: input.error?.slice(0, 2_000),
        } as unknown as Prisma.InputJsonValue,
        result: { passed } as unknown as Prisma.InputJsonValue,
        passed,
      },
    });
    if (passed) {
      const r = await this.progress.completeStep(userId, stepId, { attemptsDelta: 1 });
      const p = await this.prisma.stepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
      });
      return { ...r, passed: true, attempts: p?.attempts ?? 1 };
    }
    await this.progress.recordAttempt(userId, stepId, null);
    const st = await this.stateAfterAttempt(userId, step.module.courseId, stepId);
    return {
      passed: false,
      reason,
      message: input.error,
      attempts: st.attempts,
      xpAwarded: 0,
      coursePercent: st.coursePercent,
      courseCompleted: st.courseCompleted,
      next: null,
    };
  }

  /** Addım ipucusu: bir dəfə XP cəriməsi (dedupe), mətn yalnız bu endpoint-dən qayıdır */
  async hint(
    userId: string,
    stepId: string,
    index: number,
    preview: boolean,
  ): Promise<HintResultDto> {
    const step = await this.loadStep(stepId);
    const secret = (step.secret ?? {}) as { hints?: string[] };
    const cfg = step.config as { hint_penalty_xp?: number };
    const hints = secret.hints ?? [];
    const text = hints[index];
    if (typeof text !== 'string') throw notFound('NOT_FOUND', 'Belə ipucu yoxdur');
    const penalty = cfg.hint_penalty_xp ?? 10;
    if (preview) return { index, hint: text, xpPenalty: 0, unlocked: hints.slice(0, index + 1) };
    await this.assertUnlocked(userId, stepId, false);
    const hintKey = `h:${index}`;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.hintUsage.findUnique({
        where: { userId_stepId_hintKey: { userId, stepId, hintKey } },
      });
      if (existing) return;
      await tx.hintUsage.create({ data: { userId, stepId, hintKey, xpPenalty: penalty } });
      if (penalty > 0)
        await this.progress.grantXp(
          tx,
          userId,
          -penalty,
          'HINT_USED',
          `hint:${stepId}:${hintKey}`,
          { stepId, courseId: step.module.courseId },
        );
    });
    const used = await this.prisma.hintUsage.findMany({
      where: { userId, stepId, hintKey: { startsWith: 'h:' } },
    });
    const unlocked = used
      .map((u) => Number(u.hintKey.slice(2)))
      .sort((a, b) => a - b)
      .map((i) => hints[i])
      .filter((x): x is string => typeof x === 'string');
    return { index, hint: text, xpPenalty: penalty, unlocked };
  }

  async ctfHint(userId: string, taskId: string, preview: boolean): Promise<HintResultDto> {
    const task = await this.prisma.ctfTask.findUnique({
      where: { id: taskId },
      include: { step: { include: { module: { select: { courseId: true } } } } },
    });
    if (!task) throw notFound();
    if (!task.hint) throw notFound('NOT_FOUND', 'Bu sual üçün ipucu yoxdur');
    const cfg = task.step.config as { hint_penalty_xp?: number };
    const penalty = cfg.hint_penalty_xp ?? 10;
    if (preview) return { index: task.order, hint: task.hint, xpPenalty: 0, unlocked: [task.hint] };
    await this.assertUnlocked(userId, task.stepId, false);
    const hintKey = `t:${task.key}`;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.hintUsage.findUnique({
        where: { userId_stepId_hintKey: { userId, stepId: task.stepId, hintKey } },
      });
      if (existing) return;
      await tx.hintUsage.create({
        data: { userId, stepId: task.stepId, hintKey, xpPenalty: penalty },
      });
      if (penalty > 0)
        await this.progress.grantXp(
          tx,
          userId,
          -penalty,
          'HINT_USED',
          `hint:${task.stepId}:${hintKey}`,
          { stepId: task.stepId, courseId: task.step.module.courseId },
        );
    });
    return { index: task.order, hint: task.hint, xpPenalty: penalty, unlocked: [task.hint] };
  }

  /** CTF cavabı: yalnız serverdə hash müqayisəsi; bütün suallar həll olunanda addım tamamlanır (addım XP-si 0, XP sual-sual) */
  async ctfAnswer(
    userId: string,
    taskId: string,
    answer: string,
    preview: boolean,
  ): Promise<CtfAnswerResultDto> {
    const task = await this.prisma.ctfTask.findUnique({
      where: { id: taskId },
      include: { step: { include: { module: { select: { courseId: true } } } } },
    });
    if (!task) throw notFound();
    const stepId = task.stepId;
    await this.assertUnlocked(userId, stepId, preview);
    const correct = !!task.answerHash && hashAnswer(answer, task.caseSensitive) === task.answerHash;
    if (preview)
      return {
        correct,
        taskId,
        solvedAll: false,
        attempts: 0,
        xpAwarded: correct ? task.points : 0,
        coursePercent: 0,
        courseCompleted: false,
        next: null,
      };
    await this.prisma.submission.create({
      data: {
        userId,
        stepId,
        type: 'CTF',
        payload: { taskKey: task.key } as unknown as Prisma.InputJsonValue,
        result: { correct } as unknown as Prisma.InputJsonValue,
        passed: correct,
      },
    });
    if (!correct) {
      await this.progress.recordAttempt(userId, stepId, null);
      const st = await this.stateAfterAttempt(userId, task.step.module.courseId, stepId);
      return {
        correct: false,
        taskId,
        solvedAll: false,
        attempts: st.attempts,
        xpAwarded: 0,
        coursePercent: st.coursePercent,
        courseCompleted: st.courseCompleted,
        next: null,
      };
    }
    const xpAwarded = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ctfSolve.findUnique({
        where: { userId_ctfTaskId: { userId, ctfTaskId: taskId } },
      });
      if (existing) return 0;
      await tx.ctfSolve.create({ data: { userId, ctfTaskId: taskId } });
      return this.progress.grantXp(tx, userId, task.points, 'CTF_TASK_SOLVED', `ctf:${taskId}`, {
        stepId,
        ctfTaskId: taskId,
        courseId: task.step.module.courseId,
      });
    });
    const [total, solved] = await Promise.all([
      this.prisma.ctfTask.count({ where: { stepId } }),
      this.prisma.ctfSolve.count({ where: { userId, ctfTask: { stepId } } }),
    ]);
    if (solved >= total) {
      const r = await this.progress.completeStep(userId, stepId, { xp: 0, attemptsDelta: 1 });
      const p = await this.prisma.stepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
      });
      return {
        ...r,
        correct: true,
        taskId,
        solvedAll: true,
        xpAwarded,
        attempts: p?.attempts ?? 1,
      };
    }
    await this.progress.recordAttempt(userId, stepId, null);
    const st = await this.stateAfterAttempt(userId, task.step.module.courseId, stepId);
    return {
      correct: true,
      taskId,
      solvedAll: false,
      attempts: st.attempts,
      xpAwarded,
      coursePercent: st.coursePercent,
      courseCompleted: st.courseCompleted,
      next: null,
    };
  }

  async mySubmissions(userId: string, stepId: string) {
    const rows = await this.prisma.submission.findMany({
      where: { userId, stepId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      passed: r.passed,
      score: r.score,
      result: r.result,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
