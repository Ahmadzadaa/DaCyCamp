import type { Metadata } from 'next';
import type { TopicDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TopicsManager } from '@/components/admin/topics-manager';

export const metadata: Metadata = { title: `${t('topics.title')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const topics = await apiFetch<TopicDto[]>('/admin/topics');
  return <TopicsManager initial={topics} />;
}
