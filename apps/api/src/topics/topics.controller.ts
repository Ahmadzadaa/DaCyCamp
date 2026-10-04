import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Topic } from '@prisma/client';
import {
  createTopicSchema,
  reorderSchema,
  updateTopicSchema,
  type CreateTopicInput,
  type TopicDto,
  type UpdateTopicInput,
} from '@dacy/shared';
import { Audit } from '../audit/audit.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { Public, Staff } from '../common/decorators';
import { badRequest, conflict, notFound } from '../common/errors';
import { enOf, enToI18n } from '../common/i18n/en-text';

export const toTopicDto = (t: Topic & { _count?: { courses: number } }): TopicDto => ({
  id: t.id,
  slug: t.slug,
  title: t.title,
  description: t.description,
  color: t.color,
  order: t.order,
  isPublished: t.isPublished,
  courseCount: t._count?.courses,
  en: enOf(t.i18n),
});

/** Mövzular (Qeyd 5): kataloq üçün ictimai siyahı + admin CRUD və sıralama */
@Controller()
export class TopicsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('topics')
  async list(): Promise<TopicDto[]> {
    const rows = await this.prisma.topic.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: {
        _count: {
          select: { courses: { where: { isPublished: true, deletedAt: null, archivedAt: null } } },
        },
      },
    });
    return rows.map(toTopicDto);
  }

  @Staff()
  @Get('admin/topics')
  async adminList(): Promise<TopicDto[]> {
    const rows = await this.prisma.topic.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { courses: { where: { deletedAt: null } } } } },
    });
    return rows.map(toTopicDto);
  }

  @Staff()
  @Audit({ action: 'topic.create', entity: 'TOPIC', target: 'result' })
  @Post('admin/topics')
  async create(@Body(new ZodPipe(createTopicSchema)) dto: CreateTopicInput): Promise<TopicDto> {
    if (await this.prisma.topic.findUnique({ where: { slug: dto.slug } }))
      throw conflict('SLUG_TAKEN');
    const max = await this.prisma.topic.aggregate({ _max: { order: true } });
    const { en, ...rest } = dto;
    const t = await this.prisma.topic.create({
      data: { ...rest, i18n: enToI18n(en), order: (max._max.order ?? 0) + 1 },
    });
    return toTopicDto({ ...t, _count: { courses: 0 } });
  }

  @Staff()
  @Audit({ action: 'topic.reorder', entity: 'TOPIC', target: { param: '_' } })
  @Patch('admin/topics/reorder')
  async reorder(@Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    const all = await this.prisma.topic.findMany({ select: { id: true } });
    const ids = new Set(all.map((x) => x.id));
    if (all.length !== dto.ids.length || dto.ids.some((id) => !ids.has(id)))
      throw badRequest('ORDER_CONFLICT', 'Sıra siyahısı bütün elementləri əhatə etməlidir');
    // Topic.order unikal deyil — bir keçiddə yazmaq kifayətdir
    await this.prisma.$transaction(
      dto.ids.map((id, i) => this.prisma.topic.update({ where: { id }, data: { order: i + 1 } })),
    );
    return { ok: true };
  }

  @Staff()
  @Audit({ action: 'topic.update', entity: 'TOPIC', body: ['isPublished', 'title', 'color'] })
  @Patch('admin/topics/:id')
  async update(
    @Param('id') id: string,
    @Body(new ZodPipe(updateTopicSchema)) dto: UpdateTopicInput,
  ): Promise<TopicDto> {
    if (dto.slug) {
      const other = await this.prisma.topic.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (other) throw conflict('SLUG_TAKEN');
    }
    const { en, ...rest } = dto;
    const i18n = enToI18n(en);
    const t = await this.prisma.topic
      .update({
        where: { id },
        data: { ...rest, ...(i18n !== undefined ? { i18n } : {}) },
        include: { _count: { select: { courses: { where: { deletedAt: null } } } } },
      })
      .catch(() => null);
    if (!t) throw notFound();
    return toTopicDto(t);
  }

  /** Mövzu silinir, kurslar qalır (yalnız əlaqə qırılır) */
  @Staff()
  @Audit({ action: 'topic.delete', entity: 'TOPIC' })
  @Delete('admin/topics/:id')
  async remove(@Param('id') id: string) {
    await this.prisma.topic.delete({ where: { id } }).catch(() => {
      throw notFound();
    });
    return { ok: true };
  }
}
