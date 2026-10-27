import { enabledStep } from '../../content/enabled-step';
import { STEP_TYPES } from '@dacy/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AcademyEvaluationTrust,
  AcademyStepRefDto,
  AcademyStepSearchQuery,
  StepType,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressService } from '../../progress/progress.service';
import { LearnService } from '../../learn/learn.service';
import { notFound, unprocessable } from '../../common/errors';

/** Elementə yazılan mənbə snapshot-u (addım silinsə / dəyişsə tarix pozulmur) */
export interface StepSnapshot {
  stepId: string;
  type: StepType;
  title: string;
  xp: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleKey: string;
  moduleTitle: string;
  stepKey: string;
  level: string;
}

/** Mövcud qiymətləndirmənin etibar səviyyəsi (bax: docs/academy-management/SECURITY.md) */
export function trustOf(type: StepType): AcademyEvaluationTrust {
  switch (type) {
    case 'QUIZ':
    case 'CTF':
    case 'TERMINAL':
      return 'SERVER_VERIFIED';
    case 'SQL':
    case 'PYTHON':
      return 'SERVER_VERIFIED';
    default:
      return 'COMPLETION';
  }
}

const stepSelect = {
  id: true,
  key: true,
  type: true,
  title: true,
  xp: true,
  isPublished: true,
  updatedAt: true,
  module: {
    select: {
      key: true,
      title: true,
      isPublished: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          level: true,
          isPublished: true,
          deletedAt: true,
        },
      },
    },
  },
} satisfies Prisma.StepSelect;
type StepRow = Prisma.StepGetPayload<{ select: typeof stepSelect }>;

const available = (s: StepRow) =>
  enabledStep(s.type) &&
  s.isPublished &&
  s.module.isPublished &&
  s.module.course.isPublished &&
  !s.module.course.deletedAt;

/**
 * Məzmun adapteri: akademiya platforma addımlarını axtarır, yoxlayır və onlara istinad edir (kopyalamır).
 * Tələbənin addımı mövcud redaktorda açması üçün mövcud kursa yazılışdan və StepUnlock mexanizmindən istifadə edir.
 */
