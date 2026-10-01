import type { Metadata } from 'next';
import type { AdminCourseDto, TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CoursesTable } from '@/components/admin/courses-table';

export const metadata: Metadata = { title: `${t('admin.courses')} · ${t('app.admin')}` };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ istiqamet?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.istiqamet) qs.set('track', sp.istiqamet);
  if (sp.q) qs.set('q', sp.q);
  const [courses, tracks] = await Promise.all([
    apiFetch<AdminCourseDto[]>(`/admin/courses${qs.size ? `?${qs}` : ''}`),
    apiFetch<TrackDto[]>('/admin/tracks'),
  ]);
  return <CoursesTable courses={courses} tracks={tracks} track={sp.istiqamet} q={sp.q} />;
}
