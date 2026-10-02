'use client';
import Link from 'next/link';
import { toast } from 'sonner';
import { Award, Download, Link2 } from 'lucide-react';
import type { CertificateDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/components/admin/format';
import { TrackBadge } from './track-badge';

/** İctimai sertifikat səhifəsi — PDF ilə eyni quruluş: sol zolaq istiqamət rəngində, sağda QR və etibarlılıq */
export function CertificateCard({ cert }: { cert: CertificateDto }) {
  const valid = !cert.revokedAt;
  async function copy() {
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      toast.success(t('cert.linkCopied'));
    } catch {
      toast(cert.verifyUrl);
    }
  }
  return (
    <div className="mx-auto max-w-[980px]">
      <article
        className="box relative overflow-hidden p-0"
        style={{ ['--c' as string]: cert.trackColor }}
        data-testid="certificate"
      >
        <div className="absolute inset-y-0 left-0 w-2.5" style={{ background: cert.trackColor }} />
        <div className="ml-2.5 h-1.5 bg-brand" />
        {!valid ? (
          <div className="ml-2.5 bg-error/10 px-6 py-2 text-sm font-semibold text-error">
            ⚠ {t('cert.revoked')} · {fmtDate(cert.revokedAt)}
          </div>
        ) : null}
        <div className="grid gap-8 p-7 pl-10 md:grid-cols-[1fr_230px] md:p-10 md:pl-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand font-bold text-navy">
                Dc
              </span>
              <div>
                <b className="block leading-tight">{t('cert.org')}</b>
                <span className="text-sm text-muted">{t('cert.title')}</span>
              </div>
            </div>
            <p className="mt-10 text-muted">Bu sertifikat təsdiq edir ki,</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl" data-testid="cert-name">
              {cert.studentName}
            </h1>
            <p className="mt-6 text-muted">aşağıdakı {t('cert.completedCourse')}:</p>
            <h2 className="mt-1 text-xl md:text-2xl">{cert.courseTitle}</h2>
            <div className="mt-3">
              <TrackBadge color={cert.trackColor}>{cert.trackTitle}</TrackBadge>
            </div>
            <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted">{t('cert.issued')}</dt>
              <dd>{fmtDate(cert.issuedAt)}</dd>
              <dt className="text-muted">{t('cert.serial')}</dt>
              <dd className="font-mono" data-testid="cert-serial">
                {cert.serial}
              </dd>
              <dt className="text-muted">{t('cert.student')}</dt>
              <dd>{cert.studentName}</dd>
              <dt className="text-muted">XP</dt>
              <dd>
                {cert.hours ? `${t('cert.hours', { n: cert.hours })} · ` : ''}
                {t('cert.xp', { n: cert.xp })}
              </dd>
            </dl>
          </div>
          <div className="flex flex-col items-center gap-3 md:pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cert.qrDataUrl}
              alt="QR"
              width={190}
              height={190}
              className="rounded-xl bg-white p-2 shadow-sm"
            />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
                valid ? 'bg-brand/15 text-brand' : 'bg-error/10 text-error',
              )}
              data-testid="cert-status"
            >
              <Award className="size-4" />
              {valid ? `✓ ${t('cert.valid')}` : t('cert.revoked')}
            </span>
            <p className="text-center text-xs text-muted">{t('cert.verifyHint')}</p>
          </div>
        </div>
      </article>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={cert.pdfUrl}
          className="b b-brand"
          download={`${cert.serial}.pdf`}
          data-testid="cert-pdf"
        >
          <Download className="size-4" /> {t('cert.downloadPdf')}
        </a>
        <button type="button" className="b b-dark" onClick={() => void copy()}>
          <Link2 className="size-4" /> {t('cert.copyLink')}
        </button>
        {cert.courseSlug ? (
          <Link href={`/kurs/${cert.courseSlug}`} className="b b-ghost">
            {t('cert.course')} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
