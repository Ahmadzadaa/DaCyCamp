import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AcademyCourseLinkDto, AcademyGroupDto, AdminCourseListDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { PageHeader } from '@/components/admin/page-header';
import { GroupStatusBadge } from '@/components/academy/badges';
import { fetchRoster } from '@/components/academy/server';
import { GroupEditor } from '@/components/academy/admin/admin-forms';
import { JoinCodeBox } from '@/components/academy/admin/join-code';
import {
  CourseLinks,
  EnrollmentsManager,
  InstructorsManager,
} from '@/components/academy/admin/group-people';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.adminTitle')} · ${t('app.admin')}` };
}

export default async function AdminGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await apiTry<AcademyGroupDto>(`/academy/groups/${id}`);
  if (!g || !g.permissions.includes('group.manage')) notFound();
  const [students, links, courses] = await Promise.all([
    fetchRoster(id).then((x) => x ?? []),
    apiTry<AcademyCourseLinkDto[]>(`/academy/groups/${id}/courses`).then((x) => x ?? []),
    apiTry<AdminCourseListDto>('/admin/courses?published=true').then((x) => x?.courses ?? []),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/akademiya" className="back-link">
        <ArrowLeft aria-hidden />
        {t('academy.adminTitle')}
      </Link>
      <PageHeader
        title={`${g.code} · ${g.name}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {g.program.title} <GroupStatusBadge status={g.status} /> · {g.timezone}
          </span>
        }
      >
        <Link href={`/muellim/qruplar/${g.id}`} className="b b-ghost">
          {t('academy.teacherTitle')}
        </Link>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="box" aria-labelledby="ae">
          <h2 id="ae" className="box-h">
            {t('academy.admin.enrollments')}
          </h2>
          <EnrollmentsManager groupId={g.id} rows={students} />
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          <section className="box" aria-labelledby="aj">
            <h2 id="aj" className="box-h">
              {t('academy.admin.joinCode')}
            </h2>
            <JoinCodeBox g={g} />
          </section>
          <section className="box" aria-labelledby="ai">
            <h2 id="ai" className="box-h">
              {t('academy.admin.instructors')}
            </h2>
            <InstructorsManager g={g} />
          </section>
          <section className="box" aria-labelledby="as">
            <h2 id="as" className="box-h">
              {t('academy.tabs.settings')}
            </h2>
            <GroupEditor g={g} />
          </section>
          <section className="box" aria-labelledby="ac">
            <h2 id="ac" className="box-h">
              {t('academy.admin.courses')}
            </h2>
            <CourseLinks groupId={g.id} linked={links.map((l) => l.courseId)} courses={courses} />
          </section>
        </div>
      </div>
    </div>
  );
}
