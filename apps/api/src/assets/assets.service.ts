import { Injectable } from '@nestjs/common';
import type { Asset } from '@prisma/client';
import type { AssetDto, AssetKind } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SqlCheckService } from '../sql-check/sql-check.service';
import { ProgressService } from '../progress/progress.service';
import { conflict, notFound } from '../common/errors';
import {
  defaultFolder,
  detectKind,
  normalizeAssetPath,
  removeFromStorage,
  safeFilename,
  saveToStorage,
  moveIntoStorage,
  sha256,
} from './storage';

interface AssetUploadMeta {
  courseId: string;
  filename: string;
  mime: string;
  path?: string;
  kind?: AssetKind;
  replace?: boolean;
  uploadedById?: string;
}

export const assetUrl = (a: { id: string; filename: string }) =>
  `/api/assets/${a.id}/${encodeURIComponent(a.filename)}`;
export const toAssetDto = (a: Asset): AssetDto => ({
  id: a.id,
  courseId: a.courseId,
  path: a.path,
  kind: a.kind,
  filename: a.filename,
  mime: a.mime,
  sizeBytes: a.sizeBytes,
  url: assetUrl(a),
  createdAt: a.createdAt.toISOString(),
});

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqlCheck: SqlCheckService,
    private readonly progress: ProgressService,
  ) {}

  async list(courseId: string, kind?: AssetKind) {
    const rows = await this.prisma.asset.findMany({
      where: { courseId, ...(kind ? { kind } : {}) },
      orderBy: { path: 'asc' },
    });
    return rows.map(toAssetDto);
  }

  /** Faylı yaddaşa yazır və Asset sətri yaradır; eyni path varsa replace=true olmadan 409 */
  async upload(opts: AssetUploadMeta & { buffer: Buffer }) {
    const buf = opts.buffer;
    return this.persist(opts, async (filename) => ({
      key: await saveToStorage(opts.courseId, filename, buf),
      sha256: sha256(buf),
      size: buf.length,
    }));
  }

  /** Böyük fayl (video) diskdəki müvəqqəti fayldan — yaddaşa yüklənmir */
  async uploadFile(opts: AssetUploadMeta & { tmpPath: string }) {
    return this.persist(opts, (filename) => moveIntoStorage(opts.courseId, filename, opts.tmpPath));
  }

  private async persist(
    opts: AssetUploadMeta,
    store: (filename: string) => Promise<{ key: string; sha256: string; size: number }>,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: opts.courseId } });
    if (!course) throw notFound();
    const filename = safeFilename(opts.filename);
    const kind = opts.kind ?? detectKind(opts.path ?? filename, opts.mime);
    const path = normalizeAssetPath(opts.path ?? `${defaultFolder(kind)}/${filename}`);
    const existing = await this.prisma.asset.findUnique({
      where: { courseId_path: { courseId: opts.courseId, path } },
    });
    if (existing && !opts.replace) throw conflict('ASSET_PATH_EXISTS', `Bu yol artıq var: ${path}`);
    const stored = await store(filename);
    const storageKey = stored.key;
    const data = {
      courseId: opts.courseId,
      path,
      kind,
      filename,
      mime: opts.mime || 'application/octet-stream',
      sizeBytes: stored.size,
      sha256: stored.sha256,
      storageKey,
      uploadedById: opts.uploadedById ?? null,
    };
    let asset: Asset;
    if (existing) {
      // əvvəl baza, sonra köhnə fayl: yeniləmə uğursuz olsa sətir hələ mövcud fayla işarə edir
      asset = await this.prisma.asset.update({ where: { id: existing.id }, data });
      await removeFromStorage(existing.storageKey).catch(() => undefined);
      if (existing.sha256 !== stored.sha256) await this.refreshSqlExpected(opts.courseId, path);
    } else {
      asset = await this.prisma.asset.create({ data });
    }
    return toAssetDto(asset);
  }

  /**
   * Dataset dəyişəndə həmin faylı istifadə edən dərc olunmuş SQL addımlarının gözlənilən
   * nəticəsi yenidən hesablanır — əks halda keşdə köhnə nəticə qalır və düzgün həllər səhv sayılır.
   * Hesablanmayan addım ZIP idxalında olduğu kimi qaralamaya keçirilir.
   */
  private async refreshSqlExpected(courseId: string, path: string) {
    const steps = await this.prisma.step.findMany({
      where: { type: 'SQL', isPublished: true, module: { courseId } },
      select: { id: true, config: true },
    });
    let unpublished = false;
    for (const s of steps) {
      const ds = (s.config as { dataset?: unknown } | null)?.dataset;
      if (!Array.isArray(ds) || !ds.includes(path)) continue;
      try {
        await this.sqlCheck.computeAndStore(s.id);
      } catch {
        await this.prisma.step.update({ where: { id: s.id }, data: { isPublished: false } });
        unpublished = true;
      }
    }
    if (unpublished) await this.progress.recomputeCourse(courseId);
  }

  async remove(id: string) {
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: { course: { select: { coverAssetId: true } } },
    });
    if (!a) throw notFound();
    if (a.course.coverAssetId === id) throw conflict('ASSET_IN_USE', 'Bu fayl kursun üz şəklidir');
    // addım təriflərində istinad varmı?
    const steps = await this.prisma.step.findMany({
      where: { module: { courseId: a.courseId } },
      select: { config: true, secret: true },
    });
    const needle = `"${a.path}"`;
    for (const s of steps) {
      if (
        JSON.stringify(s.config).includes(needle) ||
        (s.secret && JSON.stringify(s.secret).includes(needle))
      ) {
        throw conflict('ASSET_IN_USE', 'Bu fayl addımlarda istifadə olunur');
      }
    }
    await this.prisma.asset.delete({ where: { id } });
    await removeFromStorage(a.storageKey);
    return { ok: true };
  }

  async pathsOfCourse(courseId: string): Promise<Set<string>> {
    const rows = await this.prisma.asset.findMany({ where: { courseId }, select: { path: true } });
    return new Set(rows.map((r) => r.path));
  }

  /** path → url xəritəsi (tələbə görünüşü üçün) */
  async resolverFor(courseId: string) {
    const rows = await this.prisma.asset.findMany({ where: { courseId } });
    const map = new Map(rows.map((r) => [r.path, r]));
    const resolve = (path: string) => {
      const a = map.get(path);
      return a ? { path, url: assetUrl(a), filename: a.filename, size_bytes: a.sizeBytes } : null;
    };
    const assetMap: Record<string, string> = {};
    for (const r of rows) assetMap[r.path] = assetUrl(r);
    return Object.assign(resolve, { assetMap });
  }
}
