import { FolderOpen } from 'lucide-react';
import { t } from '@/lib/i18n';
import { SoonPage } from '@/components/admin/soon-page';
export default function FilesPage() {
  return <SoonPage phase={2} icon={FolderOpen} title={t('admin.files')} />;
}
