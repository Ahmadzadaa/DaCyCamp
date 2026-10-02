'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileArchive, Upload } from 'lucide-react';
import type { CourseImportDto, ImportReport, StepType } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fmtDate } from './format';

export function ImportPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<'validate' | 'apply' | null>(null);
  const [over, setOver] = useState(false);
  const [history, setHistory] = useState<CourseImportDto[]>([]);

  const loadHistory = () =>
    api<CourseImportDto[]>('/admin/imports')
      .then(setHistory)
      .catch(() => null);
  useEffect(() => {
    void loadHistory();
  }, []);

  async function send(kind: 'validate' | 'apply') {
    if (!file) return;
    setBusy(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api<ImportReport>(`/admin/import/${kind}`, { method: 'POST', body: fd });
      setReport(r);
      if (kind === 'apply' && r.ok) {
        toast.success(t('admin.importApplied'));
        void loadHistory();
      } else if (!r.ok) toast.error(t('admin.importFailed'));
      else toast.success(t('admin.importOk'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setReport(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">{t('admin.importTitle')}</h1>
        <p className="mt-1 text-sm text-muted">
          {t('admin.importDesc')} <span className="font-mono text-xs">docs/content-package.md</span>{' '}
          — {t('admin.importFormat')}.
        </p>
      </div>
      <div
        className={cn('drop', over && 'over')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
          data-testid="zip-input"
        />
        <FileArchive className="mx-auto mb-2 size-8" />
        {file ? <b className="text-ink">{file.name}</b> : t('common.dropHere')}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="dark"
          disabled={!file}
          loading={busy === 'validate'}
          onClick={() => send('validate')}
        >
          {t('admin.importValidate')}
        </Button>
        <Button
          type="button"
          disabled={!file || !report?.ok}
          loading={busy === 'apply'}
          onClick={() => send('apply')}
          data-testid="apply-import"
        >
          <Upload className="size-4" />
          {t('admin.importApply')}
        </Button>
      </div>

      {report ? (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              report.ok ? 'border-ok bg-ok/10' : 'border-error/50 bg-error/10',
            )}
          >
            <b>{report.ok ? t('admin.importOk') : t('admin.importFailed')}</b>
            {report.course ? (
              <span className="ml-2 text-muted">
                {report.course.title} ·{' '}
                <span className="font-mono text-xs">{report.course.slug}</span> ·{' '}
                {report.course.track} ·{' '}
                {report.course.exists ? t('admin.importWillUpdate') : t('admin.importWillCreate')}
              </span>
            ) : null}
            {report.applied ? (
              <div className="mt-2">
                <Link
                  href={`/admin/kurslar/${report.applied.courseSlug}`}
                  className="b b-brand b-sm"
                >
                  {t('admin.open')} →
                </Link>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="box">
              <b className="text-sm">{t('admin.importSummary')}</b>
              <ul className="mt-2 text-sm text-muted">
                <li>
                  {t('common.modules', { n: report.summary.modules })} ·{' '}
                  {t('common.steps', { n: report.summary.steps })} · {t('nav.files')}:{' '}
                  {report.summary.assets}
                </li>
                <li>
                  {Object.entries(report.summary.byType)
                    .map(([k, v]) => `${t(`stepTypeShort.${k as StepType}`)}: ${v}`)
                    .join(' · ')}
                </li>
                {report.summary.willUnpublish.length ? (
                  <li className="mt-1 text-de">
                    {t('admin.importWillUnpublish')}: {report.summary.willUnpublish.join(', ')}
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="box md:col-span-2">
              {report.errors.length ? (
                <>
                  <b className="text-sm text-error">
                    {t('admin.importErrors')} ({report.errors.length})
                  </b>
                  <table className="tbl-admin mt-2">
                    <tbody>
                      {report.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="font-mono text-xs">{e.file}</td>
                          <td>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
              {report.warnings.length ? (
                <>
                  <b className="mt-3 block text-sm text-de">
                    {t('admin.importWarnings')} ({report.warnings.length})
                  </b>
                  <table className="tbl-admin mt-2">
                    <tbody>
                      {report.warnings.map((e, i) => (
                        <tr key={i}>
                          <td className="font-mono text-xs">{e.file}</td>
                          <td>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
              {!report.errors.length && !report.warnings.length ? (
                <p className="text-sm text-muted">—</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {history.length ? (
        <div className="card overflow-x-auto">
          <table className="tbl-admin">
            <thead>
              <tr>
                <th>{t('admin.importHistory')}</th>
                <th>{t('common.slug')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="font-mono text-xs">{h.filename}</td>
                  <td className="font-mono text-xs">{h.slug}</td>
                  <td>
                    <span
                      className={cn(
                        'badge',
                        h.status === 'APPLIED'
                          ? 'bg-ok/20 text-[#159b74]'
                          : h.status === 'FAILED'
                            ? 'bg-error/15 text-error'
                            : 'badge-muted',
                      )}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="text-muted">{fmtDate(h.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
