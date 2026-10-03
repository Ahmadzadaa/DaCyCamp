import { Injectable } from '@nestjs/common';
import type { AdminOverviewDto, AdminSearchDto, AssetKind, Role } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, dateToDay, dayKey, dayToDate } from '../progress/dates';
import { courseStatus } from '../content/content.service';

const DAY = 86_400_000;

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  /** Header axtarışı — hər bölmədən 8-ə qədər nəticə */
  async search(raw: string): Promise<AdminSearchDto> {
    const q = raw.trim().slice(0, 100);
    if (q.length < 2) return { q, courses: [], users: [], assets: [], paths: [] };
    const has = { contains: q, mode: 'insensitive' as const };
    const [courses, users, assets, paths] = await Promise.all([
      this.prisma.course.findMany({
        where: { OR: [{ title: has }, { slug: has }] },
        include: { track: true },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      this.prisma.user.findMany({
        where: { OR: [{ name: has }, { email: has }] },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.asset.findMany({
        where: { OR: [{ path: has }, { filename: has }], course: { deletedAt: null } },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.learningPath.findMany({
        where: { OR: [{ title: has }, { slug: has }] },
        include: { track: true },
        take: 8,
      }),
    ]);
    return {
      q,
      courses: courses.map((c) => ({
        slug: c.slug,
        title: c.title,
        trackTitle: c.track.title,
        trackColor: c.track.color,
        status: courseStatus(c),
      })),
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role as Role })),
      assets: assets.map((a) => ({
        id: a.id,
        path: a.path,
        filename: a.filename,
        kind: a.kind as AssetKind,
        courseSlug: a.course.slug,
        courseTitle: a.course.title,
      })),
      paths: paths.map((p) => ({
        slug: p.slug,
        title: p.title,
        trackColor: p.track.color,
        isPublished: p.isPublished,
      })),
    };
  }

  async get(): Promise<AdminOverviewDto> {
    const today = dayKey();
    const from = addDays(today, -13);
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const live = { deletedAt: null };
    const [
      all,
      published,
      draft,
      archived,
      deleted,
      tracks,
      students,
      newStudents7d,
      enrollments,
      activeRows,
      certs,
      pathCerts,
      pendingReviews,
      activeLabs,
      days,
      courses,
    ] = await Promise.all([
      this.prisma.course.count({ where: live }),
      this.prisma.course.count({ where: { ...live, isPublished: true, archivedAt: null } }),
      this.prisma.course.count({ where: { ...live, isPublished: false, archivedAt: null } }),
      this.prisma.course.count({ where: { ...live, archivedAt: { not: null } } }),
      this.prisma.course.count({ where: { deletedAt: { not: null } } }),
      this.prisma.track.count(),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: weekAgo } } }),
      this.prisma.enrollment.count({ where: { course: live } }),
      this.prisma.activityDay.findMany({
        where: { date: { gte: dayToDate(addDays(today, -6)) }, stepsCompleted: { gt: 0 } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.certificate.count({ where: { revokedAt: null } }),
      this.prisma.pathCertificate.count({ where: { revokedAt: null } }),
      this.prisma.pathItemProgress.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.labSession.count({ where: { status: { in: ['STARTING', 'RUNNING'] } } }),
      this.prisma.activityDay.groupBy({
        by: ['date'],
        where: { date: { gte: dayToDate(from) } },
        _sum: { stepsCompleted: true },
      }),
      this.prisma.course.findMany({
        where: live,
        include: {
          track: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { enrollments: { _count: 'desc' } },
        take: 5,
      }),
    ]);
    const completedBy = await this.prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courses.map((c) => c.id) }, completedAt: { not: null } },
      _count: { _all: true },
    });
    const done = new Map(completedBy.map((r) => [r.courseId, r._count._all]));
    const perDay = new Map(days.map((d) => [dateToDay(d.date), d._sum.stepsCompleted ?? 0]));
    return {
      courses: { all, published, draft, archived, deleted },
      tracks,
      students,
      newStudents7d,
      enrollments,
      activeLearners7d: activeRows.length,
      certificates: certs + pathCerts,
      pendingReviews,
      activeLabs,
      activity: Array.from({ length: 14 }, (_, i) => {
        const date = addDays(from, i);
        return { date, steps: perDay.get(date) ?? 0 };
      }),
      topCourses: courses.map((c) => ({
        slug: c.slug,
        title: c.title,
        trackColor: c.track.color,
        trackTitle: c.track.title,
        enrollments: c._count.enrollments,
        completed: done.get(c.id) ?? 0,
      })),
    };
  }
}
