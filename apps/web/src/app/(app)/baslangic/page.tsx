import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';
export default function OnboardingPage() {
  return (
    <EmptyState
      icon={Compass}
      title={t('common.soon')}
      description="«Hansı peşəyə hazırlaşırsınız?» onboarding-i Mərhələ 4-də əlavə olunacaq."
    />
  );
}
