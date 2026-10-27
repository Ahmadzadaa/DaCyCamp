import { PasswordRecovery } from '@/components/app/password-recovery';
import { t } from '@/lib/i18n';
export const generateMetadata = () => ({
  title: t('reliability.resetTitle'),
  robots: { index: false },
});
export default function Page() {
  return <PasswordRecovery reset />;
}
