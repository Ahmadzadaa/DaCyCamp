import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AdminCourseListDto, AdminPathDto, TrackDto } from '@dacy/shared';
import { apiFetch, apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { PathEditor } from '@/components/admin/path-editor/path-editor';

type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} · ${t('admin.pathsTitle')}` };
}

export default async function AdminPathPage({ params }: Props) {
  const { slug } = await params;
  const [path, tracks, { courses }] = await Promise.all([
    apiTry<AdminPathDto>(`/admin/paths/${slug}`),
    apiFetch<TrackDto[]>('/admin/tracks'),
    apiFetch<AdminCourseListDto>('/admin/courses'),
  ]);
  if (!path) notFound();
  return <PathEditor initial={path} tracks={tracks} courses={courses} />;
}
