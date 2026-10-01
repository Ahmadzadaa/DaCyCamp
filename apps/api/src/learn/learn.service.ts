import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  toStudentView,
  type CourseMapDto,
  type QuizConfig,
  type QuizResultDto,
  type QuizSecret,
  type StepType,
  type StepViewDto,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { CatalogService } from '../catalog/catalog.service';
import { AssetsService } from '../assets/assets.service';
import { badRequest, forbidden, notFound } from '../common/errors';

const TYPE_INDEX_GROUP: Record<StepType, StepType[]> = {
  THEORY: ['THEORY'],
  QUIZ: ['QUIZ'],
  SQL: ['SQL', 'PYTHON'],
  PYTHON: ['SQL', 'PYTHON'],
  TERMINAL: ['TERMINAL'],
  CTF: ['CTF'],
};

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly catalog: CatalogService,
    private readonly assets: AssetsService,
  ) {}

  async enroll(userId: string, slug: string) {
    const c = await this.prisma.course.findUnique({ where: { slug } });
    if (!c || !c.isPublished) throw notFound('COURSE_UNPUBLISHED', 'Bu kurs dərc olunmayıb');
    const e = await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: c.id } },
      create: { userId, courseId: c.id },
      update: {},
    });
    return { id: e.id, courseId: c.id, enrolledAt: e.enrolledAt.toISOString(), percent: e.percent };
  }

  async myEnrollments(userId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId },
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
      select: { id: true, isPublished: true },
    });
    if (!c || (!c.isPublished && !preview))
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
    return {
      course: outline,
      enrolled: !!enrollment,
      map: rest,
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
      .map((h) => allHints[Number(h.hintKey.slice(2))])
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

  async completeTheory(userId: string, stepId: string, preview: boolean) {
    const step = await this.prisma.step.findUnique({ where: { id: stepId } });
    if (!step) throw notFound();
    if (step.type !== 'THEORY') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    if (preview)
      return { xpAwarded: step.xp, coursePercent: 0, courseCompleted: false, next: null };
    return this.progress.completeStep(userId, stepId);
  }

  private async assertUnlocked(userId: string, stepId: string, preview: boolean) {
    if (preview) return;
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { module: { select: { courseId: true } } },
    });
    if (!step) throw notFound();
    const course = await this.progress.loadCourseShape(step.module.courseId);
    const map = await this.progress.mapFor(userId, course);
    const s = map.flat.find((x) => x.id === stepId);
    if (!s) throw notFound();
    if (s.state === 'locked') throw forbidden('STEP_LOCKED', 'Bu addım kilidlidir');
  }

  /** Quiz: serverdə Step.secret ilə qiymətləndirmə */
  async submitQuiz(
    userId: string,
    stepId: string,
    answers: number[][],
    preview: boolean,
  ): Promise<QuizResultDto> {
    const step = await this.prisma.step.findUnique({ where: { id: stepId } });
    if (!step) throw notFound();
    if (step.type !== 'QUIZ') throw badRequest('WRONG_STEP_TYPE');
    await this.assertUnlocked(userId, step.id, preview);
    const cfg = step.config as unknown as QuizConfig;
    const sec = (step.secret ?? { questions: [] }) as unknown as QuizSecret;
    const total = cfg.questions.length;
    if (total === 0) throw badRequest('VALIDATION_FAILED', 'Testdə sual yoxdur');
    let correctCount = 0;
    const perQuestion = cfg.questions.map((_, i) => {
      const correct = [...(sec.questions[i]?.correct ?? [])].sort((a, b) => a - b);
      const given = [...new Set(answers[i] ?? [])].sort((a, b) => a - b);
      const ok = correct.length === given.length && correct.every((v, k) => v === given[k]);
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
        payload: { answers } as Prisma.InputJsonValue,
        result: { score, passed } as Prisma.InputJsonValue,
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
    const p = await this.prisma.stepProgress.findUnique({
      where: { userId_stepId: { userId, stepId } },
    });
    const course = await this.progress.loadCourseShape(
      (await this.prisma.module.findUniqueOrThrow({ where: { id: step.moduleId } })).courseId,
    );
    const map = await this.progress.mapFor(userId, course);
    return {
      score,
      passed,
      perQuestion,
      attempts: p?.attempts ?? 1,
      xpAwarded: 0,
      coursePercent: map.percent,
      courseCompleted: map.isComplete,
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
