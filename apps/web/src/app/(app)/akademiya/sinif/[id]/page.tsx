import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type {
  ClassroomDto,
  AcademyMyAssignmentDto,
  AcademyAssignmentListItemDto,
  AcademySessionDto,
  AcademyMyGradeDto,
} from '@dacy/shared';
import { apiFetch, apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { ClassroomView } from '@/components/classroom/classroom-view';

export function generateMetadata(): Metadata {
  return { title: t('classroom.title') };
}
const TABS = ['', 'materials', 'assignments', 'calendar', 'questions', 'grades', 'about'];
export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab ?? '') ? (sp.tab ?? '') : '';
  const page = Math.min(10000, Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1));
  const data = await apiTry<ClassroomDto>(`/academy/groups/${id}/classroom?page=${page}`);
  if (!data) notFound();
  const staff = data.group.myRole !== 'STUDENT';
  const [assignments, staffAssignments, sessions, grades] = await Promise.all([
    staff
      ? Promise.resolve([])
      : apiFetch<AcademyMyAssignmentDto[]>(`/academy/me/assignments?groupId=${id}`),
    (staff && tab === 'assignments') || (staff && tab === 'calendar')
      ? apiFetch<AcademyAssignmentListItemDto[]>(`/academy/groups/${id}/assignments`)
      : Promise.resolve([]),
    tab === 'calendar'
      ? apiFetch<AcademySessionDto[]>(`/academy/groups/${id}/sessions`)
      : Promise.resolve([]),
    !staff && tab === 'grades'
      ? apiFetch<AcademyMyGradeDto[]>('/academy/me/grades')
      : Promise.resolve([]),
  ]);
  return (
    <ClassroomView
      key={data.viewerId}
      data={data}
      assignments={assignments}
      staffAssignments={staffAssignments}
      sessions={sessions}
      grades={grades.filter((g) => g.groupCode === data.group.code)}
      tab={tab}
    />
  );
}
