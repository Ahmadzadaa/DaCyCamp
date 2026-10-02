import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { ImportPanel } from '@/components/admin/import-panel';
export const metadata: Metadata = { title: `${t('admin.importTitle')} · ${t('app.admin')}` };
export default function ImportPage() {
  return <ImportPanel />;
}
