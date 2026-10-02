'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Paperclip, Upload } from 'lucide-react';
import type { PathItemViewDto, ProjectSubmitResultDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { fmtDate } from '@/components/admin/format';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PathResultToasts } from './path-result-toasts';

type P = NonNullable<PathItemViewDto['project']>;

/** Layihə təhvili: fayllar + link + qeyd; vəziyyət (yoxlamada / qəbul / qaytarıldı) */
export function ProjectForm({
  itemId,
  project,
  preview,
}: {
  itemId: string;
  project: P;
  preview: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState(project.submission?.link ?? '');
  const [note, setNote] = useState(project.submission?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProjectSubmitResultDto | null>(null);
  const sub = project.submission;
  const q = preview ? '?preview=1' : '';

  async function submit() {
    if (!files.length && !link.trim()) {
      toast.error(t('paths.needSomething'));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      if (link.trim()) fd.append('link', link.trim());
      if (note.trim()) fd.append('note', note.trim());
      const r = await api<ProjectSubmitResultDto>(`/learn/path-items/${itemId}/project${q}`, {
        method: 'POST',
        body: fd,
      });
      setResult(r);
      toast.success(r.status === 'PASSED' ? t('paths.autoPassed') : t('paths.submittedAt'));
      setFiles([]);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const status = result?.status ?? sub?.status ?? null;
  return (
    <div className="flex flex-col gap-4">
      {sub ? (
        <div
          className={
            status === 'PASSED'
              ? 'rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm'
              : status === 'FAILED'
                ? 'rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm'
                : 'rounded-lg border border-de/40 bg-de/10 px-4 py-3 text-sm'
          }
          data-testid="project-status"
        >
          <b>
            {status === 'PASSED'
              ? `✓ ${t('paths.projectPassed')}`
              : status === 'FAILED'
                ? `✗ ${t('paths.projectFailed')}`
                : `⏳ ${t('paths.awaitingReview')}`}
          </b>
          {sub.submittedAt ? (
            <span className="ml-2 text-muted">
              {t('paths.submittedAt')}: {fmtDate(sub.submittedAt, true)}
            </span>
          ) : null}
          {sub.feedback ? (
            <p className="mt-2">
              <b>{t('paths.feedback')}:</b> {sub.feedback}
            </p>
          ) : null}
          {sub.files.length || sub.link ? (
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {sub.files.map((f) => (
                <li key={f.url}>
                  <a
                    href={f.url}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 hover:border-brand"
                  >
                    <Paperclip className="size-3" /> {f.filename} · {(f.size / 1024).toFixed(1)} KB
                  </a>
                </li>
              ))}
              {sub.link ? (
                <li>
                  <a
                    href={sub.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 hover:border-brand"
                  >
                    🔗 {sub.link}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {status !== 'PASSED' ? (
        <div className="box flex flex-col gap-3">
          {project.maxFiles > 0 ? (
            <Field label={`${t('paths.files')} · ${t('paths.maxFiles', { n: project.maxFiles })}`}>
              <input
                ref={input}
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []).slice(0, project.maxFiles))
                }
                data-testid="project-files"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => input.current?.click()}>
                  <Upload className="size-4" /> {t('paths.uploadFiles')}
                </Button>
                <span className="text-sm text-muted">
                  {files.length ? files.map((f) => f.name).join(', ') : t('paths.noFiles')}
                </span>
              </div>
            </Field>
          ) : null}
          {project.allowLink ? (
            <Field label={t('paths.link')}>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                data-testid="project-link"
              />
            </Field>
          ) : null}
          <Field label={t('paths.note')}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </Field>
          <div>
            <Button
              type="button"
              loading={busy}
              onClick={() => void submit()}
              data-testid="project-submit"
            >
              {sub ? t('paths.resubmit') : t('paths.submit')}
            </Button>
          </div>
        </div>
      ) : null}
      <PathResultToasts result={result} />
    </div>
  );
}
