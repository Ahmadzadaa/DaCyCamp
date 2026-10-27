import { notFound } from 'next/navigation';
import type { ClassroomDto, ClassroomLessonDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { LessonView } from '@/components/classroom/lesson-view';
import { t } from '@/lib/i18n';
export const generateMetadata = () => ({ title: t('classroom.lesson') });
export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const lesson = await apiTry<ClassroomLessonDto>(`/academy/classroom/lessons/${lessonId}`);
  if (!lesson || lesson.groupId !== id) notFound();
  const classroom = await apiTry<ClassroomDto>(`/academy/groups/${id}/classroom`);
  if (!classroom) notFound();
  return <LessonView key={classroom.viewerId} lesson={lesson} classroom={classroom} />;
}
