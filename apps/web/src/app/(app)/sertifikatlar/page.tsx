import type { Metadata } from 'next';
import { Award } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';
export const metadata: Metadata = { title: t('nav.certificates') };
export default function CertificatesPage() {
  return (
    <EmptyState
      icon={Award}
      title={`${t('nav.certificates')} — ${t('common.soon')}`}
      description="Sertifikatlar və ictimai yoxlama səhifəsi Mərhələ 3-də əlavə olunacaq."
    />
  );
}
