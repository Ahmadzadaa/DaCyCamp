import type { Metadata } from 'next';
import type { AdminLabSessionDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { LabsTable } from '@/components/admin/labs-table';
import { PageHeader } from '@/components/admin/page-header';

export const metadata: Metadata = { title: `${t('admin.labs')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  const rows = await apiFetch<AdminLabSessionDto[]>('/admin/labs');
  return (
    <div>
      <PageHeader title={t('admin.labs')} subtitle={t('admin.labsDesc')} />
      <LabsTable initial={rows} />
    </div>
  );
}
