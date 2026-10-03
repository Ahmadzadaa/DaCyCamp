import type { Metadata } from 'next';
import type { TopicDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TopicsManager } from '@/components/admin/topics-manager';
import { LevelLabelsCard } from '@/components/admin/level-labels-card';
import { getLevelLabels } from '@/lib/level-labels';

export const metadata: Metadata = { title: `${t('topics.title')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const [topics, levels] = await Promise.all([
    apiFetch<TopicDto[]>('/admin/topics'),
    getLevelLabels(),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <TopicsManager initial={topics} />
      <LevelLabelsCard initial={levels} />
    </div>
  );
}
