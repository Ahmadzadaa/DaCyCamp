import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import type { AssetKind } from '@dacy/shared';
import { storageDir } from '../config/env';

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']);
const VIDEO = new Set(['mp4', 'webm', 'mov', 'm4v']);
const DATASET = new Set(['csv', 'tsv', 'sqlite', 'db', 'sql', 'parquet', 'json', 'xlsx']);

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'fayl';
  return base.replace(/[^\w.\-əğıöşüçƏĞİÖŞÜÇ ]+/gu, '_').slice(0, 150) || 'fayl';
}

/** Yol prefiksinə və uzantıya görə növ */
export function detectKind(path: string, mime = ''): AssetKind {
  const ext = extname(path).slice(1).toLowerCase();
  if (path.startsWith('checks/')) return 'CHECK_SCRIPT';
  if (path.startsWith('datasets/')) return 'DATASET';
  if (IMAGE.has(ext) || mime.startsWith('image/')) return 'IMAGE';
  if (VIDEO.has(ext) || mime.startsWith('video/')) return 'VIDEO';
  if (ext === 'pdf' || mime === 'application/pdf') return 'PDF';
  if (DATASET.has(ext)) return 'DATASET';
  if (ext === 'sh' || (ext === 'py' && path.includes('check'))) return 'CHECK_SCRIPT';
  return 'ATTACHMENT';
}

export function defaultFolder(kind: AssetKind): string {
  switch (kind) {
    case 'IMAGE':
      return 'images';
    case 'VIDEO':
      return 'videos';
    case 'PDF':
      return 'files';
    case 'DATASET':
      return 'datasets';
    case 'CHECK_SCRIPT':
      return 'checks';
    default:
      return 'files';
  }
}

export function normalizeAssetPath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/(^|\/)\.\.(\/|$)/g, '$1');
}

export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

export async function saveToStorage(
  courseId: string,
  filename: string,
  buf: Buffer,
): Promise<string> {
  const key = `${courseId}/${randomUUID()}-${safeFilename(filename)}`;
  const full = join(storageDir, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buf);
  return key;
}

export const storagePath = (key: string) => join(storageDir, key);

export async function removeFromStorage(key: string) {
  await rm(storagePath(key), { force: true });
}

export async function storageExists(key: string) {
  try {
    await stat(storagePath(key));
    return true;
  } catch {
    return false;
  }
}
