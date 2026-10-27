import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardCheck, ClipboardList, Presentation, Users } from 'lucide-react';
import type { AcademyInstructorOverviewDto, ClassroomTeacherDeskDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { TeacherDesk } from '@/components/classroom/teacher-desk';
import { GroupStatusBadge } from '@/components/academy/badges';

export function generateMetadata(): Metadata {
  return { title: t('academy.teacherTitle') };
}

export default async function TeacherHomePage() {
  const o = await apiTry<AcademyInstructorOverviewDto>('/academy/instructor/overview');
  if (!o) notFound();
  const desk = await apiTry<ClassroomTeacherDeskDto>('/academy/instructor/desk');
  return (
    <>
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('academy.teacherTitle')}</h1>
          </div>
          <p>{t('academy.teacherIntro')}</p>
        </div>
        <HeroArt kind="dashboard" />
      </section>
      {desk ? <TeacherDesk desk={desk} /> : null}
      {o.groups.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title={t('academy.empty.teacherGroups')}
          description={t('academy.empty.teacherGroupsDesc')}
        />
      ) : (
        <>
          <div className="kpis">
            {[
              { icon: Users, label: t('academy.teacher.activeStudents'), value: o.totals.students },
              {
                icon: ClipboardList,
                label: t('academy.teacher.activeAssignments'),
                value: o.totals.activeAssignments,
              },
              {
                icon: ClipboardCheck,
                label: t('academy.teacher.pending'),
                value: o.totals.pendingReviews,
                alert: o.totals.pendingReviews > 0,
              },
            ].map((k) => (
              <div key={k.label} className={`kpi${k.alert ? ' alert' : ''}`}>
                <span className="kpi-ic">
                  <k.icon aria-hidden />
                </span>
                <b>{k.value}</b>
                <span className="kpi-l">{k.label}</span>
              </div>
            ))}
          </div>
          <section aria-labelledby="t-groups" className="flex flex-col gap-3">
            <h2 id="t-groups" className="h2">
              {t('academy.teacher.groups')}
            </h2>
            <div className="ac-cards" data-testid="teacher-groups">
              {o.groups.map((g) => (
                <Link key={g.id} href={`/muellim/qruplar/${g.id}`} className="ac-card">
                  <div className="ac-item-h">
                    <span className="text-sm text-muted">{g.programTitle}</span>
                    <GroupStatusBadge status={g.status} />
                  </div>
                  <h3>
                    {g.code} · {g.name}
                  </h3>
                  <span className="ac-meta">
                    <span>{t(`academy.role.${g.role}`)}</span>
                    <span>
                      {t('academy.teacher.activeStudents')}: <b>{g.activeStudents}</b>
                    </span>
                    <span>
                      {t('academy.teacher.activeAssignments')}: <b>{g.activeAssignments}</b>
                    </span>
                  </span>
                  {g.pendingReviews ? (
                    <span className="badge badge-warn self-start">
                      {t('academy.teacher.pending')}: {g.pendingReviews}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
