import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AcademyCourseLinkDto,
  AcademyEnrollmentCreateInput,
  AcademyEnrollmentDto,
  AcademyEnrollmentEventDto,
  AcademyEnrollmentStatus,
  AcademyEnrollmentUpdateInput,
  AcademyGroupCreateInput,
  AcademyGroupDto,
  AcademyGroupStatus,
  AcademyGroupUpdateInput,
  AcademyInstructorAssignInput,
  AcademyPage,
  AcademyPageQuery,
  AcademyProgramCreateInput,
  AcademyProgramDto,
  AcademyProgramUpdateInput,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { badRequest, conflict, notFound } from '../../common/errors';
import {
  AcademyAccessService,
  academyForbidden,
  type GroupAccess,
} from '../access/academy-access.service';
import { emitAcademyEvent } from '../notifications/academy-events';

/** Qrupun həyat dövrü: arxiv geri qaytarılmır, akademik tarix silinmir */
const GROUP_TRANSITIONS: Record<AcademyGroupStatus, AcademyGroupStatus[]> = {
  PLANNED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED', 'ACTIVE'],
  CANCELLED: ['ARCHIVED', 'PLANNED'],
  ARCHIVED: [],
};

/** Yazılış keçidləri; tutum yoxlaması ACTIVE/PENDING/PAUSED yerləri üçündür */
const ENROLLMENT_TRANSITIONS: Record<AcademyEnrollmentStatus, AcademyEnrollmentStatus[]> = {
  PENDING: ['ACTIVE', 'WITHDRAWN'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'WITHDRAWN'],
  PAUSED: ['ACTIVE', 'COMPLETED', 'WITHDRAWN'],
  COMPLETED: ['ACTIVE'],
  WITHDRAWN: ['ACTIVE', 'PENDING'],
};
const SEAT_STATUSES: AcademyEnrollmentStatus[] = ['PENDING', 'ACTIVE', 'PAUSED'];