@Injectable()
export class AcademyContentAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly learn: LearnService,
  ) {}

  /** Müəllim üçün mövcud tapşırıqların axtarışı: yalnız dərc olunmuş kursların dərc olunmuş addımları */
  async search(q: AcademyStepSearchQuery): Promise<AcademyStepRefDto[]> {
    if (q.type && !enabledStep(q.type)) return [];
    const rows = await this.prisma.step.findMany({
      where: {
        isPublished: true,
        ...(q.type ? { type: q.type } : { type: { in: STEP_TYPES.filter(enabledStep) } }),
        ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}),
        module: {
          isPublished: true,
          course: {
            isPublished: true,
            deletedAt: null,
            ...(q.courseId ? { id: q.courseId } : {}),
            ...(q.level ? { level: q.level } : {}),
            ...(q.topicId ? { topics: { some: { id: q.topicId } } } : {}),
          },
        },
      },
      select: stepSelect,
      orderBy: [
        { module: { course: { title: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
      take: q.limit,
    });
    return rows.map((s) => this.refFromRow(s));
  }

  /** Elementlər üçün addımları yoxlayır: mövcud və dərc olunmuş olmalıdır. Snapshot + versiya qaytarır. */
  async resolve(
    stepIds: string[],
  ): Promise<Map<string, { snapshot: StepSnapshot; version: string }>> {
    const uniq = [...new Set(stepIds)];
    const rows = await this.prisma.step.findMany({
      where: { id: { in: uniq } },
      select: stepSelect,
    });
    const out = new Map<string, { snapshot: StepSnapshot; version: string }>();
    for (const id of uniq) {
      const s = rows.find((r) => r.id === id);
      if (!s) throw notFound('ACADEMY_STEP_NOT_FOUND', 'Platforma tapşırığı tapılmadı');
      if (!available(s))
        throw unprocessable(
          'ACADEMY_STEP_UNAVAILABLE',
          `«${s.title}» dərc olunmayıb və ya silinib`,
        );
      out.set(id, { snapshot: this.snapshot(s), version: s.updatedAt.toISOString() });
    }
    return out;
  }

  /** Element üçün istinad: snapshot + canlı vəziyyət (addım gizlədilib / silinibsə available=false) */
  async refs(
    items: Array<{ stepId: string | null; sourceSnapshot: unknown }>,
  ): Promise<Map<string, AcademyStepRefDto>> {
    const ids = items.map((i) => i.stepId).filter((x): x is string => !!x);
    const rows = ids.length
      ? await this.prisma.step.findMany({ where: { id: { in: ids } }, select: stepSelect })
      : [];
    const out = new Map<string, AcademyStepRefDto>();
    for (const it of items) {
      const snap = it.sourceSnapshot as StepSnapshot | null;
      if (!snap) continue;
      const live = it.stepId ? rows.find((r) => r.id === it.stepId) : undefined;
      out.set(
        snap.stepId,
        live ? this.refFromRow(live) : { ...this.refFromSnapshot(snap), available: false },
      );
    }
    return out;
  }

  private snapshot(s: StepRow): StepSnapshot {
    return {
      stepId: s.id,
      type: s.type as StepType,
      title: s.title,
      xp: s.xp,
      courseId: s.module.course.id,
      courseSlug: s.module.course.slug,
      courseTitle: s.module.course.title,
      moduleKey: s.module.key,
      moduleTitle: s.module.title,
      stepKey: s.key,
      level: s.module.course.level,
    };
  }

  private refFromRow(s: StepRow): AcademyStepRefDto {
    return { ...this.refFromSnapshot(this.snapshot(s)), available: available(s) };
  }

  private refFromSnapshot(s: StepSnapshot): AcademyStepRefDto {
    return {
      stepId: s.stepId,
      type: s.type,
      title: s.title,
      courseSlug: s.courseSlug,
      courseTitle: s.courseTitle,
      moduleKey: s.moduleKey,
      moduleTitle: s.moduleTitle,
      stepKey: s.stepKey,
      level: s.level,
      available: true,
      trust: trustOf(s.type),
    };
  }

  /** Mövcud redaktorda addımın ünvanı */
  workspaceUrl(s: Pick<StepSnapshot, 'courseSlug' | 'moduleKey' | 'stepKey'>): string {
    return `/kurs/${s.courseSlug}/${s.moduleKey}/${s.stepKey}`;
  }

  /**
   * Tələbənin addımı açması üçün: mövcud qaydalarla kursa yazılış (LearnService.enroll) və ardıcıl kursda
   * kilidlidirsə StepUnlock (admin əl ilə açma mexanizmi). Qiymətləndirmə və XP mövcud mühərrikdə qalır.
   */
  async ensureLearningAccess(
    studentId: string,
    stepId: string,
    grantedById: string | null,
  ): Promise<string> {
    const s = await this.prisma.step.findUnique({ where: { id: stepId }, select: stepSelect });
    if (!s || !available(s))
      throw unprocessable('ACADEMY_STEP_UNAVAILABLE', 'Bu tapşırıq hazırda əlçatan deyil');
    await this.learn.enroll(studentId, s.module.course.slug);
    const shape = await this.progress.loadCourseShape(s.module.course.id);
    const map = await this.progress.mapFor(studentId, shape);
    const cur = map.flat.find((x) => x.id === stepId);
    if (cur?.state === 'locked')
      await this.prisma.stepUnlock.upsert({
        where: { userId_stepId: { userId: studentId, stepId } },
        create: { userId: studentId, stepId, unlockedById: grantedById },
        update: {},
      });
    return this.workspaceUrl(this.snapshot(s));
  }
}
