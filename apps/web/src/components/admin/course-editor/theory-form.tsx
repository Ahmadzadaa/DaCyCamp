'use client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Video } from 'lucide-react';
import type { AssetDto } from '@dacy/shared';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Markdown } from '@/components/app/markdown';
import { VideoEmbed } from '@/components/app/video-embed';
import { assetMapOf, uploadAsset } from '../upload';

export interface TheoryValues {
  content: string;
  video_url: string;
}

export function TheoryForm({
  values,
  onChange,
  courseId,
  assets,
  onAssetUploaded,
}: {
  values: TheoryValues;
  onChange: (v: TheoryValues) => void;
  courseId: string;
  assets: AssetDto[];
  onAssetUploaded: (a: AssetDto) => void;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const assetMap = assetMapOf(assets);

  function insertAtCursor(text: string) {
    const el = ta.current;
    const cur = values.content;
    if (!el) return onChange({ ...values, content: `${cur}\n${text}\n` });
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    const next = `${cur.slice(0, start)}${text}${cur.slice(end)}`;
    onChange({ ...values, content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  }

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('img');
    try {
      const a = await uploadAsset(courseId, file, 'IMAGE', {
        path: `images/${file.name}`,
        replace: true,
      });
      onAssetUploaded(a);
      insertAtCursor(`![${a.filename}](${a.path})`);
      toast.success(t('admin.assetUploaded', { path: a.path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('vid');
    try {
      const a = await uploadAsset(courseId, file, 'VIDEO', {
        path: `videos/${file.name}`,
        replace: true,
      });
      onAssetUploaded(a);
      onChange({ ...values, video_url: a.path });
      toast.success(t('admin.assetUploaded', { path: a.path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Field label={t('admin.videoUrl')} full>
        <div className="flex gap-2">
          <Input
            value={values.video_url}
            onChange={(e) => onChange({ ...values, video_url: e.target.value })}
            placeholder="https://youtu.be/… və ya videos/fayl.mp4"
          />
          <input
            ref={vidInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onVideo}
          />
          <Button
            type="button"
            variant="ghost"
            loading={busy === 'vid'}
            onClick={() => vidInput.current?.click()}
          >
            <Video className="size-4" />
            {t('admin.uploadVideo')}
          </Button>
        </div>
      </Field>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <div className="fld">
          <div className="flex items-center justify-between">
            <span className="lbl">{t('admin.content')}</span>
            <input
              ref={imgInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImage}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy === 'img'}
              onClick={() => imgInput.current?.click()}
            >
              <ImagePlus className="size-4" />
              {t('admin.insertImage')}
            </Button>
          </div>
          <Textarea
            ref={ta}
            code
            value={values.content}
            onChange={(e) => onChange({ ...values, content: e.target.value })}
            className="min-h-[360px] whitespace-pre-wrap"
          />
        </div>
        <div className="fld">
          <span className="lbl">{t('admin.livePreview')}</span>
          <div className="box min-h-[360px] overflow-auto">
            {values.video_url ? (
              <div className="mb-4">
                <VideoEmbed url={values.video_url} assetMap={assetMap} />
              </div>
            ) : null}
            <Markdown content={values.content} assetMap={assetMap} />
          </div>
        </div>
      </div>
    </>
  );
}
