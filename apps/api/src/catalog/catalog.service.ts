import { Injectable } from '@nestjs/common';
import type { Course, Track } from '@prisma/client';
import {
  computeCourseMap,
  type CourseCardDto,
  type CourseOutlineDto,
  type Level,
  type StepType,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assetUrl } from '../assets/assets.service';
import { notFound } from '../common/errors';

type CourseWithRel = Course & {
  track: Track;
  cover: { id: string; filename: string } | null;
  modules: Array<{
    id: string;
    key: string;
    title: string;
    order: number;
    isPublished: boolean;
    steps: Array<{
      id: string;
      key: string;
      type: StepType;
      title: string;
      xp: number;
      order: number;
      isPublished: boolean;
    }>;
  }>;
  _count?: { assets: number };
};

export const courseInclude = {
  track: true,
  cover: { select: { id: true, filename: true } },
  modules: {
    orderBy: { order: 'asc' as const },
    include: {
      steps: {
        orderBy: { order: 'asc' as const },
        select: {
          id: true,
          key: true,
          type: true,
          title: true,
          xp: true,
          order: true,
          isPublished: true,
        },
      },
    },
  },
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  toCard(c: CourseWithRel, datasetCount = 0, includeUnpublished = false): CourseCardDto {
    const mods = c.modules.filter((m) => includeUnpublished || m.isPublished);
    const steps = mods.flatMap((m) => m.steps.filter((s) => includeUnpublished || s.isPublished));
    const counts: Partial<Record<StepType, number>> = {};
    for (const s of steps) counts[s.type] = (counts[s.type] ?? 0) + 1;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      level: c.level as Level,
      description: c.description,
      coverUrl: c.cover ? assetUrl(c.cover) : null,
      estimatedHours: c.estimatedHours,
      sequential: c.sequential,
      track: { slug: c.track.slug, title: c.track.title, color: c.track.color },
      moduleCount: mods.length,
      stepCount: steps.length,
      stepTypeCounts: counts,
      datasetCount,
    };
  }

  async list(opts: {
    track?: string;
    level?: Level;
    q?: string;
    userId?: string;
  }): Promise<CourseCardDto[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
        track: { isPublished: true },
        ...(opts.track ? { track: { slug: opts.track, isPublished: true } } : {}),
        ...(opts.level ? { level: opts.level } : {}),
        ...(opts.q
          ? {
              OR: [
                { title: { contains: opts.q, mode: 'insensitive' } },
                { description: { contains: opts.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
      include: { ...courseInclude, _count: { select: { assets: { where: { kind: 'DATASET' } } } } },
    });
    const cards = courses.map((c) => this.toCard(c as CourseWithRel, c._count.assets));
    if (opts.userId) {
      const enr = await this.prisma.enrollment.findMany({
        where: { userId: opts.userId, courseId: { in: courses.map((c) => c.id) } },
      });
      const byCourse = new Map(enr.map((e) => [e.courseId, e]));
      for (const card of cards) {
        const e = byCourse.get(card.id);
        if (e) {
          card.enrolled = true;
          card.percent = e.percent;
          card.completed = !!e.completedAt;
        }
      }
    }
    return cards;
  }

  async outline(
    slug: string,
    opts: { userId?: string; staff?: boolean },
  ): Promise<CourseOutlineDto> {
    const c = await this.prisma.course.findUnique({
      where: { slug },
      include: { ...courseInclude, _count: { select: { assets: { where: { kind: 'DATASET' } } } } },
    });
    if (!c || (!c.isPublished && !opts.staff)) throw notFound();
    const card = this.toCard(c as CourseWithRel, c._count.assets, !!opts.staff && !c.isPublished);
    const out: CourseOutlineDto = {
      ...card,
      modules: c.modules
        .filter((m) => m.isPublished)
        .map((m) => ({
          id: m.id,
          key: m.key,
          title: m.title,
          order: m.order,
          steps: m.steps
            .filter((s) => s.isPublished)
            .map((s) => ({
              id: s.id,
              key: s.key,
              type: s.type as StepType,
              title: s.title,
              xp: s.xp,
              order: s.order,
            })),
        })),
    };
    if (opts.userId) {
      const e = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: opts.userId, courseId: c.id } },
      });
      if (e) {
        const progress = await this.prisma.stepProgress.findMany({
          where: { userId: opts.userId, step: { module: { courseId: c.id } } },
          select: { stepId: true, status: true },
        });
        const map = computeCourseMap({
          sequential: c.sequential,
          modules: c.modules.map((m) => ({
            ...m,
            steps: m.steps.map((s) => ({ ...s, type: s.type as StepType })),
          })),
          progress,
        });
        out.enrolled = true;
        out.percent = map.percent;
        out.completed = map.isComplete;
      }
    }
    return out;
  }
}
