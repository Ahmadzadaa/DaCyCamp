import { Route } from 'lucide-react';
import { t } from '@/lib/i18n';
import { SoonPage } from '@/components/admin/soon-page';
export default function PathsAdminPage() {
  return <SoonPage phase={4} icon={Route} title={t('nav.paths')} />;
}
