import type { Metadata } from 'next';
import { Route } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';
export const metadata: Metadata = { title: t('nav.paths') };
export default function PathsPage() {
  return (
    <EmptyState
      icon={Route}
      title={`${t('nav.paths')} — ${t('common.soon')}`}
      description="Karyera yolları (Learning Path) Mərhələ 4-də əlavə olunacaq."
    />
  );
}
