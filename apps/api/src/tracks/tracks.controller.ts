import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createTrackSchema,
  reorderSchema,
  updateTrackSchema,
  type CreateTrackInput,
  type TrackDto,
  type UpdateTrackInput,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, Public, Staff } from '../common/decorators';
import { conflict, notFound } from '../common/errors';
import { reorderInTx } from '../common/utils/reorder';
import type { Track } from '@prisma/client';

export const toTrackDto = (t: Track & { _count?: { courses: number } }): TrackDto => ({
  id: t.id,
  slug: t.slug,
  title: t.title,
  description: t.description,
  color: t.color,
  icon: t.icon,
  order: t.order,
  isPublished: t.isPublished,
  courseCount: t._count?.courses,
});

@Controller()
export class TracksController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('tracks')
  async list(): Promise<TrackDto[]> {
    const rows = await this.prisma.track.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: { _count: { select: { courses: { where: { isPublished: true } } } } },
    });
    return rows.map(toTrackDto);
  }

  @Staff()
  @Get('admin/tracks')
  async adminList(): Promise<TrackDto[]> {
    const rows = await this.prisma.track.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
    return rows.map(toTrackDto);
  }

  @Staff()
  @Post('admin/tracks')
  async create(@Body(new ZodPipe(createTrackSchema)) dto: CreateTrackInput): Promise<TrackDto> {
    const exists = await this.prisma.track.findUnique({ where: { slug: dto.slug } });
    if (exists) throw conflict('SLUG_TAKEN');
    const max = await this.prisma.track.aggregate({ _max: { order: true } });
    const t = await this.prisma.track.create({
      data: { ...dto, order: (max._max.order ?? 0) + 1 },
    });
    return toTrackDto(t);
  }

  @Staff()
  @Patch('admin/tracks/reorder')
  async reorder(@Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    await this.prisma.$transaction((tx) => reorderInTx(tx, 'track', {}, dto.ids));
    return { ok: true };
  }

  @Staff()
  @Patch('admin/tracks/:id')
  async update(
    @Param('id') id: string,
    @Body(new ZodPipe(updateTrackSchema)) dto: UpdateTrackInput,
  ): Promise<TrackDto> {
    if (dto.slug) {
      const other = await this.prisma.track.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (other) throw conflict('SLUG_TAKEN');
    }
    const t = await this.prisma.track.update({ where: { id }, data: dto }).catch(() => null);
    if (!t) throw notFound();
    return toTrackDto(t);
  }

  @AdminOnly()
  @Delete('admin/tracks/:id')
  async remove(@Param('id') id: string) {
    const count = await this.prisma.course.count({ where: { trackId: id } });
    if (count > 0) throw conflict('TRACK_HAS_COURSES');
    await this.prisma.track.delete({ where: { id } }).catch(() => {
      throw notFound();
    });
    return { ok: true };
  }
}
