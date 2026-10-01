import { Route } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';
export default function PathPage() {
  return (
    <EmptyState
      icon={Route}
      title={`${t('nav.paths')} — ${t('common.soon')}`}
      description="Yol səhifəsi Mərhələ 4-də əlavə olunacaq."
    />
  );
}
