import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { AuditLog } from '@/components/admin/audit-log';

export const metadata: Metadata = { title: `${t('audit.title')} · ${t('app.admin')}` };

/** Fəaliyyət tarixçəsi — yalnız ADMIN (API də 403 qaytarır) */
export default async function AuditPage() {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') redirect('/admin/kurslar');
  return <AuditLog />;
}
