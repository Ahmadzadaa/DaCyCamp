import { Upload } from 'lucide-react';
import { t } from '@/lib/i18n';
import { SoonPage } from '@/components/admin/soon-page';
export default function ImportPage() {
  return <SoonPage phase={2} icon={Upload} title={t('admin.import')} />;
}
