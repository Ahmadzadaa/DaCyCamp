import { Injectable } from '@nestjs/common';
import type { DashboardDto } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toCertificateSummary } from '../certificates/certificates.service';
import { ProgressService } from '../progress/progress.service';
import { toPublicUser } from '../auth/auth.service';
import { addDays, dateToDay, dayKey, weekDays } from '../progress/dates';
import { notFound } from '../common/errors';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async get(userId: string): Promise<DashboardDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound();
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
      include: { course: { include: { track: true } }, lastStep: { include: { module: true } } },
    });
    const courses: DashboardDto['courses'] = [];
    let cont: DashboardDto['continue'] = null;
    for (const e of enrollments) {
      if (!e.course.isPublished) continue;
      const shape = await this.progress.loadCourseShape(e.courseId);
      const map = await this.progress.mapFor(userId, shape);
      courses.push({
        slug: e.course.slug,
        title: e.course.title,
        trackColor: e.course.track.color,
        trackTitle: e.course.track.title,
        percent: map.percent,
        done: map.done,
        total: map.total,
        completedAt: e.completedAt?.toISOString() ?? null,
        lastActivityAt: e.lastActivityAt.toISOString(),
      });
      if (!cont && map.continueStep) {
        const m = map.modules.find((x) => x.key === map.continueStep!.moduleKey)!;
        const s = m.steps.find((x) => x.key === map.continueStep!.stepKey)!;
        cont = {
          courseSlug: e.course.slug,
          courseTitle: e.course.title,
          moduleTitle: m.title,
          stepTitle: s.title,
          url: `/kurs/${e.course.slug}/${m.key}/${s.key}`,
          trackColor: e.course.track.color,
        };
      }
    }
    const today = dayKey();
    const days = await this.prisma.activityDay.findMany({
      where: { userId, stepsCompleted: { gt: 0 } },
      orderBy: { date: 'desc' },
      take: 400,
    });
    const daySet = new Set(days.map((d) => dateToDay(d.date)));
    let streak = 0;
    let cursor = daySet.has(today) ? today : addDays(today, -1);
    while (daySet.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    const [stepsCompleted, certificates, pathCerts, certRows] = await Promise.all([
      this.prisma.stepProgress.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.certificate.count({ where: { userId, revokedAt: null } }),
      this.prisma.pathCertificate.count({ where: { userId, revokedAt: null } }),
      this.prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
        take: 6,
      }),
    ]);
    const allDays = new Set(
      (
        await this.prisma.activityDay.findMany({
          where: { userId, date: { gte: new Date(`${weekDays(today)[0]}T00:00:00.000Z`) } },
        })
      ).map((d) => dateToDay(d.date)),
    );
    return {
      user: toPublicUser(user),
      continue: cont,
      courses,
      xpTotal: user.xpTotal,
      streakDays: streak,
      stepsCompleted,
      certificates: certificates + pathCerts,
      certificateItems: certRows.map(toCertificateSummary),
      week: weekDays(today).map((d) => allDays.has(d)),
      activePath: null,
    };
  }
}
