import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award } from 'lucide-react';
import type { CertificateSummaryDto } from '@dacy/shared';
import { EmptyState } from '@/components/app/empty-state';
import { TrackBadge } from '@/components/app/track-badge';
import { fmtDate } from '@/components/admin/format';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: t('nav.certificates') };

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/sertifikatlar');
  const items = await apiFetch<CertificateSummaryDto[]>('/me/certificates');
  if (!items.length)
    return <EmptyState icon={Award} title={t('cert.myTitle')} description={t('cert.myEmpty')} />;
  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('cert.myTitle')}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/sertifikat/${c.id}`}
            className="box flex items-center gap-4 hover:border-brand"
            style={{ ['--c' as string]: c.trackColor }}
          >
            <span
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: c.trackColor }}
            >
              <Award className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate">{c.courseTitle}</b>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <TrackBadge color={c.trackColor}>{c.trackTitle}</TrackBadge>
                <span className="font-mono">{c.serial}</span>
                <span>{fmtDate(c.issuedAt)}</span>
                {c.revokedAt ? <span className="text-error">{t('cert.revoked')}</span> : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
