import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AdminCourseListDto, AdminRoadmapDto, TrackDto } from '@dacy/shared';
import { apiFetch, apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { RoadmapEditor } from '@/components/admin/roadmap-editor';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await apiTry<AdminRoadmapDto>(`/admin/roadmaps/${id}`);
  return { title: `${r?.title ?? t('common.notFound')} · ${t('roadmap.adminTitle')}` };
}

export default async function RoadmapEditPage({ params }: Props) {
  const { id } = await params;
  const [roadmap, tracks, list] = await Promise.all([
    apiTry<AdminRoadmapDto>(`/admin/roadmaps/${id}`),
    apiFetch<TrackDto[]>('/admin/tracks'),
    apiFetch<AdminCourseListDto>('/admin/courses'),
  ]);
  if (!roadmap) notFound();
  return (
    <RoadmapEditor
      initial={roadmap}
      tracks={tracks.map((x) => ({ slug: x.slug, title: x.title }))}
      courses={list.courses
        .filter((c) => c.status !== 'deleted')
        .map((c) => ({ slug: c.slug, title: c.title }))}
    />
  );
}
