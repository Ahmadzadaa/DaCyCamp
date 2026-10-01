import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { UsersTable } from '@/components/admin/users-table';

export const metadata: Metadata = { title: `${t('admin.students')} · ${t('app.admin')}` };

export default function StudentsPage() {
  return <UsersTable />;
}
