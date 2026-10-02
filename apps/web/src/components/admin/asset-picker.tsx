'use client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import type { AssetDto, AssetKind } from '@dacy/shared';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { uploadAsset } from './upload';

/** Kursun fayllarından seçim (+ yerindəcə yükləmə). multiple=false → tək seçim */
export function AssetPicker({
  assets,
  value,
  onChange,
  kinds,
  folder,
  uploadKind,
  courseId,
  onAssetUploaded,
  multiple = true,
  emptyText,
}: {
  assets: AssetDto[];
  value: string[];
  onChange: (paths: string[]) => void;
  kinds?: AssetKind[];
  folder: string;
  uploadKind: AssetKind;
  courseId: string;
  onAssetUploaded: (a: AssetDto) => void;
  multiple?: boolean;
  emptyText?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const list = assets.filter((a) => !kinds || kinds.includes(a.kind));
  const toggle = (path: string) => {
    if (!multiple) return onChange(value.includes(path) ? [] : [path]);
    onChange(value.includes(path) ? value.filter((p) => p !== path) : [...value, path]);
  };
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const a = await uploadAsset(courseId, file, uploadKind, {
        path: `${folder}/${file.name}`,
        replace: true,
      });
      onAssetUploaded(a);
      onChange(multiple ? [...value.filter((p) => p !== a.path), a.path] : [a.path]);
      toast.success(t('admin.assetUploaded', { path: a.path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {list.length === 0 ? (
        <p className="text-xs text-muted">{emptyText ?? t('admin.noAssets')}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {list.map((a) => {
          const on = value.includes(a.path);
          return (
            <button
              key={a.id}
              type="button"
              className={cn('chip font-mono text-xs', on && 'on')}
              onClick={() => toggle(a.path)}
              aria-pressed={on}
              title={`${a.kind} · ${(a.sizeBytes / 1024).toFixed(1)} KB`}
            >
              {a.path}
            </button>
          );
        })}
      </div>
      <div>
        <input ref={input} type="file" className="hidden" onChange={onFile} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={busy}
          onClick={() => input.current?.click()}
        >
          <Upload className="size-4" />
          {t('admin.uploadTo', { dir: folder })}
        </Button>
      </div>
    </div>
  );
}
