import { Injectable } from '@nestjs/common';
import { Prisma, type Step } from '@prisma/client';
import {
  emptyDefinition,
  mergeStep,
  parseDraft,
  slugify,
  splitStep,
  validateForPublish,
  type AdminCourseDto,
  type AdminCourseTreeDto,
  type AdminStepDto,
  type CreateCourseInput,
  type CreateModuleInput,
  type CreateStepInput,
  type Level,
  type StepType,
  type UpdateCourseInput,
  type UpdateModuleInput,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService, assetUrl } from '../assets/assets.service';
import { badRequest, conflict, notFound, unprocessable } from '../common/errors';
import { nextOrder, reorderInTx } from '../common/utils/reorder';
import { hashAnswer } from './ctf-hash';
import { SqlCheckService } from '../sql-check/sql-check.service';

const courseSelect = {
  track: { select: { id: true, slug: true, title: true, color: true } },
  cover: { select: { id: true, filename: true } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof courseSelect }>;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
    private readonly sqlCheck: SqlCheckService,
  ) {}

  /* ───────── kurslar ───────── */

  private toCourseDto(c: CourseRow): AdminCourseDto {
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      level: c.level as Level,
      description: c.description,
      sequential: c.sequential,
      estimatedHours: c.estimatedHours,
      order: c.order,
      isPublished: c.isPublished,
      trackId: c.trackId,
      track: c.track,
      coverAssetId: c.coverAssetId,
      coverUrl: c.cover ? assetUrl(c.cover) : null,
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  async listCourses(opts: {
    track?: string;
    q?: string;
    published?: boolean;
  }): Promise<AdminCourseDto[]> {
    const rows = await this.prisma.course.findMany({
      where: {
        ...(opts.track ? { track: { slug: opts.track } } : {}),
        ...(opts.published !== undefined ? { isPublished: opts.published } : {}),
        ...(opts.q ? { title: { contains: opts.q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
      include: courseSelect,
    });
    return rows.map((r) => this.toCourseDto(r));
  }

  async createCourse(dto: CreateCourseInput, createdById: string): Promise<AdminCourseDto> {
    if (await this.prisma.course.findUnique({ where: { slug: dto.slug } }))
      throw conflict('SLUG_TAKEN');
    if (!(await this.prisma.track.findUnique({ where: { id: dto.trackId } })))
      throw notFound('NOT_FOUND', 'İstiqamət tapılmadı');
    const order = await nextOrder(this.prisma, 'course', { trackId: dto.trackId });
    const c = await this.prisma.course.create({
      data: { ...dto, order, createdById },
      include: courseSelect,
    });
    return this.toCourseDto(c);
  }

  async getCourseTree(idOrSlug: string): Promise<AdminCourseTreeDto> {
    const c = await this.prisma.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        ...courseSelect,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: { _count: { select: { progress: true } } },
            },
          },
        },
      },
    });
    if (!c) throw notFound();
    return {
      ...this.toCourseDto(c),
      modules: c.modules.map((m) => ({
        id: m.id,
        key: m.key,
        title: m.title,
        description: m.description,
        order: m.order,
        isPublished: m.isPublished,
        steps: m.steps.map((s) => ({
          id: s.id,
          key: s.key,
          type: s.type as StepType,
          title: s.title,
          xp: s.xp,
          order: s.order,
          isPublished: s.isPublished,
          hasProgress: s._count.progress > 0,
        })),
      })),
    };
  }

  async updateCourse(id: string, dto: UpdateCourseInput): Promise<AdminCourseDto> {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw notFound();
    if (
      dto.slug &&
      dto.slug !== c.slug &&
      (await this.prisma.course.findUnique({ where: { slug: dto.slug } }))
    )
      throw conflict('SLUG_TAKEN');
    if (dto.coverAssetId) {
      const a = await this.prisma.asset.findFirst({
        where: { id: dto.coverAssetId, courseId: id },
      });
      if (!a) throw badRequest('VALIDATION_FAILED', 'Üz şəkli bu kursa aid deyil');
    }
    let trackChanged: { trackId: string; order: number } | null = null;
    if (dto.trackId && dto.trackId !== c.trackId) {
      trackChanged = {
        trackId: dto.trackId,
        order: await nextOrder(this.prisma, 'course', { trackId: dto.trackId }),
      };
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.course.update({
        where: { id },
        data: { ...dto, ...(trackChanged ?? {}) },
        include: courseSelect,
      });
      if (trackChanged) {
        const rest = await tx.course.findMany({
          where: { trackId: c.trackId },
          orderBy: { order: 'asc' },
          select: { id: true },
        });
        if (rest.length)
          await reorderInTx(
            tx,
            'course',
            { trackId: c.trackId },
            rest.map((r) => r.id),
          );
      }
      return u;
    });
    return this.toCourseDto(updated);
  }

  async publishCourse(id: string, isPublished: boolean): Promise<AdminCourseDto> {
    const c = await this.prisma.course
      .update({
        where: { id },
        data: { isPublished, ...(isPublished ? { publishedAt: new Date() } : {}) },
        include: courseSelect,
      })
      .catch(() => null);
    if (!c) throw notFound();
    return this.toCourseDto(c);
  }

  async courseStats(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw notFound();
    const [enrollments, completed, progressRows, assets, pathItems] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId: id } }),
      this.prisma.enrollment.count({ where: { courseId: id, completedAt: { not: null } } }),
      this.prisma.stepProgress.count({ where: { step: { module: { courseId: id } } } }),
      this.prisma.asset.count({ where: { courseId: id } }),
      this.prisma.pathItem.count({ where: { courseId: id } }),
    ]);
    return { enrollments, completed, progressRows, assets, pathItems };
  }

  async deleteCourse(id: string, confirm: string | undefined) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw notFound();
    if (confirm !== c.slug)
      throw badRequest('VALIDATION_FAILED', 'Təsdiq üçün kursun slug-ını göndərin');
    if (await this.prisma.pathItem.count({ where: { courseId: id } }))
      throw conflict('COURSE_IN_PATH');
    const assets = await this.prisma.asset.findMany({ where: { courseId: id } });
    await this.prisma.$transaction(async (tx) => {
      await tx.course.delete({ where: { id } });
      const rest = await tx.course.findMany({
        where: { trackId: c.trackId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      if (rest.length)
        await reorderInTx(
          tx,
          'course',
          { trackId: c.trackId },
          rest.map((r) => r.id),
        );
    });
    const { removeFromStorage } = await import('../assets/storage');
    await Promise.all(assets.map((a) => removeFromStorage(a.storageKey)));
    return { ok: true };
  }

  async reorderCourses(trackId: string, ids: string[]) {
    await this.prisma.$transaction((tx) => reorderInTx(tx, 'course', { trackId }, ids));
    return { ok: true };
  }

  /* ───────── fəsillər ───────── */

  private async uniqueKey(
    delegate: 'module' | 'step',
    where: Record<string, unknown>,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const model = this.prisma[delegate] as unknown as {
      findFirst: (a: unknown) => Promise<{ id: string } | null>;
    };
    let key = base || 'x';
    for (let i = 2; i < 1000; i++) {
      const hit = await model.findFirst({
        where: { ...where, key, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (!hit) return key;
      key = `${base}-${i}`;
    }
    throw conflict('KEY_TAKEN');
  }

  async createModule(courseId: string, dto: CreateModuleInput) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId } }))) throw notFound();
    if (
      dto.key &&
      (await this.prisma.module.findUnique({ where: { courseId_key: { courseId, key: dto.key } } }))
    )
      throw conflict('KEY_TAKEN');
    const key = dto.key ?? (await this.uniqueKey('module', { courseId }, slugify(dto.title, 60)));
    const order = await nextOrder(this.prisma, 'module', { courseId });
    return this.prisma.module.create({
      data: { courseId, key, title: dto.title, description: dto.description, order },
    });
  }

  async updateModule(id: string, dto: UpdateModuleInput) {
    const m = await this.prisma.module.findUnique({ where: { id } });
    if (!m) throw notFound();
    if (dto.key && dto.key !== m.key) {
      if (await this.moduleHasProgress(id))
        throw conflict('MODULE_HAS_PROGRESS', 'İrəliləyişi olan fəslin açarı dəyişdirilə bilməz');
      if (
        await this.prisma.module.findUnique({
          where: { courseId_key: { courseId: m.courseId, key: dto.key } },
        })
      )
        throw conflict('KEY_TAKEN');
    }
    return this.prisma.module.update({ where: { id }, data: dto });
  }

  async moduleHasProgress(id: string) {
    return (await this.prisma.stepProgress.count({ where: { step: { moduleId: id } } })) > 0;
  }

  async deleteModule(id: string, force: boolean) {
    const m = await this.prisma.module.findUnique({ where: { id } });
    if (!m) throw notFound();
    if (!force && (await this.moduleHasProgress(id))) throw conflict('MODULE_HAS_PROGRESS');
    await this.prisma.$transaction(async (tx) => {
      await tx.module.delete({ where: { id } });
      const rest = await tx.module.findMany({
        where: { courseId: m.courseId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      if (rest.length)
        await reorderInTx(
          tx,
          'module',
          { courseId: m.courseId },
          rest.map((r) => r.id),
        );
    });
    return { ok: true };
  }

  async reorderModules(courseId: string, ids: string[]) {
    await this.prisma.$transaction((tx) => reorderInTx(tx, 'module', { courseId }, ids));
    return { ok: true };
  }

  /* ───────── addımlar ───────── */

  async createStep(moduleId: string, dto: CreateStepInput) {
    const m = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!m) throw notFound();
    if (
      dto.key &&
      (await this.prisma.step.findUnique({ where: { moduleId_key: { moduleId, key: dto.key } } }))
    )
      throw conflict('KEY_TAKEN');
    const key = dto.key ?? (await this.uniqueKey('step', { moduleId }, slugify(dto.title, 60)));
    const order = await nextOrder(this.prisma, 'step', { moduleId });
    const split = splitStep(emptyDefinition(dto.type, dto.title));
    const s = await this.prisma.step.create({
      data: {
        moduleId,
        key,
        type: dto.type,
        title: dto.title,
        order,
        xp: split.xp,
        config: split.config as unknown as Prisma.InputJsonValue,
        secret: Prisma.JsonNull,
      },
    });
    return this.getStep(s.id);
  }

  async getStep(id: string): Promise<AdminStepDto> {
    const s = await this.prisma.step.findUnique({
      where: { id },
      include: {
        ctfTasks: { orderBy: { order: 'asc' } },
        module: { select: { courseId: true } },
        _count: { select: { progress: true } },
      },
    });
    if (!s) throw notFound();
    const definition = mergeStep(
      s.type as StepType,
      s.title,
      s.xp,
      s.estimatedMinutes,
      s.config,
      s.secret,
      s.ctfTasks.map((t) => ({ ...t, answerHash: t.answerHash || '' })),
    );
    const assetPaths = await this.assets.pathsOfCourse(s.module.courseId);
    const issues = validateForPublish(definition, assetPaths);
    return {
      id: s.id,
      moduleId: s.moduleId,
      key: s.key,
      type: s.type as StepType,
      isPublished: s.isPublished,
      hasProgress: s._count.progress > 0,
      order: s.order,
      definition,
      issues,
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  /** Tam tərifi yazır: draft sxemi; dərc olunubsa sərt yoxlama; CTF cavabları hash-lənir */
  async putStep(id: string, input: unknown, meta?: { key?: string }): Promise<AdminStepDto> {
    const s = await this.prisma.step.findUnique({
      where: { id },
      include: {
        ctfTasks: true,
        module: { select: { courseId: true } },
        _count: { select: { progress: true } },
      },
    });
    if (!s) throw notFound();
    const parsed = parseDraft(input);
    if (!parsed.ok)
      throw badRequest('VALIDATION_FAILED', 'Addım tərifi düzgün deyil', parsed.issues);
    const def = parsed.def;
    const newType = def.type.toUpperCase() as StepType;
    if (newType !== s.type && s._count.progress > 0) throw conflict('STEP_TYPE_LOCKED');
    if (meta?.key && meta.key !== s.key) {
      if (s._count.progress > 0)
        throw conflict('STEP_HAS_PROGRESS', 'İrəliləyişi olan addımın açarı dəyişdirilə bilməz');
      if (
        await this.prisma.step.findUnique({
          where: { moduleId_key: { moduleId: s.moduleId, key: meta.key } },
        })
      )
        throw conflict('KEY_TAKEN');
    }
    const split = splitStep(def);
    // mövcud hash-ləri saxla
    const existingByKey = new Map(s.ctfTasks.map((t) => [t.key, t]));
    const tasks = split.ctfTasks.map((t) => {
      const answerHash = t.answer
        ? hashAnswer(t.answer, t.caseSensitive)
        : (t.answerHash ?? existingByKey.get(t.key)?.answerHash ?? '');
      return {
        key: t.key,
        order: t.order,
        question: t.question,
        hint: t.hint ?? null,
        points: t.points,
        caseSensitive: t.caseSensitive,
        answerHash,
      };
    });
    if (s.isPublished) {
      const merged = mergeStep(
        split.type,
        split.title,
        split.xp,
        split.estimatedMinutes,
        split.config,
        split.secret,
        tasks.map((t) => ({ ...t, answerHash: t.answerHash || '' })),
      );
      const issues = validateForPublish(merged, await this.assets.pathsOfCourse(s.module.courseId));
      if (issues.length)
        throw unprocessable('PUBLISH_ISSUES', 'Dərc olunmuş addımda səhvlər var', issues);
    }
    // SQL: həll dəyişibsə köhnə "expected" keşini sil (Mərhələ 2-də yenidən hesablanır)
    const secret = split.secret as Record<string, unknown> | null;
    await this.prisma.$transaction(async (tx) => {
      await tx.step.update({
        where: { id },
        data: {
          type: newType,
          title: split.title,
          xp: split.xp,
          estimatedMinutes: split.estimatedMinutes,
          config: split.config as unknown as Prisma.InputJsonValue,
          secret: secret ? (secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          ...(meta?.key ? { key: meta.key } : {}),
        },
      });
      const keep = new Set(tasks.map((t) => t.key));
      await tx.ctfTask.deleteMany({ where: { stepId: id, key: { notIn: [...keep] } } });
      // iki fazalı sıra: əvvəl mənfi
      for (const t of tasks) {
        await tx.ctfTask.upsert({
          where: { stepId_key: { stepId: id, key: t.key } },
          create: { stepId: id, ...t, order: -t.order },
          update: { ...t, order: -t.order },
        });
      }
      for (const t of tasks)
        await tx.ctfTask.update({
          where: { stepId_key: { stepId: id, key: t.key } },
          data: { order: t.order },
        });
    });
    if (s.isPublished && newType === 'SQL') await this.sqlCheck.computeAndStore(id);
    return this.getStep(id);
  }

  async publishStep(id: string, isPublished: boolean): Promise<AdminStepDto> {
    const cur = await this.getStep(id);
    if (isPublished && cur.issues.length)
      throw unprocessable('PUBLISH_ISSUES', 'Dərc etmək üçün səhvləri düzəldin', cur.issues);
    // SQL: həllin gözlənilən nəticəsi dərc zamanı serverdə hesablanır (tələbəyə yalnız hash müqayisəsi)
    if (isPublished && cur.type === 'SQL') await this.sqlCheck.computeAndStore(id);
    await this.prisma.step.update({ where: { id }, data: { isPublished } });
    return this.getStep(id);
  }

  async deleteStep(id: string, force: boolean) {
    const s = await this.prisma.step.findUnique({
      where: { id },
      include: { _count: { select: { progress: true } } },
    });
    if (!s) throw notFound();
    if (!force && s._count.progress > 0) throw conflict('STEP_HAS_PROGRESS');
    await this.prisma.$transaction(async (tx) => {
      await tx.step.delete({ where: { id } });
      const rest = await tx.step.findMany({
        where: { moduleId: s.moduleId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      if (rest.length)
        await reorderInTx(
          tx,
          'step',
          { moduleId: s.moduleId },
          rest.map((r) => r.id),
        );
    });
    return { ok: true };
  }

  async reorderSteps(moduleId: string, ids: string[]) {
    await this.prisma.$transaction((tx) => reorderInTx(tx, 'step', { moduleId }, ids));
    return { ok: true };
  }

  /** Addımı eyni kurs daxilində başqa fəslə köçürür; Step.id dəyişmir */
  async moveStep(id: string, targetModuleId: string, index: number) {
    const s = await this.prisma.step.findUnique({ where: { id }, include: { module: true } });
    if (!s) throw notFound();
    const target = await this.prisma.module.findUnique({ where: { id: targetModuleId } });
    if (!target) throw notFound();
    if (target.courseId !== s.module.courseId)
      throw badRequest('VALIDATION_FAILED', 'Yalnız eyni kurs daxilində köçürmək olar');
    if (
      target.id !== s.moduleId &&
      (await this.prisma.step.findUnique({
        where: { moduleId_key: { moduleId: target.id, key: s.key } },
      }))
    )
      throw conflict('KEY_TAKEN');
    await this.prisma.$transaction(async (tx) => {
      const srcRest = (
        await tx.step.findMany({
          where: { moduleId: s.moduleId, NOT: { id } },
          orderBy: { order: 'asc' },
          select: { id: true },
        })
      ).map((r) => r.id);
      const dst =
        target.id === s.moduleId
          ? srcRest
          : (
              await tx.step.findMany({
                where: { moduleId: target.id },
                orderBy: { order: 'asc' },
                select: { id: true },
              })
            ).map((r) => r.id);
      const dstIds = [...dst];
      dstIds.splice(Math.min(index, dstIds.length), 0, id);
      if (target.id !== s.moduleId) {
        // əvvəl mənbə fəsildən çıxart (müvəqqəti böyük sıra ilə toqquşma olmasın)
        await tx.step.update({ where: { id }, data: { moduleId: target.id, order: 100000 } });
        if (srcRest.length) await reorderInTx(tx, 'step', { moduleId: s.moduleId }, srcRest);
      }
      await reorderInTx(tx, 'step', { moduleId: target.id }, dstIds);
    });
    return this.getStep(id);
  }

  async stepHasProgress(id: string) {
    return (await this.prisma.stepProgress.count({ where: { stepId: id } })) > 0;
  }

  /** Dərc dəyişəndə / idxalda: hər yazılmanın faizini yenidən hesabla (ProgressService çağırır) */
  async stepsOfCourseRaw(courseId: string): Promise<Step[]> {
    return this.prisma.step.findMany({ where: { module: { courseId } } });
  }
}
