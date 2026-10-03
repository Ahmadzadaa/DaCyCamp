import type { Metadata } from 'next';
import type { AdminRoadmapDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { RoadmapsManager } from '@/components/admin/roadmaps-manager';

export const metadata: Metadata = { title: `${t('roadmap.adminTitle')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function RoadmapsAdminPage() {
  const roadmaps = await apiFetch<AdminRoadmapDto[]>('/admin/roadmaps');
  return <RoadmapsManager initial={roadmaps} />;
}
