import { Injectable } from '@nestjs/common';
import type { Asset } from '@prisma/client';
import type { AssetDto, AssetKind } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { conflict, notFound } from '../common/errors';
import {
  defaultFolder,
  detectKind,
  normalizeAssetPath,
  removeFromStorage,
  safeFilename,
  saveToStorage,
  sha256,
} from './storage';

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
  constructor(private readonly prisma: PrismaService) {}

  async list(courseId: string, kind?: AssetKind) {
    const rows = await this.prisma.asset.findMany({
      where: { courseId, ...(kind ? { kind } : {}) },
      orderBy: { path: 'asc' },
    });
    return rows.map(toAssetDto);
  }

  /** Faylı yaddaşa yazır və Asset sətri yaradır; eyni path varsa replace=true olmadan 409 */
  async upload(opts: {
    courseId: string;
    buffer: Buffer;
    filename: string;
    mime: string;
    path?: string;
    kind?: AssetKind;
    replace?: boolean;
    uploadedById?: string;
  }) {
    const course = await this.prisma.course.findUnique({ where: { id: opts.courseId } });
    if (!course) throw notFound();
    const filename = safeFilename(opts.filename);
    const kind = opts.kind ?? detectKind(opts.path ?? filename, opts.mime);
    const path = normalizeAssetPath(opts.path ?? `${defaultFolder(kind)}/${filename}`);
    const existing = await this.prisma.asset.findUnique({
      where: { courseId_path: { courseId: opts.courseId, path } },
    });
    if (existing && !opts.replace) throw conflict('ASSET_PATH_EXISTS', `Bu yol artıq var: ${path}`);
    const storageKey = await saveToStorage(opts.courseId, filename, opts.buffer);
    const data = {
      courseId: opts.courseId,
      path,
      kind,
      filename,
      mime: opts.mime || 'application/octet-stream',
      sizeBytes: opts.buffer.length,
      sha256: sha256(opts.buffer),
      storageKey,
      uploadedById: opts.uploadedById ?? null,
    };
    let asset: Asset;
    if (existing) {
      await removeFromStorage(existing.storageKey);
      asset = await this.prisma.asset.update({ where: { id: existing.id }, data });
    } else {
      asset = await this.prisma.asset.create({ data });
    }
    return toAssetDto(asset);
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
