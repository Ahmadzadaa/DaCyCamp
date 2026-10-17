import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AcademyAssignmentDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { AssignmentForm } from '@/components/academy/teacher/assignment-form';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.teacher.editAssignment')} · ${t('academy.teacherTitle')}` };
}

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await apiTry<AcademyAssignmentDto>(`/academy/assignments/${id}`);
  if (!a) notFound();
  return (
    <>
      <Link href={`/muellim/tapsiriqlar/${a.id}`} className="back-link">
        <ArrowLeft aria-hidden />
        {a.title}
      </Link>
      <div className="ph1 !mb-0">
        <h1>{t('academy.teacher.editAssignment')}</h1>
      </div>
      <AssignmentForm groupId={a.groupId} initial={a} />
    </>
  );
}
