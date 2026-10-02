/**
 * Learning Path — admin: CRUD, addımlar, sıralama, dərc yoxlaması, layihə rəyləri, idxal/ixrac.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, type PathItemType } from '@prisma/client';
import { dump as yamlDump } from 'js-yaml';
import {
  mergeAssessment,
  pathInputToYaml,
  slugify,
  splitAssessment,
  validatePathForPublish,
  type AdminPathDto,
  type AdminPathItemDto,
  type AdminProjectReviewDto,
  type Level,
  type PathInput,
  type PathItemInput,
  type AssessmentPublic,
  type AssessmentSecret,
  type ProjectConfig,
  type MilestoneConfig,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { badRequest, conflict, notFound, unprocessable } from '../common/errors';
import { readFromStorage } from '../assets/storage';
import {
  PathsService,
  itemTitleOf,
  pathInclude,
  type PathItemWithCourse,
  type PathWithRel,
} from './paths.service';
import type { ProjectPayload } from './paths-learn.service';

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PathsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: PathsService,
    private readonly progress: ProgressService,
  ) {}

  // ───────────────────────── DTO

  toInput(it: PathItemWithCourse): PathItemInput {
    const base = { key: it.key, optional: it.isOptional, hours: it.estimatedHours, xp: it.xp };
    switch (it.type) {
      case 'COURSE':
        return { type: 'course', course_slug: it.course?.slug ?? '', ...base };
      case 'ASSESSMENT':
        return {
          type: 'assessment',
          title: it.title ?? '',
          ...base,
          config: mergeAssessment(
            it.config as Partial<AssessmentPublic>,
            it.secret as Partial<AssessmentSecret>,
          ),
        };
      case 'PROJECT':
        return {
          type: 'project',
          title: it.title ?? '',
          ...base,
          config: it.config as unknown as ProjectConfig,
        };
      case 'MILESTONE':
        return {
          type: 'milestone',
          title: it.title ?? '',
          ...base,
          config: it.config as unknown as MilestoneConfig,
        };
    }
  }

  issuesOf(p: PathWithRel) {
    return validatePathForPublish({
      title: p.title,
      items: p.items.map((it) => ({
        key: it.key,
        type: it.type,
        title: it.type === 'COURSE' ? (it.course?.title ?? null) : it.title,
        isOptional: it.isOptional,
        config: it.config,
        secret: it.secret,
        course: it.course ? { slug: it.course.slug, isPublished: it.course.isPublished } : null,
      })),
    });
  }

  async toAdmin(p: PathWithRel): Promise<AdminPathDto> {
    const enrollmentCount = await this.prisma.pathEnrollment.count({ where: { pathId: p.id } });
    const items: AdminPathItemDto[] = p.items.map((it) => ({
      id: it.id,
      key: it.key,
      order: it.order,
      type: it.type,
      title: itemTitleOf(it),
      isOptional: it.isOptional,
      estimatedHours: it.estimatedHours,
      xp: it.xp,
      course: it.course
        ? {
            id: it.course.id,
            slug: it.course.slug,
            title: it.course.title,
            isPublished: it.course.isPublished,
            level: it.course.level as Level,
          }
        : null,
      input: this.toInput(it),
    }));
    return {
      ...this.paths.toCard(p),
      order: p.order,
      enrollmentCount,
      items,
      issues: this.issuesOf(p),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // ───────────────────────── yol

  async list(): Promise<AdminPathDto[]> {
    const rows = await this.prisma.learningPath.findMany({
      include: pathInclude,
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
    });
    return Promise.all(rows.map((p) => this.toAdmin(p)));
  }

  async get(slug: string): Promise<AdminPathDto> {
    return this.toAdmin(await this.paths.load(slug));
  }

  async create(input: PathInput): Promise<AdminPathDto> {
    const track = await this.prisma.track.findUnique({ where: { slug: input.track } });
    if (!track) throw badRequest('VALIDATION_FAILED', `İstiqamət tapılmadı: ${input.track}`);
    if (await this.prisma.learningPath.findUnique({ where: { slug: input.slug } }))
      throw conflict('SLUG_TAKEN', 'Bu slug artıq istifadə olunur');
    const max = await this.prisma.learningPath.aggregate({
      where: { trackId: track.id },
      _max: { order: true },
    });
    const p = await this.prisma.learningPath.create({
      data: {
        ...this.meta(input),
        title: input.title,
        trackId: track.id,
        slug: input.slug,
        order: (max._max.order ?? 0) + 1,
      },
      include: pathInclude,
    });
    return this.toAdmin(p as unknown as PathWithRel);
  }

  private meta(input: Partial<PathInput>) {
    return {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.target_audience !== undefined
        ? { targetAudience: input.target_audience ?? null }
        : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
      ...(input.estimated_hours !== undefined
        ? { estimatedHours: input.estimated_hours ?? null }
        : {}),
      ...(input.sequential !== undefined ? { sequential: input.sequential } : {}),
    };
  }

  async update(id: string, input: Partial<PathInput>): Promise<AdminPathDto> {
    const cur = await this.paths.loadById(id);
    let trackId = cur.trackId;
    let order = cur.order;
    if (input.track && input.track !== cur.track.slug) {
      const track = await this.prisma.track.findUnique({ where: { slug: input.track } });
      if (!track) throw badRequest('VALIDATION_FAILED', `İstiqamət tapılmadı: ${input.track}`);
      trackId = track.id;
      const max = await this.prisma.learningPath.aggregate({
        where: { trackId },
        _max: { order: true },
      });
      order = (max._max.order ?? 0) + 1;
    }
    if (input.slug && input.slug !== cur.slug) {
      if (await this.prisma.learningPath.findUnique({ where: { slug: input.slug } }))
        throw conflict('SLUG_TAKEN', 'Bu slug artıq istifadə olunur');
    }
    const p = await this.prisma.learningPath.update({
      where: { id },
      data: { ...this.meta(input), ...(input.slug ? { slug: input.slug } : {}), trackId, order },
      include: pathInclude,
    });
    return this.toAdmin(p);
  }

  async remove(id: string, force = false) {
    const p = await this.paths.loadById(id);
    const n = await this.prisma.pathEnrollment.count({ where: { pathId: id } });
    if (n > 0 && !force)
      throw conflict('PATH_HAS_ENROLLMENTS', 'Bu yola yazılan tələbələr var', { enrollments: n });
    await this.prisma.learningPath.delete({ where: { id: p.id } });
    return { ok: true };
  }

  async publish(id: string, published: boolean): Promise<AdminPathDto> {
    const p = await this.paths.loadById(id);
    if (published) {
      const issues = this.issuesOf(p);
      if (issues.length)
        throw unprocessable('PUBLISH_ISSUES', 'Dərc etmək üçün səhvləri düzəldin', issues);
    }
    const u = await this.prisma.learningPath.update({
      where: { id },
      data: { isPublished: published },
      include: pathInclude,
    });
    return this.toAdmin(u);
  }

  // ───────────────────────── addımlar

  private async itemData(tx: Tx, pathId: string, input: PathItemInput, existingKey?: string) {
    const typeMap: Record<PathItemInput['type'], PathItemType> = {
      course: 'COURSE',
      project: 'PROJECT',
      assessment: 'ASSESSMENT',
      milestone: 'MILESTONE',
    };
    let courseId: string | null = null;
    let key = input.key;
    if (input.type === 'course') {
      const c = await tx.course.findUnique({
        where: { slug: input.course_slug },
        select: { id: true },
      });
      if (!c) throw badRequest('COURSE_NOT_FOUND', `Kurs tapılmadı: ${input.course_slug}`);
      courseId = c.id;
      key = key ?? input.course_slug;
    }
    if (!key) {
      const base = slugify(input.title ?? '') || input.type;
      key = base;
      let n = 2;
      while (await tx.pathItem.findUnique({ where: { pathId_key: { pathId, key } } }))
        key = `${base}-${n++}`;
    }
    if (key !== existingKey) {
      const dup = await tx.pathItem.findUnique({ where: { pathId_key: { pathId, key } } });
      if (dup) throw conflict('PATH_ITEM_KEY_TAKEN', `Bu açar artıq yolda var: ${key}`);
    }
    let config: unknown = {};
    let secret: unknown = null;
    if (input.type === 'assessment') ({ config, secret } = splitAssessment(input.config));
    else if (input.type === 'project' || input.type === 'milestone') config = input.config;
    return {
      key,
      type: typeMap[input.type],
      courseId,
      title: input.type === 'course' ? null : (input.title ?? ''),
      isOptional: input.optional,
      estimatedHours: input.hours ?? null,
      xp: input.xp,
      config: config as Prisma.InputJsonValue,
      secret: secret === null ? Prisma.JsonNull : (secret as Prisma.InputJsonValue),
    };
  }

  async addItem(pathId: string, input: PathItemInput): Promise<AdminPathDto> {
    await this.paths.loadById(pathId);
    await this.prisma.$transaction(async (tx) => {
      const data = await this.itemData(tx, pathId, input);
      const max = await tx.pathItem.aggregate({ where: { pathId }, _max: { order: true } });
      await tx.pathItem.create({ data: { ...data, pathId, order: (max._max.order ?? 0) + 1 } });
    });
    return this.toAdmin(await this.paths.loadById(pathId));
  }

  async updateItem(itemId: string, input: PathItemInput): Promise<AdminPathDto> {
    const it = await this.prisma.pathItem.findUnique({ where: { id: itemId } });
    if (!it) throw notFound();
    const typeMap: Record<PathItemInput['type'], PathItemType> = {
      course: 'COURSE',
      project: 'PROJECT',
      assessment: 'ASSESSMENT',
      milestone: 'MILESTONE',
    };
    if (typeMap[input.type] !== it.type)
      throw badRequest(
        'PATH_ITEM_TYPE',
        'Addımın tipi dəyişdirilə bilməz — silib yenisini əlavə edin',
      );
    await this.prisma.$transaction(async (tx) => {
      const data = await this.itemData(
        tx,
        it.pathId,
        { ...input, key: input.key ?? it.key },
        it.key,
      );
      await tx.pathItem.update({ where: { id: itemId }, data });
    });
    return this.toAdmin(await this.paths.loadById(it.pathId));
  }

  async removeItem(itemId: string): Promise<AdminPathDto> {
    const it = await this.prisma.pathItem.findUnique({ where: { id: itemId } });
    if (!it) throw notFound();
    await this.prisma.pathItem.delete({ where: { id: itemId } });
    await this.normalizeOrders(this.prisma, it.pathId);
    return this.toAdmin(await this.paths.loadById(it.pathId));
  }

  async reorder(pathId: string, ids: string[]): Promise<AdminPathDto> {
    const items = await this.prisma.pathItem.findMany({ where: { pathId } });
    if (ids.length !== items.length || !ids.every((id) => items.some((i) => i.id === id)))
      throw badRequest('VALIDATION_FAILED', 'Sıra siyahısı tam deyil');
    await this.prisma.$transaction(async (tx) => {
      for (const [i, id] of ids.entries())
        await tx.pathItem.update({ where: { id }, data: { order: -(i + 1) } });
      for (const [i, id] of ids.entries())
        await tx.pathItem.update({ where: { id }, data: { order: i + 1 } });
    });
    return this.toAdmin(await this.paths.loadById(pathId));
  }

  private async normalizeOrders(tx: Tx, pathId: string) {
    const items = await tx.pathItem.findMany({ where: { pathId }, orderBy: { order: 'asc' } });
    for (const [i, it] of items.entries())
      if (it.order !== -(i + 1))
        await tx.pathItem.update({ where: { id: it.id }, data: { order: -(i + 1) } });
    for (const [i, it] of items.entries())
      await tx.pathItem.update({ where: { id: it.id }, data: { order: i + 1 } });
  }

  // ───────────────────────── idxal / ixrac

  /** path.yaml idxalı: slug üzrə upsert, addımlar açar üzrə; paketdə olmayan addımlar silinir */
  async upsertFromInput(
    tx: Tx,
    input: PathInput,
    items: PathItemInput[],
    published: boolean | undefined,
  ): Promise<{ id: string; slug: string; created: boolean }> {
    const track = await tx.track.findUnique({ where: { slug: input.track } });
    if (!track) throw badRequest('VALIDATION_FAILED', `İstiqamət tapılmadı: ${input.track}`);
    const existing = await tx.learningPath.findUnique({
      where: { slug: input.slug },
      include: { items: true },
    });
    let pathId: string;
    if (existing) {
      await tx.learningPath.update({
        where: { id: existing.id },
        data: { ...this.meta(input), trackId: track.id },
      });
      pathId = existing.id;
      for (const [i, it] of existing.items.entries())
        await tx.pathItem.update({ where: { id: it.id }, data: { order: -(i + 1) } });
    } else {
      const max = await tx.learningPath.aggregate({
        where: { trackId: track.id },
        _max: { order: true },
      });
      const created = await tx.learningPath.create({
        data: {
          ...this.meta(input),
          title: input.title,
          trackId: track.id,
          slug: input.slug,
          order: (max._max.order ?? 0) + 1,
        },
      });
      pathId = created.id;
    }
    const keep = new Set<string>();
    for (const [i, it] of items.entries()) {
      const data = await this.itemData(tx, pathId, it, it.key);
      keep.add(data.key);
      const cur = await tx.pathItem.findUnique({
        where: { pathId_key: { pathId, key: data.key } },
      });
      if (cur && cur.type !== data.type) {
        await tx.pathItem.delete({ where: { id: cur.id } });
        await tx.pathItem.create({ data: { ...data, pathId, order: i + 1 } });
      } else if (cur)
        await tx.pathItem.update({ where: { id: cur.id }, data: { ...data, order: i + 1 } });
      else await tx.pathItem.create({ data: { ...data, pathId, order: i + 1 } });
    }
    await tx.pathItem.deleteMany({ where: { pathId, key: { notIn: [...keep] } } });
    if (published !== undefined) {
      const p = await tx.learningPath.findUniqueOrThrow({
        where: { id: pathId },
        include: pathInclude,
      });
      if (published) {
        const issues = this.issuesOf(p);
        if (issues.length)
          throw unprocessable('PUBLISH_ISSUES', 'Yol dərc olunmadı: səhvləri düzəldin', issues);
      }
      await tx.learningPath.update({ where: { id: pathId }, data: { isPublished: published } });
    }
    return { id: pathId, slug: input.slug, created: !existing };
  }

  async exportYaml(id: string): Promise<{ text: string; filename: string }> {
    const p = await this.paths.loadById(id);
    const y = pathInputToYaml(
      {
        track: p.track.slug,
        title: p.title,
        slug: p.slug,
        level: p.level as Level,
        description: p.description,
        target_audience: p.targetAudience,
        skills: p.skills,
        estimated_hours: p.estimatedHours,
        sequential: p.sequential,
        published: p.isPublished,
      },
      p.items.map((it) => ({ ...this.toInput(it), key: it.key })),
    );
    return { text: yamlDump(y, { lineWidth: 120, noRefs: true }), filename: `${p.slug}.path.yaml` };
  }

  // ───────────────────────── layihə rəyləri

  async reviews(status?: 'SUBMITTED' | 'PASSED' | 'FAILED'): Promise<AdminProjectReviewDto[]> {
    const rows = await this.prisma.pathItemProgress.findMany({
      where: {
        pathItem: { type: 'PROJECT' },
        ...(status ? { status } : { status: { in: ['SUBMITTED', 'PASSED', 'FAILED'] } }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        pathItem: { include: { path: { select: { slug: true, title: true } } } },
      },
      orderBy: [{ submittedAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => {
      const payload = (r.payload as unknown as ProjectPayload | null) ?? {
        files: [],
        link: null,
        note: null,
      };
      return {
        id: r.id,
        user: r.user,
        path: r.pathItem.path,
        item: { id: r.pathItem.id, key: r.pathItem.key, title: r.pathItem.title ?? '' },
        status: r.status,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        feedback: r.feedback,
        files: payload.files.map((f, i) => ({
          filename: f.filename,
          size: f.size,
          url: `/api/admin/path-reviews/${r.id}/files/${i}`,
        })),
        link: payload.link,
        note: payload.note,
      };
    });
  }

  async review(
    progressId: string,
    body: { passed: boolean; feedback?: string },
    reviewerId: string,
  ): Promise<AdminProjectReviewDto> {
    const pr = await this.prisma.pathItemProgress.findUnique({
      where: { id: progressId },
      include: { pathItem: true },
    });
    if (!pr || pr.pathItem.type !== 'PROJECT') throw notFound();
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.pathItemProgress.update({
        where: { id: progressId },
        data: {
          status: body.passed ? 'PASSED' : 'FAILED',
          feedback: body.feedback?.trim() || null,
          reviewedById: reviewerId,
          ...(body.passed ? { completedAt: pr.completedAt ?? now } : {}),
        },
      });
      if (body.passed)
        await this.progress.grantXp(
          tx,
          pr.userId,
          pr.pathItem.xp,
          'PATH_ITEM_COMPLETED',
          `pathitem:${pr.pathItemId}`,
          { pathItemId: pr.pathItemId, pathId: pr.pathItem.pathId },
        );
      await this.paths.recomputeEnrollment(tx, pr.userId, pr.pathItem.pathId);
    });
    return (await this.reviews()).find((r) => r.id === progressId)!;
  }

  async reviewFile(
    progressId: string,
    index: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const pr = await this.prisma.pathItemProgress.findUnique({ where: { id: progressId } });
    const f = (pr?.payload as unknown as ProjectPayload | null)?.files?.[index];
    if (!f) throw notFound();
    return { buffer: await readFromStorage(f.storageKey), filename: f.filename };
  }
}
