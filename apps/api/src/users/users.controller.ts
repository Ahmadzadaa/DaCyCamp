import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { verify } from '@node-rs/argon2';
import {
  changePasswordSchema,
  updateMeSchema,
  updateRoleSchema,
  type AdminUserDto,
  type Paged,
  type Role,
} from '@dacy/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { AuthService, toPublicUser } from '../auth/auth.service';
import { badRequest, notFound } from '../common/errors';

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
    @Body(new ZodPipe(updateMeSchema)) dto: { name?: string; locale?: 'az' | 'en' },
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
  @Patch('admin/users/:id/role')
  async setRole(@Param('id') id: string, @Body(new ZodPipe(updateRoleSchema)) dto: { role: Role }) {
    const user = await this.prisma.user
      .update({ where: { id }, data: { role: dto.role } })
      .catch(() => null);
    if (!user) throw notFound();
    return toPublicUser(user);
  }
}
