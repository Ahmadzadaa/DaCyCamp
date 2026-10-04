import type { Metadata } from 'next';
import type { AdminCourseListDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { AssetsLibrary } from '@/components/admin/assets-library';
export function generateMetadata(): Metadata {
  return { title: `${t('admin.files')} · ${t('app.admin')}` };
}
export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ kurs?: string }>;
}) {
  const { kurs } = await searchParams;
  const { courses } = await apiFetch<AdminCourseListDto>('/admin/courses');
  return <AssetsLibrary courses={courses} initialCourseId={kurs} />;
}
