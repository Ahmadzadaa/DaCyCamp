import { redirect } from 'next/navigation';
import type { MeSummaryDto } from '@dacy/shared';
import { apiTry, getCurrentUser, isStaff } from '@/lib/api/server';
import { AdminProvider } from '@/components/admin/admin-context';
import { AdminShell } from '@/components/shell/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/admin/kurslar');
  if (!isStaff(user)) redirect('/kurslar');
  const summary = await apiTry<MeSummaryDto>('/me/summary');
  return (
    <AdminProvider role={user.role}>
      <AdminShell user={user} summary={summary}>
        {children}
      </AdminShell>
    </AdminProvider>
  );
}
