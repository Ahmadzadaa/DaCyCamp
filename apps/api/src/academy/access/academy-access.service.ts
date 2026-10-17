import { CanActivate, Injectable } from '@nestjs/common';
import {
  academyCan,
  ACADEMY_ACTIONS,
  type AcademyAction,
  type AcademyActorContext,
  type AcademyEnrollmentStatus,
  type AcademyInstructorRole,
} from '@dacy/shared';
import { env } from '../../config/env';
import { forbidden, notFound } from '../../common/errors';
import type { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

/** Modul söndürülübsə bütün akademiya endpoint-ləri 404 (icazə mexanizmi deyil — yalnız əlçatanlıq) */
@Injectable()
export class AcademyEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!env.ACADEMY_MANAGEMENT_ENABLED)
      throw notFound('ACADEMY_DISABLED', 'Akademiya modulu söndürülüb');
    return true;
  }
}

export interface GroupAccess {
  group: {
    id: string;
    code: string;
    name: string;
    status: string;
    timezone: string;
    programId: string;
  };
  ctx: AcademyActorContext;
  role: 'ADMIN' | AcademyInstructorRole | 'STUDENT' | null;
  enrollmentId: string | null;
}

export const academyForbidden = () =>
  forbidden('ACADEMY_FORBIDDEN', 'Bu qrupun məlumatlarına icazəniz yoxdur');

/**
 * Resurs səviyyəli icazələr. Kontekst hər sorğuda bazadan oxunur (keş yoxdur): müəllim qrupdan çıxarılanda və ya
 * yazılış dayandırılanda hüquqlar dərhal itir. Qlobal admin — yalnız etibarlı `Role.ADMIN`.
 */
@Injectable()
export class AcademyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isAdmin(user: AuthUser): boolean {
    return user.role === 'ADMIN';
  }

  /** Admin deyilsə 403 */
  requireAdmin(user: AuthUser): void {
    if (!this.isAdmin(user))
      throw forbidden('ACADEMY_ADMIN_ONLY', 'Bu əməliyyat yalnız admin üçündür');
  }

  async groupAccess(user: AuthUser, groupId: string): Promise<GroupAccess> {
    const group = await this.prisma.academyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, code: true, name: true, status: true, timezone: true, programId: true },
    });
    if (!group) throw notFound('ACADEMY_GROUP_NOT_FOUND', 'Qrup tapılmadı');
    const [inst, enr] = await Promise.all([
      this.prisma.academyGroupInstructor.findFirst({
        where: { groupId, userId: user.id, removedAt: null },
        select: { role: true },
      }),
      this.prisma.academyEnrollment.findUnique({
        where: { groupId_studentId: { groupId, studentId: user.id } },
        select: { id: true, status: true },
      }),
    ]);
    const isAdmin = this.isAdmin(user);
    const ctx: AcademyActorContext = {
      isAdmin,
      instructorRole: (inst?.role as AcademyInstructorRole | undefined) ?? null,
      enrollmentStatus: (enr?.status as AcademyEnrollmentStatus | undefined) ?? null,
    };
    const role = isAdmin ? 'ADMIN' : (ctx.instructorRole ?? (enr ? 'STUDENT' : null));
    return { group, ctx, role, enrollmentId: enr?.id ?? null };
  }

  /** Siyahılar üçün: bir neçə qrupun konteksti 2 sorğu ilə (N+1 yoxdur) */
  async groupAccessMany(
    user: AuthUser,
    groups: ReadonlyArray<GroupAccess['group']>,
  ): Promise<Map<string, GroupAccess>> {
    const ids = groups.map((g) => g.id);
    const [insts, enrs] = await Promise.all([
      this.prisma.academyGroupInstructor.findMany({
        where: { groupId: { in: ids }, userId: user.id, removedAt: null },
        select: { groupId: true, role: true },
      }),
      this.prisma.academyEnrollment.findMany({
        where: { groupId: { in: ids }, studentId: user.id },
        select: { id: true, groupId: true, status: true },
      }),
    ]);
    const isAdmin = this.isAdmin(user);
    const out = new Map<string, GroupAccess>();
    for (const g of groups) {
      const inst = insts.find((i) => i.groupId === g.id);
      const enr = enrs.find((e) => e.groupId === g.id);
      const ctx: AcademyActorContext = {
        isAdmin,
        instructorRole: (inst?.role as AcademyInstructorRole | undefined) ?? null,
        enrollmentStatus: (enr?.status as AcademyEnrollmentStatus | undefined) ?? null,
      };
      out.set(g.id, {
        group: g,
        ctx,
        role: isAdmin ? 'ADMIN' : (ctx.instructorRole ?? (enr ? 'STUDENT' : null)),
        enrollmentId: enr?.id ?? null,
      });
    }
    return out;
  }

  /** Əməliyyata icazə yoxdursa 403 (qrup yoxdursa 404) */
  async require(user: AuthUser, groupId: string, action: AcademyAction): Promise<GroupAccess> {
    const a = await this.groupAccess(user, groupId);
    if (!academyCan(a.ctx, action)) throw academyForbidden();
    return a;
  }

  /** Bir neçə əməliyyatdan ən azı biri */
  async requireAny(
    user: AuthUser,
    groupId: string,
    actions: AcademyAction[],
  ): Promise<GroupAccess> {
    const a = await this.groupAccess(user, groupId);
    if (!actions.some((x) => academyCan(a.ctx, x))) throw academyForbidden();
    return a;
  }

  can(a: GroupAccess, action: AcademyAction): boolean {
    return academyCan(a.ctx, action);
  }

  /** UI üçün: cari istifadəçinin bu qrupdakı bütün icazələri */
  permissions(a: GroupAccess): AcademyAction[] {
    return ACADEMY_ACTIONS.filter((x) => academyCan(a.ctx, x));
  }

  /** Tapşırıq vasitəsilə qrup konteksti */
  async assignmentAccess(user: AuthUser, assignmentId: string) {
    const asg = await this.prisma.academyAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, groupId: true, status: true },
    });
    if (!asg) throw notFound('ACADEMY_ASSIGNMENT_NOT_FOUND', 'Tapşırıq tapılmadı');
    return { assignment: asg, access: await this.groupAccess(user, asg.groupId) };
  }

  /** İstifadəçinin müəllim olduğu aktiv qruplar (admin üçün null — hamısı) */
  async instructorGroupIds(user: AuthUser): Promise<string[] | null> {
    if (this.isAdmin(user)) return null;
    const rows = await this.prisma.academyGroupInstructor.findMany({
      where: { userId: user.id, removedAt: null },
      select: { groupId: true },
    });
    return rows.map((r) => r.groupId);
  }

  /** /me/summary — menyunu göstərmək üçün (modul söndürülübsə null) */
  async summary(user: AuthUser) {
    if (!env.ACADEMY_MANAGEMENT_ENABLED) return null;
    const [enr, inst] = await Promise.all([
      this.prisma.academyEnrollment.count({
        where: {
          studentId: user.id,
          status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN'] },
        },
      }),
      this.prisma.academyGroupInstructor.count({ where: { userId: user.id, removedAt: null } }),
    ]);
    return {
      enabled: true as const,
      student: enr > 0,
      instructor: inst > 0,
      admin: this.isAdmin(user),
    };
  }
}
