'use client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Film, Upload } from 'lucide-react';
import type { AdminModuleNode, AdminStepDto, AdminStepNode, AssetDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { uploadVideo } from '../upload';
import { stepNodeOf } from './types';

const fmtMb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 100 * 1024 * 1024 ? 0 : 1)} MB`;

/**
 * Fəslin sonuna video dərs: faylı yüklə (irəliləyiş faizi ilə) → fəslin sonunda nəzəri addım yaranır
 * (video + istəyə bağlı qısa izah) və dərhal dərc olunur. Tələbə videonu baxıb «davam et» ilə bitirir.
 */
export function AddVideoDialog({
  module,
  courseId,
  onOpenChange,
  onCreated,
  onAssetUploaded,
}: {
  module: AdminModuleNode | null;
  courseId: string;
  onOpenChange: (o: boolean) => void;
  onCreated: (moduleId: string, s: AdminStepNode) => void;
  onAssetUploaded: (a: AssetDto) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pct !== null;

  function reset() {
    setFile(null);
    setTitle('');
    setNote('');
    setPct(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!module) return;
    if (!file) return setError(t('admin.videoPick'));
    const name = title.trim() || t('admin.videoDefaultTitle', { module: module.title });
    setError(null);
    setPct(0);
    try {
      const asset = await uploadVideo(courseId, file, {
        path: `videos/${module.key}-${file.name}`,
        replace: true,
        onProgress: setPct,
      });
      onAssetUploaded(asset);
      const created = await api<AdminStepDto>(`/admin/modules/${module.id}/steps`, {
        method: 'POST',
        body: { type: 'THEORY', title: name, template: false },
      });
      const saved = await api<AdminStepDto>(`/admin/steps/${created.id}`, {
        method: 'PUT',
        body: { type: 'theory', title: name, xp: 10, content: note.trim(), video_url: asset.path },
      });
      let node = stepNodeOf(saved);
      try {
        node = stepNodeOf(
          await api<AdminStepDto>(`/admin/steps/${created.id}/publish`, {
            method: 'PATCH',
            body: { isPublished: true },
          }),
        );
        toast.success(t('admin.videoAdded'));
      } catch (err) {
        // addım itmir — qaralama kimi ağacda qalır, redaktorda düzəldilib dərc oluna bilər
        toast.error(`${t('admin.videoDraft')} ${errorMessage(err)}`);
      }
      onCreated(module.id, node);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
      setPct(null);
    }
  }

  return (
    <Dialog
      open={module !== null}
      onOpenChange={(o) => {
        if (busy) return; // yükləmə gedərkən bağlanmasın
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        title={t('admin.videoDialogTitle')}
        description={module ? t('admin.videoDialogDesc', { module: module.title }) : undefined}
        icon={<Film />}
        className="max-w-[560px]"
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
            className="hidden"
            data-testid="video-file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = '';
              setFile(f);
              setError(null);
            }}
          />
          <button
            type="button"
            className="vid-drop"
            onClick={() => input.current?.click()}
            disabled={busy}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
          >
            <Upload aria-hidden />
            {file ? (
              <span>
                <b>{file.name}</b> · {fmtMb(file.size)}
              </span>
            ) : (
              <span>{t('admin.videoDrop')}</span>
            )}
            <small>{t('admin.videoFormats')}</small>
          </button>
          <Field label={t('admin.videoTitleLabel')}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={module ? t('admin.videoDefaultTitle', { module: module.title }) : ''}
              disabled={busy}
            />
          </Field>
          <Field label={t('admin.videoNote')}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('admin.videoNotePh')}
              disabled={busy}
            />
          </Field>
          {busy ? (
            <div className="flex flex-col gap-1.5" aria-live="polite">
              <div className="nbar !mt-0 !h-2">
                <i style={{ width: `${pct}%`, background: 'var(--brand)' }} />
              </div>
              <span className="text-xs text-muted">
                {pct < 100 ? t('admin.videoUploading', { pct }) : t('admin.videoSaving')}
              </span>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" loading={busy} data-testid="video-submit">
              <Film className="size-4" />
              {t('admin.videoSubmit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
