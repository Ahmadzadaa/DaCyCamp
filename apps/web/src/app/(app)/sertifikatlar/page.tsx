import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, BookOpen, Download, Route } from 'lucide-react';
import type { CertificateSummaryDto } from '@dacy/shared';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { TrackBadge } from '@/components/app/track-badge';
import { fmtDate } from '@/components/admin/format';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: t('nav.certificates') };

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/sertifikatlar');
  const items = await apiFetch<CertificateSummaryDto[]>('/me/certificates');
  return (
    <div className="flex flex-col gap-8">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('cert.myTitle')}</h1>
            <span className="badge badge-mint">
              {items.length} {t('cert.countUnit')}
            </span>
          </div>
          <p>{t('cert.heroText')}</p>
        </div>
        <HeroArt kind="award" />
      </section>

      {!items.length ? (
        <EmptyState
          icon={Award}
          title={t('cert.myTitle')}
          description={t('cert.myEmpty')}
          action={
            <Link href="/kurslar" className="b b-brand">
              <BookOpen aria-hidden />
              {t('cert.emptyCta')}
            </Link>
          }
        />
      ) : (
        <div className="cert-grid">
          {items.map((c) => (
            <article
              key={c.id}
              className={cn('cert-mini', c.revokedAt && 'revoked')}
              style={{ ['--c' as string]: c.trackColor }}
            >
              <div className="cert-mini-top">
                <span className="cert-mini-ic">
                  {c.kind === 'path' ? <Route aria-hidden /> : <Award aria-hidden />}
                </span>
                <span className={cn('badge', c.revokedAt ? 'badge-err' : 'badge-ok')}>
                  <span className="bdot" aria-hidden />
                  {c.revokedAt ? t('cert.revoked') : t('cert.valid')}
                </span>
              </div>
              <span className="eyebrow">
                {c.kind === 'path' ? t('cert.kindPath') : t('cert.kindCourse')}
              </span>
              <h3>
                <Link href={`/sertifikat/${c.id}`}>{c.courseTitle}</Link>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <TrackBadge color={c.trackColor}>{c.trackTitle}</TrackBadge>
              </div>
              <dl className="cert-mini-meta">
                <div>
                  <dt>{t('cert.serial')}</dt>
                  <dd className="font-mono">{c.serial}</dd>
                </div>
                <div>
                  <dt>{t('cert.issued')}</dt>
                  <dd>{fmtDate(c.issuedAt)}</dd>
                </div>
              </dl>
              <div className="cert-mini-ft">
                <Link href={`/sertifikat/${c.id}`} className="b b-dark b-sm">
                  {t('cert.view')}
                </Link>
                <a
                  href={`/api/certificates/${c.id}.pdf`}
                  className="b b-ghost b-sm"
                  download={`${c.serial}.pdf`}
                >
                  <Download aria-hidden />
                  PDF
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
