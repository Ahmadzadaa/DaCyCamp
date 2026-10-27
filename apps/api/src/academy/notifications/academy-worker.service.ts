import { Prisma } from '@prisma/client';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ACADEMY_DEFAULTS, effectiveDueAt } from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { AcademyAssignmentsService } from '../assignments/assignments.service';
import { AcademyFilesService } from '../files/files.service';
import type { AcademyEvent } from './academy-events';
import { ClassroomService } from '../classroom/classroom.service';

/** Bildiriş növləri (web lüğəti `notif.academy.*` ilə eyni adlar) */
export const ACADEMY_NOTIFICATION_TYPES = [
  'CLASSROOM_QUESTION',
  'CLASSROOM_REPLY',
  'CLASSROOM_COMMENT',
  'CLASSROOM_ANNOUNCEMENT',
  'CLASSROOM_LESSON',
  'ENROLLED',
  'ASSIGNMENT_PUBLISHED',
  'ASSIGNMENT_UPDATED',
  'DEADLINE_EXTENDED',
  'DEADLINE_SOON',
  'SUBMISSION_RECEIVED',
  'SUBMISSION_RETURNED',
  'GRADE_RELEASED',
  'CLASS_RESCHEDULED',
  'CLASS_CANCELLED',
] as const;
export type AcademyNotificationType = (typeof ACADEMY_NOTIFICATION_TYPES)[number];

interface Draft {
  userId: string;
  type: AcademyNotificationType;
  /** məlumat (tapşırığın / dərsin adı); başlıq mətni oxuyanın dilində göstərilir */
  title: string;
  body: string | null;
  url: string | null;
  referenceType: string;
  referenceId: string;
  dedupeKey: string;
}

const MAX_ATTEMPTS = 5;
const BATCH = 100;
const HOUR = 3_600_000;

/**
 * Akademiya işçisi: outbox hadisələrini bildirişə çevirir (təkrar çatdırılmaya qarşı `userId + dedupeKey` unikal),
 * planlaşdırılmış tapşırıqları dərc edir, son tarix xatırlatmalarını göndərir və köhnə müvəqqəti faylları silir.
 * Bildiriş alınmasa belə akademik qeyd (göndəriş, qiymət) artıq bazadadır — işçi yalnız bildiriş çatdırır.
 * Uğursuz hadisə eksponensial gecikmə ilə yenidən cəhd olunur (5 dəfədən sonra FAILED).
 */
