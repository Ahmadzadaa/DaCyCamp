import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AdminCourseListDto, AdminUserDetailDto } from '@dacy/shared';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { UserDetail } from '@/components/admin/user-detail';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const u = await apiTry<AdminUserDetailDto>(`/admin/users/${id}`);
  return { title: `${u?.name ?? t('common.notFound')} · ${t('app.admin')}` };
}

export default async function UserPage({ params }: Props) {
  const { id } = await params;
  const [user, me, list] = await Promise.all([
    apiTry<AdminUserDetailDto>(`/admin/users/${id}`),
    getCurrentUser(),
    apiTry<AdminCourseListDto>('/admin/courses'),
  ]);
  if (!user) notFound();
  const courses = (list?.courses ?? [])
    .filter((c) => c.status !== 'deleted')
    .map((c) => ({ id: c.id, title: c.title }));
  return <UserDetail initial={user} courses={courses} meId={me?.id ?? ''} />;
}
