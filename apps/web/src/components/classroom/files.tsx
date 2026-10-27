'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, FileText, Upload } from 'lucide-react';
import type { AcademyFileDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ClassroomAction } from './actions';

export function ClassroomFiles({
  id,
  kind,
  files,
  canManage,
  compact = false,
}: {
  id: string;
  kind: 'lesson' | 'announcement';
  files: AcademyFileDto[];
  canManage: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      await api(
        `/academy/classroom/${kind === 'lesson' ? 'lessons' : 'announcements'}/${id}/files`,
        { method: 'POST', body },
      );
      router.refresh();
      toast.success(t('classroom.saved'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  if (compact && !canManage && !files.length) return null;
  return (
    <section className={compact ? 'cr-post-files' : 'cr-card'}>
      <div className="cr-section-head">
        {compact ? (
          <span className="text-xs text-muted">{t('classroom.files')}</span>
        ) : (
          <div>
            <h2>{t('classroom.files')}</h2>
            <p>{t('classroom.fileHint')}</p>
          </div>
        )}
        {canManage ? (
          <>
            <input
              ref={input}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('classroom.addFile')}
              onChange={(e) => void upload(e.target.files?.[0])}
              accept=".pdf,.csv,.txt,.md,.py,.sql,.ipynb,.json,.zip,.xlsx,.docx,.pptx,.png,.jpg,.jpeg"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy}
              disabled={files.length >= 20}
              onClick={() => input.current?.click()}
            >
              <Upload className="size-4" />
              {t('classroom.addFile')}
            </Button>
          </>
        ) : null}
      </div>
      <ul className="cr-files">
        {files.map((f) => (
          <li key={f.id}>
            <span className="cr-list-icon">
              <FileText aria-hidden />
            </span>
            <a href={`/api/academy/classroom/files/${f.id}`} className="flex-1 min-w-0">
              <b>{f.filename}</b>
              <small>{Math.max(1, Math.ceil(f.sizeBytes / 1024))} KB</small>
            </a>
            <a
              href={`/api/academy/classroom/files/${f.id}`}
              className="iconbtn"
              aria-label={`${t('classroom.download')}: ${f.filename}`}
            >
              <Download className="size-4" />
            </a>
            {canManage ? (
              <ClassroomAction path={`/academy/classroom/files/${f.id}/hide`} confirm="file">
                {t('classroom.hideFile')}
              </ClassroomAction>
            ) : null}
          </li>
        ))}
      </ul>
      {!compact && !files.length ? (
        <p className="cr-empty-small">{t('classroom.emptyFiles')}</p>
      ) : null}
    </section>
  );
}