@Injectable()
export class AcademyWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('AcademyWorker');
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: AcademyAssignmentsService,
    private readonly files: AcademyFilesService,
    private readonly classroom: ClassroomService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      !env.ACADEMY_MANAGEMENT_ENABLED ||
      env.ACADEMY_WORKER_INTERVAL_SEC <= 0
    )
      return;
    this.timer = setInterval(() => void this.runOnce(), env.ACADEMY_WORKER_INTERVAL_SEC * 1000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Bir dövr (testlər birbaşa çağırır). Paralel dövr başlamır. */
  async runOnce(at?: Date) {
    const now = at ?? new Date();
    const out = { skipped: false, published: 0, processed: 0, failed: 0, reminders: 0, cleaned: 0 };
    if (this.running) return { ...out, skipped: true };
    this.running = true;
    try {
      await this.step('classroom', () => this.classroom.publishDue(now));
      out.published =
        (await this.step('publish', () => this.assignments.publishScheduled(now))) ?? 0;
      const r = await this.step('outbox', () => this.processOutbox(at));
      out.processed = r?.processed ?? 0;
      out.failed = r?.failed ?? 0;
      out.reminders = (await this.step('reminders', () => this.deadlineReminders(now))) ?? 0;
      out.cleaned = (await this.step('cleanup', () => this.files.cleanupStaged(now))) ?? 0;
    } finally {
      this.running = false;
    }
    return out;
  }

  /** Bir addımın xətası digərlərini dayandırmır */
  private async step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      this.log.warn(`${name}: ${(e as Error).message}`);
      return undefined;
    }
  }

  // ───────────────────────── outbox

  async processOutbox(at?: Date): Promise<{ processed: number; failed: number }> {
    const now = at ?? new Date();
    // SKIP LOCKED — bir neçə API nüsxəsi eyni hadisəni eyni anda götürmür
    const batch = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "AcademyOutboxEvent"
        WHERE status = 'PENDING' AND "availableAt" <= ${at ? Prisma.sql`${at}` : Prisma.sql`clock_timestamp()`}
        ORDER BY "createdAt" ASC
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return [];
      // götürülən hadisələri qısa müddətə «rezerv» edirik (iş yarımçıq qalsa, 5 dəqiqədən sonra yenidən görünür)
      await tx.academyOutboxEvent.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { availableAt: new Date(now.getTime() + 5 * 60_000) },
      });
      return tx.academyOutboxEvent.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
        orderBy: { createdAt: 'asc' },
      });
    });
    let processed = 0;
    let failed = 0;
    for (const ev of batch) {
      try {
        const drafts = await this.recipients(ev.payload as unknown as AcademyEvent);
        if (drafts.length)
          await this.prisma.academyNotification.createMany({ data: drafts, skipDuplicates: true });
        await this.prisma.academyOutboxEvent.update({
          where: { id: ev.id },
          data: {
            status: 'DONE',
            processedAt: new Date(),
            attempts: ev.attempts + 1,
            lastError: null,
          },
        });
        processed++;
      } catch (e) {
        const attempts = ev.attempts + 1;
        const backoff = Math.min(HOUR, 30_000 * 2 ** (attempts - 1));
        await this.prisma.academyOutboxEvent.update({
          where: { id: ev.id },
          data: {
            attempts,
            lastError: String((e as Error).message).slice(0, 1000),
            status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
            availableAt: new Date(now.getTime() + backoff),
          },
        });
        failed++;
        this.log.warn(`outbox ${ev.type} ${ev.id}: ${(e as Error).message}`);
      }
    }
    return { processed, failed };
  }

  /** Hadisə → alıcılar. Silinmiş / dəyişmiş qeyd üçün bildiriş yaranmır (hadisə «DONE» olur) */
  async recipients(e: AcademyEvent): Promise<Draft[]> {
    switch (e.type) {
      case 'CLASSROOM_QUESTION':
      case 'CLASSROOM_REPLY': {
        const reply =
          e.type === 'CLASSROOM_REPLY'
            ? await this.prisma.classroomReply.findUnique({ where: { id: e.id } })
            : null;
        if (e.type === 'CLASSROOM_REPLY' && (!reply || reply.hiddenAt)) return [];
        const questionId = e.type === 'CLASSROOM_QUESTION' ? e.id : reply?.questionId;
        const question = questionId
          ? await this.prisma.classroomQuestion.findUnique({ where: { id: questionId } })
          : null;
        const post = reply?.announcementId
          ? await this.prisma.classroomAnnouncement.findUnique({
              where: { id: reply.announcementId },
            })
          : null;
        const parent = question ?? post;
        if (!parent || parent.archivedAt) return [];
        const group = await this.prisma.academyGroup.findUnique({ where: { id: parent.groupId } });
        if (!group || !['PLANNED', 'ACTIVE', 'COMPLETED'].includes(group.status)) return [];
        const instructors = await this.prisma.academyGroupInstructor.findMany({
          where: { groupId: group.id, removedAt: null },
          select: { userId: true },
        });
        const admins = await this.prisma.user.findMany({
          where: { role: 'ADMIN', isBlocked: false },
          select: { id: true },
        });
        const staffIds = [...instructors.map((x) => x.userId), ...admins.map((x) => x.id)];
        const actor = reply?.authorId ?? question?.authorId;
        const recipientIds = new Set<string>(
          reply?.isStaff && question ? (question.authorId ? [question.authorId] : []) : staffIds,
        );
        if (post) {
          if (post.authorId) recipientIds.add(post.authorId);
          const participants = await this.prisma.classroomReply.findMany({
            where: { announcementId: post.id, hiddenAt: null, authorId: { not: null } },
            distinct: ['authorId'],
            select: { authorId: true },
          });
          for (const p of participants) if (p.authorId) recipientIds.add(p.authorId);
        }
        if (actor) recipientIds.delete(actor);
        const studentsCanView = !!question || !!(post?.isPublished && post.publishAt <= new Date());
        const allowed = await this.prisma.user.findMany({
          where: {
            id: { in: [...recipientIds] },
            isBlocked: false,
            OR: [
              { id: { in: staffIds } },
              ...(studentsCanView
                ? [
                    {
                      academyEnrollments: {
                        some: {
                          groupId: group.id,
                          status: { in: ['ACTIVE', 'COMPLETED'] as Array<'ACTIVE' | 'COMPLETED'> },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
          select: { id: true },
        });
        return allowed.map((user) => ({
          userId: user.id,
          type:
            e.type === 'CLASSROOM_QUESTION'
              ? 'CLASSROOM_QUESTION'
              : question
                ? 'CLASSROOM_REPLY'
                : 'CLASSROOM_COMMENT',
          title: parent.title,
          body: group.code,
          url: question
            ? `/akademiya/sinif/${group.id}/sual/${question.id}`
            : `/akademiya/sinif/${group.id}`,
          referenceType: 'CLASSROOM',
          referenceId: e.id,
          dedupeKey: `classroom-discussion:${e.type}:${e.id}`,
        }));
      }
      case 'CLASSROOM_PUBLISHED': {
        const item =
          e.kind === 'lesson'
            ? await this.prisma.classroomLesson.findUnique({
                where: { id: e.id },
                include: { topic: { select: { archivedAt: true } } },
              })
            : await this.prisma.classroomAnnouncement.findUnique({ where: { id: e.id } });
        if (!item || !item.isPublished || item.archivedAt || item.publishAt > new Date()) return [];
        if ('topic' in item && item.topic.archivedAt) return [];
        const group = await this.prisma.academyGroup.findUnique({ where: { id: item.groupId } });
        if (!group || !['PLANNED', 'ACTIVE'].includes(group.status)) return [];
        const students = await this.prisma.academyEnrollment.findMany({
          where: { groupId: item.groupId, status: 'ACTIVE' },
          select: { studentId: true },
        });
        return students.map((s) => ({
          userId: s.studentId,
          type:
            e.kind === 'lesson'
              ? ('CLASSROOM_LESSON' as const)
              : ('CLASSROOM_ANNOUNCEMENT' as const),
          title: item.title,
          body: group.code,
          url:
            e.kind === 'lesson'
              ? `/akademiya/sinif/${item.groupId}/ders/${item.id}`
              : `/akademiya/sinif/${item.groupId}`,
          referenceType: 'CLASSROOM',
          referenceId: item.id,
          dedupeKey: `classroom:${e.kind}:${item.id}:${e.version}`,
        }));
      }
      case 'ENROLLMENT_CREATED': {
        const enr = await this.prisma.academyEnrollment.findUnique({
          where: { id: e.enrollmentId },
          include: { group: { select: { code: true, name: true } } },
        });
        if (!enr || enr.status !== 'ACTIVE') return [];
        return [
          {
            userId: enr.studentId,
            type: 'ENROLLED',
            title: enr.group.name,
            body: enr.group.code,
            url: '/akademiya',
            referenceType: 'GROUP',
            referenceId: enr.groupId,
            dedupeKey: `enrolled:${enr.id}`,
          },
        ];
      }
      case 'ASSIGNMENT_PUBLISHED':
      case 'ASSIGNMENT_UPDATED': {
        const a = await this.prisma.academyAssignment.findUnique({
          where: { id: e.assignmentId },
          include: { group: { select: { code: true, status: true } } },
        });
        if (!a || a.status !== 'PUBLISHED' || a.group.status !== 'ACTIVE') return [];
        const students = await this.activeStudents(a.groupId);
        const updated = e.type === 'ASSIGNMENT_UPDATED';
        return students.map((userId) => ({
          userId,
          type: updated ? 'ASSIGNMENT_UPDATED' : 'ASSIGNMENT_PUBLISHED',
          title: a.title,
          body: a.group.code,
          url: `/akademiya/tapsiriqlar/${a.id}`,
          referenceType: 'ASSIGNMENT',
          referenceId: a.id,
          dedupeKey: updated ? `updated:${a.id}:${e.version}` : `published:${a.id}`,
        }));
      }
      case 'DEADLINE_EXTENDED': {
        const x = await this.prisma.academyAssignmentExtension.findUnique({
          where: { id: e.extensionId },
          include: { assignment: { include: { group: { select: { code: true } } } } },
        });
        if (!x || x.extendedDueAt.toISOString() !== e.extendedDueAt) return [];
        return [
          {
            userId: x.studentId,
            type: 'DEADLINE_EXTENDED',
            title: x.assignment.title,
            body: x.assignment.group.code,
            url: `/akademiya/tapsiriqlar/${x.assignmentId}`,
            referenceType: 'ASSIGNMENT',
            referenceId: x.assignmentId,
            dedupeKey: `extended:${x.id}:${e.extendedDueAt}`,
          },
        ];
      }
      case 'SUBMISSION_RECEIVED': {
        const at = await this.prisma.academySubmissionAttempt.findUnique({
          where: { id: e.attemptId },
          include: {
            submission: {
              include: { assignment: { include: { group: { select: { code: true } } } } },
            },
          },
        });
        if (!at) return [];
        const a = at.submission.assignment;
        return [
          {
            userId: at.submission.studentId,
            type: 'SUBMISSION_RECEIVED',
            title: a.title,
            body: a.group.code,
            url: `/akademiya/tapsiriqlar/${a.id}`,
            referenceType: 'ATTEMPT',
            referenceId: at.id,
            dedupeKey: `received:${at.id}`,
          },
        ];
      }
      case 'SUBMISSION_RETURNED':
      case 'GRADE_RELEASED': {
        const g = await this.prisma.academyGrade.findUnique({
          where: { id: e.gradeId },
          include: {
            submission: {
              include: { assignment: { include: { group: { select: { code: true } } } } },
            },
          },
        });
        const want = e.type === 'GRADE_RELEASED' ? 'RELEASED' : 'RETURNED';
        if (!g || g.status !== want) return [];
        const a = g.submission.assignment;
        return [
          {
            userId: g.submission.studentId,
            type: e.type,
            title: a.title,
            body: a.group.code,
            url: `/akademiya/tapsiriqlar/${a.id}`,
            referenceType: 'GRADE',
            referenceId: g.id,
            dedupeKey: `${e.type === 'GRADE_RELEASED' ? 'grade' : 'returned'}:${g.id}:${e.version}`,
          },
        ];
      }
      case 'CLASS_RESCHEDULED':
      case 'CLASS_CANCELLED': {
        const s = await this.prisma.academyClassSession.findUnique({
          where: { id: e.sessionId },
          include: { group: { select: { code: true } } },
        });
        if (!s) return [];
        if (
          e.type === 'CLASS_RESCHEDULED' &&
          (s.status === 'CANCELLED' || s.startsAt.toISOString() !== e.startsAt)
        )
          return [];
        const students = await this.activeStudents(s.groupId);
        return students.map((userId) => ({
          userId,
          type: e.type,
          title: s.title,
          body: s.group.code,
          url: '/akademiya/cedvel',
          referenceType: 'SESSION',
          referenceId: s.id,
          dedupeKey:
            e.type === 'CLASS_CANCELLED' ? `class-cancel:${s.id}` : `class:${s.id}:${e.startsAt}`,
        }));
      }
    }
  }

  private async activeStudents(groupId: string): Promise<string[]> {
    const rows = await this.prisma.academyEnrollment.findMany({
      where: { groupId, status: 'ACTIVE' },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  // ───────────────────────── son tarix xatırlatmaları

  /**
   * Hələ göndərməmiş ACTIVE tələbəyə son tarixdən 24 və 3 saat əvvəl (fərdi uzadılma nəzərə alınır).
   * Eyni anda bir neçə hədd uyğun gəlsə yalnız ən yaxını göndərilir; açarda effektiv son tarix var —
   * son tarix dəyişsə yeni xatırlatma mümkündür, eyni son tarix üçün təkrar yoxdur.
   */
  async deadlineReminders(now = new Date()): Promise<number> {
    const hours = [...ACADEMY_DEFAULTS.reminderHours].sort((a, b) => a - b);
    const horizon = new Date(now.getTime() + Math.max(...hours) * HOUR);
    const assignments = await this.prisma.academyAssignment.findMany({
      where: {
        status: 'PUBLISHED',
        availableAt: { lte: now },
        group: { status: 'ACTIVE' },
        OR: [
          { dueAt: { gt: now, lte: horizon } },
          { extensions: { some: { extendedDueAt: { gt: now, lte: horizon } } } },
        ],
      },
      include: { group: { select: { code: true } }, extensions: true },
    });
    const drafts: Draft[] = [];
    for (const a of assignments) {
      const [students, submitted] = await Promise.all([
        this.activeStudents(a.groupId),
        this.prisma.academySubmission.findMany({
          where: { assignmentId: a.id, attempts: { some: {} } },
          select: { studentId: true },
        }),
      ]);
      const done = new Set(submitted.map((s) => s.studentId));
      for (const userId of students) {
        if (done.has(userId)) continue;
        const ext = a.extensions.find((x) => x.studentId === userId);
        const due = effectiveDueAt(a.dueAt, ext?.extendedDueAt);
        const left = due.getTime() - now.getTime();
        if (left <= 0) continue;
        const h = hours.find((x) => left <= x * HOUR);
        if (h === undefined) continue;
        drafts.push({
          userId,
          type: 'DEADLINE_SOON',
          title: a.title,
          body: a.group.code,
          url: `/akademiya/tapsiriqlar/${a.id}`,
          referenceType: 'ASSIGNMENT',
          referenceId: a.id,
          dedupeKey: `deadline:${a.id}:${h}:${due.toISOString()}`,
        });
      }
    }
    if (!drafts.length) return 0;
    const r = await this.prisma.academyNotification.createMany({
      data: drafts,
      skipDuplicates: true,
    });
    return r.count;
  }
}
