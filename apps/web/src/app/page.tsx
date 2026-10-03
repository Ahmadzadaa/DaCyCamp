import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { CourseCardDto, PathCardDto, TrackDto } from '@dacy/shared';
import { apiTry, getCurrentUser, isStaff } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Landing } from '@/components/landing/landing';
import { getLevelLabels } from '@/lib/level-labels';

export const metadata: Metadata = { title: { absolute: t('landing.metaTitle') } };

/** Qonaq → tanışlıq səhifəsi; daxil olmuş tələbə → panel, heyət → admin panel */
export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? '/admin' : '/panel');
  const [tracks, courses, paths, levels] = await Promise.all([
    apiTry<TrackDto[]>('/tracks'),
    apiTry<CourseCardDto[]>('/courses'),
    apiTry<PathCardDto[]>('/paths'),
    getLevelLabels(),
  ]);
  return (
    <Landing tracks={tracks ?? []} courses={courses ?? []} paths={paths ?? []} levels={levels} />
  );
}
