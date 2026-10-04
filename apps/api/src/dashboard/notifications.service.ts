import { Injectable } from '@nestjs/common';
import type { NotificationDto } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { tr } from '../common/i18n/request-locale';

const DAY = 86_400_000;
const WINDOW_DAYS = 30;
const MAX_ITEMS = 20;

type Snap = { courseTitle?: string; pathTitle?: string };

/**
 * Zəng menyusu üçün bildirişlər — ayrıca cədvəl saxlanmır, mövcud qeydlərdən törədilir:
 * sertifikatlar, layihə rəyləri, yeni dərc olunmuş kurslar, (heyət üçün) yoxlama gözləyən layihələr.
 * «Oxunmamış» = User.notificationsSeenAt-dən sonrakılar.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<NotificationDto[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];
    const since = new Date(Date.now() - WINDOW_DAYS * DAY);
    // qeydiyyatdan çox əvvəl dərc olunmuş kurslar «yeni» sayılmır
    const courseSince = new Date(Math.max(since.getTime(), user.createdAt.getTime() - 7 * DAY));
    const staff = user.role === 'ADMIN' || user.role === 'INSTRUCTOR';

    const [certs, pathCerts, reviews, courses, enrolled, pending, replies, openTickets] =
      await Promise.all([
        this.prisma.certificate.findMany({
          where: { userId, issuedAt: { gte: since } },
          orderBy: { issuedAt: 'desc' },
          take: MAX_ITEMS,
        }),
        this.prisma.pathCertificate.findMany({
          where: { userId, issuedAt: { gte: since } },
          orderBy: { issuedAt: 'desc' },
          take: MAX_ITEMS,
        }),
        this.prisma.pathItemProgress.findMany({
          where: {
            userId,
            reviewedById: { not: null },
            status: { in: ['PASSED', 'FAILED'] },
            updatedAt: { gte: since },
          },
          include: { pathItem: { include: { path: true } } },
          orderBy: { updatedAt: 'desc' },
          take: MAX_ITEMS,
        }),
        this.prisma.course.findMany({
          where: {
            isPublished: true,
            deletedAt: null,
            archivedAt: null,
            publishedAt: { gte: courseSince },
          },
          orderBy: { publishedAt: 'desc' },
          take: 10,
        }),
        this.prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
        staff
          ? this.prisma.pathItemProgress.findMany({
              where: { status: 'SUBMITTED' },
              orderBy: { submittedAt: 'desc' },
              select: { submittedAt: true, updatedAt: true },
            })
          : Promise.resolve([]),
        // dəstək: tələbəyə heyətin cavabları
        this.prisma.supportMessage.findMany({
          where: { fromStaff: true, createdAt: { gte: since }, ticket: { userId } },
          include: { ticket: { select: { id: true, subject: true } } },
          orderBy: { createdAt: 'desc' },
          take: MAX_ITEMS,
        }),
        // dəstək: heyət üçün cavab gözləyən müraciətlər
        staff
          ? this.prisma.supportTicket.findMany({
              where: { status: 'OPEN' },
              orderBy: { lastMessageAt: 'desc' },
              select: { lastMessageAt: true },
            })
          : Promise.resolve([]),
      ]);

    const seen = user.notificationsSeenAt?.getTime() ?? 0;
    const items: Omit<NotificationDto, 'unread'>[] = [];
    for (const c of certs)
      items.push({
        id: `cert:${c.id}`,
        kind: 'certificate',
        title: tr('notif.certificate'),
        body: (c.snapshot as Snap).courseTitle ?? null,
        url: `/sertifikat/${c.id}`,
        at: c.issuedAt.toISOString(),
      });
    for (const c of pathCerts)
      items.push({
        id: `pcert:${c.id}`,
        kind: 'certificate',
        title: tr('notif.pathCertificate'),
        body: (c.snapshot as Snap).pathTitle ?? null,
        url: `/sertifikat/${c.id}`,
        at: c.issuedAt.toISOString(),
      });
    for (const r of reviews) {
      const passed = r.status === 'PASSED';
      items.push({
        id: `review:${r.id}:${r.updatedAt.getTime()}`,
        kind: passed ? 'project_passed' : 'project_returned',
        title: passed ? tr('notif.projectPassed') : tr('notif.projectReturned'),
        body: r.pathItem.title ?? r.pathItem.path.title,
        url: `/yol/${r.pathItem.path.slug}/${r.pathItem.key}`,
        at: r.updatedAt.toISOString(),
      });
    }
    const mine = new Set(enrolled.map((e) => e.courseId));
    // heyət üçün «yeni kurs» bildirişi mənasızdır (kursları özləri dərc edir)
    for (const c of staff ? [] : courses) {
      if (mine.has(c.id) || !c.publishedAt) continue;
      items.push({
        id: `course:${c.id}`,
        kind: 'new_course',
        title: tr('notif.newCourse'),
        body: c.title,
        url: `/kurs/${c.slug}`,
        at: c.publishedAt.toISOString(),
      });
    }
    if (pending.length) {
      const last = pending[0]!;
      items.push({
        id: `pending:${pending.length}`,
        kind: 'reviews_pending',
        title: tr('notif.reviewsPending', { n: pending.length }),
        body: null,
        url: '/admin/layiheler',
        at: (last.submittedAt ?? last.updatedAt).toISOString(),
      });
    }
    for (const m of replies)
      items.push({
        id: `support:${m.id}`,
        kind: 'support_reply',
        title: tr('notif.supportReply'),
        body: m.ticket.subject,
        url: `/destek/${m.ticket.id}`,
        at: m.createdAt.toISOString(),
      });
    if (openTickets.length)
      items.push({
        id: `support-open:${openTickets.length}:${openTickets[0]!.lastMessageAt.getTime()}`,
        kind: 'support_open',
        title: tr('notif.supportOpen', { n: openTickets.length }),
        body: null,
        url: '/admin/destek',
        at: openTickets[0]!.lastMessageAt.toISOString(),
      });
    return items
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, MAX_ITEMS)
      .map((n) => ({ ...n, unread: new Date(n.at).getTime() > seen }));
  }

  async unreadCount(userId: string): Promise<number> {
    return (await this.list(userId)).filter((n) => n.unread).length;
  }

  async markSeen(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationsSeenAt: new Date() },
    });
    return { ok: true };
  }
}