const groupInclude = {
  program: { select: { id: true, title: true, slug: true } },
  instructors: {
    where: { removedAt: null },
    orderBy: [{ role: 'asc' as const }, { assignedAt: 'asc' as const }],
    select: {
      role: true,
      assignedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: { select: { enrollments: { where: { status: 'ACTIVE' as const } } } },
} satisfies Prisma.AcademyGroupInclude;
type GroupRow = Prisma.AcademyGroupGetPayload<{ include: typeof groupInclude }>;

const isUnique = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class AcademyOrganizationService {
  private readonly log = new Logger('Academy');
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly audit: AuditService,
  ) {}

  // ───────────────────────── proqramlar

  async listPrograms(user: AuthUser): Promise<AcademyProgramDto[]> {
    this.access.requireAdmin(user);
    const rows = await this.prisma.academyProgram.findMany({
      orderBy: [{ status: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { groups: true } } },
    });
    return rows.map((p) => this.programDto(p, p._count.groups));
  }

  async createProgram(
    user: AuthUser,
    input: AcademyProgramCreateInput,
  ): Promise<AcademyProgramDto> {
    this.access.requireAdmin(user);
    try {
      const p = await this.prisma.academyProgram.create({ data: input });
      await this.audit.record(user, {
        action: 'academy.program.create',
        entityType: 'ACADEMY',
        entityId: p.id,
        entityTitle: p.title,
      });
      return this.programDto(p, 0);
    } catch (e) {
      if (isUnique(e)) throw conflict('ACADEMY_SLUG_TAKEN', 'Bu slug artıq istifadə olunur');
      throw e;
    }
  }

  async updateProgram(
    user: AuthUser,
    id: string,
    input: AcademyProgramUpdateInput,
  ): Promise<AcademyProgramDto> {
    this.access.requireAdmin(user);
    const before = await this.prisma.academyProgram.findUnique({ where: { id } });
    if (!before) throw notFound('ACADEMY_PROGRAM_NOT_FOUND', 'Proqram tapılmadı');
    try {
      const p = await this.prisma.academyProgram.update({
        where: { id },
        data: input,
        include: { _count: { select: { groups: true } } },
      });
      await this.audit.record(user, {
        action: 'academy.program.update',
        entityType: 'ACADEMY',
        entityId: id,
        entityTitle: p.title,
        details: { before: { title: before.title, status: before.status }, after: input },
      });
      return this.programDto(p, p._count.groups);
    } catch (e) {
      if (isUnique(e)) throw conflict('ACADEMY_SLUG_TAKEN', 'Bu slug artıq istifadə olunur');
      throw e;
    }
  }

  private programDto(
    p: {
      id: string;
      title: string;
      slug: string;
      description: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    },
    groupCount: number,
  ): AcademyProgramDto {
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      status: p.status as AcademyProgramDto['status'],
      groupCount,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // ───────────────────────── qruplar

  async listGroups(
    user: AuthUser,
    q: AcademyPageQuery & { programId?: string },
  ): Promise<AcademyPage<AcademyGroupDto>> {
    const admin = this.access.isAdmin(user);
    const where: Prisma.AcademyGroupWhereInput = {
      ...(q.status ? { status: q.status as AcademyGroupStatus } : {}),
      ...(q.programId ? { programId: q.programId } : {}),
      ...(q.q
        ? {
            OR: [
              { code: { contains: q.q, mode: 'insensitive' } },
              { name: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      // admin deyilsə — yalnız müəllim olduğu və ya yazıldığı qruplar
      ...(admin
        ? {}
        : {
            OR: [
              { instructors: { some: { userId: user.id, removedAt: null } } },
              {
                enrollments: {
                  some: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
                },
              },
            ],
          }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.academyGroup.count({ where }),
      this.prisma.academyGroup.findMany({
        where,
        include: groupInclude,
        orderBy: [{ status: 'asc' }, { code: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const access = await this.access.groupAccessMany(user, rows);
    const items = rows.map((g) => this.groupDto(g, access.get(g.id)!));
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async getGroup(user: AuthUser, id: string): Promise<AcademyGroupDto> {
    const a = await this.access.require(user, id, 'group.view');
    const g = await this.prisma.academyGroup.findUniqueOrThrow({
      where: { id },
      include: groupInclude,
    });
    return this.groupDto(g, a);
  }

  groupDto(g: GroupRow, a: GroupAccess): AcademyGroupDto {
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      description: g.description,
      status: g.status as AcademyGroupStatus,
      format: g.format as AcademyGroupDto['format'],
      timezone: g.timezone,
      capacity: g.capacity,
      startAt: g.startAt?.toISOString() ?? null,
      endAt: g.endAt?.toISOString() ?? null,
      program: g.program,
      instructors: g.instructors.map((i) => ({
        user: {
          id: i.user.id,
          name: i.user.name,
          email: a.ctx.isAdmin || a.ctx.instructorRole ? i.user.email : undefined,
        },
        role: i.role as 'LEAD' | 'ASSISTANT',
        assignedAt: i.assignedAt.toISOString(),
      })),
      activeStudents: g._count.enrollments,
      permissions: this.access.permissions(a),
      myRole: a.role,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }

  async createGroup(user: AuthUser, input: AcademyGroupCreateInput): Promise<AcademyGroupDto> {
    this.access.requireAdmin(user);
    const program = await this.prisma.academyProgram.findUnique({ where: { id: input.programId } });
    if (!program) throw notFound('ACADEMY_PROGRAM_NOT_FOUND', 'Proqram tapılmadı');
    if (program.status === 'ARCHIVED')
      throw conflict('ACADEMY_PROGRAM_ARCHIVED', 'Arxivdəki proqrama yeni qrup əlavə olunmur');
    const assistants = [...new Set(input.assistantInstructorIds ?? [])].filter(
      (x) => x !== input.leadInstructorId,
    );
    const staffIds = [...(input.leadInstructorId ? [input.leadInstructorId] : []), ...assistants];
    if (staffIds.length) {
      const found = await this.prisma.user.count({ where: { id: { in: staffIds } } });
      if (found !== staffIds.length) throw notFound('USER_NOT_FOUND', 'Müəllim tapılmadı');
    }
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const g = await tx.academyGroup.create({
          data: {
            programId: input.programId,
            code: input.code,
            name: input.name,
            description: input.description,
            status: input.status,
            format: input.format,
            timezone: input.timezone,
            capacity: input.capacity ?? null,
            startAt: input.startAt ?? null,
            endAt: input.endAt ?? null,
            createdById: user.id,
          },
        });
        if (input.leadInstructorId)
          await tx.academyGroupInstructor.create({
            data: {
              groupId: g.id,
              userId: input.leadInstructorId,
              role: 'LEAD',
              leadSlot: g.id,
              assignedById: user.id,
            },
          });
        for (const uid of assistants)
          await tx.academyGroupInstructor.create({
            data: { groupId: g.id, userId: uid, role: 'ASSISTANT', assignedById: user.id },
          });
        return g.id;
      });
      await this.audit.record(user, {
        action: 'academy.group.create',
        entityType: 'ACADEMY',
        entityId: id,
        entityTitle: `${input.code} · ${input.name}`,
      });
      this.log.log(`group created ${input.code}`);
      return this.getGroup(user, id);
    } catch (e) {
      if (isUnique(e)) throw conflict('ACADEMY_GROUP_CODE_TAKEN', 'Bu qrup kodu artıq var');
      throw e;
    }
  }

  async updateGroup(
    user: AuthUser,
    id: string,
    input: AcademyGroupUpdateInput,
  ): Promise<AcademyGroupDto> {
    this.access.requireAdmin(user);
    const before = await this.prisma.academyGroup.findUnique({ where: { id } });
    if (!before) throw notFound('ACADEMY_GROUP_NOT_FOUND', 'Qrup tapılmadı');
    if (input.status && input.status !== before.status) {
      const allowed = GROUP_TRANSITIONS[before.status as AcademyGroupStatus];
      if (!allowed.includes(input.status))
        throw conflict(
          'ACADEMY_GROUP_TRANSITION',
          `Vəziyyət ${before.status} → ${input.status} mümkün deyil`,
        );
    }
    if (before.status === 'ARCHIVED' && Object.keys(input).some((k) => k !== 'status'))
      throw conflict('ACADEMY_GROUP_ARCHIVED', 'Arxivdəki qrup dəyişdirilmir');
    const start = input.startAt !== undefined ? input.startAt : before.startAt;
    const end = input.endAt !== undefined ? input.endAt : before.endAt;
    if (start && end && end < start)
      throw badRequest('VALIDATION_FAILED', 'Bitmə tarixi başlanğıcdan əvvəl ola bilməz');
    if (input.capacity != null) {
      const seats = await this.prisma.academyEnrollment.count({
        where: { groupId: id, status: { in: SEAT_STATUSES } },
      });
      if (input.capacity < seats)
        throw conflict('ACADEMY_CAPACITY_BELOW_ACTIVE', `Qrupda artıq ${seats} tələbə var`);
    }
    try {
      await this.prisma.academyGroup.update({
        where: { id },
        data: {
          ...input,
          capacity: input.capacity === undefined ? undefined : input.capacity,
        },
      });
    } catch (e) {
      if (isUnique(e)) throw conflict('ACADEMY_GROUP_CODE_TAKEN', 'Bu qrup kodu artıq var');
      throw e;
    }
    await this.audit.record(user, {
      action: 'academy.group.update',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${input.code ?? before.code} · ${input.name ?? before.name}`,
      details: {
        before: { status: before.status, capacity: before.capacity, name: before.name },
        changes: Object.keys(input),
      },
    });
    return this.getGroup(user, id);
  }

  // ───────────────────────── müəllimlər

  async assignInstructor(user: AuthUser, groupId: string, input: AcademyInstructorAssignInput) {
    this.access.requireAdmin(user);
    const group = await this.prisma.academyGroup.findUnique({ where: { id: groupId } });
    if (!group) throw notFound('ACADEMY_GROUP_NOT_FOUND', 'Qrup tapılmadı');
    if (group.status === 'ARCHIVED')
      throw conflict('ACADEMY_GROUP_ARCHIVED', 'Arxivdəki qrup dəyişdirilmir');
    const target = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw notFound('USER_NOT_FOUND', 'İstifadəçi tapılmadı');
    // eyni qrupda həm tələbə, həm müəllim olmaq ziddiyyətlidir
    const enr = await this.prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId, studentId: input.userId } },
    });
    if (enr && enr.status !== 'WITHDRAWN' && enr.status !== 'COMPLETED')
      throw conflict('ACADEMY_INSTRUCTOR_IS_STUDENT', 'Bu istifadəçi qrupun tələbəsidir');
    try {
      await this.prisma.academyGroupInstructor.upsert({
        where: { groupId_userId: { groupId, userId: input.userId } },
        create: {
          groupId,
          userId: input.userId,
          role: input.role,
          leadSlot: input.role === 'LEAD' ? groupId : null,
          assignedById: user.id,
        },
        update: {
          role: input.role,
          leadSlot: input.role === 'LEAD' ? groupId : null,
          removedAt: null,
          assignedAt: new Date(),
          assignedById: user.id,
        },
      });
    } catch (e) {
      if (isUnique(e))
        throw conflict(
          'ACADEMY_LEAD_EXISTS',
          'Qrupun artıq aparıcı müəllimi var — əvvəlcə onu dəyişin',
        );
      throw e;
    }
    await this.audit.record(user, {
      action: 'academy.instructor.assign',
      entityType: 'ACADEMY',
      entityId: groupId,
      entityTitle: `${group.code} · ${target.email}`,
      details: { userId: input.userId, role: input.role },
    });
    return this.getGroup(user, groupId);
  }

  /** Müəllimi qrupdan çıxarır: sətir qalır (removedAt), hüquqlar dərhal itir */
  async removeInstructor(user: AuthUser, groupId: string, userId: string) {
    this.access.requireAdmin(user);
    const row = await this.prisma.academyGroupInstructor.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { group: { select: { code: true } }, user: { select: { email: true } } },
    });
    if (!row || row.removedAt)
      throw notFound('ACADEMY_INSTRUCTOR_NOT_FOUND', 'Bu müəllim qrupda deyil');
    await this.prisma.academyGroupInstructor.update({
      where: { id: row.id },
      data: { removedAt: new Date(), leadSlot: null },
    });
    await this.audit.record(user, {
      action: 'academy.instructor.remove',
      entityType: 'ACADEMY',
      entityId: groupId,
      entityTitle: `${row.group.code} · ${row.user.email}`,
      details: { userId, role: row.role },
    });
    return this.getGroup(user, groupId);
  }

  // ───────────────────────── tələbələr

  async listStudents(
    user: AuthUser,
    groupId: string,
    q: AcademyPageQuery,
  ): Promise<AcademyPage<AcademyEnrollmentDto>> {
    await this.access.require(user, groupId, 'group.viewRoster');
    const where: Prisma.AcademyEnrollmentWhereInput = {
      groupId,
      ...(q.status ? { status: q.status as AcademyEnrollmentStatus } : {}),
      ...(q.q
        ? {
            student: {
              OR: [
                { name: { contains: q.q, mode: 'insensitive' } },
                { email: { contains: q.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.academyEnrollment.count({ where }),
      this.prisma.academyEnrollment.findMany({
        where,
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: [{ status: 'asc' }, { student: { name: 'asc' } }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return {
      items: rows.map((r) => this.enrollmentDto(r)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  enrollmentDto(r: {
    id: string;
    groupId: string;
    status: string;
    enrolledAt: Date;
    endedAt: Date | null;
    student: { id: string; name: string; email: string };
  }): AcademyEnrollmentDto {
    return {
      id: r.id,
      groupId: r.groupId,
      student: r.student,
      status: r.status as AcademyEnrollmentStatus,
      enrolledAt: r.enrolledAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
    };
  }

  /**
   * Yazılış: tutum yoxlaması qrup sətrini kilidləyərək (SELECT … FOR UPDATE) eyni tranzaksiyada aparılır —
   * paralel sorğular tutumu keçə bilməz. Mövcud (çıxmış / bitirmiş) yazılış yenidən aktivləşir, tarixçə qalır.
   */
  async enroll(
    user: AuthUser,
    groupId: string,
    input: AcademyEnrollmentCreateInput,
  ): Promise<AcademyEnrollmentDto> {
    this.access.requireAdmin(user);
    const student = input.userId
      ? await this.prisma.user.findUnique({ where: { id: input.userId } })
      : await this.prisma.user.findUnique({ where: { email: input.email! } });
    if (!student) throw notFound('USER_NOT_FOUND', 'İstifadəçi tapılmadı');
    const inst = await this.prisma.academyGroupInstructor.findFirst({
      where: { groupId, userId: student.id, removedAt: null },
    });
    if (inst) throw conflict('ACADEMY_STUDENT_IS_INSTRUCTOR', 'Bu istifadəçi qrupun müəllimidir');

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; status: string; capacity: number | null; code: string }>
      >`
        SELECT "id", "status"::text AS "status", "capacity", "code" FROM "AcademyGroup" WHERE "id" = ${groupId} FOR UPDATE`;
      const group = locked[0];
      if (!group) throw notFound('ACADEMY_GROUP_NOT_FOUND', 'Qrup tapılmadı');
      if (!['PLANNED', 'ACTIVE'].includes(group.status))
        throw conflict('ACADEMY_GROUP_CLOSED', 'Bu qrupa yazılış bağlıdır');
      const existing = await tx.academyEnrollment.findUnique({
        where: { groupId_studentId: { groupId, studentId: student.id } },
      });
      if (existing && SEAT_STATUSES.includes(existing.status as AcademyEnrollmentStatus))
        throw conflict('ACADEMY_ALREADY_ENROLLED', 'Tələbə artıq bu qrupdadır');
      if (group.capacity != null && !input.overrideCapacity) {
        const seats = await tx.academyEnrollment.count({
          where: { groupId, status: { in: SEAT_STATUSES } },
        });
        if (seats >= group.capacity)
          throw conflict('ACADEMY_CAPACITY_REACHED', 'Qrupun tutumu dolub');
      }
      const now = new Date();
      const enr = existing
        ? await tx.academyEnrollment.update({
            where: { id: existing.id },
            data: { status: input.status, endedAt: null, enrolledAt: now, createdById: user.id },
            include: { student: { select: { id: true, name: true, email: true } } },
          })
        : await tx.academyEnrollment.create({
            data: { groupId, studentId: student.id, status: input.status, createdById: user.id },
            include: { student: { select: { id: true, name: true, email: true } } },
          });
      await tx.academyEnrollmentEvent.create({
        data: {
          enrollmentId: enr.id,
          fromStatus: (existing?.status as AcademyEnrollmentStatus | undefined) ?? null,
          toStatus: input.status,
          reason: input.overrideCapacity ? 'capacity override' : null,
          actorId: user.id,
        },
      });
      if (input.status === 'ACTIVE')
        await emitAcademyEvent(tx, { type: 'ENROLLMENT_CREATED', enrollmentId: enr.id });
      return { enr, code: group.code };
    });
    await this.audit.record(user, {
      action: 'academy.enrollment.create',
      entityType: 'ACADEMY',
      entityId: result.enr.id,
      entityTitle: `${result.code} · ${student.email}`,
      details: { status: input.status, overrideCapacity: input.overrideCapacity },
    });
    this.log.log(`enrollment ${result.code} ${student.id} → ${input.status}`);
    return this.enrollmentDto(result.enr);
  }

  async updateEnrollment(
    user: AuthUser,
    enrollmentId: string,
    input: AcademyEnrollmentUpdateInput,
  ): Promise<AcademyEnrollmentDto> {
    this.access.requireAdmin(user);
    const result = await this.prisma.$transaction(async (tx) => {
      const enr = await tx.academyEnrollment.findUnique({ where: { id: enrollmentId } });
      if (!enr) throw notFound('ACADEMY_ENROLLMENT_NOT_FOUND', 'Yazılış tapılmadı');
      const from = enr.status as AcademyEnrollmentStatus;
      if (from === input.status)
        throw conflict('ACADEMY_ENROLLMENT_SAME_STATUS', 'Vəziyyət artıq belədir');
      if (!ENROLLMENT_TRANSITIONS[from].includes(input.status))
        throw conflict(
          'ACADEMY_ENROLLMENT_TRANSITION',
          `Vəziyyət ${from} → ${input.status} mümkün deyil`,
        );
      const locked = await tx.$queryRaw<
        Array<{ status: string; capacity: number | null; code: string }>
      >`
        SELECT "status"::text AS "status", "capacity", "code" FROM "AcademyGroup" WHERE "id" = ${enr.groupId} FOR UPDATE`;
      const group = locked[0]!;
      // yer tutmayan vəziyyətdən yer tutana keçid → tutum yoxlaması
      if (!SEAT_STATUSES.includes(from) && SEAT_STATUSES.includes(input.status)) {
        if (!['PLANNED', 'ACTIVE'].includes(group.status))
          throw conflict('ACADEMY_GROUP_CLOSED', 'Bu qrupa yazılış bağlıdır');
        if (group.capacity != null) {
          const seats = await tx.academyEnrollment.count({
            where: { groupId: enr.groupId, status: { in: SEAT_STATUSES } },
          });
          if (seats >= group.capacity)
            throw conflict('ACADEMY_CAPACITY_REACHED', 'Qrupun tutumu dolub');
        }
      }
      const ended = input.status === 'COMPLETED' || input.status === 'WITHDRAWN';
      const upd = await tx.academyEnrollment.update({
        where: { id: enr.id },
        data: { status: input.status, endedAt: ended ? new Date() : null },
        include: { student: { select: { id: true, name: true, email: true } } },
      });
      await tx.academyEnrollmentEvent.create({
        data: {
          enrollmentId: enr.id,
          fromStatus: from,
          toStatus: input.status,
          reason: input.reason ?? null,
          actorId: user.id,
        },
      });
      if (input.status === 'ACTIVE' && (from === 'PENDING' || from === 'WITHDRAWN'))
        await emitAcademyEvent(tx, { type: 'ENROLLMENT_CREATED', enrollmentId: enr.id });
      return { upd, from, code: group.code };
    });
    await this.audit.record(user, {
      action: 'academy.enrollment.update',
      entityType: 'ACADEMY',
      entityId: enrollmentId,
      entityTitle: `${result.code} · ${result.upd.student.email}`,
      details: { from: result.from, to: input.status, reason: input.reason ?? null },
    });
    return this.enrollmentDto(result.upd);
  }

  async enrollmentHistory(
    user: AuthUser,
    enrollmentId: string,
  ): Promise<AcademyEnrollmentEventDto[]> {
    const enr = await this.prisma.academyEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enr) throw notFound('ACADEMY_ENROLLMENT_NOT_FOUND', 'Yazılış tapılmadı');
    const a = await this.access.groupAccess(user, enr.groupId);
    const own = enr.studentId === user.id;
    if (!own && !this.access.can(a, 'group.viewRoster')) throw academyForbidden();
    const rows = await this.prisma.academyEnrollmentEvent.findMany({
      where: { enrollmentId },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((e) => ({
      fromStatus: (e.fromStatus as AcademyEnrollmentStatus | null) ?? null,
      toStatus: e.toStatus as AcademyEnrollmentStatus,
      reason: e.reason,
      actor: e.actor,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  // ───────────────────────── əlaqəli platforma kursları

  async listCourseLinks(user: AuthUser, groupId: string): Promise<AcademyCourseLinkDto[]> {
    const a = await this.access.groupAccess(user, groupId);
    if (!this.access.can(a, 'group.view')) throw academyForbidden();
    const rows = await this.prisma.academyCourseLink.findMany({
      where: { groupId, course: { deletedAt: null } },
      include: { course: { select: { id: true, slug: true, title: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({ courseId: r.course.id, slug: r.course.slug, title: r.course.title }));
  }

  async setCourseLinks(
    user: AuthUser,
    groupId: string,
    courseIds: string[],
  ): Promise<AcademyCourseLinkDto[]> {
    this.access.requireAdmin(user);
    const group = await this.prisma.academyGroup.findUnique({ where: { id: groupId } });
    if (!group) throw notFound('ACADEMY_GROUP_NOT_FOUND', 'Qrup tapılmadı');
    const ids = [...new Set(courseIds)];
    const found = await this.prisma.course.count({ where: { id: { in: ids }, deletedAt: null } });
    if (found !== ids.length) throw notFound('COURSE_NOT_FOUND', 'Kurs tapılmadı');
    await this.prisma.$transaction([
      this.prisma.academyCourseLink.deleteMany({ where: { groupId, courseId: { notIn: ids } } }),
      ...ids.map((courseId, i) =>
        this.prisma.academyCourseLink.upsert({
          where: { groupId_courseId: { groupId, courseId } },
          create: { groupId, courseId, sortOrder: i },
          update: { sortOrder: i },
        }),
      ),
    ]);
    await this.audit.record(user, {
      action: 'academy.group.courses',
      entityType: 'ACADEMY',
      entityId: groupId,
      entityTitle: group.code,
      details: { courseIds: ids },
    });
    return this.listCourseLinks(user, groupId);
  }
}
