import { Injectable } from '@nestjs/common';
import { computeCourseMap, type AdminCourseStudentDto, type ProgressStatus } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { badRequest, conflict, notFound } from '../common/errors';

/** Kurs daxilində tələbələrə müdaxilə (yalnız ADMIN): siyahı, çıxar, sıfırla, kilidi əl ilə aç */
@Injectable()
export class CourseStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  private async course(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw notFound();
    return c;
  }

  private async enrollment(courseId: string, userId: string) {
    const e = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!e) throw notFound('NOT_ENROLLED', 'Tələbə bu kursa yazılmayıb');
    return e;
  }

  async list(courseId: string): Promise<AdminCourseStudentDto[]> {
    await this.course(courseId);
    const shape = await this.progress.loadCourseShape(courseId);
    const inCourse = { step: { module: { courseId } } };
    // bir sorğu ilə hamının irəliləyişi və açılmış kilidləri → xəritə yaddaşda hesablanır
    const [rows, progress, unlocks] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { lastActivityAt: 'desc' },
      }),
      this.prisma.stepProgress.findMany({
        where: inCourse,
        select: { userId: true, stepId: true, status: true, score: true, attempts: true },
      }),
      this.prisma.stepUnlock.findMany({ where: inCourse, select: { userId: true, stepId: true } }),
    ]);
    const group = <T extends { userId: string }>(xs: T[]) => {
      const m = new Map<string, T[]>();
      for (const x of xs) m.set(x.userId, [...(m.get(x.userId) ?? []), x]);
      return m;
    };
    const progByUser = group(progress);
    const unlocksByUser = group(unlocks);
    return rows.map((e) => {
      const unlocked = (unlocksByUser.get(e.user.id) ?? []).map((u) => u.stepId);
      const map = computeCourseMap({
        sequential: shape.sequential,
        modules: shape.modules,
        progress: (progByUser.get(e.user.id) ?? []).map((p) => ({
          ...p,
          status: p.status as ProgressStatus,
        })),
        unlocked,
      });
      return {
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        percent: map.percent,
        enrolledAt: e.enrolledAt.toISOString(),
        lastActivityAt: e.lastActivityAt.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
        unlockedStepIds: unlocked,
        lockedStepIds: map.flat.filter((s) => s.state === 'locked').map((s) => s.id),
        done: map.done,
        total: map.total,
      };
    });
  }

  /** Kursdan çıxar: yazılma silinir; irəliləyiş saxlanılır ki, "Geri qaytar" itkisiz olsun */
  async remove(courseId: string, userId: string) {
    const e = await this.enrollment(courseId, userId);
    await this.prisma.enrollment.delete({ where: { id: e.id } });
    return { ok: true, userId, email: e.user.email };
  }

  /** "Geri qaytar" və ya admin tərəfindən yazma: irəliləyiş keşi yenidən hesablanır */
  async enroll(courseId: string, userId: string) {
    await this.course(courseId);
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!u) throw notFound();
    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
    await this.refresh(courseId, userId);
    return { ok: true, userId, email: u.email };
  }

  /**
   * İrəliləyişi sıfırla: bu kursun addımları üzrə StepProgress, Submission, HintUsage, CtfSolve, LabSession
   * və əl ilə açılmış kilidlər silinir; yazılma qalır (0%). XP jurnalı toxunulmur (qazanılmış XP qalır).
   */
  async reset(courseId: string, userId: string) {
    const e = await this.enrollment(courseId, userId);
    const inCourse = { step: { module: { courseId } } };
    await this.prisma.$transaction([
      this.prisma.stepProgress.deleteMany({ where: { userId, ...inCourse } }),
      this.prisma.submission.deleteMany({ where: { userId, ...inCourse } }),
      this.prisma.hintUsage.deleteMany({ where: { userId, ...inCourse } }),
      this.prisma.labSession.deleteMany({ where: { userId, ...inCourse } }),
      this.prisma.stepUnlock.deleteMany({ where: { userId, ...inCourse } }),
      this.prisma.ctfSolve.deleteMany({ where: { userId, ctfTask: inCourse } }),
      this.prisma.enrollment.update({
        where: { id: e.id },
        data: { percent: 0, completedAt: null, lastStepId: null },
      }),
    ]);
    return { ok: true, userId, email: e.user.email };
  }

  private async courseStep(courseId: string, stepId: string) {
    const s = await this.prisma.step.findUnique({
      where: { id: stepId },
      select: { id: true, title: true, module: { select: { courseId: true } } },
    });
    if (!s || s.module.courseId !== courseId)
      throw badRequest('VALIDATION_FAILED', 'Addım bu kursa aid deyil');
    return s;
  }

  async unlock(courseId: string, userId: string, stepId: string, actorId: string) {
    const e = await this.enrollment(courseId, userId);
    const s = await this.courseStep(courseId, stepId);
    const shape = await this.progress.loadCourseShape(courseId);
    const map = await this.progress.mapFor(userId, shape);
    const cur = map.flat.find((x) => x.id === stepId);
    if (cur && cur.state !== 'locked')
      throw conflict('STEP_NOT_LOCKED', 'Bu addım tələbə üçün artıq açıqdır');
    await this.prisma.stepUnlock.upsert({
      where: { userId_stepId: { userId, stepId } },
      create: { userId, stepId, unlockedById: actorId },
      update: {},
    });
    return { ok: true, userId, email: e.user.email, stepId, stepTitle: s.title };
  }

  async relock(courseId: string, userId: string, stepId: string) {
    const e = await this.enrollment(courseId, userId);
    const s = await this.courseStep(courseId, stepId);
    await this.prisma.stepUnlock.deleteMany({ where: { userId, stepId } });
    return { ok: true, userId, email: e.user.email, stepId, stepTitle: s.title };
  }

  private async refresh(courseId: string, userId: string) {
    const shape = await this.progress.loadCourseShape(courseId);
    const map = await this.progress.mapFor(userId, shape);
    await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { percent: map.percent },
    });
  }
}
