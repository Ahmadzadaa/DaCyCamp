import { Award } from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';
export default function VerifyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Logo text="DaCy Academy" className="mb-6 text-ink" />
      <EmptyState
        icon={Award}
        title={t('common.soon')}
        description="Sertifikatın ictimai yoxlanması Mərhələ 3-də əlavə olunacaq."
      />
    </main>
  );
}
