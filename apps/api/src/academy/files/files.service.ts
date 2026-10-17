import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import {
  ACADEMY_DEFAULTS,
  ACADEMY_FILE_TYPES,
  evaluateSubmissionWindow,
  groupAcceptsSubmissions,
  type AcademyAssignmentStatus,
  type AcademyFileDto,
  type AcademyFileExtension,
} from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthUser } from '../../common/decorators';
import { conflict, notFound, unprocessable } from '../../common/errors';
import { removeFromStorage, safeFilename, sha256, storagePath } from '../../assets/storage';
import { AcademyAccessService, academyForbidden } from '../access/academy-access.service';
import { fileDto, STUDENT_VISIBLE } from '../assignments/assignments.service';

export interface UploadedBlob {
  buffer: Buffer;
  filename: string;
}

const READ_ONLY: AcademyAssignmentStatus[] = ['ARCHIVED', 'CANCELLED'];
const MAX_RESOURCES = 20;
const TEXT_TYPES: ReadonlySet<AcademyFileExtension> = new Set(['csv', 'txt', 'md', 'py', 'sql', 'json', 'ipynb']);
const ZIP_TYPES: ReadonlySet<AcademyFileExtension> = new Set(['zip', 'docx', 'xlsx', 'pptx']);

const startsWith = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

/**
 * Məzmun uzantıya uyğundurmu: ikili növlərdə sehrli baytlar, mətn növlərində etibarlı UTF-8 və NUL baytı yoxdur,
 * JSON / ipynb həqiqətən JSON-dur. Müştərinin göndərdiyi MIME növünə etibar edilmir.
 */
