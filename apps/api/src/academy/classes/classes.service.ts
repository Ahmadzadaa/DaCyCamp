import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  academyCan,
  attendanceRate,
  expandWeeklySchedule,
  groupIsReadOnly,
  type AcademyAttendanceInput,
  type AcademyAttendanceRowDto,
  type AcademyEnrollmentStatus,
  type AcademyMyAttendanceDto,
  type AcademyScheduleInput,
  type AcademySessionCreateInput,
  type AcademySessionDto,
  type AcademySessionUpdateInput,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound, unprocessable } from '../../common/errors';
import { AcademyAccessService, academyForbidden, type GroupAccess } from '../access/academy-access.service';
import { emitAcademyEvent } from '../notifications/academy-events';

const sessionInclude = {
  group: { select: { code: true } },
  instructor: { select: { id: true, name: true } },
  _count: { select: { attendance: true } },
} satisfies Prisma.AcademyClassSessionInclude;
type SessionRow = Prisma.AcademyClassSessionGetPayload<{ include: typeof sessionInclude }>;

const MAX_SERIES = 200;
const DAY = 86_400_000;
/** davamiyyət dərs başlamazdan ən çox bu qədər əvvəl qeyd oluna bilər */
const EARLY_MARK_MS = 15 * 60_000;

/**
 * Dərs cədvəli və davamiyyət. Görüş linki yalnız səlahiyyətli istifadəçiyə qaytarılır (aktiv tələbə, qrupun
 * müəllimi, admin). Cədvəli dəyişmək — aparıcı / admin (`session.manage`); davamiyyət — köməkçi də (`attendance.manage`).
 * Hər dərs ayrıca sətirdir: təkrarlanan cədvəldən bir dərsi köçürmək digərlərinə təsir etmir.
 */
