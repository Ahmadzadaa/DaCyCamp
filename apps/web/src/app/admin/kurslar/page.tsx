import type { Metadata } from 'next';
import {
  LEVELS,
  type AdminCourseListDto,
  type CourseStatus,
  type Level,
  type TopicDto,
  type TrackDto,
} from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CoursesTable } from '@/components/admin/courses-table';
import { ActivityFeed } from '@/components/admin/activity-feed';

export function generateMetadata(): Metadata {
  return { title: `${t('admin.courses')} · ${t('app.admin')}` };
}

const STATUSES: CourseStatus[] = ['published', 'draft', 'archived', 'deleted'];

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    istiqamet?: string;
    q?: string;
    status?: string;
    movzu?: string;
    seviyye?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const level = (LEVELS as readonly string[]).includes(sp.seviyye ?? '')
    ? (sp.seviyye as Level)
    : undefined;
  const qs = new URLSearchParams();
  if (sp.istiqamet) qs.set('track', sp.istiqamet);
  if (sp.q) qs.set('q', sp.q);
  if (status) qs.set('status', status);
  if (sp.movzu) qs.set('topic', sp.movzu);
  if (level) qs.set('level', level);
  const [data, tracks, topics] = await Promise.all([
    apiFetch<AdminCourseListDto>(`/admin/courses${qs.size ? `?${qs}` : ''}`),
    apiFetch<TrackDto[]>('/admin/tracks'),
    apiFetch<TopicDto[]>('/admin/topics'),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <CoursesTable
        data={data}
        tracks={tracks}
        topics={topics}
        track={sp.istiqamet}
        q={sp.q}
        status={status}
        topic={sp.movzu}
        level={level}
      />
      {status !== 'deleted' ? <ActivityFeed action="course." limit={5} /> : null}
    </div>
  );
}
