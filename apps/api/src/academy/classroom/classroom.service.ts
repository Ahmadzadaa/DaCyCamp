import { Injectable } from '@nestjs/common';
import { Prisma, type ClassroomLesson, type ClassroomQuestion } from '@prisma/client';
import { extname } from 'node:path';
import {
  ACADEMY_FILE_TYPES,
  type AcademyFileExtension,
  type ClassroomPublication,
  type ClassroomDto,
  type ClassroomLessonDto,
  type ClassroomLessonSummary,
  type ClassroomAnnouncementDto,
  type ClassroomLessonInput,
  type ClassroomLessonUpdateInput,
  type ClassroomAnnouncementInput,
  type ClassroomAnnouncementUpdateInput,
  type ClassroomTopicInput,
  type ClassroomQuestionInput,
  type ClassroomQuestionDto,
  type ClassroomReplyDto,
  type ClassroomLink,
  type ClassroomTeacherDeskDto,
  classroomLessonSchema,
  classroomAnnouncementSchema,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound, unprocessable } from '../../common/errors';
import { env } from '../../config/env';
import {
  AcademyAccessService,
  academyForbidden,
  type GroupAccess,
} from '../access/academy-access.service';
import { AcademyOrganizationService } from '../organization/organization.service';
import { AcademyClassesService } from '../classes/classes.service';
import { AcademyContentAdapter } from '../integrations/content.adapter';
import { needsReview } from '../analytics/analytics.service';
import { contentMatches, type UploadedBlob } from '../files/files.service';
import { safeFilename, saveToStorage, removeFromStorage, storagePath } from '../../assets/storage';
import { emitAcademyEvent } from '../notifications/academy-events';

