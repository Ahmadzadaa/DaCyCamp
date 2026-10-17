import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AcademyGroupDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { AssignmentForm } from '@/components/academy/teacher/assignment-form';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.teacher.newAssignment')} · ${t('academy.teacherTitle')}` };
}

export default async function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await apiTry<AcademyGroupDto>(`/academy/groups/${id}`);
  if (!g || !g.permissions.includes('assignment.createDraft')) notFound();
  return (
    <>
      <Link href={`/muellim/qruplar/${g.id}`} className="back-link">
        <ArrowLeft aria-hidden />
        {g.code} · {g.name}
      </Link>
      <div className="ph1 !mb-0">
        <h1>{t('academy.teacher.newAssignment')}</h1>
      </div>
      <AssignmentForm groupId={g.id} />
    </>
  );
}
