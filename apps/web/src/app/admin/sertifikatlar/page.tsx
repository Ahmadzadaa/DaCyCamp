import type { Metadata } from 'next';
import type { AdminPendingCertificateDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { PageHeader } from '@/components/admin/page-header';
import { CertReview } from '@/components/admin/cert-review';

export function generateMetadata(): Metadata {
  return { title: `${t('certReview.title')} · ${t('app.admin')}` };
}
export const dynamic = 'force-dynamic';

/** SEC-04: brauzerdə yoxlanılan Python nəticələrinə əsaslanan sertifikatların təsdiqi */
export default async function CertificateReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [rows, sp] = await Promise.all([
    apiFetch<AdminPendingCertificateDto[]>('/admin/certificates/pending'),
    searchParams,
  ]);
  return (
    <div>
      <PageHeader title={t('certReview.title')} subtitle={t('certReview.lead')} />
      <CertReview initial={rows} openId={sp.id ?? null} />
    </div>
  );
}