const PAGE_SIZE = 15;
const closed = (status: string) => ['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(status);
const visible = (item: { isPublished: boolean; publishAt: Date; archivedAt: Date | null }) =>
  item.isPublished && !item.archivedAt && item.publishAt <= new Date();
const versionConflict = () =>
  conflict('ACADEMY_VERSION_CONFLICT', 'Məlumat dəyişib. Səhifəni yeniləyib təkrar cəhd edin.');
const publicationStatus = (item: {
  archivedAt: Date | null;
  isPublished: boolean;
  publishAt: Date;
}): ClassroomPublication =>
  item.archivedAt
    ? 'ARCHIVED'
    : !item.isPublished
      ? 'DRAFT'
      : item.publishAt > new Date()
        ? 'SCHEDULED'
        : 'PUBLISHED';
const lessonSummary = (
  l: ClassroomLesson & { _count: { files: number } },
): ClassroomLessonSummary => ({
  publicationStatus: publicationStatus(l),
  id: l.id,
  topicId: l.topicId,
  title: l.title,
  order: l.order,
  isPublished: l.isPublished,
  publishAt: l.publishAt.toISOString(),
  archivedAt: l.archivedAt?.toISOString() ?? null,
  version: l.version,
  fileCount: l._count.files,
  stepCount: l.stepIds.length,
});

@Injectable()
export class ClassroomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly organization: AcademyOrganizationService,
    private readonly classes: AcademyClassesService,
    private readonly content: AcademyContentAdapter,
    private readonly audit: AuditService,
  ) {}

  private async view(user: AuthUser, groupId: string) {
    return this.access.requireAny(user, groupId, ['assignment.viewAll', 'group.view']);
  }
  private async manage(user: AuthUser, groupId: string) {
    const a = await this.access.require(user, groupId, 'session.manage');
    if (closed(a.group.status))
      throw conflict('ACADEMY_GROUP_CLOSED', 'Qrup yalnız oxumaq üçündür');
    return a;
  }
  private staff(a: GroupAccess) {
    return this.access.can(a, 'assignment.viewAll');
  }
  private writableStudent(a: GroupAccess) {
    if (!this.staff(a) && !this.access.can(a, 'student.submit')) throw academyForbidden();
    if (closed(a.group.status))
      throw conflict('ACADEMY_GROUP_CLOSED', 'Qrup yalnız oxumaq üçündür');
  }
  private async record(user: AuthUser, action: string, id: string, title: string) {
    await this.audit.record(user, {
      action: `academy.classroom.${action}`,
      entityType: 'ACADEMY',
      entityId: id,
      entityTitle: title,
    });
  }

  async classroom(user: AuthUser, groupId: string, page = 1): Promise<ClassroomDto> {
    const a = await this.view(user, groupId);
    const staff = this.staff(a);
    const [group, topics, announcements, sessions] = await Promise.all([
      this.organization.getGroup(user, groupId),
      this.prisma.classroomTopic.findMany({
        where: { groupId, ...(staff ? {} : { archivedAt: null }) },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          lessons: {
            where: staff
              ? {}
              : { archivedAt: null, isPublished: true, publishAt: { lte: new Date() } },
            include: { _count: { select: { files: { where: { removedAt: null } } } } },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          },
        },
      }),
      this.announcements(user, groupId, page, a),
      this.classes.list(user, groupId, {
        from: new Date(Date.now() - 24 * 3600_000).toISOString(),
      }),
    ]);
    return {
      viewerId: user.id,
      group,
      canManage: this.access.can(a, 'session.manage') && !closed(a.group.status),
      readOnly: closed(a.group.status),
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        order: t.order,
        archivedAt: t.archivedAt?.toISOString() ?? null,
        lessons: t.lessons.map(lessonSummary),
      })),
      announcements,
      nextSession:
        sessions.find((s) => s.status !== 'CANCELLED' && new Date(s.endsAt) > new Date()) ?? null,
    };
  }

  async announcements(user: AuthUser, groupId: string, page: number, access?: GroupAccess) {
    const a = access ?? (await this.view(user, groupId));
    const where: Prisma.ClassroomAnnouncementWhereInput = {
      groupId,
      ...(this.staff(a)
        ? {}
        : { archivedAt: null, isPublished: true, publishAt: { lte: new Date() } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.classroomAnnouncement.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }, { id: 'desc' }],
        include: {
          author: { select: { name: true } },
          files: { where: { removedAt: null }, orderBy: { createdAt: 'asc' } },
          reads: { where: { userId: user.id } },
          _count: { select: { replies: { where: { hiddenAt: null } } } },
        },
      }),
      this.prisma.classroomAnnouncement.count({ where }),
    ]);
    return {
      items: rows.map((r): ClassroomAnnouncementDto => ({
        publicationStatus: publicationStatus(r),
        files: r.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          sizeBytes: f.sizeBytes,
          mimeType: f.mime,
          createdAt: f.createdAt.toISOString(),
        })),
        id: r.id,
        title: r.title,
        body: r.body,
        links: r.links as unknown as ClassroomLink[],
        pinned: r.pinned,
        commentsEnabled: r.commentsEnabled,
        isPublished: r.isPublished,
        publishAt: r.publishAt.toISOString(),
        archivedAt: r.archivedAt?.toISOString() ?? null,
        version: r.version,
        authorName: r.author?.name ?? 'DaCy Academy',
        read: !!r.reads[0] && r.reads[0].readAt >= r.updatedAt,
        replyCount: r._count.replies,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async topic(user: AuthUser, groupId: string, input: ClassroomTopicInput, id?: string) {
    await this.manage(user, groupId);
    if (id) {
      const changed = await this.prisma.classroomTopic.updateMany({
        where: { id, groupId },
        data: input,
      });
      if (!changed.count) throw notFound();
    } else {
      if ((await this.prisma.classroomTopic.count({ where: { groupId } })) >= 100)
        throw conflict('CLASSROOM_LIMIT', 'Mövzu limiti: 100');
      id = (await this.prisma.classroomTopic.create({ data: { ...input, groupId } })).id;
    }
    await this.record(user, 'topic.save', id, input.title);
    return { id };
  }

  async archiveTopic(user: AuthUser, id: string, archived: boolean) {
    const topic = await this.prisma.classroomTopic.findUnique({ where: { id } });
    if (!topic) throw notFound();
    await this.manage(user, topic.groupId);
    await this.prisma.classroomTopic.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    });
    await this.record(user, 'topic.archive', id, topic.title);
    return { ok: true };
  }

  private async lessonInput(groupId: string, input: ClassroomLessonInput, lessonId?: string) {
    const t = await this.prisma.classroomTopic.findFirst({
      where: { id: input.topicId, groupId, archivedAt: null },
    });
    if (!t) throw unprocessable('CLASSROOM_TOPIC_INVALID', 'Aktiv mövzu seçin');
    if (input.stepIds.length) await this.content.resolve(input.stepIds);
    if (
      input.isPublished &&
      !input.content.trim() &&
      !input.videoUrl &&
      !input.links.length &&
      !input.stepIds.length &&
      (!lessonId ||
        !(await this.prisma.classroomFile.count({ where: { lessonId, removedAt: null } })))
    )
      throw unprocessable(
        'CLASSROOM_LESSON_EMPTY',
        'Dərsə mətn, video, link və ya məşq əlavə edin',
      );
  }

  async createLesson(user: AuthUser, groupId: string, input: ClassroomLessonInput) {
    await this.manage(user, groupId);
    await this.lessonInput(groupId, input);
    const l = await this.prisma.$transaction(async (tx) => {
      const created = await tx.classroomLesson.create({
        data: {
          ...input,
          groupId,
          authorId: user.id,
          publishAt: input.publishAt ? new Date(input.publishAt) : new Date(),
          links: input.links as Prisma.InputJsonValue,
        },
      });
      await this.snapshot(tx, user, 'lesson', created);
      return created;
    });
    await this.record(user, 'lesson.create', l.id, l.title);
    return this.lesson(user, l.id);
  }

  async updateLesson(user: AuthUser, id: string, input: ClassroomLessonUpdateInput) {
    const l = await this.prisma.classroomLesson.findUnique({ where: { id } });
    if (!l) throw notFound();
    await this.manage(user, l.groupId);
    await this.lessonInput(l.groupId, input, id);
    const { expectedVersion, ...rest } = input;
    const publishAt = input.publishAt ? new Date(input.publishAt) : l.publishAt;
    const rescheduled = input.isPublished && (!l.isPublished || +publishAt !== +l.publishAt);
    await this.prisma.$transaction(async (tx) => {
      await this.snapshot(tx, user, 'lesson', l);
      const r = await tx.classroomLesson.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...rest,
          publishAt,
          links: input.links as Prisma.InputJsonValue,
          version: { increment: 1 },
          ...(rescheduled ? { notifiedAt: null } : {}),
        },
      });
      if (!r.count) throw versionConflict();
      await this.snapshot(
        tx,
        user,
        'lesson',
        await tx.classroomLesson.findUniqueOrThrow({ where: { id } }),
      );
    });
    await this.record(user, 'lesson.update', id, input.title);
    return this.lesson(user, id);
  }

  private async loadLesson(user: AuthUser, id: string) {
    const l = await this.prisma.classroomLesson.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!l) throw notFound();
    const a = await this.view(user, l.groupId);
    if (!this.staff(a) && (!visible(l) || l.topic.archivedAt)) throw notFound();
    return { l, a };
  }

  async lesson(user: AuthUser, id: string): Promise<ClassroomLessonDto> {
    const { l, a } = await this.loadLesson(user, id);
    const [files, steps] = await Promise.all([
      this.prisma.classroomFile.findMany({
        where: { lessonId: id, removedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.step.findMany({
        where: {
          id: { in: l.stepIds },
          isPublished: true,
          module: { isPublished: true, course: { isPublished: true, deletedAt: null } },
        },
        select: {
          id: true,
          title: true,
          type: true,
          module: { select: { course: { select: { title: true } } } },
        },
      }),
    ]);
    return {
      ...lessonSummary({ ...l, _count: { files: files.length } }),
      groupId: l.groupId,
      content: l.content,
      videoUrl: l.videoUrl,
      links: l.links as unknown as ClassroomLink[],
      stepIds: l.stepIds,
      canManage: this.access.can(a, 'session.manage') && !closed(a.group.status),
      files: files.map((f) => ({
        id: f.id,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        mimeType: f.mime,
        url: `/api/academy/classroom/files/${f.id}`,
        status: 'ATTACHED' as const,
        createdAt: f.createdAt.toISOString(),
      })),
      steps: steps.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        courseTitle: s.module.course.title,
      })),
    };
  }

  async openStep(user: AuthUser, id: string, stepId: string) {
    const { l, a } = await this.loadLesson(user, id);
    if (!l.stepIds.includes(stepId)) throw notFound();
    if (this.staff(a) && (user.role === 'ADMIN' || user.role === 'INSTRUCTOR')) {
      const resolved = await this.content.resolve([stepId]);
      return { url: this.content.workspaceUrl(resolved.get(stepId)!.snapshot) + '?onizle=1' };
    }
    this.writableStudent(a);
    return { url: await this.content.ensureLearningAccess(user.id, stepId, l.authorId) };
  }

  async saveAnnouncement(
    user: AuthUser,
    groupId: string,
    input: ClassroomAnnouncementInput,
    id?: string,
    expectedVersion?: number,
  ) {
    await this.manage(user, groupId);
    const existing = id
      ? await this.prisma.classroomAnnouncement.findFirst({ where: { id, groupId } })
      : null;
    if (id && !existing) throw notFound();
    const publishAt = input.publishAt
      ? new Date(input.publishAt)
      : (existing?.publishAt ?? new Date());
    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await this.snapshot(tx, user, 'announcement', existing);
        const rescheduled =
          input.isPublished && (!existing.isPublished || +publishAt !== +existing.publishAt);
        const result = await tx.classroomAnnouncement.updateMany({
          where: { id, groupId, version: expectedVersion },
          data: {
            ...input,
            publishAt,
            links: input.links as Prisma.InputJsonValue,
            version: { increment: 1 },
            ...(rescheduled ? { notifiedAt: null } : {}),
          },
        });
        if (!result.count) throw versionConflict();
      } else {
        id = (
          await tx.classroomAnnouncement.create({
            data: {
              ...input,
              groupId,
              authorId: user.id,
              publishAt,
              links: input.links as Prisma.InputJsonValue,
            },
          })
        ).id;
      }
      await this.snapshot(
        tx,
        user,
        'announcement',
        await tx.classroomAnnouncement.findUniqueOrThrow({ where: { id: id! } }),
      );
    });
    await this.record(user, 'announcement.save', id!, input.title);
    return { id };
  }

  async updateAnnouncement(user: AuthUser, id: string, input: ClassroomAnnouncementUpdateInput) {
    const item = await this.prisma.classroomAnnouncement.findUnique({ where: { id } });
    if (!item) throw notFound();
    const { expectedVersion, ...data } = input;
    return this.saveAnnouncement(user, item.groupId, data, id, expectedVersion);
  }

  private async snapshot(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    kind: 'lesson' | 'announcement',
    item: { id: string; groupId: string; version: number },
  ) {
    await tx.classroomRevision.upsert({
      where: { kind_entityId_version: { kind, entityId: item.id, version: item.version } },
      update: {},
      create: {
        groupId: item.groupId,
        kind,
        entityId: item.id,
        version: item.version,
        snapshot: JSON.parse(JSON.stringify(item)) as Prisma.InputJsonValue,
        actorId: user.id,
        actorName: user.name,
      },
    });
  }

  async history(user: AuthUser, kind: 'lesson' | 'announcement', id: string, page = 1) {
    const item =
      kind === 'lesson'
        ? (await this.loadLesson(user, id)).l
        : (await this.loadAnnouncement(user, id)).item;
    await this.access.require(user, item.groupId, 'session.manage');
    const where = { kind, entityId: id, groupId: item.groupId };
    const [items, total] = await Promise.all([
      this.prisma.classroomRevision.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { version: 'desc' },
      }),
      this.prisma.classroomRevision.count({ where }),
    ]);
    return {
      items: items.map((r) => ({
        id: r.id,
        version: r.version,
        actorName: r.actorName,
        createdAt: r.createdAt.toISOString(),
        snapshot: r.snapshot,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async restoreRevision(
    user: AuthUser,
    kind: 'lesson' | 'announcement',
    id: string,
    revisionId: string,
    expectedVersion: number,
  ) {
    const revision = await this.prisma.classroomRevision.findFirst({
      where: { id: revisionId, kind, entityId: id },
    });
    if (!revision) throw notFound();
    await this.manage(user, revision.groupId);
    return kind === 'lesson'
      ? this.updateLesson(user, id, {
          ...classroomLessonSchema.parse(revision.snapshot),
          expectedVersion,
        })
      : this.updateAnnouncement(user, id, {
          ...classroomAnnouncementSchema.parse(revision.snapshot),
          expectedVersion,
        });
  }

  async archive(
    user: AuthUser,
    kind: 'lesson' | 'announcement',
    id: string,
    archived: boolean,
    expectedVersion: number,
  ) {
    const item =
      kind === 'lesson'
        ? await this.prisma.classroomLesson.findUnique({ where: { id } })
        : await this.prisma.classroomAnnouncement.findUnique({ where: { id } });
    if (!item) throw notFound();
    await this.manage(user, item.groupId);
    const args = {
      where: { id, version: expectedVersion },
      data: { archivedAt: archived ? new Date() : null, version: { increment: 1 } },
    };
    const r =
      kind === 'lesson'
        ? await this.prisma.classroomLesson.updateMany(args)
        : await this.prisma.classroomAnnouncement.updateMany(args);
    if (!r.count) throw versionConflict();
    await this.record(user, `${kind}.archive`, id, item.title);
    return { ok: true };
  }

  private async loadAnnouncement(user: AuthUser, id: string) {
    const item = await this.prisma.classroomAnnouncement.findUnique({ where: { id } });
    if (!item) throw notFound();
    const a = await this.view(user, item.groupId);
    if (!this.staff(a) && !visible(item)) throw notFound();
    return { item, a };
  }

  async readAnnouncement(user: AuthUser, id: string) {
    await this.loadAnnouncement(user, id);
    await this.prisma.classroomAnnouncementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: user.id } },
      create: { announcementId: id, userId: user.id },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  async addFile(
    user: AuthUser,
    id: string,
    blob: UploadedBlob,
    kind: 'lesson' | 'announcement' = 'lesson',
  ) {
    const parent =
      kind === 'lesson'
        ? (await this.loadLesson(user, id)).l
        : (await this.loadAnnouncement(user, id)).item;
    await this.manage(user, parent.groupId);
    const target = kind === 'lesson' ? { lessonId: id } : { announcementId: id };
    const filename = safeFilename(blob.filename);
    const ext = extname(filename).slice(1).toLowerCase() as AcademyFileExtension;
    if (!Object.hasOwn(ACADEMY_FILE_TYPES, ext))
      throw unprocessable('ACADEMY_FILE_TYPE', 'Bu fayl növü qəbul edilmir');
    if (!blob.buffer.length || blob.buffer.length > env.ACADEMY_MAX_FILE_MB * 1024 * 1024)
      throw unprocessable('ACADEMY_FILE_EMPTY', 'Fayl boşdur və ya ölçü limitini keçir');
    if (!contentMatches(ext, blob.buffer))
      throw unprocessable('ACADEMY_FILE_CONTENT', 'Fayl məzmunu uzantıya uyğun deyil');
    const key = await saveToStorage(`classroom/${kind}/${id}`, filename, blob.buffer);
    try {
      const file = await this.prisma.$transaction(async (tx) => {
        if (kind === 'lesson')
          await tx.$queryRaw`SELECT id FROM "ClassroomLesson" WHERE id = ${id} FOR UPDATE`;
        else await tx.$queryRaw`SELECT id FROM "ClassroomAnnouncement" WHERE id = ${id} FOR UPDATE`;
        if ((await tx.classroomFile.count({ where: { ...target, removedAt: null } })) >= 20)
          throw conflict('ACADEMY_TOO_MANY_FILES', 'Ən çox 20 fayl');
        if (kind === 'announcement')
          await tx.classroomAnnouncement.update({
            where: { id },
            data: { version: { increment: 1 } },
          });
        return tx.classroomFile.create({
          data: {
            ...target,
            filename,
            storageKey: key,
            mime: ACADEMY_FILE_TYPES[ext],
            sizeBytes: blob.buffer.length,
            ownerId: user.id,
          },
        });
      });
      await this.record(user, 'file.add', file.id, filename);
      return { id: file.id };
    } catch (e) {
      await removeFromStorage(key).catch(() => undefined);
      throw e;
    }
  }

  async file(user: AuthUser, id: string) {
    const file = await this.prisma.classroomFile.findUnique({ where: { id } });
    if (!file || file.removedAt) throw notFound();
    if (file.lessonId) await this.loadLesson(user, file.lessonId);
    else if (file.announcementId) await this.loadAnnouncement(user, file.announcementId);
    else throw notFound();
    return { path: storagePath(file.storageKey), filename: file.filename, mime: file.mime };
  }

  async removeFile(user: AuthUser, id: string) {
    const file = await this.prisma.classroomFile.findUnique({ where: { id } });
    if (!file) throw notFound();
    const parent = file.lessonId
      ? (await this.loadLesson(user, file.lessonId)).l
      : (await this.loadAnnouncement(user, file.announcementId!)).item;
    await this.manage(user, parent.groupId);
    await this.prisma.$transaction(async (tx) => {
      await tx.classroomFile.update({ where: { id }, data: { removedAt: new Date() } });
      if (file.announcementId)
        await tx.classroomAnnouncement.update({
          where: { id: file.announcementId },
          data: { version: { increment: 1 } },
        });
    });
    await this.record(user, 'file.hide', id, file.filename);
    return { ok: true };
  }

  private questionDto(
    q: ClassroomQuestion & { _count: { replies: number } },
    user: AuthUser,
    a: GroupAccess,
  ): ClassroomQuestionDto {
    return {
      id: q.id,
      groupId: q.groupId,
      assignmentId: q.assignmentId,
      title: q.title,
      body: q.body,
      isPrivate: q.isPrivate,
      resolvedAt: q.resolvedAt?.toISOString() ?? null,
      authorName: q.authorName,
      createdAt: q.createdAt.toISOString(),
      replyCount: q._count.replies,
      canResolve: this.staff(a) || q.authorId === user.id,
    };
  }

  async questions(user: AuthUser, groupId: string, page = 1, assignmentId?: string) {
    const a = await this.view(user, groupId);
    const where: Prisma.ClassroomQuestionWhereInput = {
      groupId,
      archivedAt: null,
      ...(assignmentId ? { assignmentId } : {}),
      ...(this.staff(a) ? {} : { OR: [{ isPrivate: false }, { authorId: user.id }] }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.classroomQuestion.findMany({
        where,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { replies: { where: { hiddenAt: null } } } } },
      }),
      this.prisma.classroomQuestion.count({ where }),
    ]);
    return {
      items: rows.map((q) => this.questionDto(q, user, a)),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async ask(user: AuthUser, groupId: string, input: ClassroomQuestionInput) {
    const a = await this.view(user, groupId);
    this.writableStudent(a);
    if (input.assignmentId) {
      const asg = await this.prisma.academyAssignment.findFirst({
        where: { id: input.assignmentId, groupId },
      });
      if (!asg || (!this.staff(a) && (asg.status !== 'PUBLISHED' || asg.availableAt > new Date())))
        throw notFound();
    }
    const q = await this.prisma.$transaction(async (tx) => {
      const created = await tx.classroomQuestion.create({
        data: { ...input, groupId, authorId: user.id, authorName: user.name },
      });
      await emitAcademyEvent(tx, { type: 'CLASSROOM_QUESTION', id: created.id });
      return created;
    });
    return { id: q.id };
  }

  private async loadQuestion(user: AuthUser, id: string) {
    const q = await this.prisma.classroomQuestion.findUnique({
      where: { id },
      include: { _count: { select: { replies: { where: { hiddenAt: null } } } } },
    });
    if (!q || q.archivedAt) throw notFound();
    const a = await this.view(user, q.groupId);
    if (q.isPrivate && q.authorId !== user.id && !this.staff(a)) throw notFound();
    return { q, a };
  }

  async question(user: AuthUser, id: string) {
    const { q, a } = await this.loadQuestion(user, id);
    return {
      question: this.questionDto(q, user, a),
      replies: await this.replies(user, 'question', id),
    };
  }

  async resolve(user: AuthUser, id: string, resolved: boolean) {
    const { q, a } = await this.loadQuestion(user, id);
    this.writableStudent(a);
    if (!this.staff(a) && q.authorId !== user.id) throw academyForbidden();
    await this.prisma.classroomQuestion.update({
      where: { id },
      data: { resolvedAt: resolved ? new Date() : null },
    });
    await this.record(user, 'question.resolve', id, q.title);
    return { ok: true };
  }

  async replies(
    user: AuthUser,
    kind: 'announcement' | 'question',
    id: string,
  ): Promise<ClassroomReplyDto[]> {
    const a =
      kind === 'announcement'
        ? (await this.loadAnnouncement(user, id)).a
        : (await this.loadQuestion(user, id)).a;
    const rows = await this.prisma.classroomReply.findMany({
      where: { [kind === 'announcement' ? 'announcementId' : 'questionId']: id, hiddenAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      authorName: r.authorName,
      isStaff: r.isStaff,
      createdAt: r.createdAt.toISOString(),
      canHide:
        !closed(a.group.status) &&
        (this.staff(a) || this.access.can(a, 'student.submit')) &&
        (this.staff(a) || r.authorId === user.id),
    }));
  }

  async reply(user: AuthUser, kind: 'announcement' | 'question', id: string, body: string) {
    let a: GroupAccess;
    if (kind === 'announcement') {
      const r = await this.loadAnnouncement(user, id);
      a = r.a;
      if (!r.item.commentsEnabled || r.item.archivedAt)
        throw conflict('CLASSROOM_COMMENTS_CLOSED', 'Şərhlər bağlıdır');
    } else {
      const r = await this.loadQuestion(user, id);
      a = r.a;
      if (r.q.resolvedAt)
        throw conflict('CLASSROOM_COMMENTS_CLOSED', 'Sual cavablandırılıb. Əvvəl yenidən açın.');
    }
    this.writableStudent(a);
    return this.prisma.$transaction(async (tx) => {
      if (kind === 'announcement') {
        await tx.$queryRaw`SELECT id FROM "ClassroomAnnouncement" WHERE id = ${id} FOR UPDATE`;
        const current = await tx.classroomAnnouncement.findUniqueOrThrow({ where: { id } });
        if (!current.commentsEnabled || current.archivedAt || (!this.staff(a) && !visible(current)))
          throw conflict('CLASSROOM_COMMENTS_CLOSED');
      } else {
        await tx.$queryRaw`SELECT id FROM "ClassroomQuestion" WHERE id = ${id} FOR UPDATE`;
        const current = await tx.classroomQuestion.findUniqueOrThrow({ where: { id } });
        if (current.resolvedAt || current.archivedAt) throw conflict('CLASSROOM_COMMENTS_CLOSED');
      }
      const key = kind === 'announcement' ? 'announcementId' : 'questionId';
      if ((await tx.classroomReply.count({ where: { [key]: id, hiddenAt: null } })) >= 200)
        throw conflict('CLASSROOM_LIMIT', 'Şərh limiti: 200');
      const r = await tx.classroomReply.create({
        data: { [key]: id, body, authorId: user.id, authorName: user.name, isStaff: this.staff(a) },
      });
      await emitAcademyEvent(tx, { type: 'CLASSROOM_REPLY', id: r.id });
      return { id: r.id };
    });
  }

  async hideReply(user: AuthUser, id: string) {
    const r = await this.prisma.classroomReply.findUnique({ where: { id } });
    if (!r) throw notFound();
    const a = r.announcementId
      ? (await this.loadAnnouncement(user, r.announcementId)).a
      : (await this.loadQuestion(user, r.questionId!)).a;
    this.writableStudent(a);
    if (r.authorId !== user.id && !this.staff(a)) throw academyForbidden();
    await this.prisma.classroomReply.update({ where: { id }, data: { hiddenAt: new Date() } });
    await this.record(user, 'reply.hide', id, 'Şərh');
    return { ok: true };
  }

  async teacherDesk(user: AuthUser): Promise<ClassroomTeacherDeskDto> {
    const ids = await this.access.instructorGroupIds(user);
    if (ids !== null && !ids.length && user.role !== 'TEACHER') throw academyForbidden();
    const groupWhere: Prisma.AcademyGroupWhereInput = {
      ...(ids ? { id: { in: ids } } : {}),
      status: { in: ['PLANNED', 'ACTIVE'] },
    };
    const now = new Date();
    const [sessions, submissions, questions] = await Promise.all([
      this.prisma.academyClassSession.findMany({
        where: {
          group: groupWhere,
          status: { not: 'CANCELLED' },
          endsAt: { gte: now },
          startsAt: { lte: new Date(+now + 7 * 86400_000) },
        },
        orderBy: { startsAt: 'asc' },
        take: 8,
        include: { group: { select: { code: true, timezone: true } } },
      }),
      this.prisma.academySubmission.findMany({
        where: { assignment: { group: groupWhere }, attempts: { some: {} } },
        include: {
          student: { select: { name: true } },
          assignment: { select: { id: true, title: true, group: { select: { code: true } } } },
          attempts: {
            orderBy: { attemptNumber: 'desc' },
            take: 1,
            select: { id: true, attemptNumber: true, submittedAt: true },
          },
          grade: { select: { status: true, gradedAt: true, gradedById: true, updatedAt: true } },
        },
      }),
      this.prisma.classroomQuestion.findMany({
        where: { group: groupWhere, resolvedAt: null, archivedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          group: { select: { code: true } },
          replies: {
            where: { hiddenAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { isStaff: true },
          },
          _count: { select: { replies: { where: { hiddenAt: null } } } },
        },
      }),
    ]);
    const waiting = questions.filter((q) => !q.replies[0]?.isStaff);
    const review = submissions
      .filter((s) => needsReview(s.attempts, s.grade) || s.grade?.status === 'DRAFT')
      .sort((a, b) => +a.attempts[0]!.submittedAt - +b.attempts[0]!.submittedAt);
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        groupCode: s.group.code,
        timezone: s.group.timezone,
        meetingUrl: s.meetingUrl,
      })),
      reviews: review.slice(0, 12).map((s) => ({
        submissionId: s.id,
        assignmentId: s.assignment.id,
        title: s.assignment.title,
        studentName: s.student.name,
        groupCode: s.assignment.group.code,
        submittedAt: s.attempts[0]!.submittedAt.toISOString(),
        attemptNumber: s.attempts[0]!.attemptNumber,
      })),
      questions: waiting.slice(0, 10).map((q) => ({
        id: q.id,
        groupId: q.groupId,
        assignmentId: q.assignmentId,
        title: q.title,
        body: q.body,
        isPrivate: q.isPrivate,
        resolvedAt: null,
        authorName: q.authorName,
        createdAt: q.createdAt.toISOString(),
        replyCount: q._count.replies,
        canResolve: true,
        groupCode: q.group.code,
      })),
      reviewCount: review.length,
      questionCount: waiting.length,
    };
  }

  /** Row claims keep scheduled notifications idempotent across API workers. Visibility uses server time. */
  async publishDue(now = new Date()) {
    for (const kind of ['lesson', 'announcement'] as const) {
      const where = {
        isPublished: true,
        publishAt: { lte: now },
        archivedAt: null,
        notifiedAt: null,
        group: { status: { in: ['PLANNED', 'ACTIVE'] as Array<'PLANNED' | 'ACTIVE'> } },
        ...(kind === 'lesson' ? { topic: { archivedAt: null } } : {}),
      };
      const items =
        kind === 'lesson'
          ? await this.prisma.classroomLesson.findMany({ where, take: 100 })
          : await this.prisma.classroomAnnouncement.findMany({ where, take: 100 });
      for (const item of items) {
        await this.prisma.$transaction(async (tx) => {
          const args = {
            where: { id: item.id, version: item.version, notifiedAt: null },
            data: { notifiedAt: now, updatedAt: item.updatedAt },
          };
          const claimed =
            kind === 'lesson'
              ? await tx.classroomLesson.updateMany(args)
              : await tx.classroomAnnouncement.updateMany(args);
          if (claimed.count)
            await emitAcademyEvent(tx, {
              type: 'CLASSROOM_PUBLISHED',
              kind,
              id: item.id,
              version: item.version,
            });
        });
      }
    }
  }
}
