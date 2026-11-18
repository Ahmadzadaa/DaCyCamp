import { t } from '@/lib/i18n';
import type { AssetDto, AssetKind } from '@dacy/shared';
import { ApiError, api, tryRefresh } from '@/lib/api/client';

/** «images/a.png» + 2 → «images/a-2.png» */
export function withPathSuffix(path: string, suffix: string | number): string {
  const slash = path.lastIndexOf('/');
  const dot = path.lastIndexOf('.');
  return dot > slash + 1
    ? `${path.slice(0, dot)}-${suffix}${path.slice(dot)}`
    : `${path}-${suffix}`;
}

/**
 * POST /admin/courses/:id/assets (multipart).
 * `replace` yalnız açıq «Əvəz et» əməliyyatı üçündür. Əks halda yol artıq varsa (409
 * ASSET_PATH_EXISTS) fayl «-2», «-3»… şəkilçisi ilə yeni yola yazılır — eyni adlı
 * (məs. image.png) başqa faylın üzərinə xəbərsiz yazılmasın.
 */
export async function uploadAsset(
  courseId: string,
  file: File,
  kind: AssetKind,
  opts: { path?: string; replace?: boolean } = {},
): Promise<AssetDto> {
  const send = (path?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    if (path) fd.append('path', path);
    return api<AssetDto>(`/admin/courses/${courseId}/assets${opts.replace ? '?replace=1' : ''}`, {
      method: 'POST',
      body: fd,
    });
  };
  if (opts.replace || !opts.path) return send(opts.path);
  for (let n = 1; ; n++) {
    try {
      return await send(n === 1 ? opts.path : withPathSuffix(opts.path, n));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ASSET_PATH_EXISTS') || n >= 50) throw e;
    }
  }
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
  // böyük faylı 409-dan sonra təkrar göndərməmək üçün yeni yükləmədə yol əvvəlcədən unikallaşdırılır
  const path =
    opts.path && !opts.replace && retry
      ? withPathSuffix(opts.path, Math.random().toString(36).slice(2, 7))
      : opts.path;
  const fd = new FormData();
  fd.append('file', file);
  if (path) fd.append('path', path);
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
    return uploadVideo(courseId, file, { ...opts, path }, false);
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
