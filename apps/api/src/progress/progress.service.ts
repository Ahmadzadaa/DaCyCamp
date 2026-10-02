import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeCourseMap,
  type CompleteResultDto,
  type ProgressStatus,
  type StepType,
  type XpReason,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PathsService } from '../paths/paths.service';
import { CertificatesService } from '../certificates/certificates.service';
import { dayKey, dayToDate } from './dates';
import { forbidden, notFound } from '../common/errors';

type Tx = Prisma.TransactionClient;

export interface CourseShape {
  id: string;
  slug: string;
  sequential: boolean;
  modules: Array<{
    id: string;
    key: string;
    title: string;
    order: number;
    isPublished: boolean;
    steps: Array<{
      id: string;
      key: string;
      type: StepType;
      title: string;
      xp: number;
      order: number;
      isPublished: boolean;
    }>;
  }>;
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: PathsService,
    private readonly certs: CertificatesService,
  ) {}

  async loadCourseShape(
    courseId: string,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<CourseShape> {
    const c = await tx.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                key: true,
                type: true,
                title: true,
                xp: true,
                order: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });
    if (!c) throw notFound();
    return {
      id: c.id,
      slug: c.slug,
      sequential: c.sequential,
      modules: c.modules.map((m) => ({
        ...m,
        steps: m.steps.map((s) => ({ ...s, type: s.type as StepType })),
      })),
    };
  }

  async progressRows(userId: string, courseId: string, tx: Tx | PrismaService = this.prisma) {
    const rows = await tx.stepProgress.findMany({
      where: { userId, step: { module: { courseId } } },
      select: { stepId: true, status: true, score: true, attempts: true },
    });
    return rows.map((r) => ({ ...r, status: r.status as ProgressStatus }));
  }

  async mapFor(
    userId: string,
    course: CourseShape,
    includeUnpublished = false,
    tx: Tx | PrismaService = this.prisma,
  ) {
    const progress = await this.progressRows(userId, course.id, tx);
    return computeCourseMap({
      sequential: course.sequential,
      modules: course.modules,
      progress,
      includeUnpublished,
    });
  }

  /** Addımı açanda: IN_PROGRESS sətri + "qaldığınız yer" */
  async start(userId: string, stepId: string) {
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { module: { select: { courseId: true } } },
    });
    if (!step) throw notFound();
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: step.module.courseId } },
    });
    if (!enrollment) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
    await this.prisma.$transaction([
      this.prisma.stepProgress.upsert({
        where: { userId_stepId: { userId, stepId } },
        create: { userId, stepId },
        update: {},
      }),
      this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { lastStepId: stepId, lastActivityAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }),
    ]);
    return { ok: true };
  }

  /** XP jurnalı: dedupeKey ilə bir dəfə; qaytarır: həqiqətən verilən məbləğ */
  async grantXp(
    tx: Tx,
    userId: string,
    amount: number,
    reason: XpReason,
    dedupeKey: string,
    refs: { stepId?: string; courseId?: string; ctfTaskId?: string } = {},
  ): Promise<number> {
    if (amount === 0) return 0;
    const exists = await tx.xpEvent.findUnique({
      where: { userId_dedupeKey: { userId, dedupeKey } },
    });
    if (exists) return 0;
    await tx.xpEvent.create({ data: { userId, amount, reason, dedupeKey, ...refs } });
    await tx.user.update({ where: { id: userId }, data: { xpTotal: { increment: amount } } });
    const date = dayToDate(dayKey());
    await tx.activityDay.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, xp: amount, stepsCompleted: 0 },
      update: { xp: { increment: amount } },
    });
    return amount;
  }

  /**
   * Tamamlama tranzaksiyası: StepProgress → COMPLETED, XP (bir dəfə), ActivityDay, Enrollment keşi,
   * kurs bitibsə completedAt + COURSE_COMPLETED + PathsService hook.
   */
  async completeStep(
    userId: string,
    stepId: string,
    opts: { score?: number | null; attemptsDelta?: number; xp?: number } = {},
  ): Promise<CompleteResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const step = await tx.step.findUnique({
        where: { id: stepId },
        include: { module: { select: { courseId: true } } },
      });
      if (!step) throw notFound();
      const courseId = step.module.courseId;
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
      const existing = await tx.stepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
      });
      const alreadyDone = existing?.status === 'COMPLETED';
      const now = new Date();
      await tx.stepProgress.upsert({
        where: { userId_stepId: { userId, stepId } },
        create: {
          userId,
          stepId,
          status: 'COMPLETED',
          attempts: opts.attemptsDelta ?? 1,
          score: opts.score ?? null,
          completedAt: now,
          lastAttemptAt: now,
        },
        update: {
          status: 'COMPLETED',
          attempts: { increment: opts.attemptsDelta ?? 0 },
          lastAttemptAt: now,
          ...(alreadyDone ? {} : { completedAt: now }),
          ...(opts.score != null && (existing?.score == null || opts.score > existing.score)
            ? { score: opts.score }
            : {}),
        },
      });
      let xpAwarded = 0;
      if (!alreadyDone) {
        xpAwarded = await this.grantXp(
          tx,
          userId,
          opts.xp ?? step.xp,
          'STEP_COMPLETED',
          `step:${stepId}`,
          {
            stepId,
            courseId,
          },
        );
        const date = dayToDate(dayKey());
        await tx.activityDay.upsert({
          where: { userId_date: { userId, date } },
          create: { userId, date, xp: 0, stepsCompleted: 1 },
          update: { stepsCompleted: { increment: 1 } },
        });
      }
      const course = await this.loadCourseShape(courseId, tx);
      const map = await this.mapFor(userId, course, false, tx);
      const justCompleted = map.isComplete && !enrollment.completedAt;
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          percent: map.percent,
          lastStepId: stepId,
          lastActivityAt: now,
          ...(justCompleted ? { completedAt: now } : {}),
        },
      });
      if (justCompleted) {
        await this.grantXp(tx, userId, 0, 'COURSE_COMPLETED', `course:${courseId}`, { courseId });
        await tx.xpEvent.upsert({
          where: { userId_dedupeKey: { userId, dedupeKey: `course:${courseId}` } },
          create: {
            userId,
            amount: 0,
            reason: 'COURSE_COMPLETED',
            dedupeKey: `course:${courseId}`,
            courseId,
          },
          update: {},
        });
        await this.paths.onCourseCompleted(tx, userId, courseId);
      }
      // kurs bitibsə sertifikat (idempotent — artıq varsa eyni id)
      const certificateId = map.isComplete
        ? await this.certs.issueForCourse(tx, userId, courseId)
        : null;
      await tx.user.update({ where: { id: userId }, data: { lastActiveAt: now } });
      return {
        xpAwarded,
        coursePercent: map.percent,
        courseCompleted: map.isComplete,
        next: map.continueStep
          ? { moduleKey: map.continueStep.moduleKey, stepKey: map.continueStep.stepKey }
          : null,
        certificateId,
      };
    });
  }

  /** Uğursuz cəhd: attempts++ və ən yaxşı bal */
  async recordAttempt(userId: string, stepId: string, score: number | null) {
    const now = new Date();
    await this.prisma.stepProgress.upsert({
      where: { userId_stepId: { userId, stepId } },
      create: { userId, stepId, attempts: 1, score, lastAttemptAt: now },
      update: {
        attempts: { increment: 1 },
        lastAttemptAt: now,
        ...(score != null ? { score: { set: score } } : {}),
      },
    });
  }

  /** Dərc dəyişəndə / idxaldan sonra kursun bütün yazılmalarını yenidən hesabla */
  async recomputeCourse(courseId: string) {
    const course = await this.loadCourseShape(courseId);
    const enrollments = await this.prisma.enrollment.findMany({ where: { courseId } });
    for (const e of enrollments) {
      const map = await this.mapFor(e.userId, course);
      await this.prisma.enrollment.update({
        where: { id: e.id },
        data: {
          percent: map.percent,
          ...(map.isComplete && !e.completedAt ? { completedAt: new Date() } : {}),
        },
      });
      if (map.isComplete) await this.certs.issueForCourse(this.prisma, e.userId, courseId);
    }
  }
}
