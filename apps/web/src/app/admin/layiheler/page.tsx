import type { Metadata } from 'next';
import type { AdminProjectReviewDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { ReviewsTable } from '@/components/admin/reviews-table';
import { PageHeader } from '@/components/admin/page-header';

export function generateMetadata(): Metadata {
  return { title: `${t('admin.reviews')} · ${t('app.admin')}` };
}
export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const rows = await apiFetch<AdminProjectReviewDto[]>('/admin/path-reviews');
  return (
    <div>
      <PageHeader title={t('admin.reviews')} subtitle={t('admin.reviewsDesc')} />
      <ReviewsTable initial={rows} />
    </div>
  );
}
