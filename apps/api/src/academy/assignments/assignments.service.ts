import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  assertRubricTotal,
  fromCenti,
  ScoreError,
  sumItemMax,
  toCenti,
  type AcademyAssignmentCreateInput,
  type AcademyAssignmentDto,
  type AcademyAssignmentListItemDto,
  type AcademyAssignmentStatus,
  type AcademyAssignmentUpdateInput,
  type AcademyExtensionDto,
  type AcademyExtensionInput,
  type AcademyFileDto,
  type AcademyItemDto,
  type AcademyItemInput,
  type AcademyItemKind,
  type AcademyRevisionDto,
  type AcademyRubricDto,
  type AcademyRubricInput,
  type AcademyStepSearchQuery,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../common/errors';
import { AcademyAccessService, academyForbidden, type GroupAccess } from '../access/academy-access.service';
import { AcademyContentAdapter, type StepSnapshot } from '../integrations/content.adapter';
import { emitAcademyEvent } from '../notifications/academy-events';
import { removeFromStorage } from '../../assets/storage';

const assignmentInclude = {
  group: { select: { code: true } },
  items: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  files: {
    where: { purpose: 'ASSIGNMENT_RESOURCE' as const, status: 'ATTACHED' as const },
    orderBy: { createdAt: 'asc' as const },
  },
  rubric: { include: { criteria: { orderBy: { sortOrder: 'asc' as const } } } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.AcademyAssignmentInclude;
type AssignmentRow = Prisma.AcademyAssignmentGetPayload<{ include: typeof assignmentInclude }>;

/** Tələbələrin gördüyü vəziyyətlər */
export const STUDENT_VISIBLE: AcademyAssignmentStatus[] = ['PUBLISHED', 'ARCHIVED'];
/** Yalnız oxunan (redaktə olunmayan) vəziyyətlər */
const READ_ONLY: AcademyAssignmentStatus[] = ['ARCHIVED', 'CANCELLED'];
const DEADLINE_FIELDS = ['availableAt', 'dueAt', 'lateCutoffAt', 'latePolicy', 'latePenaltyPercent'] as const;

type ItemDraft = {
  id?: string;
  kind: AcademyItemKind;
  stepId: string | null;
  sourceVersion: string | null;
  sourceSnapshot: StepSnapshot | null;
  title: string;
  description: string;
  maxScoreCenti: number;
  sortOrder: number;
};

export const fileDto = (f: {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}): AcademyFileDto => ({
  id: f.id,
  filename: f.originalFilename,
  sizeBytes: f.sizeBytes,
  mimeType: f.mimeType,
  createdAt: f.createdAt.toISOString(),
});

@Injectable()
export class AcademyAssignmentsService {
  private readonly log = new Logger('Academy');
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly content: AcademyContentAdapter,
    private readonly audit: AuditService,
  ) {}

  // ───────────────────────── DTO

  async loadRow(id: string): Promise<AssignmentRow> {
    const a = await this.prisma.academyAssignment.findUnique({ where: { id }, include: assignmentInclude });
    if (!a) throw notFound('ACADEMY_ASSIGNMENT_NOT_FOUND', 'Tapşırıq tapılmadı');
    return a;
  }

  async toDto(a: AssignmentRow): Promise<AcademyAssignmentDto> {
    const refs = await this.content.refs(a.items);
    return {
      id: a.id,
      groupId: a.groupId,
      groupCode: a.group.code,
      title: a.title,
      description: a.description,
      type: a.type,
      status: a.status,
      availableAt: a.availableAt.toISOString(),
      dueAt: a.dueAt.toISOString(),
      lateCutoffAt: a.lateCutoffAt?.toISOString() ?? null,
      latePolicy: a.latePolicy,
      latePenaltyPercent: a.latePenaltyPercent,
      maxAttempts: a.maxAttempts,
      maxScore: fromCenti(a.maxScoreCenti),
      gradingType: a.gradingType,
      attemptSelection: a.attemptSelection,
      deliverables: a.deliverables,
      version: a.version,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      items: a.items.map((i) => this.itemDto(i, refs)),
      resources: a.files.map(fileDto),
      rubric: a.rubric ? this.rubricDto(a.rubric) : null,
      createdBy: a.createdBy,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  itemDto(
    i: AssignmentRow['items'][number],
    refs: Map<string, AcademyItemDto['step'] & object>,
  ): AcademyItemDto {
    const snap = i.sourceSnapshot as StepSnapshot | null;
    return {
      id: i.id,
      kind: i.kind,
      title: i.title,
      description: i.description,
      maxScore: fromCenti(i.maxScoreCenti),
      sortOrder: i.sortOrder,
      step: snap ? (refs.get(snap.stepId) ?? null) : null,
    };
  }

  rubricDto(r: NonNullable<AssignmentRow['rubric']>): AcademyRubricDto {
    return {
      id: r.id,
      title: r.title,
      maxScore: fromCenti(r.maxScoreCenti),
      criteria: r.criteria.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        maxScore: fromCenti(c.maxScoreCenti),
        sortOrder: c.sortOrder,
      })),
    };
  }

  // ───────────────────────── siyahı və detal (heyət)

  async listForGroup(user: AuthUser, groupId: string, status?: string): Promise<AcademyAssignmentListItemDto[]> {
    await this.access.require(user, groupId, 'assignment.viewAll');
    const rows = await this.prisma.academyAssignment.findMany({
      where: { groupId, ...(status ? { status: status as AcademyAssignmentStatus } : {}) },
      orderBy: [{ dueAt: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
    const ids = rows.map((r) => r.id);
    const [subs, active] = await Promise.all([
      this.prisma.academySubmission.findMany({
        where: { assignmentId: { in: ids }, attempts: { some: {} } },
        select: { assignmentId: true, grade: { select: { status: true } } },
      }),
      this.prisma.academyEnrollment.count({ where: { groupId, status: 'ACTIVE' } }),
    ]);
    return rows.map((r) => {
      const mine = subs.filter((s) => s.assignmentId === r.id);
      return {
        id: r.id,
        title: r.title,
        type: r.type,
        status: r.status,
        availableAt: r.availableAt.toISOString(),
        dueAt: r.dueAt.toISOString(),
        maxScore: fromCenti(r.maxScoreCenti),
        itemCount: r._count.items,
        submittedCount: mine.length,
        pendingReview: mine.filter((s) => !s.grade || s.grade.status === 'DRAFT').length,
        expectedCount: active,
      };
    });
  }

  async getForStaff(user: AuthUser, id: string): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.viewAll')) throw academyForbidden();
    return this.toDto(await this.loadRow(id));
  }

  // ───────────────────────── mövcud tapşırıqların axtarışı

  async searchSteps(user: AuthUser, q: AcademyStepSearchQuery) {
    if (!this.access.isAdmin(user)) {
      const groups = await this.access.instructorGroupIds(user);
      if (!groups?.length) throw forbidden('ACADEMY_FORBIDDEN', 'Yalnız müəllim və admin üçün');
    }
    return this.content.search(q);
  }

  // ───────────────────────── yaratma və redaktə

  /** Element girişləri → saxlanılacaq elementlər (platforma addımları adapterdən yoxlanılır) */
  private async buildItems(inputs: AcademyItemInput[]): Promise<ItemDraft[]> {
    const stepIds = inputs.filter((i) => i.kind === 'LEARNING_STEP').map((i) => i.stepId!);
    const resolved = stepIds.length ? await this.content.resolve(stepIds) : new Map();
    return inputs.map((i, idx) => {
      const r = i.kind === 'LEARNING_STEP' ? resolved.get(i.stepId!) : undefined;
      return {
        id: i.id,
        kind: i.kind,
        stepId: r ? r.snapshot.stepId : null,
        sourceVersion: r ? r.version : null,
        sourceSnapshot: r ? r.snapshot : null,
        title: i.title?.trim() || r?.snapshot.title || '',
        description: i.description ?? '',
        maxScoreCenti: toCenti(i.maxScore),
        sortOrder: idx,
      };
    });
  }

  /** Növ və qiymətləndirmə üsulu elementlərlə uyğun olmalıdır */
  private validateComposition(type: string, gradingType: string, items: ItemDraft[]) {
    if (type === 'EXISTING_CHALLENGE' && !items.some((i) => i.kind === 'LEARNING_STEP'))
      throw unprocessable('ACADEMY_ITEMS_TYPE', 'Mövcud tapşırıq növü üçün ən azı bir platforma tapşırığı seçin');
    if (type === 'FILE_BASED' && !items.some((i) => i.kind === 'FILE'))
      throw unprocessable('ACADEMY_ITEMS_TYPE', 'Fayl tapşırığı üçün ən azı bir fayl elementi lazımdır');
    // avtomatik qiymətləndirmə yalnız uyğun qiymətləndirici olan elementlərdə (platforma addımları)
    if (gradingType === 'AUTOMATIC' && items.some((i) => i.maxScoreCenti > 0 && i.kind !== 'LEARNING_STEP'))
      throw unprocessable(
        'ACADEMY_AUTO_GRADING_UNSUPPORTED',
        'Avtomatik qiymətləndirmə yalnız platforma tapşırıqları üçün mümkündür — Hibrid və ya Əl ilə seçin',
      );
    if (sumItemMax(items) <= 0)
      throw unprocessable('ACADEMY_MAX_SCORE_ZERO', 'Elementlərin maksimum ballarının cəmi 0-dan böyük olmalıdır');
  }

  private assertGroupWritable(a: GroupAccess) {
    if (!['PLANNED', 'ACTIVE'].includes(a.group.status))
      throw conflict('ACADEMY_GROUP_CLOSED', 'Bu qrupda yeni tapşırıq yaradılmır / dəyişdirilmir');
  }

  async create(user: AuthUser, groupId: string, input: AcademyAssignmentCreateInput): Promise<AcademyAssignmentDto> {
    const a = await this.access.require(user, groupId, 'assignment.createDraft');
    this.assertGroupWritable(a);
    const items = await this.buildItems(input.items);
    this.validateComposition(input.type, input.gradingType, items);
    const created = await this.prisma.academyAssignment.create({
      data: {
        groupId,
        title: input.title,
        description: input.description,
        type: input.type,
        status: 'DRAFT',
        availableAt: input.availableAt,
        dueAt: input.dueAt,
        lateCutoffAt: input.lateCutoffAt ?? null,
        latePolicy: input.latePolicy,
        latePenaltyPercent: input.latePenaltyPercent,
        maxAttempts: input.maxAttempts,
        maxScoreCenti: sumItemMax(items),
        gradingType: input.gradingType,
        attemptSelection: input.attemptSelection,
        deliverables: input.deliverables,
        createdById: user.id,
        updatedById: user.id,
        items: {
          create: items.map(({ id: _id, sourceSnapshot, ...i }) => ({
            ...i,
            sourceSnapshot: sourceSnapshot ? (sourceSnapshot as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
      },
    });
    await this.audit.record(user, {
      action: 'academy.assignment.create',
      entityType: 'ACADEMY',
      entityId: created.id,
      entityTitle: `${a.group.code} · ${created.title}`,
    });
    return this.toDto(await this.loadRow(created.id));
  }

  /**
   * Redaktə. Qaralama sərbəst dəyişir. Dərc olunmuş tapşırıq: versiya +1, snapshot + redaktor + səbəb saxlanılır,
   * tələbələrə bildiriş gedir. Göndəriş (cəhd) və ya qiymət varsa elementlər dəyişdirilmir — əvvəlki cəhdlər
   * köhnə elementlərə görə qiymətləndirilib, səssizcə yenidən şərh olunmamalıdır.
   */
  async update(user: AuthUser, id: string, input: AcademyAssignmentUpdateInput): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    const cur = await this.loadRow(id);
    if (READ_ONLY.includes(cur.status)) throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Bu tapşırıq artıq bağlıdır');
    const published = cur.status === 'PUBLISHED' || cur.status === 'SCHEDULED';
    const need = published ? 'assignment.editPublished' : 'assignment.editDraft';
    if (!this.access.can(access, need)) throw academyForbidden();
    const deadlineChanged = DEADLINE_FIELDS.some((f) => input[f] !== undefined && !sameValue(input[f], cur[f]));
    if (published && deadlineChanged && !this.access.can(access, 'assignment.changeDeadline')) throw academyForbidden();
    this.assertGroupWritable(access);
    if (input.expectedVersion !== undefined && input.expectedVersion !== cur.version)
      throw conflict('ACADEMY_VERSION_CONFLICT', 'Tapşırıq başqa istifadəçi tərəfindən dəyişdirilib — səhifəni yeniləyin');

    const availableAt = input.availableAt ?? cur.availableAt;
    const dueAt = input.dueAt ?? cur.dueAt;
    const lateCutoffAt = input.lateCutoffAt !== undefined ? input.lateCutoffAt : cur.lateCutoffAt;
    if (dueAt <= availableAt) throw badRequest('VALIDATION_FAILED', 'Son tarix açılış tarixindən sonra olmalıdır');
    if (lateCutoffAt && lateCutoffAt < dueAt)
      throw badRequest('VALIDATION_FAILED', 'Gecikmə həddi son tarixdən əvvəl ola bilməz');

    let items: ItemDraft[] | null = null;
    if (input.items) {
      const [attempts, grades] = await Promise.all([
        this.prisma.academySubmissionAttempt.count({ where: { assignmentId: id } }),
        this.prisma.academyGrade.count({ where: { assignmentId: id } }),
      ]);
      if (attempts > 0 || grades > 0)
        throw conflict(
          'ACADEMY_ASSIGNMENT_HAS_SUBMISSIONS',
          'Göndərişi olan tapşırığın elementləri dəyişdirilmir — yeni tapşırıq yaradın və ya bunu ləğv edin',
        );
      const known = new Set(cur.items.map((i) => i.id));
      if (input.items.some((i) => i.id && !known.has(i.id)))
        throw badRequest('VALIDATION_FAILED', 'Element bu tapşırığa aid deyil');
      items = await this.buildItems(input.items);
    }
    const nextType = input.type ?? cur.type;
    const nextGrading = input.gradingType ?? cur.gradingType;
    const effectiveItems =
      items ??
      cur.items.map((i) => ({
        kind: i.kind,
        stepId: i.stepId,
        sourceVersion: i.sourceVersion,
        sourceSnapshot: i.sourceSnapshot as StepSnapshot | null,
        title: i.title,
        description: i.description,
        maxScoreCenti: i.maxScoreCenti,
        sortOrder: i.sortOrder,
      }));
    this.validateComposition(nextType, nextGrading, effectiveItems);
    const maxScoreCenti = sumItemMax(effectiveItems);
    if (cur.rubric && maxScoreCenti !== cur.rubric.maxScoreCenti)
      throw conflict('ACADEMY_RUBRIC_MISMATCH', 'Rubrikanın cəmi tapşırığın maksimum balına bərabər olmalıdır — əvvəl rubrikanı dəyişin');

    const changes = changedFields(cur, input);
    if (items) changes.push('items');
    if (!changes.length) return this.toDto(cur);
    const { reason: _r, expectedVersion: _e, items: _i, ...fields } = input;

    await this.prisma.$transaction(async (tx) => {
      // optimistik bloklama: versiya dəyişməyibsə yenilə
      const upd = await tx.academyAssignment.updateMany({
        where: { id, version: cur.version },
        data: {
          ...fields,
          maxScoreCenti,
          updatedById: user.id,
          ...(published ? { version: { increment: 1 } } : {}),
        },
      });
      if (upd.count !== 1) throw conflict('ACADEMY_VERSION_CONFLICT', 'Tapşırıq eyni anda dəyişdirildi — yenidən cəhd edin');
      if (items) {
        const keep = items.filter((i) => i.id).map((i) => i.id!);
        await tx.academyAssignmentItem.deleteMany({ where: { assignmentId: id, id: { notIn: keep } } });
        for (const it of items) {
          const data = {
            kind: it.kind,
            stepId: it.stepId,
            sourceVersion: it.sourceVersion,
            sourceSnapshot: it.sourceSnapshot ? (it.sourceSnapshot as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            title: it.title,
            description: it.description,
            maxScoreCenti: it.maxScoreCenti,
            sortOrder: it.sortOrder,
          };
          if (it.id) await tx.academyAssignmentItem.update({ where: { id: it.id }, data });
          else await tx.academyAssignmentItem.create({ data: { ...data, assignmentId: id } });
        }
      }
      if (published) {
        const after = await tx.academyAssignment.findUniqueOrThrow({ where: { id }, include: { items: true } });
        await tx.academyAssignmentRevision.create({
          data: {
            assignmentId: id,
            version: after.version,
            snapshot: snapshotOf(after) as unknown as Prisma.InputJsonValue,
            changes,
            reason: input.reason ?? null,
            editedById: user.id,
          },
        });
        if (cur.status === 'PUBLISHED')
          await emitAcademyEvent(tx, { type: 'ASSIGNMENT_UPDATED', assignmentId: id, version: after.version, changes });
      }
    });
    await this.audit.record(user, {
      action: deadlineChanged ? 'academy.assignment.deadline' : 'academy.assignment.update',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${input.title ?? cur.title}`,
      details: {
        changes,
        reason: input.reason ?? null,
        ...(deadlineChanged
          ? {
              before: { availableAt: cur.availableAt, dueAt: cur.dueAt, lateCutoffAt: cur.lateCutoffAt },
              after: { availableAt, dueAt, lateCutoffAt },
            }
          : {}),
      },
    });
    if (deadlineChanged) this.log.log(`deadline changed ${id}: ${cur.dueAt.toISOString()} → ${dueAt.toISOString()}`);
    return this.toDto(await this.loadRow(id));
  }

  /** Dərc: «now» — tələbələr dərhal görür (açılış vaxtına qədər «açılmayıb»); «scheduled» — açılış anında avtomatik */
  async publish(user: AuthUser, id: string, mode: 'now' | 'scheduled'): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.publish')) throw academyForbidden();
    this.assertGroupWritable(access);
    const cur = await this.loadRow(id);
    if (cur.status !== 'DRAFT' && !(cur.status === 'SCHEDULED' && mode === 'now'))
      throw conflict('ACADEMY_ASSIGNMENT_NOT_DRAFT', 'Yalnız qaralama dərc oluna bilər');
    const now = new Date();
    if (cur.dueAt <= now) throw conflict('ACADEMY_DUE_IN_PAST', 'Son tarix artıq keçib — əvvəl tarixi dəyişin');
    if (mode === 'scheduled' && cur.availableAt <= now)
      throw conflict('ACADEMY_SCHEDULE_IN_PAST', 'Açılış vaxtı keçib — dərhal dərc edin');
    if (!cur.items.length) throw unprocessable('ACADEMY_NO_ITEMS', 'Tapşırıqda element yoxdur');
    const stepItems = cur.items.filter((i) => i.kind === 'LEARNING_STEP');
    if (stepItems.some((i) => !i.stepId))
      throw unprocessable('ACADEMY_STEP_UNAVAILABLE', 'Platforma tapşırıqlarından biri silinib');
    if (stepItems.length) await this.content.resolve(stepItems.map((i) => i.stepId!));
    if (cur.rubric) {
      try {
        assertRubricTotal(cur.rubric.criteria, cur.maxScoreCenti);
      } catch {
        throw conflict('ACADEMY_RUBRIC_MISMATCH', 'Rubrikanın cəmi tapşırığın maksimum balına bərabər deyil');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      if (mode === 'scheduled') {
        await tx.academyAssignment.update({ where: { id }, data: { status: 'SCHEDULED', updatedById: user.id } });
        return;
      }
      const upd = await tx.academyAssignment.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: now, updatedById: user.id },
        include: { items: true },
      });
      await tx.academyAssignmentRevision.upsert({
        where: { assignmentId_version: { assignmentId: id, version: upd.version } },
        create: {
          assignmentId: id,
          version: upd.version,
          snapshot: snapshotOf(upd) as unknown as Prisma.InputJsonValue,
          changes: ['published'],
          editedById: user.id,
        },
        update: {},
      });
      await emitAcademyEvent(tx, { type: 'ASSIGNMENT_PUBLISHED', assignmentId: id });
    });
    await this.audit.record(user, {
      action: 'academy.assignment.publish',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${cur.title}`,
      details: { mode },
    });
    this.log.log(`assignment ${mode === 'now' ? 'published' : 'scheduled'} ${id}`);
    return this.toDto(await this.loadRow(id));
  }

  /** Planlaşdırılmış tapşırıqlar açılış anında dərc olunur (bildiriş işçisi çağırır) */
  async publishScheduled(now = new Date()): Promise<number> {
    const due = await this.prisma.academyAssignment.findMany({
      where: { status: 'SCHEDULED', availableAt: { lte: now } },
      select: { id: true },
    });
    let n = 0;
    for (const { id } of due) {
      await this.prisma.$transaction(async (tx) => {
        const upd = await tx.academyAssignment.updateMany({
          where: { id, status: 'SCHEDULED' },
          data: { status: 'PUBLISHED', publishedAt: now },
        });
        if (upd.count !== 1) return;
        const a = await tx.academyAssignment.findUniqueOrThrow({ where: { id }, include: { items: true } });
        await tx.academyAssignmentRevision.upsert({
          where: { assignmentId_version: { assignmentId: id, version: a.version } },
          create: { assignmentId: id, version: a.version, snapshot: snapshotOf(a) as unknown as Prisma.InputJsonValue, changes: ['published'] },
          update: {},
        });
        await emitAcademyEvent(tx, { type: 'ASSIGNMENT_PUBLISHED', assignmentId: id });
        n++;
      });
    }
    if (n) this.log.log(`scheduled assignments published: ${n}`);
    return n;
  }

  /** Ləğv (CANCELLED) və ya arxiv (ARCHIVED): qeydlər qalır, yeni göndəriş yoxdur */
  async close(user: AuthUser, id: string, to: 'CANCELLED' | 'ARCHIVED', reason?: string): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.cancel')) throw academyForbidden();
    const cur = await this.loadRow(id);
    if (READ_ONLY.includes(cur.status)) throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Bu tapşırıq artıq bağlıdır');
    if (to === 'ARCHIVED' && cur.status !== 'PUBLISHED')
      throw conflict('ACADEMY_ASSIGNMENT_TRANSITION', 'Yalnız dərc olunmuş tapşırıq arxivlənir');
    await this.prisma.academyAssignment.update({ where: { id }, data: { status: to, updatedById: user.id } });
    await this.audit.record(user, {
      action: to === 'CANCELLED' ? 'academy.assignment.cancel' : 'academy.assignment.archive',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${cur.title}`,
      details: { from: cur.status, reason: reason ?? null },
    });
    return this.toDto(await this.loadRow(id));
  }

  /** Yalnız göndərişi olmayan qaralama silinir (faylları ilə) */
  async deleteDraft(user: AuthUser, id: string): Promise<{ ok: true }> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.editDraft')) throw academyForbidden();
    const cur = await this.loadRow(id);
    if (cur.status !== 'DRAFT') throw conflict('ACADEMY_ASSIGNMENT_NOT_DRAFT', 'Yalnız qaralama silinə bilər — dərc olunmuşu ləğv edin');
    const subs = await this.prisma.academySubmission.count({ where: { assignmentId: id } });
    if (subs) throw conflict('ACADEMY_ASSIGNMENT_HAS_SUBMISSIONS', 'Göndərişi olan tapşırıq silinmir');
    const files = await this.prisma.academyFile.findMany({ where: { assignmentId: id }, select: { storageKey: true } });
    await this.prisma.academyAssignment.delete({ where: { id } });
    for (const f of files) await removeFromStorage(f.storageKey).catch(() => undefined);
    await this.audit.record(user, {
      action: 'academy.assignment.delete',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${cur.title}`,
    });
    return { ok: true };
  }

  // ───────────────────────── fərdi uzadılmalar

  async listExtensions(user: AuthUser, id: string): Promise<AcademyExtensionDto[]> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.viewAll')) throw academyForbidden();
    const rows = await this.prisma.academyAssignmentExtension.findMany({
      where: { assignmentId: id },
      include: { student: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((e) => ({
      id: e.id,
      student: e.student,
      extendedDueAt: e.extendedDueAt.toISOString(),
      reason: e.reason,
      approvedBy: e.approvedBy,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  /** Yalnız seçilmiş tələbənin effektiv son tarixi dəyişir. Əvvəlki dəyər auditdə saxlanılır. */
  async upsertExtension(user: AuthUser, id: string, input: AcademyExtensionInput): Promise<AcademyExtensionDto[]> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.extend')) throw academyForbidden();
    const cur = await this.loadRow(id);
    if (READ_ONLY.includes(cur.status)) throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Bu tapşırıq artıq bağlıdır');
    if (input.extendedDueAt <= cur.dueAt)
      throw badRequest('VALIDATION_FAILED', 'Uzadılmış son tarix ümumi son tarixdən sonra olmalıdır');
    const enr = await this.prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: cur.groupId, studentId: input.studentId } },
      include: { student: { select: { email: true } } },
    });
    if (!enr || !['ACTIVE', 'PAUSED'].includes(enr.status))
      throw conflict('ACADEMY_NOT_ENROLLED', 'Tələbə bu qrupa aktiv yazılmayıb');
    const prev = await this.prisma.academyAssignmentExtension.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: input.studentId } },
    });
    await this.prisma.$transaction(async (tx) => {
      const ext = await tx.academyAssignmentExtension.upsert({
        where: { assignmentId_studentId: { assignmentId: id, studentId: input.studentId } },
        create: {
          assignmentId: id,
          groupId: cur.groupId,
          studentId: input.studentId,
          extendedDueAt: input.extendedDueAt,
          reason: input.reason,
          approvedById: user.id,
        },
        update: { extendedDueAt: input.extendedDueAt, reason: input.reason, approvedById: user.id },
      });
      if (cur.status === 'PUBLISHED')
        await emitAcademyEvent(tx, {
          type: 'DEADLINE_EXTENDED',
          extensionId: ext.id,
          extendedDueAt: input.extendedDueAt.toISOString(),
        });
    });
    await this.audit.record(user, {
      action: 'academy.assignment.extension',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${cur.title} · ${enr.student.email}`,
      details: {
        studentId: input.studentId,
        previous: prev?.extendedDueAt ?? null,
        next: input.extendedDueAt,
        reason: input.reason,
      },
    });
    return this.listExtensions(user, id);
  }

  async deleteExtension(user: AuthUser, id: string, studentId: string): Promise<AcademyExtensionDto[]> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.extend')) throw academyForbidden();
    const prev = await this.prisma.academyAssignmentExtension.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId } },
    });
    if (!prev) throw notFound('ACADEMY_EXTENSION_NOT_FOUND', 'Uzadılma tapılmadı');
    await this.prisma.academyAssignmentExtension.delete({ where: { id: prev.id } });
    await this.audit.record(user, {
      action: 'academy.assignment.extension.remove',
      entityType: 'ACADEMY',
      entityId: id,
      details: { studentId, previous: prev.extendedDueAt },
    });
    return this.listExtensions(user, id);
  }

  // ───────────────────────── versiyalar

  async revisions(user: AuthUser, id: string): Promise<AcademyRevisionDto[]> {
    const { access } = await this.access.assignmentAccess(user, id);
    if (!this.access.can(access, 'assignment.viewAll')) throw academyForbidden();
    const rows = await this.prisma.academyAssignmentRevision.findMany({
      where: { assignmentId: id },
      include: { editedBy: { select: { id: true, name: true } } },
      orderBy: { version: 'asc' },
    });
    return rows.map((r) => ({
      version: r.version,
      reason: r.reason,
      editedBy: r.editedBy,
      changes: r.changes,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ───────────────────────── rubrika

  /** Rubrika: meyarların cəmi = tapşırığın maksimumu. Qiymət yazılandan sonra dəyişmir. */
  async setRubric(user: AuthUser, id: string, input: AcademyRubricInput): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    const cur = await this.loadRow(id);
    const need = cur.status === 'DRAFT' ? 'assignment.editDraft' : 'assignment.editPublished';
    if (!this.access.can(access, need)) throw academyForbidden();
    if (READ_ONLY.includes(cur.status)) throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Bu tapşırıq artıq bağlıdır');
    if (await this.prisma.academyGrade.count({ where: { assignmentId: id } }))
      throw conflict('ACADEMY_RUBRIC_LOCKED', 'Qiymət yazılıb — rubrika artıq dəyişdirilmir');
    const criteria = input.criteria.map((c, i) => ({
      title: c.title,
      description: c.description ?? '',
      maxScoreCenti: toCenti(c.maxScore),
      sortOrder: i,
    }));
    try {
      assertRubricTotal(criteria, cur.maxScoreCenti);
    } catch (e) {
      if (e instanceof ScoreError)
        throw unprocessable('ACADEMY_RUBRIC_MISMATCH', `Meyarların cəmi ${fromCenti(cur.maxScoreCenti)} bal olmalıdır`);
      throw e;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.academyRubric.deleteMany({ where: { assignmentId: id } });
      const r = await tx.academyRubric.create({
        data: { assignmentId: id, title: input.title, maxScoreCenti: cur.maxScoreCenti },
      });
      await tx.academyRubricCriterion.createMany({
        data: criteria.map((c) => ({ ...c, rubricId: r.id, assignmentId: id })),
      });
    });
    await this.audit.record(user, {
      action: 'academy.assignment.rubric',
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: `${cur.group.code} · ${cur.title}`,
    });
    return this.toDto(await this.loadRow(id));
  }

  async deleteRubric(user: AuthUser, id: string): Promise<AcademyAssignmentDto> {
    const { access } = await this.access.assignmentAccess(user, id);
    const cur = await this.loadRow(id);
    const need = cur.status === 'DRAFT' ? 'assignment.editDraft' : 'assignment.editPublished';
    if (!this.access.can(access, need)) throw academyForbidden();
    if (await this.prisma.academyGrade.count({ where: { assignmentId: id } }))
      throw conflict('ACADEMY_RUBRIC_LOCKED', 'Qiymət yazılıb — rubrika artıq dəyişdirilmir');
    await this.prisma.academyRubric.deleteMany({ where: { assignmentId: id } });
    return this.toDto(await this.loadRow(id));
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date)
    return (a as Date | null)?.getTime?.() === (b as Date | null)?.getTime?.();
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function changedFields(cur: Record<string, unknown>, input: Record<string, unknown>): string[] {
  return Object.keys(input).filter(
    (k) => !['items', 'reason', 'expectedVersion'].includes(k) && input[k] !== undefined && !sameValue(input[k], cur[k]),
  );
}

/** Versiya snapshot-u: cəhd hansı versiyaya göndərilibsə o məzmun bərpa oluna bilər */
function snapshotOf(a: {
  title: string;
  description: string;
  type: string;
  availableAt: Date;
  dueAt: Date;
  lateCutoffAt: Date | null;
  latePolicy: string;
  latePenaltyPercent: number;
  maxAttempts: number;
  maxScoreCenti: number;
  gradingType: string;
  attemptSelection: string;
  items: Array<{
    id: string;
    kind: string;
    stepId: string | null;
    sourceVersion: string | null;
    title: string;
    description: string;
    maxScoreCenti: number;
    sortOrder: number;
  }>;
}) {
  return {
    title: a.title,
    description: a.description,
    type: a.type,
    availableAt: a.availableAt.toISOString(),
    dueAt: a.dueAt.toISOString(),
    lateCutoffAt: a.lateCutoffAt?.toISOString() ?? null,
    latePolicy: a.latePolicy,
    latePenaltyPercent: a.latePenaltyPercent,
    maxAttempts: a.maxAttempts,
    maxScoreCenti: a.maxScoreCenti,
    gradingType: a.gradingType,
    attemptSelection: a.attemptSelection,
    items: [...a.items]
      .sort((x, y) => x.sortOrder - y.sortOrder)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        stepId: i.stepId,
        sourceVersion: i.sourceVersion,
        title: i.title,
        description: i.description,
        maxScoreCenti: i.maxScoreCenti,
        sortOrder: i.sortOrder,
      })),
  };
}