@Injectable()
export class AcademyClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly audit: AuditService,
  ) {}

  private canSeeLink(a: GroupAccess): boolean {
    return a.ctx.isAdmin || a.ctx.instructorRole !== null || a.ctx.enrollmentStatus === 'ACTIVE';
  }

  private dto(s: SessionRow, showLink: boolean, showCount: boolean): AcademySessionDto {
    return {
      id: s.id,
      groupId: s.groupId,
      groupCode: s.group.code,
      title: s.title,
      description: s.description,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      status: s.status,
      meetingUrl: showLink && s.status !== 'CANCELLED' ? s.meetingUrl : null,
      instructor: s.instructor,
      seriesId: s.seriesId,
      attendanceMarked: showCount ? s._count.attendance : 0,
    };
  }

  private async loadSession(user: AuthUser, sessionId: string) {
    const s = await this.prisma.academyClassSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!s) throw notFound('ACADEMY_SESSION_NOT_FOUND', 'Dərs tapılmadı');
    return { s, access: await this.access.groupAccess(user, s.groupId) };
  }

  private assertWritableGroup(a: GroupAccess) {
    if (groupIsReadOnly(a.group.status)) throw conflict('ACADEMY_GROUP_READ_ONLY', 'Qrup yalnız oxunur');
  }

  private async assertGroupInstructor(groupId: string, instructorId: string | null | undefined) {
    if (!instructorId) return;
    const ok = await this.prisma.academyGroupInstructor.count({ where: { groupId, userId: instructorId, removedAt: null } });
    if (!ok) throw unprocessable('ACADEMY_NOT_GROUP_INSTRUCTOR', 'Bu istifadəçi qrupun müəllimi deyil');
  }

  // ───────────────────────── cədvəl

  async list(user: AuthUser, groupId: string, range: { from?: string; to?: string }): Promise<AcademySessionDto[]> {
    const a = await this.access.require(user, groupId, 'group.view');
    const rows = await this.prisma.academyClassSession.findMany({
      where: {
        groupId,
        ...(range.from || range.to
          ? { startsAt: { ...(range.from ? { gte: new Date(range.from) } : {}), ...(range.to ? { lte: new Date(range.to) } : {}) } }
          : {}),
      },
      include: sessionInclude,
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    const staff = academyCan(a.ctx, 'attendance.manage');
    return rows.map((s) => this.dto(s, this.canSeeLink(a), staff));
  }

  async create(user: AuthUser, groupId: string, input: AcademySessionCreateInput): Promise<AcademySessionDto> {
    const a = await this.access.require(user, groupId, 'session.manage');
    this.assertWritableGroup(a);
    await this.assertGroupInstructor(groupId, input.instructorId);
    const s = await this.prisma.academyClassSession.create({
      data: {
        groupId,
        title: input.title,
        description: input.description ?? '',
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        meetingUrl: input.meetingUrl ?? null,
        instructorId: input.instructorId ?? null,
        createdById: user.id,
      },
      include: sessionInclude,
    });
    await this.audit.record(user, {
      action: 'academy.session.create',
      entityType: 'ACADEMY',
      entityId: s.id,
      entityTitle: `${a.group.code} · ${s.title}`,
      details: { startsAt: s.startsAt.toISOString() },
    });
    return this.dto(s, true, true);
  }

  /** Həftəlik təkrarlanan cədvəl: qrupun vaxt zonasında yerli saat (yay vaxtı nəzərə alınır) */
  async createSeries(user: AuthUser, groupId: string, input: AcademyScheduleInput): Promise<AcademySessionDto[]> {
    const a = await this.access.require(user, groupId, 'session.manage');
    this.assertWritableGroup(a);
    const slots = expandWeeklySchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      weekdays: input.weekdays,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      timezone: a.group.timezone,
      maxSessions: MAX_SERIES + 1,
    });
    if (!slots.length) throw unprocessable('ACADEMY_SCHEDULE_EMPTY', 'Seçilmiş aralıqda dərs günü yoxdur');
    if (slots.length > MAX_SERIES)
      throw unprocessable('ACADEMY_SCHEDULE_TOO_LONG', `Bir cədvəldə ən çox ${MAX_SERIES} dərs`);
    const seriesId = randomUUID();
    await this.prisma.academyClassSession.createMany({
      data: slots.map((x) => ({
        groupId,
        title: input.title,
        startsAt: x.startsAt,
        endsAt: x.endsAt,
        meetingUrl: input.meetingUrl ?? null,
        seriesId,
        createdById: user.id,
      })),
    });
    await this.audit.record(user, {
      action: 'academy.session.series',
      entityType: 'ACADEMY',
      entityId: seriesId,
      entityTitle: `${a.group.code} · ${input.title}`,
      details: { count: slots.length, startDate: input.startDate, endDate: input.endDate, weekdays: input.weekdays, startTime: input.startTime },
    });
    const rows = await this.prisma.academyClassSession.findMany({ where: { seriesId }, include: sessionInclude, orderBy: { startsAt: 'asc' } });
    return rows.map((s) => this.dto(s, true, true));
  }

  /** Tək dərsi dəyişmək: vaxt dəyişsə RESCHEDULED + bildiriş, ləğv — CANCELLED + bildiriş */
  async update(user: AuthUser, sessionId: string, input: AcademySessionUpdateInput): Promise<AcademySessionDto> {
    const { s, access } = await this.loadSession(user, sessionId);
    if (!academyCan(access.ctx, 'session.manage')) throw academyForbidden();
    this.assertWritableGroup(access);
    await this.assertGroupInstructor(s.groupId, input.instructorId);
    const startsAt = input.startsAt ? new Date(input.startsAt) : s.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : s.endsAt;
    if (endsAt <= startsAt) throw unprocessable('ACADEMY_SESSION_TIME', 'Bitmə vaxtı başlanğıcdan sonra olmalıdır');
    const timeChanged = startsAt.getTime() !== s.startsAt.getTime() || endsAt.getTime() !== s.endsAt.getTime();
    let status = input.status ?? s.status;
    if (timeChanged && !input.status && s.status === 'SCHEDULED') status = 'RESCHEDULED';

    const row = await this.prisma.$transaction(async (tx) => {
      const r = await tx.academyClassSession.update({
        where: { id: s.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
          ...(input.instructorId !== undefined ? { instructorId: input.instructorId } : {}),
          startsAt,
          endsAt,
          status,
        },
        include: sessionInclude,
      });
      if (status === 'CANCELLED' && s.status !== 'CANCELLED') await emitAcademyEvent(tx, { type: 'CLASS_CANCELLED', sessionId: s.id });
      else if (timeChanged && status !== 'CANCELLED')
        await emitAcademyEvent(tx, { type: 'CLASS_RESCHEDULED', sessionId: s.id, startsAt: startsAt.toISOString() });
      return r;
    });
    await this.audit.record(user, {
      action: 'academy.session.update',
      entityType: 'ACADEMY',
      entityId: s.id,
      entityTitle: `${access.group.code} · ${row.title}`,
      details: {
        before: { startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), status: s.status },
        after: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status },
        reason: input.reason ?? null,
      },
    });
    return this.dto(row, true, true);
  }

  async remove(user: AuthUser, sessionId: string): Promise<{ ok: true }> {
    const { s, access } = await this.loadSession(user, sessionId);
    if (!academyCan(access.ctx, 'session.manage')) throw academyForbidden();
    this.assertWritableGroup(access);
    if (s._count.attendance) throw conflict('ACADEMY_SESSION_HAS_ATTENDANCE', 'Davamiyyəti olan dərs silinmir — ləğv edin');
    await this.prisma.academyClassSession.delete({ where: { id: s.id } });
    await this.audit.record(user, {
      action: 'academy.session.delete',
      entityType: 'ACADEMY',
      entityId: s.id,
      entityTitle: `${access.group.code} · ${s.title}`,
    });
    return { ok: true };
  }

  // ───────────────────────── davamiyyət

  async attendance(user: AuthUser, sessionId: string): Promise<AcademyAttendanceRowDto[]> {
    const { s, access } = await this.loadSession(user, sessionId);
    if (!academyCan(access.ctx, 'attendance.manage')) throw academyForbidden();
    const [enrollments, records] = await Promise.all([
      this.prisma.academyEnrollment.findMany({
        where: { groupId: s.groupId, status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN'] } },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: 'asc' } },
      }),
      this.prisma.academyAttendance.findMany({ where: { sessionId: s.id } }),
    ]);
    return enrollments
      .filter((e) => e.status === 'ACTIVE' || e.status === 'PAUSED' || records.some((r) => r.studentId === e.studentId))
      .map((e) => {
        const r = records.find((x) => x.studentId === e.studentId);
        return {
          student: e.student,
          enrollmentStatus: e.status,
          status: r?.status ?? null,
          note: r?.note ?? null,
          markedAt: r?.markedAt.toISOString() ?? null,
        };
      });
  }

  /** Toplu qeyd (upsert). Tələbə bu qrupa yazılmalıdır (bazada da kompozit açarla təmin olunur) */
  async markAttendance(user: AuthUser, sessionId: string, input: AcademyAttendanceInput): Promise<AcademyAttendanceRowDto[]> {
    const { s, access } = await this.loadSession(user, sessionId);
    if (!academyCan(access.ctx, 'attendance.manage')) throw academyForbidden();
    this.assertWritableGroup(access);
    if (s.status === 'CANCELLED') throw conflict('ACADEMY_SESSION_CANCELLED', 'Ləğv olunmuş dərs üçün davamiyyət qeyd olunmur');
    if (Date.now() < s.startsAt.getTime() - EARLY_MARK_MS)
      throw conflict('ACADEMY_SESSION_NOT_STARTED', 'Dərs hələ başlamayıb');
    const ids = input.records.map((r) => r.studentId);
    if (new Set(ids).size !== ids.length) throw unprocessable('ACADEMY_DUPLICATE_STUDENT', 'Eyni tələbə iki dəfə');
    const enrolled = await this.prisma.academyEnrollment.findMany({
      where: { groupId: s.groupId, studentId: { in: ids }, status: { in: ['ACTIVE', 'PAUSED'] } },
      select: { studentId: true },
    });
    const ok = new Set(enrolled.map((e) => e.studentId));
    const bad = ids.filter((id) => !ok.has(id));
    if (bad.length) throw unprocessable('ACADEMY_NOT_ENROLLED', 'Tələbə bu qrupda deyil', { studentIds: bad });
    const now = new Date();
    await this.prisma.$transaction(
      input.records.map((r) =>
        this.prisma.academyAttendance.upsert({
          where: { sessionId_studentId: { sessionId: s.id, studentId: r.studentId } },
          create: { sessionId: s.id, groupId: s.groupId, studentId: r.studentId, status: r.status, note: r.note ?? null, markedById: user.id, markedAt: now },
          update: { status: r.status, note: r.note ?? null, markedById: user.id, markedAt: now },
        }),
      ),
    );
    await this.audit.record(user, {
      action: 'academy.attendance.mark',
      entityType: 'ACADEMY',
      entityId: s.id,
      entityTitle: `${access.group.code} · ${s.title}`,
      details: { count: input.records.length },
    });
    return this.attendance(user, sessionId);
  }

  // ───────────────────────── tələbə

  /** Tələbənin cədvəli: ACTIVE yazılış — link ilə; bitirmiş (COMPLETED) — linksiz, yalnız tarixçə */
  async mySchedule(user: AuthUser, range: { from?: string; to?: string }): Promise<AcademySessionDto[]> {
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { groupId: true, status: true },
    });
    if (!enrollments.length) return [];
    const from = range.from ? new Date(range.from) : new Date(Date.now() - DAY);
    const to = range.to ? new Date(range.to) : new Date(Date.now() + 30 * DAY);
    const rows = await this.prisma.academyClassSession.findMany({
      where: { groupId: { in: enrollments.map((e) => e.groupId) }, startsAt: { gte: from, lte: to } },
      include: sessionInclude,
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    const active = new Set(enrollments.filter((e) => e.status === 'ACTIVE').map((e) => e.groupId));
    return rows.map((s) => this.dto(s, active.has(s.groupId), false));
  }

  async nextSession(user: AuthUser): Promise<AcademySessionDto | null> {
    const now = new Date();
    const enr = await this.prisma.academyEnrollment.findMany({ where: { studentId: user.id, status: 'ACTIVE' }, select: { groupId: true } });
    if (!enr.length) return null;
    const s = await this.prisma.academyClassSession.findFirst({
      where: { groupId: { in: enr.map((e) => e.groupId) }, endsAt: { gte: now }, status: { not: 'CANCELLED' } },
      include: sessionInclude,
      orderBy: { startsAt: 'asc' },
    });
    return s ? this.dto(s, true, false) : null;
  }

  /** Öz davamiyyəti (PENDING-dən başqa hər yazılış vəziyyətində) və qrup üzrə faiz */
  async myAttendance(user: AuthUser): Promise<{
    records: AcademyMyAttendanceDto[];
    groups: Array<{ groupId: string; groupCode: string; rate: number | null; present: number; late: number; absent: number; excused: number }>;
  }> {
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { studentId: user.id, status: { not: 'PENDING' as AcademyEnrollmentStatus } },
      include: { group: { select: { code: true } } },
    });
    const rows = await this.prisma.academyAttendance.findMany({
      where: { studentId: user.id, groupId: { in: enrollments.map((e) => e.groupId) }, session: { status: { not: 'CANCELLED' } } },
      include: { session: { select: { title: true, startsAt: true, group: { select: { code: true } } } } },
      orderBy: { session: { startsAt: 'desc' } },
    });
    return {
      records: rows.map((r) => ({
        sessionId: r.sessionId,
        title: r.session.title,
        groupCode: r.session.group.code,
        startsAt: r.session.startsAt.toISOString(),
        status: r.status,
      })),
      groups: enrollments.map((e) => {
        const mine = rows.filter((r) => r.groupId === e.groupId);
        const c = {
          present: mine.filter((r) => r.status === 'PRESENT').length,
          late: mine.filter((r) => r.status === 'LATE').length,
          absent: mine.filter((r) => r.status === 'ABSENT').length,
          excused: mine.filter((r) => r.status === 'EXCUSED').length,
        };
        return { groupId: e.groupId, groupCode: e.group.code, rate: attendanceRate(c), ...c };
      }),
    };
  }
}
