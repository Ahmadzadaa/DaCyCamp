import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AcademyEnrollmentStatus,
  AcademyJoinPreviewDto,
  AcademyJoinRegisterInput,
  AcademyJoinResultDto,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthService } from '../../auth/auth.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, unprocessable } from '../../common/errors';
import { emitAcademyEvent } from '../notifications/academy-events';

type Db = Prisma.TransactionClient | PrismaService;

const OPEN_GROUP = ['PLANNED', 'ACTIVE'];
/** yer tutan yazılışlar (tutum yoxlaması) */
const SEAT_STATUSES: AcademyEnrollmentStatus[] = ['PENDING', 'ACTIVE', 'PAUSED'];

/** müəllim və tələbə hesabları ayrıdır: müəllim hesabı qrupa tələbə kimi yazılmır */
export const teacherAccount = () =>
  conflict('ACADEMY_TEACHER_ACCOUNT', 'Müəllim hesabı ilə tələbə kimi qrupa yazılmaq olmaz');

const invalidCode = () =>
  unprocessable('ACADEMY_JOIN_CODE_INVALID', 'Kod yanlışdır və ya artıq etibarlı deyil');

/**
 * Qrupa qoşulma kodu. Tələbə kodu qeydiyyatda (və ya sonra profildən) yazır və birbaşa həmin qrupa
 * ACTIVE tələbə kimi düşür. Tutum, qrupun vəziyyəti və təkrar yazılış admin yazılışı ilə eyni qaydalarla,
 * qrup sətri kilidlənərək yoxlanılır.
 */
@Injectable()
export class AcademyJoinService {
  private readonly log = new Logger('AcademyJoin');
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  /** Kod hansı qrupa aiddir — tələbə qeydiyyatdan əvvəl görür */
  async preview(code: string): Promise<AcademyJoinPreviewDto> {
    const g = await this.findOpen(this.prisma, code);
    return {
      group: {
        code: g.code,
        name: g.name,
        startAt: g.startAt?.toISOString() ?? null,
        format: g.format as AcademyJoinPreviewDto['group']['format'],
      },
      program: { title: g.program.title },
    };
  }

  /** Daxil olmuş istifadəçi (məs. əvvəl yalnız Camp üçün qeydiyyatdan keçən) kodla qrupa qoşulur */
  async join(user: AuthUser, code: string): Promise<AcademyJoinResultDto> {
    if (user.role === 'TEACHER') throw teacherAccount();
    const r = await this.prisma.$transaction((tx) => this.enrollByCode(tx, user.id, code));
    await this.record(user, r);
    return r;
  }

  /** Akademiyaya qeydiyyat: hesab və yazılış bir tranzaksiyada — kod keçmirsə hesab da yaranmır */
  async register(dto: AcademyJoinRegisterInput, meta: { ua?: string; ip?: string }) {
    let joined: AcademyJoinResultDto | undefined;
    const { user, tokens } = await this.auth.register(dto, meta, async (tx, u) => {
      joined = await this.enrollByCode(tx, u.id, dto.code);
    });
    await this.record(user, joined!);
    return { user, tokens, joined: joined! };
  }

  private async findOpen(db: Db, code: string) {
    const g = await db.academyGroup.findUnique({
      where: { joinCode: code },
      include: { program: { select: { title: true, status: true } } },
    });
    // söndürülmüş kod və arxiv proqram «yanlış kod» kimi görünür — kodun nə vaxtsa olduğu açılmır
    if (!g || !g.joinEnabled || g.program.status === 'ARCHIVED') throw invalidCode();
    if (!OPEN_GROUP.includes(g.status))
      throw conflict('ACADEMY_JOIN_CLOSED', 'Bu qrupa qoşulma bağlıdır');
    return g;
  }

  private async enrollByCode(
    tx: Prisma.TransactionClient,
    studentId: string,
    code: string,
  ): Promise<AcademyJoinResultDto> {
    const found = await this.findOpen(tx, code);
    // kilid: paralel qoşulmalar tutumu keçməsin; kod bu arada yenilənibsə və ya söndürülübsə qəbul olunmur
    const locked = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        capacity: number | null;
        joinCode: string;
        joinEnabled: boolean;
      }>
    >`
      SELECT "id", "status"::text AS "status", "capacity", "joinCode", "joinEnabled"
      FROM "AcademyGroup" WHERE "id" = ${found.id} FOR UPDATE`;
    const g = locked[0];
    if (!g || g.joinCode !== code || !g.joinEnabled) throw invalidCode();
    if (!OPEN_GROUP.includes(g.status))
      throw conflict('ACADEMY_JOIN_CLOSED', 'Bu qrupa qoşulma bağlıdır');

    const inst = await tx.academyGroupInstructor.findFirst({
      where: { groupId: g.id, userId: studentId, removedAt: null },
      select: { id: true },
    });
    if (inst) throw conflict('ACADEMY_STUDENT_IS_INSTRUCTOR', 'Siz bu qrupun müəllimisiniz');

    const existing = await tx.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: g.id, studentId } },
    });
    if (existing?.status === 'ACTIVE' || existing?.status === 'PAUSED')
      throw conflict('ACADEMY_ALREADY_MEMBER', 'Siz artıq bu qrupdasınız');
    // admin çıxarıbsa və ya qrupu bitiribsə, kodla özü geri qayıda bilməz
    if (existing && existing.status !== 'PENDING')
      throw conflict(
        'ACADEMY_JOIN_NOT_ALLOWED',
        'Bu qrupa yenidən qoşulmaq üçün adminə müraciət edin',
      );

    if (g.capacity != null) {
      const seats = await tx.academyEnrollment.count({
        where: { groupId: g.id, status: { in: SEAT_STATUSES }, NOT: { studentId } },
      });
      if (seats >= g.capacity) throw conflict('ACADEMY_CAPACITY_REACHED', 'Qrupda boş yer yoxdur');
    }

    const now = new Date();
    const enr = existing
      ? await tx.academyEnrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', endedAt: null, enrolledAt: now },
        })
      : await tx.academyEnrollment.create({
          data: { groupId: g.id, studentId, status: 'ACTIVE', createdById: studentId },
        });
    await tx.academyEnrollmentEvent.create({
      data: {
        enrollmentId: enr.id,
        fromStatus: (existing?.status as AcademyEnrollmentStatus | undefined) ?? null,
        toStatus: 'ACTIVE',
        reason: 'join code',
        actorId: studentId,
      },
    });
    await emitAcademyEvent(tx, { type: 'ENROLLMENT_CREATED', enrollmentId: enr.id });
    return { groupId: g.id, groupCode: found.code, groupName: found.name };
  }

  private async record(user: Pick<AuthUser, 'id' | 'email'>, r: AcademyJoinResultDto) {
    await this.audit.record(user, {
      action: 'academy.enrollment.join',
      entityType: 'ACADEMY',
      entityId: r.groupId,
      entityTitle: `${r.groupCode} · ${user.email}`,
    });
    this.log.log(`joined ${r.groupCode} ${user.id}`);
  }
}
