import { Injectable } from '@nestjs/common';
import type { DashboardDto, MeSummaryDto } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toCertificateSummary } from '../certificates/certificates.service';
import { ProgressService } from '../progress/progress.service';
import { PathsLearnService } from '../paths/paths-learn.service';
import { toPublicUser } from '../auth/auth.service';
import { addDays, dateToDay, dayKey, weekDays } from '../progress/dates';
import { notFound } from '../common/errors';
import { NotificationsService } from './notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly pathsLearn: PathsLearnService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Ardıcıl aktiv günlər (bu gün hələ aktiv olmayıbsa dünəndən sayılır) */
  async streak(userId: string): Promise<number> {
    const today = dayKey();
    const days = await this.prisma.activityDay.findMany({
      where: { userId, stepsCompleted: { gt: 0 } },
      orderBy: { date: 'desc' },
      take: 400,
      select: { date: true },
    });
    const daySet = new Set(days.map((d) => dateToDay(d.date)));
    let streak = 0;
    let cursor = daySet.has(today) ? today : addDays(today, -1);
    while (daySet.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  /** Bu həftənin (B.e–B, APP_TIMEZONE) aktiv günləri və tamamlanan addım sayı */
  async week(userId: string): Promise<{ week: boolean[]; weekTasks: number }> {
    const days = weekDays(dayKey());
    const rows = await this.prisma.activityDay.findMany({
      where: { userId, date: { gte: new Date(`${days[0]}T00:00:00.000Z`) } },
    });
    const active = new Set(rows.filter((r) => r.stepsCompleted > 0).map((r) => dateToDay(r.date)));
    return {
      week: days.map((d) => active.has(d)),
      weekTasks: rows.reduce((n, r) => n + r.stepsCompleted, 0),
    };
  }

  /** Qabıq üçün yüngül xülasə (sidebar «Həftəlik hədəf», zəngin sayğacı) */
  async summary(userId: string): Promise<MeSummaryDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound();
    const [streakDays, wk, unreadNotifications] = await Promise.all([
      this.streak(userId),
      this.week(userId),
      this.notifications.unreadCount(userId),
    ]);
    const staff = user.role === 'ADMIN' || user.role === 'INSTRUCTOR';
    return {
      xpTotal: user.xpTotal,
      streakDays,
      weekTasks: wk.weekTasks,
      weeklyGoal: user.weeklyGoal,
      unreadNotifications,
      ...(staff
        ? {
            pendingReviews: await this.prisma.pathItemProgress.count({
              where: { status: 'SUBMITTED' },
            }),
            openSupport: await this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
          }
        : { supportUnread: await this.supportUnread(userId) }),
    };
  }

  /** tələbənin baxmadığı heyət cavabı olan müraciətlər */
  private async supportUnread(userId: string): Promise<number> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId, status: { not: 'OPEN' } },
      select: {
        userSeenAt: true,
        messages: {
          where: { fromStaff: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    return tickets.filter((t) => {
      const last = t.messages[0]?.createdAt;
      return !!last && (!t.userSeenAt || last > t.userSeenAt);
    }).length;
  }

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
      if (!e.course.isPublished || e.course.deletedAt) continue;
      const shape = await this.progress.loadCourseShape(e.courseId);
      const map = await this.progress.mapFor(userId, shape);
      courses.push({
        slug: e.course.slug,
        title: e.course.title,
        trackColor: e.course.track.color,
        trackTitle: e.course.track.title,
        trackSlug: e.course.track.slug,
        trackIcon: e.course.track.icon,
        percent: map.percent,
        done: map.done,
        total: map.total,
        completedAt: e.completedAt?.toISOString() ?? null,
        lastActivityAt: e.lastActivityAt.toISOString(),
      });
      if (!cont && map.continueStep) {
        const mi = map.modules.findIndex((x) => x.key === map.continueStep!.moduleKey);
        const m = map.modules[mi]!;
        const si = m.steps.findIndex((x) => x.key === map.continueStep!.stepKey);
        const s = m.steps[si]!;
        cont = {
          courseSlug: e.course.slug,
          courseTitle: e.course.title,
          moduleTitle: m.title,
          stepTitle: s.title,
          stepType: s.type,
          moduleNumber: mi + 1,
          stepNumber: si + 1,
          url: `/kurs/${e.course.slug}/${m.key}/${s.key}`,
          trackColor: e.course.track.color,
        };
      }
    }
    const [streak, wk, stepsCompleted, certificates, pathCerts, certRows] = await Promise.all([
      this.streak(userId),
      this.week(userId),
      this.prisma.stepProgress.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.certificate.count({ where: { userId, revokedAt: null } }),
      this.prisma.pathCertificate.count({ where: { userId, revokedAt: null } }),
      this.prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
        take: 6,
      }),
    ]);
    return {
      user: toPublicUser(user),
      continue: cont,
      courses,
      xpTotal: user.xpTotal,
      streakDays: streak,
      stepsCompleted,
      certificates: certificates + pathCerts,
      certificateItems: certRows.map(toCertificateSummary),
      week: wk.week,
      weekTasks: wk.weekTasks,
      weeklyGoal: user.weeklyGoal,
      activePath: await this.pathsLearn.active(userId),
    };
  }
}