export function contentMatches(ext: AcademyFileExtension, buf: Buffer): boolean {
  if (ext === 'pdf') return startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (ext === 'png') return startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === 'jpg' || ext === 'jpeg') return startsWith(buf, [0xff, 0xd8, 0xff]);
  if (ZIP_TYPES.has(ext)) return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buf, [0x50, 0x4b, 0x05, 0x06]);
  if (!TEXT_TYPES.has(ext)) return false;
  if (buf.includes(0)) return false;
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return false;
  }
  if (ext === 'json' || ext === 'ipynb') {
    try {
      const v: unknown = JSON.parse(text.replace(/^﻿/, ''));
      return ext === 'json' || (typeof v === 'object' && v !== null && !Array.isArray(v));
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Akademiya faylları. Daxili açar generasiya olunur (istifadəçinin fayl adı yolda yoxdur), fayl yalnız
 * icazə yoxlamasından sonra endirilir. Tələbə faylı əvvəlcə STAGED yüklənir, göndərişdə cəhdə bağlanır
 * (ATTACHED — bundan sonra silinmir); bağlanmamış köhnə fayllar təmizləmə işi ilə silinir.
 */
@Injectable()
export class AcademyFilesService {
  private readonly log = new Logger('AcademyFiles');

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AcademyAccessService,
    private readonly audit: AuditService,
  ) {}

  /** Uzantı və məzmun yoxlanılır; MIME növü uzantıdan təyin olunur */
  private validate(blob: UploadedBlob): { ext: AcademyFileExtension; mime: string; filename: string } {
    const filename = safeFilename(blob.filename);
    const ext = extname(filename).slice(1).toLowerCase() as AcademyFileExtension;
    if (!Object.hasOwn(ACADEMY_FILE_TYPES, ext))
      throw unprocessable('ACADEMY_FILE_TYPE', 'Bu fayl növü qəbul edilmir', { allowed: Object.keys(ACADEMY_FILE_TYPES) });
    if (blob.buffer.length === 0) throw unprocessable('ACADEMY_FILE_EMPTY', 'Fayl boşdur');
    if (!contentMatches(ext, blob.buffer))
      throw unprocessable('ACADEMY_FILE_CONTENT', 'Faylın məzmunu uzantısına uyğun deyil');
    return { ext, mime: ACADEMY_FILE_TYPES[ext], filename };
  }

  private async store(folder: string, ext: string, buf: Buffer): Promise<string> {
    const key = `academy/${folder}/${randomUUID()}.${ext}`;
    const full = storagePath(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, buf);
    return key;
  }

  // ───────────────────────── tələbə: müvəqqəti yükləmə

  /** Göndəriş üçün fayl: yalnız ACTIVE yazılış, açıq tapşırıq, FILE elementi olan tapşırıq */
  async stageSubmissionFile(user: AuthUser, assignmentId: string, blob: UploadedBlob): Promise<AcademyFileDto> {
    const a = await this.prisma.academyAssignment.findUnique({
      where: { id: assignmentId },
      include: { group: { select: { status: true } }, items: { where: { kind: 'FILE' }, select: { id: true } } },
    });
    if (!a) throw notFound('ACADEMY_ASSIGNMENT_NOT_FOUND', 'Tapşırıq tapılmadı');
    const enr = await this.prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: a.groupId, studentId: user.id } },
      select: { status: true },
    });
    if (enr?.status !== 'ACTIVE' || !STUDENT_VISIBLE.includes(a.status)) throw academyForbidden();
    if (a.status !== 'PUBLISHED') throw conflict('ACADEMY_ASSIGNMENT_CLOSED', 'Tapşırıq bağlıdır');
    if (!groupAcceptsSubmissions(a.group.status)) throw conflict('ACADEMY_GROUP_CLOSED', 'Qrup göndəriş qəbul etmir');
    if (!a.items.length) throw unprocessable('ACADEMY_FILES_NOT_ACCEPTED', 'Bu tapşırıq fayl qəbul etmir');
    const ext = await this.prisma.academyAssignmentExtension.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      select: { extendedDueAt: true },
    });
    const w = evaluateSubmissionWindow({
      now: new Date(),
      availableAt: a.availableAt,
      dueAt: a.dueAt,
      extendedDueAt: ext?.extendedDueAt ?? null,
      latePolicy: a.latePolicy,
      lateCutoffAt: a.lateCutoffAt,
    });
    if (!w.allowed) throw conflict(`ACADEMY_${w.reason}`, 'Göndəriş pəncərəsi bağlıdır');
    const staged = await this.prisma.academyFile.count({ where: { ownerId: user.id, status: 'STAGED' } });
    if (staged >= ACADEMY_DEFAULTS.maxStagedFiles)
      throw conflict('ACADEMY_TOO_MANY_FILES', 'Göndərilməmiş fayl çoxdur — əvvəlcə göndərin və ya silin');

    const v = this.validate(blob);
    const key = await this.store(`submissions/${assignmentId}`, v.ext, blob.buffer);
    try {
      const f = await this.prisma.academyFile.create({
        data: {
          purpose: 'SUBMISSION',
          status: 'STAGED',
          assignmentId,
          ownerId: user.id,
          storageKey: key,
          originalFilename: v.filename,
          sizeBytes: blob.buffer.length,
          mimeType: v.mime,
          sha256: sha256(blob.buffer),
        },
      });
      return fileDto(f);
    } catch (e) {
      await removeFromStorage(key).catch(() => undefined);
      throw e;
    }
  }

  /** Öz müvəqqəti faylını silmək (göndərişə bağlanmış fayl silinmir) */
  async deleteStaged(user: AuthUser, fileId: string): Promise<{ ok: true }> {
    const f = await this.prisma.academyFile.findUnique({ where: { id: fileId } });
    if (!f || f.ownerId !== user.id || f.status !== 'STAGED' || f.purpose !== 'SUBMISSION')
      throw notFound('ACADEMY_FILE_NOT_FOUND', 'Fayl tapılmadı');
    const del = await this.prisma.academyFile.deleteMany({ where: { id: fileId, status: 'STAGED' } });
    if (del.count) await removeFromStorage(f.storageKey).catch(() => undefined);
    return { ok: true };
  }

  listStaged(userId: string, assignmentId: string) {
    return this.prisma.academyFile
      .findMany({
        where: { ownerId: userId, assignmentId, purpose: 'SUBMISSION', status: 'STAGED' },
        orderBy: { createdAt: 'asc' },
      })
      .then((rows) => rows.map(fileDto));
  }

  // ───────────────────────── müəllim: tapşırıq resursları

  private async resourceAccess(user: AuthUser, assignmentId: string) {
    const { assignment, access } = await this.access.assignmentAccess(user, assignmentId);
    const need = assignment.status === 'DRAFT' ? 'assignment.editDraft' : 'assignment.editPublished';
    if (!this.access.can(access, need)) throw academyForbidden();
    if (READ_ONLY.includes(assignment.status))
      throw conflict('ACADEMY_ASSIGNMENT_READ_ONLY', 'Arxivləşdirilmiş / ləğv olunmuş tapşırıq dəyişdirilmir');
    return { assignment, access };
  }

  async addResource(user: AuthUser, assignmentId: string, blob: UploadedBlob): Promise<AcademyFileDto> {
    const { access } = await this.resourceAccess(user, assignmentId);
    const count = await this.prisma.academyFile.count({ where: { assignmentId, purpose: 'ASSIGNMENT_RESOURCE' } });
    if (count >= MAX_RESOURCES) throw conflict('ACADEMY_TOO_MANY_FILES', `Ən çox ${MAX_RESOURCES} resurs`);
    const v = this.validate(blob);
    const key = await this.store(`resources/${assignmentId}`, v.ext, blob.buffer);
    let f;
    try {
      f = await this.prisma.academyFile.create({
        data: {
          purpose: 'ASSIGNMENT_RESOURCE',
          status: 'ATTACHED',
          assignmentId,
          ownerId: user.id,
          storageKey: key,
          originalFilename: v.filename,
          sizeBytes: blob.buffer.length,
          mimeType: v.mime,
          sha256: sha256(blob.buffer),
          attachedAt: new Date(),
        },
      });
    } catch (e) {
      await removeFromStorage(key).catch(() => undefined);
      throw e;
    }
    await this.audit.record(user, {
      action: 'academy.assignment.resource.add',
      entityType: 'ACADEMY',
      entityId: assignmentId,
      entityTitle: `${access.group.code} · ${v.filename}`,
      details: { fileId: f.id, sizeBytes: f.sizeBytes },
    });
    return fileDto(f);
  }

  async removeResource(user: AuthUser, assignmentId: string, fileId: string): Promise<{ ok: true }> {
    const { access } = await this.resourceAccess(user, assignmentId);
    const f = await this.prisma.academyFile.findFirst({
      where: { id: fileId, assignmentId, purpose: 'ASSIGNMENT_RESOURCE' },
    });
    if (!f) throw notFound('ACADEMY_FILE_NOT_FOUND', 'Fayl tapılmadı');
    await this.prisma.academyFile.delete({ where: { id: f.id } });
    await removeFromStorage(f.storageKey).catch(() => undefined);
    await this.audit.record(user, {
      action: 'academy.assignment.resource.remove',
      entityType: 'ACADEMY',
      entityId: assignmentId,
      entityTitle: `${access.group.code} · ${f.originalFilename}`,
      details: { fileId: f.id },
    });
    return { ok: true };
  }

  // ───────────────────────── endirmə

  /**
   * Endirmə icazəsi. Resurs: qrupun heyəti və ya tapşırığı görən tələbə. Göndəriş faylı: sahibi (müvəqqəti fayl —
   * yalnız sahibi) və ya qrupda göndərişləri yoxlamaq hüququ olan heyət. Başqa qrupun faylı — 403.
   */
  async authorizeDownload(user: AuthUser, fileId: string) {
    const f = await this.prisma.academyFile.findUnique({
      where: { id: fileId },
      include: { assignment: { select: { groupId: true, status: true } } },
    });
    if (!f || !f.assignment) throw notFound('ACADEMY_FILE_NOT_FOUND', 'Fayl tapılmadı');
    const isOwner = f.ownerId === user.id;
    let allowed = false;
    if (f.purpose === 'SUBMISSION') {
      if (isOwner) allowed = true;
      else if (f.status === 'ATTACHED') {
        const a = await this.access.groupAccess(user, f.assignment.groupId);
        allowed = this.access.can(a, 'submission.review');
      }
    } else {
      const a = await this.access.groupAccess(user, f.assignment.groupId);
      allowed =
        this.access.can(a, 'assignment.viewAll') ||
        (this.access.can(a, 'group.view') && STUDENT_VISIBLE.includes(f.assignment.status));
    }
    if (!allowed) throw academyForbidden();
    return { path: storagePath(f.storageKey), filename: f.originalFilename, mime: f.mimeType };
  }

  // ───────────────────────── təmizləmə (işçi)

  /**
   * Müddəti keçmiş müvəqqəti faylları silir. Açıq (PUBLISHED) tapşırığın qaralamasında istinad olunan fayl saxlanılır.
   */
  async cleanupStaged(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ACADEMY_DEFAULTS.stagedFileTtlHours * 3_600_000);
    const old = await this.prisma.academyFile.findMany({
      where: { status: 'STAGED', createdAt: { lt: cutoff } },
      select: { id: true, storageKey: true, ownerId: true, assignmentId: true },
      take: 500,
    });
    if (!old.length) return 0;
    const drafts = await this.prisma.academySubmissionDraft.findMany({
      where: {
        studentId: { in: [...new Set(old.map((f) => f.ownerId).filter((x): x is string => !!x))] },
        assignmentId: { in: [...new Set(old.map((f) => f.assignmentId).filter((x): x is string => !!x))] },
        assignment: { status: 'PUBLISHED' },
      },
      select: { answers: true },
    });
    const kept = new Set<string>();
    for (const d of drafts)
      for (const a of (d.answers as Array<{ fileIds?: string[] }> | null) ?? []) for (const id of a.fileIds ?? []) kept.add(id);
    let removed = 0;
    for (const f of old) {
      if (kept.has(f.id)) continue;
      const del = await this.prisma.academyFile.deleteMany({ where: { id: f.id, status: 'STAGED' } });
      if (!del.count) continue;
      await removeFromStorage(f.storageKey).catch((e) => this.log.warn(`Fayl silinmədi: ${String(e)}`));
      removed++;
    }
    return removed;
  }
}
