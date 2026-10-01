import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AdminCourseTreeDto, AssetDto, TrackDto } from '@dacy/shared';
import { apiFetch, apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CourseEditor } from '@/components/admin/course-editor/course-editor';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ node?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiTry<AdminCourseTreeDto>(`/admin/courses/${slug}`);
  return { title: `${c?.title ?? slug} · ${t('app.admin')}` };
}

export default async function CourseEditorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { node } = await searchParams;
  const course = await apiTry<AdminCourseTreeDto>(`/admin/courses/${slug}`);
  if (!course) notFound();
  const [assets, tracks] = await Promise.all([
    apiFetch<AssetDto[]>(`/admin/courses/${course.id}/assets`),
    apiFetch<TrackDto[]>('/admin/tracks'),
  ]);
  return (
    <CourseEditor
      initialCourse={course}
      initialAssets={assets}
      tracks={tracks}
      initialNode={node}
    />
  );
}
