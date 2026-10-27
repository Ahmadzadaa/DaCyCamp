import { notFound } from 'next/navigation';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { OperationsView, type OperationsData } from '@/components/admin/operations-view';
export const generateMetadata = () => ({ title: t('reliability.operations') });
export default async function Page() {
  const data = await apiTry<OperationsData>('/admin/operations');
  if (!data) notFound();
  return <OperationsView initial={data} />;
}
