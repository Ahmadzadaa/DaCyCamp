/**
 * Learning Path — nüvə: yolun yüklənməsi, xəritənin hesablanması, yazılmanın yenidən hesablanması, yol sertifikatı.
 * ProgressService-dən asılı DEYİL (dövri asılılıq olmasın deyə) — kurs irəliləyişi birbaşa Prisma + computeCourseMap ilə oxunur.
 * ProgressService kurs bitəndə `onCourseCompleted` çağırır.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { LearningPath, PathItem, Prisma, Track } from '@prisma/client';
import {
  computeCourseMap,
  computePathMap,
  type Level,
  type PathCardDto,
  type PathItemDto,
  type PathItemStatus,
  type PathItemType,
  type PathMap,
  type PathMapItemInput,
  type StepType,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { notFound } from '../common/errors';

export type Tx = Prisma.TransactionClient | PrismaService;

export const pathInclude = {
  track: true,
  items: {
    orderBy: { order: 'asc' as const },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          level: true,
          isPublished: true,
          deletedAt: true,
          estimatedHours: true,
        },
      },
    },
  },
} satisfies Prisma.LearningPathInclude;

export type PathItemWithCourse = PathItem & {
  course: {
    id: string;
    slug: string;
    title: string;
    level: string;
    isPublished: boolean;
    deletedAt?: Date | null;
    estimatedHours: number | null;
  } | null;
};
export type PathWithRel = LearningPath & { track: Track; items: PathItemWithCourse[] };

export interface MapItemInput extends PathMapItemInput {
  raw: PathItemWithCourse;
  course?: PathItemDto['course'];
  progress?: PathItemDto['progress'];
}

export const itemTitleOf = (it: PathItemWithCourse) =>
  it.type === 'COURSE' ? (it.course?.title ?? '(kurs silinib)') : (it.title ?? '');
export const itemUrlOf = (pathSlug: string, it: PathItemWithCourse) =>
  it.type === 'COURSE' && it.course ? `/kurs/${it.course.slug}` : `/yol/${pathSlug}/${it.key}`;

@Injectable()
export class PathsService {
  private readonly log = new Logger('Paths');
  constructor(
    private readonly prisma: PrismaService,
    private readonly certs: CertificatesService,
  ) {}

  async load(slug: string, tx: Tx = this.prisma): Promise<PathWithRel> {
    const p = await tx.learningPath.findUnique({ where: { slug }, include: pathInclude });
    if (!p) throw notFound();
    return p;
  }
  async loadById(id: string, tx: Tx = this.prisma): Promise<PathWithRel> {
    const p = await tx.learningPath.findUnique({ where: { id }, include: pathInclude });
    if (!p) throw notFound();
    return p;
  }

  toCard(
    p: PathWithRel,
    e?: { percent: number; isActive: boolean; completedAt: Date | null } | null,
  ): PathCardDto {
    const items = p.items.filter((i) => i.type !== 'COURSE' || i.course);
    const sum = items.reduce((a, i) => a + (i.estimatedHours ?? i.course?.estimatedHours ?? 0), 0);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      level: p.level as Level,
      track: { slug: p.track.slug, title: p.track.title, color: p.track.color, icon: p.track.icon },
      skills: p.skills,
      targetAudience: p.targetAudience,
      estimatedHours: p.estimatedHours ?? (sum > 0 ? Math.round(sum) : null),
      sequential: p.sequential,
      isPublished: p.isPublished,
      courseCount: items.filter((i) => i.type === 'COURSE').length,
      projectCount: items.filter((i) => i.type === 'PROJECT').length,
      assessmentCount: items.filter((i) => i.type === 'ASSESSMENT').length,
      itemCount: items.length,
      ...(e
        ? {
            enrolled: true,
            isActive: e.isActive,
            percent: e.percent,
            completedAt: e.completedAt?.toISOString() ?? null,
          }
        : { enrolled: false }),
    };
  }

  /** Kursun tələbə üçün xəritəsi (ProgressService-siz) */
  private async courseStats(userId: string | null, courseId: string, tx: Tx) {
    const c = await tx.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
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
      },
    });
    if (!c) return { percent: 0, done: 0, total: 0, isComplete: false };
    const rows = userId
      ? await tx.stepProgress.findMany({
          where: { userId, step: { module: { courseId } } },
          select: { stepId: true, status: true, score: true, attempts: true },
        })
      : [];
    const m = computeCourseMap({
      sequential: c.sequential,
      modules: c.modules.map((mod) => ({
        ...mod,
        steps: mod.steps.map((s) => ({ ...s, type: s.type as StepType })),
      })),
      progress: rows.map((r) => ({ ...r, status: r.status as 'IN_PROGRESS' | 'COMPLETED' })),
    });
    return { percent: m.percent, done: m.done, total: m.total, isComplete: m.isComplete };
  }

  /** Tələbə (və ya anonim) üçün yolun xəritəsi + DTO addımları */
  async buildMap(
    userId: string | null,
    p: PathWithRel,
    tx: Tx = this.prisma,
  ): Promise<{ map: PathMap<MapItemInput>; items: PathItemDto[] }> {
    const items = p.items.filter((i) => i.type !== 'COURSE' || i.course);
    const courseIds = items.map((i) => i.courseId).filter((x): x is string => !!x);
    const enrollments = userId
      ? await tx.enrollment.findMany({ where: { userId, courseId: { in: courseIds } } })
      : [];
    const progress = userId
      ? await tx.pathItemProgress.findMany({
          where: { userId, pathItemId: { in: items.map((i) => i.id) } },
        })
      : [];
    const inputs: MapItemInput[] = [];
    for (const it of items) {
      if (it.type === 'COURSE' && it.course) {
        const e = enrollments.find((x) => x.courseId === it.courseId);
        const st = userId ? await this.courseStats(userId, it.courseId!, tx) : null;
        const completed = !!e?.completedAt || !!st?.isComplete;
        inputs.push({
          id: it.id,
          key: it.key,
          order: it.order,
          type: 'COURSE',
          isOptional: it.isOptional,
          courseCompleted: completed,
          raw: it,
          course: {
            slug: it.course.slug,
            title: it.course.title,
            level: it.course.level as Level,
            enrolled: !!e,
            percent: completed ? 100 : (st?.percent ?? 0),
            done: st?.done ?? 0,
            total: st?.total ?? 0,
            completedAt: e?.completedAt?.toISOString() ?? null,
          },
        });
      } else {
        const pr = progress.find((x) => x.pathItemId === it.id);
        inputs.push({
          id: it.id,
          key: it.key,
          order: it.order,
          type: it.type as PathItemType,
          isOptional: it.isOptional,
          status: (pr?.status as PathItemStatus | undefined) ?? null,
          raw: it,
          progress: pr
            ? {
                status: pr.status as PathItemStatus,
                score: pr.score,
                attempts: pr.attempts,
                submittedAt: pr.submittedAt?.toISOString() ?? null,
                completedAt: pr.completedAt?.toISOString() ?? null,
              }
            : null,
        });
      }
    }
    const map = computePathMap({ sequential: p.sequential, items: inputs });
    const dto: PathItemDto[] = map.items.map(({ item, state, number }) => ({
      id: item.id,
      key: item.key,
      order: item.order,
      type: item.type,
      title: itemTitleOf(item.raw),
      isOptional: item.isOptional,
      estimatedHours: item.raw.estimatedHours ?? item.raw.course?.estimatedHours ?? null,
      xp: item.raw.xp,
      state,
      number,
      url: itemUrlOf(p.slug, item.raw),
      ...(item.course ? { course: item.course } : {}),
      ...(item.progress !== undefined ? { progress: item.progress } : {}),
    }));
    return { map, items: dto };
  }

  /** Kurs bitəndə (ProgressService tranzaksiyasının içində) — bu kursu ehtiva edən yollar yenilənir */
  async onCourseCompleted(tx: Prisma.TransactionClient, userId: string, courseId: string) {
    const links = await tx.pathItem.findMany({
      where: { courseId, path: { enrollments: { some: { userId } } } },
      select: { pathId: true },
      distinct: ['pathId'],
    });
    for (const l of links) await this.recomputeEnrollment(tx, userId, l.pathId);
  }

  /** PathEnrollment.percent / lastItemId / completedAt + yol sertifikatı (idempotent) */
  async recomputeEnrollment(
    tx: Tx,
    userId: string,
    pathId: string,
  ): Promise<{
    percent: number;
    isComplete: boolean;
    certificateId: string | null;
    justCompleted: boolean;
  }> {
    const e = await tx.pathEnrollment.findUnique({ where: { userId_pathId: { userId, pathId } } });
    const p = await this.loadById(pathId, tx);
    const { map } = await this.buildMap(userId, p, tx);
    if (!e)
      return {
        percent: map.percent,
        isComplete: map.isComplete,
        certificateId: null,
        justCompleted: false,
      };
    const justCompleted = map.isComplete && !e.completedAt;
    await tx.pathEnrollment.update({
      where: { id: e.id },
      data: {
        percent: map.percent,
        lastItemId: map.continueItem?.id ?? null,
        ...(justCompleted ? { completedAt: new Date() } : {}),
      },
    });
    let certificateId: string | null = null;
    if (map.isComplete) {
      certificateId = await this.certs.issueForPath(tx, userId, pathId);
      if (justCompleted) {
        await tx.xpEvent
          .create({
            data: {
              userId,
              amount: 0,
              reason: 'PATH_COMPLETED',
              dedupeKey: `path:${pathId}`,
              pathId,
            },
          })
          .catch(() => undefined);
        this.log.log(`Yol tamamlandı: user=${userId} path=${p.slug}`);
      }
    }
    return { percent: map.percent, isComplete: map.isComplete, certificateId, justCompleted };
  }
}
