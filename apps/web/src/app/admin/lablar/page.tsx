import type { Metadata } from 'next';
import type { AdminLabSessionDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { LabsTable } from '@/components/admin/labs-table';

export const metadata: Metadata = { title: `${t('admin.labs')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  const rows = await apiFetch<AdminLabSessionDto[]>('/admin/labs');
  return (
    <div>
      <h1 className="text-2xl">{t('admin.labs')}</h1>
      <p className="mb-4 mt-1 text-sm text-muted">{t('admin.labsDesc')}</p>
      <LabsTable initial={rows} />
    </div>
  );
}
