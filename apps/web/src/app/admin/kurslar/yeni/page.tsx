import type { Metadata } from 'next';
import type { TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { NewCourseForm } from '@/components/admin/new-course-form';

export const metadata: Metadata = { title: `${t('admin.newCourse')} · ${t('app.admin')}` };

export default async function NewCoursePage() {
  const tracks = await apiFetch<TrackDto[]>('/admin/tracks');
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl">{t('admin.newCourse')}</h1>
      <NewCourseForm tracks={tracks} />
    </div>
  );
}
