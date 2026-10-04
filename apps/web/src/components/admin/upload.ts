import { t } from '@/lib/i18n';
import type { AssetDto, AssetKind } from '@dacy/shared';
import { ApiError, api, tryRefresh } from '@/lib/api/client';

/** POST /admin/courses/:id/assets (multipart) */
export async function uploadAsset(
  courseId: string,
  file: File,
  kind: AssetKind,
  opts: { path?: string; replace?: boolean } = {},
): Promise<AssetDto> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  if (opts.path) fd.append('path', opts.path);
  return api<AssetDto>(`/admin/courses/${courseId}/assets${opts.replace ? '?replace=1' : ''}`, {
    method: 'POST',
    body: fd,
  });
}

/** path → url xəritəsi (Markdown önizləməsi üçün) */
export const assetMapOf = (assets: AssetDto[]): Record<string, string> =>
  Object.fromEntries(assets.map((a) => [a.path, a.url]));

export const upsertAsset = (assets: AssetDto[], a: AssetDto): AssetDto[] =>
  [...assets.filter((x) => x.id !== a.id && x.path !== a.path), a].sort((x, y) =>
    x.path.localeCompare(y.path),
  );

/**
 * Video dərs: böyük fayl ayrıca endpoint-ə (diskə axınla yazılır, MAX_VIDEO_MB) — irəliləyiş faizi ilə.
 * fetch yükləmə irəliləyişini vermir, ona görə XMLHttpRequest.
 */
export async function uploadVideo(
  courseId: string,
  file: File,
  opts: { path?: string; replace?: boolean; onProgress?: (pct: number) => void } = {},
  retry = true,
): Promise<AssetDto> {
  const fd = new FormData();
  fd.append('file', file);
  if (opts.path) fd.append('path', opts.path);
  const url = `/api/admin/courses/${courseId}/videos${opts.replace ? '?replace=1' : ''}`;
  const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', t('admin.uploadNetwork')));
    xhr.send(fd);
  });
  if (res.status === 401 && retry && (await tryRefresh()))
    return uploadVideo(courseId, file, opts, false);
  const data = (() => {
    try {
      return JSON.parse(res.body || 'null') as unknown;
    } catch {
      return null;
    }
  })();
  if (res.status >= 400) {
    const e = (data ?? {}) as { code?: string; message?: string };
    const msg = res.status === 413 ? t('admin.uploadTooBig') : e.message;
    throw new ApiError(res.status, e.code ?? 'HTTP_ERROR', msg ?? t('admin.uploadFailed'));
  }
  return data as AssetDto;
}
