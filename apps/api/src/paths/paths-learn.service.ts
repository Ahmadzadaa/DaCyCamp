/**
 * Learning Path — tələbə tərəfi: siyahı, yol səhifəsi, yazılma, addım səhifələri, layihə təhvili,
 * imtahan, final (sertifikat), onboarding hədəfi, panel üçün aktiv yol.
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  computePathMap,
  scoreAssessment,
  type ActivePathDto,
  type AssessmentPublic,
  type AssessmentResultDto,
  type AssessmentSecret,
  type MilestoneConfig,
  type PathCardDto,
  type PathDetailDto,
  type PathItemDto,
  type PathItemViewDto,
  type PathProgressResultDto,
  type PathRefDto,
  type ProjectConfig,
  type ProjectSubmitInput,
  type ProjectSubmitResultDto,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { readFromStorage, saveToStorage } from '../assets/storage';
import { badRequest, forbidden, notFound } from '../common/errors';
import type { AuthUser } from '../common/decorators';
import { PathsService, itemTitleOf, itemUrlOf, type PathWithRel } from './paths.service';

export interface ProjectPayload {
  files: Array<{ storageKey: string; filename: string; size: number }>;
  link: string | null;
  note: string | null;
}

const isStaff = (u: AuthUser | null) => !!u && (u.role === 'ADMIN' || u.role === 'INSTRUCTOR');

@Injectable()
export class PathsLearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: PathsService,
    private readonly progress: ProgressService,
  ) {}

  // ───────────────────────── kataloq

  async list(userId: string | null, trackSlug?: string): Promise<PathCardDto[]> {
    const rows = await this.prisma.learningPath.findMany({
      where: { isPublished: true, ...(trackSlug ? { track: { slug: trackSlug } } : {}) },
      include: {
        track: true,
        items: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                level: true,
                isPublished: true,
                estimatedHours: true,
              },
            },
          },
        },
      },
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
    });
    const enrollments = userId
      ? await this.prisma.pathEnrollment.findMany({ where: { userId } })
      : [];
    return rows.map((p) =>
      this.paths.toCard(p, enrollments.find((e) => e.pathId === p.id) ?? null),
    );
  }

  async detail(slug: string, user: AuthUser | null, preview: boolean): Promise<PathDetailDto> {
    const p = await this.paths.load(slug);
    if (!p.isPublished && !(preview && isStaff(user)))
      throw notFound('PATH_UNPUBLISHED', 'Bu yol dərc olunmayıb');
    const userId = user?.id ?? null;
    const enrollment = userId
      ? await this.prisma.pathEnrollment.findUnique({
          where: { userId_pathId: { userId, pathId: p.id } },
        })
      : null;
    const { map, items } = await this.paths.buildMap(userId, p);
    const cont = map.continueItem;
    const cert =
      userId && (enrollment?.completedAt || map.isComplete)
        ? await this.prisma.pathCertificate.findUnique({
            where: { userId_pathId: { userId, pathId: p.id } },
            select: { id: true },
          })
        : null;
    const others = await this.prisma.learningPath.findMany({
      where: { isPublished: true, id: { not: p.id } },
      include: {
        track: true,
        items: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                level: true,
                isPublished: true,
                estimatedHours: true,
              },
            },
          },
        },
      },
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
      take: 6,
    });
    return {
      path: this.paths.toCard(p, enrollment),
      enrolled: !!enrollment,
      isActive: !!enrollment?.isActive,
      map: { done: map.done, total: map.total, percent: map.percent, isComplete: map.isComplete },
      items,
      continueUrl: enrollment && cont ? itemUrlOf(p.slug, cont.raw) : null,
      completedAt: enrollment?.completedAt?.toISOString() ?? null,
      certificateId: cert?.id ?? null,
      otherPaths: others
        .sort((a, b) => (a.trackId === p.trackId ? -1 : 0) - (b.trackId === p.trackId ? -1 : 0))
        .slice(0, 3)
        .map((o) => this.paths.toCard(o)),
    };
  }

  async enroll(userId: string, slug: string): Promise<PathCardDto> {
    const p = await this.paths.load(slug);
    if (!p.isPublished) throw notFound('PATH_UNPUBLISHED', 'Bu yol dərc olunmayıb');
    await this.prisma.$transaction(async (tx) => {
      await tx.pathEnrollment.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      await tx.pathEnrollment.upsert({
        where: { userId_pathId: { userId, pathId: p.id } },
        create: { userId, pathId: p.id, isActive: true },
        update: { isActive: true },
      });
      await this.paths.recomputeEnrollment(tx, userId, p.id);
    });
    const e = await this.prisma.pathEnrollment.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: p.id } },
    });
    return this.paths.toCard(p, e);
  }

  async activate(userId: string, slug: string): Promise<PathCardDto> {
    const p = await this.paths.load(slug);
    const e = await this.prisma.pathEnrollment.findUnique({
      where: { userId_pathId: { userId, pathId: p.id } },
    });
    if (!e) throw forbidden('PATH_NOT_ENROLLED', 'Əvvəlcə yola yazılın');
    await this.prisma.$transaction([
      this.prisma.pathEnrollment.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.pathEnrollment.update({ where: { id: e.id }, data: { isActive: true } }),
    ]);
    return this.paths.toCard(p, { ...e, isActive: true });
  }

  async mine(userId: string): Promise<PathCardDto[]> {
    const rows = await this.prisma.pathEnrollment.findMany({
      where: { userId },
      include: {
        path: {
          include: {
            track: true,
            items: {
              orderBy: { order: 'asc' },
              include: {
                course: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    level: true,
                    isPublished: true,
                    estimatedHours: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { enrolledAt: 'desc' }],
    });
    return rows.map((e) => this.paths.toCard(e.path, e));
  }

  /** Panel: aktiv yol (yoxdursa ən son yazılan) */
  async active(userId: string): Promise<ActivePathDto | null> {
    const e =
      (await this.prisma.pathEnrollment.findFirst({
        where: { userId, isActive: true },
        include: { path: { include: { track: true } } },
      })) ??
      (await this.prisma.pathEnrollment.findFirst({
        where: { userId },
        orderBy: { enrolledAt: 'desc' },
        include: { path: { include: { track: true } } },
      }));
    if (!e || !e.path.isPublished) return null;
    const p = await this.paths.loadById(e.pathId);
    const { map } = await this.paths.buildMap(userId, p);
    const cont = map.continueItem;
    return {
      slug: p.slug,
      title: p.title,
      trackTitle: p.track.title,
      trackColor: p.track.color,
      percent: map.percent,
      done: map.done,
      total: map.total,
      completedAt: e.completedAt?.toISOString() ?? null,
      next: cont
        ? { title: itemTitleOf(cont.raw), type: cont.type, url: itemUrlOf(p.slug, cont.raw) }
        : null,
    };
  }

  /** Onboarding: hədəf yol (varsa yazılma + aktiv) */
  async setTarget(userId: string, pathSlug: string | null): Promise<PathCardDto | null> {
    if (!pathSlug) {
      await this.prisma.user.update({ where: { id: userId }, data: { targetPathId: null } });
      return null;
    }
    const card = await this.enroll(userId, pathSlug);
    await this.prisma.user.update({ where: { id: userId }, data: { targetPathId: card.id } });
    return card;
  }

  /** Kurs səhifəsi: «Bu kurs X yolunun N-ci addımıdır» */
  async byCourse(courseSlug: string): Promise<PathRefDto[]> {
    const paths = await this.prisma.learningPath.findMany({
      where: { isPublished: true, items: { some: { course: { slug: courseSlug } } } },
      include: {
        track: true,
        items: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                level: true,
                isPublished: true,
                estimatedHours: true,
              },
            },
          },
        },
      },
      orderBy: [{ track: { order: 'asc' } }, { order: 'asc' }],
    });
    return paths.map((p) => {
      const map = computePathMap({
        sequential: p.sequential,
        items: p.items.map((i) => ({
          id: i.id,
          key: i.key,
          order: i.order,
          type: i.type,
          isOptional: i.isOptional,
        })),
      });
      const hit = map.items.find(
        (x) => p.items.find((i) => i.id === x.item.id)?.course?.slug === courseSlug,
      );
      return {
        slug: p.slug,
        title: p.title,
        number: hit?.number ?? 0,
        trackColor: p.track.color,
        trackTitle: p.track.title,
      };
    });
  }

  // ───────────────────────── addım səhifələri

  private async context(
    user: AuthUser,
    slugOrId: { slug: string; key: string } | { itemId: string },
    preview: boolean,
  ) {
    const item =
      'itemId' in slugOrId
        ? await this.prisma.pathItem.findUnique({ where: { id: slugOrId.itemId } })
        : await this.prisma.pathItem.findFirst({
            where: { key: slugOrId.key, path: { slug: slugOrId.slug } },
          });
    if (!item) throw notFound();
    const p = await this.paths.loadById(item.pathId);
    const staffPreview = preview && isStaff(user);
    if (!p.isPublished && !staffPreview)
      throw notFound('PATH_UNPUBLISHED', 'Bu yol dərc olunmayıb');
    const enrollment = await this.prisma.pathEnrollment.findUnique({
      where: { userId_pathId: { userId: user.id, pathId: p.id } },
    });
    if (!enrollment && !staffPreview) throw forbidden('PATH_NOT_ENROLLED', 'Əvvəlcə yola yazılın');
    const { map, items } = await this.paths.buildMap(user.id, p);
    const dto = items.find((x) => x.id === item.id);
    const raw = p.items.find((x) => x.id === item.id)!;
    if (!dto) throw notFound();
    if (dto.state === 'locked' && !staffPreview)
      throw forbidden('PATH_ITEM_LOCKED', 'Bu addım kilidlidir');
    return { p, item: raw, dto, map, items, enrollment, staffPreview };
  }

  async itemView(
    user: AuthUser,
    slug: string,
    key: string,
    preview: boolean,
  ): Promise<PathItemViewDto> {
    const { p, item, dto, map, items, enrollment } = await this.context(
      user,
      { slug, key },
      preview,
    );
    const base: PathItemViewDto = {
      item: dto,
      path: {
        slug: p.slug,
        title: p.title,
        track: { slug: p.track.slug, title: p.track.title, color: p.track.color },
      },
      enrolled: !!enrollment,
    };
    const pr = await this.prisma.pathItemProgress.findUnique({
      where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
    });
    if (item.type === 'PROJECT') {
      const c = item.config as unknown as ProjectConfig;
      const payload = (pr?.payload as unknown as ProjectPayload | null) ?? null;
      base.project = {
        instructions: c.instructions ?? '',
        deliverables: c.deliverables ?? [],
        reviewMode: c.review_mode ?? 'manual',
        allowLink: c.allow_link ?? true,
        maxFiles: c.max_files ?? 5,
        submission: pr
          ? {
              files: (payload?.files ?? []).map((f, i) => ({
                filename: f.filename,
                size: f.size,
                url: `/api/learn/path-items/${item.id}/files/${i}`,
              })),
              link: payload?.link ?? null,
              note: payload?.note ?? null,
              status: pr.status,
              feedback: pr.feedback,
              submittedAt: pr.submittedAt?.toISOString() ?? null,
            }
          : null,
      };
    } else if (item.type === 'ASSESSMENT') {
      const c = item.config as unknown as AssessmentPublic;
      base.assessment = {
        passScore: c.pass_score,
        questions: c.questions.map((q) => ({ text: q.text, type: q.type, options: q.options })),
        attempts: pr?.attempts ?? 0,
        bestScore: pr?.score ?? null,
        status: pr ? (pr.status as 'IN_PROGRESS' | 'PASSED' | 'FAILED') : null,
      };
    } else if (item.type === 'MILESTONE') {
      const c = item.config as unknown as MilestoneConfig;
      const missing = items.filter(
        (x) => x.id !== item.id && !x.isOptional && x.state !== 'completed',
      );
      const cert = await this.prisma.pathCertificate.findUnique({
        where: { userId_pathId: { userId: user.id, pathId: p.id } },
        select: { id: true },
      });
      base.milestone = {
        description: c.description ?? '',
        certificateTitle: c.certificate_title || p.title,
        missing: missing.map((m) => ({ key: m.key, title: m.title, url: m.url })),
        claimable: missing.length === 0 && pr?.status !== 'PASSED',
        certificateId: cert?.id ?? null,
      };
      void map;
    }
    return base;
  }

  // ───────────────────────── layihə

  async submitProject(
    user: AuthUser,
    itemId: string,
    files: Array<{ originalname: string; buffer: Buffer; size: number }>,
    body: ProjectSubmitInput,
    preview: boolean,
  ): Promise<ProjectSubmitResultDto> {
    const { p, item, staffPreview } = await this.context(user, { itemId }, preview);
    if (item.type !== 'PROJECT') throw badRequest('PATH_ITEM_TYPE');
    const c = item.config as unknown as ProjectConfig;
    const link = body.link?.trim() || null;
    if (!files.length && !link)
      throw badRequest('PROJECT_EMPTY', 'Ən azı bir fayl və ya link lazımdır');
    if (files.length > (c.max_files ?? 5))
      throw badRequest('FILE_TOO_LARGE', `Ən çox ${c.max_files ?? 5} fayl`);
    if (link && !(c.allow_link ?? true))
      throw badRequest('VALIDATION_FAILED', 'Bu layihədə link qəbul edilmir');
    const auto = (c.review_mode ?? 'manual') === 'auto';
    if (staffPreview)
      return {
        status: auto ? 'PASSED' : 'SUBMITTED',
        pathPercent: 0,
        pathCompleted: false,
        certificateId: null,
        xpAwarded: 0,
      };
    const stored: ProjectPayload['files'] = [];
    for (const f of files) {
      const key = await saveToStorage(`path-${p.id}`, f.originalname, f.buffer);
      stored.push({ storageKey: key, filename: f.originalname, size: f.size });
    }
    const payload: ProjectPayload = { files: stored, link, note: body.note?.trim() || null };
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const prev = await tx.pathItemProgress.findUnique({
        where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
      });
      const status = prev?.status === 'PASSED' ? 'PASSED' : auto ? 'PASSED' : 'SUBMITTED';
      await tx.pathItemProgress.upsert({
        where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
        create: {
          userId: user.id,
          pathItemId: item.id,
          status,
          attempts: 1,
          submittedAt: now,
          payload: payload as unknown as Prisma.InputJsonObject,
          ...(status === 'PASSED' ? { completedAt: now } : {}),
        },
        update: {
          status,
          attempts: { increment: 1 },
          submittedAt: now,
          feedback: status === 'PASSED' ? prev?.feedback : null,
          payload: payload as unknown as Prisma.InputJsonObject,
          ...(status === 'PASSED' && !prev?.completedAt ? { completedAt: now } : {}),
        },
      });
      let xpAwarded = 0;
      if (status === 'PASSED')
        xpAwarded = await this.progress.grantXp(
          tx,
          user.id,
          item.xp,
          'PATH_ITEM_COMPLETED',
          `pathitem:${item.id}`,
          { pathItemId: item.id, pathId: p.id },
        );
      const r = await this.paths.recomputeEnrollment(tx, user.id, p.id);
      return {
        status,
        pathPercent: r.percent,
        pathCompleted: r.isComplete,
        certificateId: r.certificateId,
        xpAwarded,
      };
    });
  }

  async projectFile(
    user: AuthUser,
    itemId: string,
    index: number,
    ownerId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const uid = ownerId && isStaff(user) ? ownerId : user.id;
    const pr = await this.prisma.pathItemProgress.findUnique({
      where: { userId_pathItemId: { userId: uid, pathItemId: itemId } },
    });
    const f = (pr?.payload as unknown as ProjectPayload | null)?.files?.[index];
    if (!f) throw notFound();
    return { buffer: await readFromStorage(f.storageKey), filename: f.filename };
  }

  // ───────────────────────── imtahan

  async submitAssessment(
    user: AuthUser,
    itemId: string,
    answers: number[][],
    preview: boolean,
  ): Promise<AssessmentResultDto> {
    const { p, item, staffPreview } = await this.context(user, { itemId }, preview);
    if (item.type !== 'ASSESSMENT') throw badRequest('PATH_ITEM_TYPE');
    const c = item.config as unknown as AssessmentPublic;
    const secret = (item.secret ?? { questions: [] }) as unknown as AssessmentSecret;
    const { score, perQuestion } = scoreAssessment(secret, answers);
    const passed = score >= c.pass_score;
    const per = perQuestion.map((q, i) => ({
      ...q,
      ...(secret.questions[i]?.explanation
        ? { explanation: secret.questions[i]!.explanation }
        : {}),
    }));
    if (staffPreview)
      return {
        score,
        passed,
        perQuestion: per,
        pathPercent: 0,
        pathCompleted: false,
        certificateId: null,
        xpAwarded: 0,
      };
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const prev = await tx.pathItemProgress.findUnique({
        where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
      });
      const status = passed || prev?.status === 'PASSED' ? 'PASSED' : 'FAILED';
      const best = Math.max(score, prev?.score ?? 0);
      await tx.pathItemProgress.upsert({
        where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
        create: {
          userId: user.id,
          pathItemId: item.id,
          status,
          attempts: 1,
          score: best,
          submittedAt: now,
          ...(passed ? { completedAt: now } : {}),
        },
        update: {
          status,
          attempts: { increment: 1 },
          score: best,
          submittedAt: now,
          ...(passed && !prev?.completedAt ? { completedAt: now } : {}),
        },
      });
      let xpAwarded = 0;
      if (passed)
        xpAwarded = await this.progress.grantXp(
          tx,
          user.id,
          item.xp,
          'PATH_ITEM_COMPLETED',
          `pathitem:${item.id}`,
          { pathItemId: item.id, pathId: p.id },
        );
      const r = await this.paths.recomputeEnrollment(tx, user.id, p.id);
      return {
        score,
        passed,
        perQuestion: per,
        pathPercent: r.percent,
        pathCompleted: r.isComplete,
        certificateId: r.certificateId,
        xpAwarded,
      };
    });
  }

  // ───────────────────────── final

  async claimMilestone(
    user: AuthUser,
    itemId: string,
    preview: boolean,
  ): Promise<PathProgressResultDto & { certificateId: string | null }> {
    const { p, item, items, staffPreview } = await this.context(user, { itemId }, preview);
    if (item.type !== 'MILESTONE') throw badRequest('PATH_ITEM_TYPE');
    const missing = items.filter(
      (x) => x.id !== item.id && !x.isOptional && x.state !== 'completed',
    );
    if (missing.length)
      throw badRequest('MILESTONE_NOT_READY', 'Əvvəlcə bütün məcburi addımları tamamlayın');
    if (staffPreview)
      return { pathPercent: 100, pathCompleted: true, certificateId: null, xpAwarded: 0 };
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.pathItemProgress.upsert({
        where: { userId_pathItemId: { userId: user.id, pathItemId: item.id } },
        create: {
          userId: user.id,
          pathItemId: item.id,
          status: 'PASSED',
          attempts: 1,
          completedAt: now,
          submittedAt: now,
        },
        update: { status: 'PASSED', completedAt: now },
      });
      const xpAwarded = await this.progress.grantXp(
        tx,
        user.id,
        item.xp,
        'PATH_ITEM_COMPLETED',
        `pathitem:${item.id}`,
        { pathItemId: item.id, pathId: p.id },
      );
      const r = await this.paths.recomputeEnrollment(tx, user.id, p.id);
      return {
        pathPercent: r.percent,
        pathCompleted: r.isComplete,
        certificateId: r.certificateId,
        xpAwarded,
      };
    });
  }

  /** test/köməkçi: yolun DTO addımları */
  async itemsOf(userId: string, p: PathWithRel): Promise<PathItemDto[]> {
    return (await this.paths.buildMap(userId, p)).items;
  }
}
