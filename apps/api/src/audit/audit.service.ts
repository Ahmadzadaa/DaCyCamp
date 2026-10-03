import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuditLogDto, AuditPageDto } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators';

export type AuditEntity =
  | 'COURSE'
  | 'MODULE'
  | 'STEP'
  | 'ASSET'
  | 'TRACK'
  | 'TOPIC'
  | 'USER'
  | 'CERTIFICATE'
  | 'PATH'
  | 'ROADMAP'
  | 'SETTING';

export interface AuditInput {
  action: string;
  entityType: AuditEntity;
  entityId?: string | null;
  entityTitle?: string | null;
  courseId?: string | null;
  details?: Record<string, unknown> | null;
}

/** Admin əməliyyatları jurnalı. Yazı xətası əsas əməliyyatı pozmur. */
@Injectable()
export class AuditService {
  private readonly log = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  async record(actor: Pick<AuthUser, 'id' | 'email'> | null, input: AuditInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? 'sistem',
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          entityTitle: input.entityTitle?.slice(0, 300) ?? null,
          courseId: input.courseId ?? null,
          details: input.details ? (input.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    } catch (e) {
      this.log.warn(`audit yazılmadı (${input.action}): ${(e as Error).message}`);
    }
  }

  /** Obyektin başlığı və aid olduğu kurs (silinmədən əvvəl oxunur) */
  async describe(
    entity: AuditEntity,
    id: string | undefined,
  ): Promise<{ title: string | null; courseId: string | null } | null> {
    if (!id) return null;
    switch (entity) {
      case 'COURSE': {
        const c = await this.prisma.course.findUnique({ where: { id }, select: { title: true } });
        return c ? { title: c.title, courseId: id } : null;
      }
      case 'MODULE': {
        const m = await this.prisma.module.findUnique({
          where: { id },
          select: { title: true, courseId: true },
        });
        return m ? { title: m.title, courseId: m.courseId } : null;
      }
      case 'STEP': {
        const s = await this.prisma.step.findUnique({
          where: { id },
          select: { title: true, module: { select: { courseId: true } } },
        });
        return s ? { title: s.title, courseId: s.module.courseId } : null;
      }
      case 'ASSET': {
        const a = await this.prisma.asset.findUnique({
          where: { id },
          select: { path: true, courseId: true },
        });
        return a ? { title: a.path, courseId: a.courseId } : null;
      }
      case 'TRACK': {
        const t = await this.prisma.track.findUnique({ where: { id }, select: { title: true } });
        return t ? { title: t.title, courseId: null } : null;
      }
      case 'TOPIC': {
        const t = await this.prisma.topic.findUnique({ where: { id }, select: { title: true } });
        return t ? { title: t.title, courseId: null } : null;
      }
      case 'USER': {
        const u = await this.prisma.user.findUnique({ where: { id }, select: { email: true } });
        return u ? { title: u.email, courseId: null } : null;
      }
      case 'CERTIFICATE': {
        const sel = { serial: true, user: { select: { email: true } } } as const;
        const c = await this.prisma.certificate.findUnique({
          where: { id },
          select: { ...sel, courseId: true },
        });
        if (c) return { title: `${c.serial} · ${c.user.email}`, courseId: c.courseId };
        const p = await this.prisma.pathCertificate.findUnique({ where: { id }, select: sel });
        return p ? { title: `${p.serial} · ${p.user.email}`, courseId: null } : null;
      }
      case 'SETTING':
        return null;
      case 'ROADMAP': {
        const r = await this.prisma.roadmap.findUnique({ where: { id }, select: { title: true } });
        return r ? { title: r.title, courseId: null } : null;
      }
      case 'PATH': {
        // id yolun və ya yol addımının (path-items/:id) id-si ola bilər
        const p =
          (await this.prisma.learningPath.findUnique({ where: { id }, select: { title: true } })) ??
          (
            await this.prisma.pathItem.findUnique({
              where: { id },
              select: { path: { select: { title: true } } },
            })
          )?.path;
        return p ? { title: p.title, courseId: null } : null;
      }
    }
  }

  async list(opts: {
    courseId?: string;
    actorId?: string;
    action?: string;
    cursor?: string;
    limit: number;
  }): Promise<AuditPageDto> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(opts.courseId ? { courseId: opts.courseId } : {}),
        ...(opts.actorId ? { actorId: opts.actorId } : {}),
        ...(opts.action ? { action: { startsWith: opts.action } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { actor: { select: { name: true } } },
    });
    const more = rows.length > opts.limit;
    const items: AuditLogDto[] = rows.slice(0, opts.limit).map((r) => ({
      id: r.id,
      actor: { id: r.actorId, email: r.actorEmail, name: r.actor?.name ?? null },
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      entityTitle: r.entityTitle,
      courseId: r.courseId,
      details: (r.details as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    return { items, nextCursor: more ? items[items.length - 1]!.id : null };
  }
}
