import { Injectable } from '@nestjs/common';
import type { AcademyNotificationDto, NotificationDto, NotificationKind } from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import type { AuthUser } from '../../common/decorators';
import { tr } from '../../common/i18n/request-locale';
import { notFound } from '../../common/errors';
import { needsReview } from '../analytics/analytics.service';
import type { AcademyNotificationType } from './academy-worker.service';

const KIND: Record<AcademyNotificationType, NotificationKind> = {
  ENROLLED: 'academy_enrolled',
  ASSIGNMENT_PUBLISHED: 'academy_assignment',
  ASSIGNMENT_UPDATED: 'academy_assignment',
  DEADLINE_EXTENDED: 'academy_deadline',
  DEADLINE_SOON: 'academy_deadline',
  SUBMISSION_RECEIVED: 'academy_submission',
  SUBMISSION_RETURNED: 'academy_returned',
  GRADE_RELEASED: 'academy_grade',
  CLASS_RESCHEDULED: 'academy_class',
  CLASS_CANCELLED: 'academy_class',
};
const KEY = {
  ENROLLED: 'notif.academy.enrolled',
  ASSIGNMENT_PUBLISHED: 'notif.academy.assignmentPublished',
  ASSIGNMENT_UPDATED: 'notif.academy.assignmentUpdated',
  DEADLINE_EXTENDED: 'notif.academy.deadlineExtended',
  DEADLINE_SOON: 'notif.academy.deadlineSoon',
  SUBMISSION_RECEIVED: 'notif.academy.submissionReceived',
  SUBMISSION_RETURNED: 'notif.academy.submissionReturned',
  GRADE_RELEASED: 'notif.academy.gradeReleased',
  CLASS_RESCHEDULED: 'notif.academy.classRescheduled',
  CLASS_CANCELLED: 'notif.academy.classCancelled',
} as const satisfies Record<AcademyNotificationType, string>;

type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  createdAt: Date;
  readAt: Date | null;
};

/**
 * Akademiya bildirişləri: işçinin yazdığı sətirlər. Başlıq oxuyanın dilində (tr) qurulur, saxlanan «title» —
 * tapşırığın / dərsin adıdır. Mövcud zəng menyusuna qoşulur (NotificationsService); menyu açılanda hamısı oxunur.
 */
@Injectable()
export class AcademyNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private heading(type: string): string {
    const k = KEY[type as AcademyNotificationType];
    return k ? tr(k) : type;
  }

  private dto(r: Row): AcademyNotificationDto {
    return {
      id: r.id,
      type: r.type,
      title: this.heading(r.type),
      body: [r.title, r.body].filter(Boolean).join(' · ') || null,
      url: r.url,
      createdAt: r.createdAt.toISOString(),
      readAt: r.readAt?.toISOString() ?? null,
    };
  }

  /** Zəng üçün elementlər (modul söndürülübsə boş) */
  async bellItems(userId: string, since: Date, seenAt: number): Promise<NotificationDto[]> {
    if (!env.ACADEMY_MANAGEMENT_ENABLED) return [];
    const [rows, pending] = await Promise.all([
      this.prisma.academyNotification.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.pendingReviews(userId),
    ]);
    const items: NotificationDto[] = rows.map((r) => ({
      id: `academy:${r.id}`,
      kind: KIND[r.type as AcademyNotificationType] ?? 'academy_assignment',
      title: this.heading(r.type),
      body: [r.title, r.body].filter(Boolean).join(' · ') || null,
      url: r.url ?? '/akademiya',
      at: r.createdAt.toISOString(),
      unread: r.readAt === null,
    }));
    if (pending.count > 0 && pending.latest)
      items.push({
        id: `academy-reviews:${pending.count}:${pending.latest.getTime()}`,
        kind: 'academy_reviews',
        title: tr('notif.academy.reviewsPending', { n: pending.count }),
        body: null,
        url: '/muellim',
        at: pending.latest.toISOString(),
        unread: pending.latest.getTime() > seenAt,
      });
    return items;
  }

  /** Müəllimin qruplarında yoxlama gözləyən göndərişlər (yalnız aktiv müəllim əlaqəsi olanlar üçün) */
  private async pendingReviews(userId: string): Promise<{ count: number; latest: Date | null }> {
    const groups = await this.prisma.academyGroupInstructor.findMany({
      where: { userId, removedAt: null },
      select: { groupId: true },
    });
    if (!groups.length) return { count: 0, latest: null };
    const subs = await this.prisma.academySubmission.findMany({
      where: { groupId: { in: groups.map((g) => g.groupId) }, attempts: { some: {} } },
      select: {
        attempts: { select: { id: true, attemptNumber: true, submittedAt: true } },
        grade: {
          select: { status: true, gradedById: true, selectedAttemptId: true, updatedAt: true },
        },
      },
    });
    let count = 0;
    let latest: Date | null = null;
    for (const s of subs) {
      if (!needsReview(s.attempts, s.grade)) continue;
      count++;
      for (const a of s.attempts) if (!latest || a.submittedAt > latest) latest = a.submittedAt;
    }
    return { count, latest };
  }

  async list(user: AuthUser): Promise<AcademyNotificationDto[]> {
    const rows = await this.prisma.academyNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.dto(r));
  }

  async markRead(user: AuthUser, id: string): Promise<{ ok: true }> {
    const r = await this.prisma.academyNotification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (
      !r.count &&
      !(await this.prisma.academyNotification.count({ where: { id, userId: user.id } }))
    )
      throw notFound('ACADEMY_NOTIFICATION_NOT_FOUND', 'Bildiriş tapılmadı');
    return { ok: true };
  }

  async markAllRead(userId: string): Promise<{ ok: true }> {
    await this.prisma.academyNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
