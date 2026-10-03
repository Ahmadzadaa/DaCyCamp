import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, writeFile, rm, stat } from 'node:fs/promises';
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

/** Böyük fayl (video): müvəqqəti fayldan anbara köçürür — yaddaşa yüklənmir, heş axınla hesablanır */
export async function moveIntoStorage(
  courseId: string,
  filename: string,
  tmpPath: string,
): Promise<{ key: string; sha256: string; size: number }> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(tmpPath)) hash.update(chunk as Buffer);
  const key = `${courseId}/${randomUUID()}-${safeFilename(filename)}`;
  const full = join(storageDir, key);
  await mkdir(dirname(full), { recursive: true });
  try {
    await rename(tmpPath, full);
  } catch {
    // müvəqqəti qovluq başqa diskdədirsə
    await copyFile(tmpPath, full);
    await rm(tmpPath, { force: true });
  }
  const { size } = await stat(full);
  return { key, sha256: hash.digest('hex'), size };
}

export const storagePath = (key: string) => join(storageDir, key);
export const readFromStorage = (key: string) => readFile(storagePath(key));

/** Mövcud faylı başqa kursun qovluğuna kopyalayır (kurs surəti); yeni açarı qaytarır */
export async function copyInStorage(
  srcKey: string,
  courseId: string,
  filename: string,
): Promise<string> {
  const key = `${courseId}/${randomUUID()}-${safeFilename(filename)}`;
  const full = join(storageDir, key);
  await mkdir(dirname(full), { recursive: true });
  await copyFile(storagePath(srcKey), full);
  return key;
}

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
