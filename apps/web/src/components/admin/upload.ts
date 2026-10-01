import type { AssetDto, AssetKind } from '@dacy/shared';
import { api } from '@/lib/api/client';

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
