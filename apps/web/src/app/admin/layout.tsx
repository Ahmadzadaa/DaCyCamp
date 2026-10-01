import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from '@/lib/api/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminProvider } from '@/components/admin/admin-context';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/admin/kurslar');
  if (!isStaff(user)) redirect('/kurslar');
  return (
    <AdminProvider role={user.role}>
      <div className="flex min-h-dvh flex-col">
        <AdminHeader user={user} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-[22px]">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
