'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronDown, Code2 } from 'lucide-react';
import type { AdminPendingCertificateDto, CertificateEvidenceDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './confirm-dialog';
import { fmtDate } from './format';

/** Təsdiq gözləyən sertifikatlar: tələbənin hər Python addımındakı son keçən kodu, təsdiq / ləğv */
export function CertReview({
  initial,
  openId,
}: {
  initial: AdminPendingCertificateDto[];
  openId: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<string | null>(openId);
  const [evidence, setEvidence] = useState<Record<string, CertificateEvidenceDto>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reject, setReject] = useState<AdminPendingCertificateDto | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || evidence[open]) return;
    let live = true;
    api<CertificateEvidenceDto>(`/admin/certificates/${open}/evidence`)
      .then((e) => live && setEvidence((x) => ({ ...x, [open]: e })))
      .catch((e) => toast.error(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [open, evidence]);

  function done(id: string) {
    setRows((xs) => xs.filter((x) => x.id !== id));
    if (open === id) setOpen(null);
    router.refresh(); // sidebar sayğacı
  }

  async function approve(r: AdminPendingCertificateDto) {
    setBusy(r.id);
    try {
      await api(`/admin/certificates/${r.id}/approve`, { method: 'POST' });
      toast.success(t('users.approveDone'));
      done(r.id);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length)
    return (
      <div className="box text-muted" data-testid="cert-review-empty">
        {t('certReview.empty')}
      </div>
    );

  return (
    <div className="flex flex-col gap-3" data-testid="cert-review">
      {rows.map((r) => {
        const ev = evidence[r.id];
        const expanded = open === r.id;
        return (
          <div key={r.id} className="box flex flex-col gap-3" data-testid="cert-review-row">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link
                href={`/admin/telebeler/${r.student.id}`}
                className="font-semibold hover:underline"
              >
                {r.student.name}
              </Link>
              <span className="text-muted">{r.student.email}</span>
              <span className="text-muted" aria-hidden>
                ·
              </span>
              <span className="min-w-0 font-semibold">{r.title}</span>
              <span className="badge badge-warn">{t('cert.pending')}</span>
              <span className="ml-auto font-mono text-xs text-muted">
                {r.serial} · {fmtDate(r.issuedAt)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="b b-ghost b-sm"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : r.id)}
                data-testid="cert-review-toggle"
              >
                <Code2 aria-hidden className="size-4" />
                {t('certReview.review')} · {t('certReview.pythonSteps', { n: r.pythonSteps })}
                <ChevronDown
                  aria-hidden
                  className={cn('size-4 transition', expanded && 'rotate-180')}
                />
              </button>
              <span className="flex-1" />
              <Button
                type="button"
                size="sm"
                loading={busy === r.id}
                // təsdiq yalnız kod açılıb baxılandan sonra
                disabled={!ev || busy !== null}
                onClick={() => void approve(r)}
                data-testid="cert-approve"
              >
                <Check className="size-4" /> {t('certReview.approve')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busy !== null}
                onClick={() => {
                  setRejectError(null);
                  setReject(r);
                }}
              >
                {t('certReview.reject')}
              </Button>
            </div>
            {expanded ? (
              ev ? (
                <ol className="flex flex-col gap-3" data-testid="cert-evidence">
                  {ev.items.map((it, i) => (
                    <li key={i} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <b>{it.stepTitle}</b>
                        <span className="text-xs text-muted">{it.courseTitle}</span>
                        <span className="ml-auto text-xs text-muted">
                          {it.passedAt
                            ? t('certReview.passedAt', { date: fmtDate(it.passedAt, true) })
                            : t('certReview.noPass')}
                        </span>
                      </div>
                      {it.code ? (
                        <pre className="max-h-72 overflow-auto rounded-lg bg-navy p-3 font-mono text-xs leading-relaxed text-on-dark">
                          {it.code}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="sk h-24 !rounded-lg" aria-busy="true" />
              )
            ) : null}
          </div>
        );
      })}
      <ConfirmDialog
        open={!!reject}
        onOpenChange={(o) => !o && setReject(null)}
        title={t('certReview.rejectTitle')}
        description={t('certReview.rejectDesc')}
        confirmLabel={t('certReview.reject')}
        error={rejectError}
        onConfirm={async () => {
          if (!reject) return;
          try {
            await api(`/admin/certificates/${reject.id}/revoke`, { method: 'POST' });
            toast.success(t('users.revokeDone'));
            done(reject.id);
            setReject(null);
          } catch (e) {
            setRejectError(errorMessage(e));
          }
        }}
      />
    </div>
  );
}
