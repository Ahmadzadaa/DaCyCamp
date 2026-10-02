import type { Metadata } from 'next';
import type { AdminCourseListDto, CourseStatus, TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CoursesTable } from '@/components/admin/courses-table';

export const metadata: Metadata = { title: `${t('admin.courses')} · ${t('app.admin')}` };

const STATUSES: CourseStatus[] = ['published', 'draft', 'archived', 'deleted'];

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ istiqamet?: string; q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const qs = new URLSearchParams();
  if (sp.istiqamet) qs.set('track', sp.istiqamet);
  if (sp.q) qs.set('q', sp.q);
  if (status) qs.set('status', status);
  const [data, tracks] = await Promise.all([
    apiFetch<AdminCourseListDto>(`/admin/courses${qs.size ? `?${qs}` : ''}`),
    apiFetch<TrackDto[]>('/admin/tracks'),
  ]);
  return <CoursesTable data={data} tracks={tracks} track={sp.istiqamet} q={sp.q} status={status} />;
}
