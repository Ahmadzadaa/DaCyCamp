import { Audit } from '../audit/audit.interceptor';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { verify } from '@node-rs/argon2';
import {
  changePasswordSchema,
  createUserSchema,
  setPasswordSchema,
  updateMeSchema,
  updateRoleSchema,
  updateUserSchema,
  type AdminUserDetailDto,
  type AdminUserDto,
  type CreateUserInput,
  type Paged,
  type Role,
  type UpdateUserInput,
} from '@dacy/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { AuthService, toPublicUser } from '../auth/auth.service';
import { badRequest, conflict, notFound } from '../common/errors';

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

@Controller()
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Patch('me')
  async updateMe(
    @CurrentUser() u: AuthUser,
    @Body(new ZodPipe(updateMeSchema))
    dto: {
      name?: string;
      locale?: 'az' | 'en';
      weeklyGoal?: number;
      showOnLeaderboard?: boolean;
    },
  ) {
    const user = await this.prisma.user.update({ where: { id: u.id }, data: dto });
    return toPublicUser(user);
  }

  @Patch('me/password')
  async changePassword(
    @CurrentUser() u: AuthUser,
    @Body(new ZodPipe(changePasswordSchema)) dto: { current: string; next: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: u.id } });
    if (!user) throw notFound();
    if (!user.passwordHash || !(await verify(user.passwordHash, dto.current)))
      throw badRequest('AUTH_WRONG_PASSWORD', 'Cari şifrə yanlışdır');
    await this.prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await this.auth.hashPassword(dto.next) },
    });
    return { ok: true };
  }

  @Staff()
  @Get('admin/users')
  async list(
    @Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>,
  ): Promise<Paged<AdminUserDto>> {
    const where = {
      ...(q.role ? { role: q.role as Role } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' as const } },
              { email: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { _count: { select: { enrollments: true } } },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        xpTotal: u.xpTotal,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        enrollmentCount: u._count.enrollments,
      })),
    };
  }

  @AdminOnly()
  @Audit({ action: 'user.role', entity: 'USER', body: ['role'] })
  @Patch('admin/users/:id/role')
  async setRole(
    @Param('id') id: string,
    @Body(new ZodPipe(updateRoleSchema)) dto: { role: Role },
    @CurrentUser() me: AuthUser,
  ) {
    await this.guardRoleChange(id, dto.role, me);
    const user = await this.prisma.user
      .update({ where: { id }, data: { role: dto.role } })
      .catch(() => null);
    if (!user) throw notFound();
    return toPublicUser(user);
  }

  // ── Admin: istifadəçi kartı və tam idarə ──

  @Staff()
  @Get('admin/users/:id')
  async detail(@Param('id') id: string): Promise<AdminUserDetailDto> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { lastActivityAt: 'desc' },
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                deletedAt: true,
                track: { select: { color: true } },
              },
            },
          },
        },
        pathEnrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            path: { select: { slug: true, title: true, track: { select: { color: true } } } },
          },
        },
        certificates: { orderBy: { issuedAt: 'desc' } },
        pathCertificates: { orderBy: { issuedAt: 'desc' } },
      },
    });
    if (!u) throw notFound();
    type Snap = { courseTitle?: string; pathTitle?: string };
    const certificates = [
      ...u.certificates.map((c) => ({
        id: c.id,
        kind: 'course' as const,
        serial: c.serial,
        title: (c.snapshot as Snap).courseTitle ?? c.serial,
        issuedAt: c.issuedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
      })),
      ...u.pathCertificates.map((c) => ({
        id: c.id,
        kind: 'path' as const,
        serial: c.serial,
        title: (c.snapshot as Snap).pathTitle ?? c.serial,
        issuedAt: c.issuedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
      })),
    ].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      xpTotal: u.xpTotal,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
      enrollmentCount: u.enrollments.length,
      weeklyGoal: u.weeklyGoal,
      showOnLeaderboard: u.showOnLeaderboard,
      certificateCount: certificates.length,
      enrollments: u.enrollments.map((e) => ({
        courseId: e.course.id,
        slug: e.course.slug,
        title: e.course.title,
        trackColor: e.course.track.color,
        percent: e.percent,
        enrolledAt: e.enrolledAt.toISOString(),
        lastActivityAt: e.lastActivityAt.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
        deleted: !!e.course.deletedAt,
      })),
      paths: u.pathEnrollments.map((p) => ({
        slug: p.path.slug,
        title: p.path.title,
        trackColor: p.path.track.color,
        enrolledAt: p.enrolledAt.toISOString(),
      })),
      certificates,
    };
  }

  @AdminOnly()
  @Audit({ action: 'user.create', entity: 'USER', target: 'result', body: ['role'] })
  @Post('admin/users')
  async create(@Body(new ZodPipe(createUserSchema)) dto: CreateUserInput) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } }))
      throw conflict('AUTH_EMAIL_TAKEN', 'Bu e-poçt artıq qeydiyyatdan keçib');
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: await this.auth.hashPassword(dto.password),
      },
    });
    return toPublicUser(user);
  }

  @AdminOnly()
  @Audit({ action: 'user.update', entity: 'USER', body: ['name', 'email', 'role'] })
  @Patch('admin/users/:id')
  async update(
    @Param('id') id: string,
    @Body(new ZodPipe(updateUserSchema)) dto: UpdateUserInput,
    @CurrentUser() me: AuthUser,
  ) {
    const cur = await this.prisma.user.findUnique({ where: { id } });
    if (!cur) throw notFound();
    if (dto.role && dto.role !== cur.role) await this.guardRoleChange(id, dto.role, me);
    if (dto.email && dto.email !== cur.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw conflict('AUTH_EMAIL_TAKEN', 'Bu e-poçt artıq qeydiyyatdan keçib');
    }
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return toPublicUser(user);
  }

  /** Admin yeni şifrə təyin edir; istifadəçinin bütün sessiyaları bağlanır */
  @AdminOnly()
  @Audit({ action: 'user.password', entity: 'USER' })
  @HttpCode(200)
  @Post('admin/users/:id/password')
  async setPassword(
    @Param('id') id: string,
    @Body(new ZodPipe(setPasswordSchema)) dto: { password: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw notFound();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: await this.auth.hashPassword(dto.password) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /**
   * Hesabı həmişəlik silir: yazılmalar, irəliləyiş, göndərişlər, XP, sertifikatlar FK cascade ilə
   * silinir; yaratdığı kurslar / yüklədiyi fayllar / jurnal qeydləri qalır (müəllif → NULL).
   */
  @AdminOnly()
  @Audit({ action: 'user.delete', entity: 'USER' })
  @Delete('admin/users/:id')
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    if (id === me.id) throw badRequest('SELF_ACTION', 'Öz hesabınızı silə bilməzsiniz');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound();
    if (user.role === 'ADMIN') await this.guardLastAdmin();
    await this.prisma.user.delete({ where: { id } });
    return { ok: true, email: user.email };
  }

  /** Özünü admin-likdən çıxarmaq və sonuncu admini itirmək qadağandır (panel kilidlənməsin) */
  private async guardRoleChange(id: string, role: Role, me: AuthUser) {
    if (role === 'ADMIN') return;
    if (id === me.id) throw badRequest('SELF_ACTION', 'Öz admin rolunuzu dəyişə bilməzsiniz');
    const target = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === 'ADMIN') await this.guardLastAdmin();
  }

  private async guardLastAdmin() {
    const admins = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw conflict('LAST_ADMIN', 'Sonuncu admin hesabını itirmək olmaz');
  }
}
