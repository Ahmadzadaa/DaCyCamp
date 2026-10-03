import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { UsersTable } from '@/components/admin/users-table';

export const metadata: Metadata = { title: `${t('admin.students')} · ${t('app.admin')}` };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <UsersTable initialQ={q ?? ''} />;
}
