import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Users,
} from 'lucide-react';
import type { AcademyAdminOverviewDto, AcademyGroupDto, AcademyProgramDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { PageHeader } from '@/components/admin/page-header';
import { GroupStatusBadge } from '@/components/academy/badges';
import { fmtZoned } from '@/components/academy/format';
import { GroupForm, ProgramForm } from '@/components/academy/admin/admin-forms';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.adminTitle')} · ${t('app.admin')}` };
}

/** Akademiya idarəetməsi (yalnız admin): proqramlar, qruplar, ümumi göstəricilər */
export default async function AdminAcademyPage() {
  const o = await apiTry<AcademyAdminOverviewDto>('/academy/admin/overview');
  if (!o) notFound();
  const [programs, groups] = await Promise.all([
    apiTry<AcademyProgramDto[]>('/academy/programs').then((x) => x ?? []),
    apiTry<AcademyGroupDto[]>('/academy/groups').then((x) => x ?? []),
  ]);
  const tiles = [
    { icon: GraduationCap, label: t('academy.admin.programs'), value: o.programs },
    { icon: Users, label: t('academy.admin.activeEnrollments'), value: o.activeEnrollments },
    {
      icon: ClipboardList,
      label: t('academy.admin.publishedAssignments'),
      value: o.publishedAssignments,
    },
    { icon: ClipboardCheck, label: t('academy.teacher.pending'), value: o.pendingReviews },
    { icon: CalendarClock, label: t('academy.admin.upcomingSessions'), value: o.upcomingSessions },
    {
      icon: AlertTriangle,
      label: t('academy.admin.outboxFailed'),
      value: o.outbox.failed,
      alert: o.outbox.failed > 0,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('academy.adminTitle')} subtitle={t('academy.adminIntro')} />
      <div className="kpis">
        {tiles.map((k) => (
          <div key={k.label} className={`kpi${k.alert ? ' alert' : ''}`}>
            <span className="kpi-ic">
              <k.icon aria-hidden />
            </span>
            <b>{k.value}</b>
            <span className="kpi-l">{k.label}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="ag">
          <h2 id="ag" className="h2">
            {t('academy.admin.groups')}
          </h2>
          {groups.length === 0 ? (
            <div className="box text-muted">{t('academy.empty.adminGroups')}</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl-admin" data-testid="admin-groups">
                <thead>
                  <tr>
                    <th>{t('academy.f.code')}</th>
                    <th>{t('academy.f.program')}</th>
                    <th>{t('academy.f.status')}</th>
                    <th>{t('academy.f.students')}</th>
                    <th>{t('academy.f.lead')}</th>
                    <th>{t('academy.f.startDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <Link
                          href={`/admin/akademiya/qruplar/${g.id}`}
                          className="ttl hover:underline"
                        >
                          {g.code}
                        </Link>
                        <div className="slug">{g.name}</div>
                      </td>
                      <td>{g.program.title}</td>
                      <td>
                        <GroupStatusBadge status={g.status} />
                      </td>
                      <td>
                        {g.capacity
                          ? t('academy.admin.seats', { n: g.activeStudents, cap: g.capacity })
                          : g.activeStudents}
                      </td>
                      <td>{g.instructors.find((i) => i.role === 'LEAD')?.user.name ?? '—'}</td>
                      <td>{fmtZoned(g.startAt, { time: false, tz: g.timezone })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          {programs.length ? (
            <section className="box" aria-labelledby="ng">
              <h2 id="ng" className="box-h">
                {t('academy.admin.newGroup')}
              </h2>
              <GroupForm programs={programs.filter((p) => p.status !== 'ARCHIVED')} />
            </section>
          ) : null}
          <section className="box" aria-labelledby="ap">
            <h2 id="ap" className="box-h">
              {t('academy.admin.programs')}
            </h2>
            {programs.length ? (
              <ul className="mb-4 flex flex-col gap-2 text-sm">
                {programs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <span>
                      <b>{p.title}</b> <span className="text-muted">· {p.slug}</span>
                    </span>
                    <span className="text-muted">
                      {t(`academy.programStatus.${p.status}`)} · {p.groupCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">{t('academy.empty.programs')}</p>
            )}
            <ProgramForm />
          </section>
        </div>
      </div>
    </div>
  );
}
