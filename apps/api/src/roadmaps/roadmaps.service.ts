import { Injectable } from '@nestjs/common';
import { Prisma, type Roadmap, type Track } from '@prisma/client';
import {
  buildRoadmapI18n,
  ROADMAPS_EN,
  roadmapContentSchema,
  type AdminRoadmapDto,
  type RoadmapContent,
  type RoadmapDto,
  type RoadmapInput,
  type RoadmapSummaryDto,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { badRequest, conflict, notFound } from '../common/errors';

type Row = Roadmap & { track: Track | null };

const jsonOrNull = (v: object | null) => (v ? (v as Prisma.InputJsonValue) : Prisma.JsonNull);

/** content JSON-u bazadan oxuyanda da yoxlayırıq: pozulmuşsa 500 yox, boş xəritə */
function contentOf(r: Roadmap): RoadmapContent {
  const parsed = roadmapContentSchema.safeParse(r.content);
  return parsed.success ? parsed.data : { levels: [] };
}

const skillsOf = (c: RoadmapContent) => c.levels.flatMap((l) => l.groups.flatMap((g) => g.skills));

function summary(r: Row): RoadmapSummaryDto {
  return {
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    track: r.track
      ? { slug: r.track.slug, title: r.track.title, color: r.track.color, icon: r.track.icon }
      : null,
    levels: contentOf(r).levels.map((l) => ({ key: l.key, title: l.title })),
  };
}

function adminDto(r: Row): AdminRoadmapDto {
  const content = contentOf(r);
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    track: r.track?.slug ?? null,
    isPublished: r.isPublished,
    order: r.order,
    content,
    skillCount: skillsOf(content).length,
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RoadmapSummaryDto[]> {
    const rows = await this.prisma.roadmap.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: { track: true },
    });
    return rows.map(summary);
  }

  async get(slug: string, userId: string | null): Promise<RoadmapDto> {
    const r = await this.prisma.roadmap.findUnique({ where: { slug }, include: { track: true } });
    if (!r || !r.isPublished) throw notFound();
    const content = contentOf(r);
    const slugs = [...new Set(skillsOf(content).flatMap((s) => (s.course ? [s.course] : [])))];
    const [courses, checks] = await Promise.all([
      slugs.length
        ? this.prisma.course.findMany({
            where: { slug: { in: slugs }, isPublished: true, deletedAt: null },
            select: {
              slug: true,
              title: true,
              // qonaqda heç bir yazılma uyğun gəlmir
              enrollments: { where: { userId: userId ?? '' }, select: { completedAt: true } },
            },
          })
        : Promise.resolve([]),
      userId
        ? this.prisma.roadmapCheck.findMany({
            where: { userId, roadmapId: r.id },
            select: { skillId: true },
          })
        : Promise.resolve([]),
    ]);
    return {
      ...summary(r),
      description: r.description,
      content,
      courses: Object.fromEntries(
        courses.map((c) => [
          c.slug,
          {
            title: c.title,
            enrolled: c.enrollments.length > 0,
            completed: !!c.enrollments[0]?.completedAt,
          },
        ]),
      ),
      checked: checks.map((c) => c.skillId),
    };
  }

  /** «Bunu bilirəm» işarəsi — yalnız mövcud bacarıq id-si üçün */
  async setCheck(slug: string, userId: string, skillId: string, checked: boolean) {
    const r = await this.prisma.roadmap.findUnique({ where: { slug } });
    if (!r || !r.isPublished) throw notFound();
    if (!skillsOf(contentOf(r)).some((s) => s.id === skillId))
      throw notFound('SKILL_NOT_FOUND', 'Bacarıq tapılmadı');
    const key = { userId_roadmapId_skillId: { userId, roadmapId: r.id, skillId } };
    if (checked)
      await this.prisma.roadmapCheck.upsert({
        where: key,
        create: { userId, roadmapId: r.id, skillId },
        update: {},
      });
    else await this.prisma.roadmapCheck.deleteMany({ where: { userId, roadmapId: r.id, skillId } });
    const all = await this.prisma.roadmapCheck.findMany({
      where: { userId, roadmapId: r.id },
      select: { skillId: true },
    });
    return { checked: all.map((c) => c.skillId) };
  }

  // ── admin ──

  async adminList(): Promise<AdminRoadmapDto[]> {
    const rows = await this.prisma.roadmap.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: { track: true },
    });
    return rows.map(adminDto);
  }

  async adminGet(id: string): Promise<AdminRoadmapDto> {
    const r = await this.prisma.roadmap.findUnique({ where: { id }, include: { track: true } });
    if (!r) throw notFound();
    return adminDto(r);
  }

  private async trackId(slug: string | null | undefined): Promise<string | null> {
    if (!slug) return null;
    const t = await this.prisma.track.findUnique({ where: { slug }, select: { id: true } });
    if (!t) throw badRequest('TRACK_NOT_FOUND', `İstiqamət tapılmadı: ${slug}`);
    return t.id;
  }

  async create(dto: RoadmapInput): Promise<AdminRoadmapDto> {
    if (await this.prisma.roadmap.findUnique({ where: { slug: dto.slug } }))
      throw conflict('SLUG_TAKEN');
    const max = await this.prisma.roadmap.aggregate({ _max: { order: true } });
    const r = await this.prisma.roadmap.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        tagline: dto.tagline ?? null,
        description: dto.description ?? null,
        trackId: await this.trackId(dto.track),
        isPublished: dto.isPublished,
        order: (max._max.order ?? 0) + 1,
        content: dto.content as unknown as Prisma.InputJsonValue,
        i18n: jsonOrNull(buildRoadmapI18n(dto)),
      },
      include: { track: true },
    });
    return adminDto(r);
  }

  async update(id: string, dto: RoadmapInput): Promise<AdminRoadmapDto> {
    const cur = await this.prisma.roadmap.findUnique({ where: { id } });
    if (!cur) throw notFound();
    if (
      dto.slug !== cur.slug &&
      (await this.prisma.roadmap.findUnique({ where: { slug: dto.slug } }))
    )
      throw conflict('SLUG_TAKEN');
    // ilkin xəritənin tərcüməsi stabil id-lərlə yenidən qurulur; qalanında köhnəlmiş hissəni
    // Prisma uzantısı özü atır (pruneTranslation)
    const i18n = buildRoadmapI18n({ ...dto, slug: ROADMAPS_EN[dto.slug] ? dto.slug : cur.slug });
    const r = await this.prisma.roadmap.update({
      where: { id },
      data: {
        slug: dto.slug,
        title: dto.title,
        tagline: dto.tagline ?? null,
        description: dto.description ?? null,
        trackId: await this.trackId(dto.track),
        isPublished: dto.isPublished,
        content: dto.content as unknown as Prisma.InputJsonValue,
        ...(i18n ? { i18n: i18n as Prisma.InputJsonValue } : {}),
      },
      include: { track: true },
    });
    return adminDto(r);
  }

  async remove(id: string) {
    const r = await this.prisma.roadmap.findUnique({ where: { id } });
    if (!r) throw notFound();
    await this.prisma.roadmap.delete({ where: { id } });
    return { ok: true };
  }

  async reorder(ids: string[]) {
    const all = await this.prisma.roadmap.findMany({ select: { id: true } });
    const known = new Set(all.map((x) => x.id));
    if (all.length !== ids.length || ids.some((id) => !known.has(id)))
      throw badRequest('ORDER_CONFLICT', 'Sıra siyahısı bütün elementləri əhatə etməlidir');
    await this.prisma.$transaction(
      ids.map((id, i) => this.prisma.roadmap.update({ where: { id }, data: { order: i + 1 } })),
    );
    return { ok: true };
  }
}
