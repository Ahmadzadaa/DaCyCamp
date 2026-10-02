import type { Metadata } from 'next';
import type { AdminProjectReviewDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { ReviewsTable } from '@/components/admin/reviews-table';

export const metadata: Metadata = { title: `${t('admin.reviews')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const rows = await apiFetch<AdminProjectReviewDto[]>('/admin/path-reviews');
  return (
    <div>
      <h1 className="text-2xl">{t('admin.reviews')}</h1>
      <p className="mb-4 mt-1 text-sm text-muted">{t('admin.reviewsDesc')}</p>
      <ReviewsTable initial={rows} />
    </div>
  );
}
