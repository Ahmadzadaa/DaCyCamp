import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Download, Plus } from 'lucide-react';
import type {
  AcademyAssignmentListItemDto,
  AcademyEnrollmentDto,
  AcademyGradebookDto,
  AcademyGroupAnalyticsDto,
  AcademyGroupDto,
  AcademySessionDto,
} from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import {
  AssignmentStatusBadge,
  ClassStatusBadge,
  EnrollmentBadge,
  GroupStatusBadge,
} from '@/components/academy/badges';
import { fmtPct, fmtScore, fmtZoned } from '@/components/academy/format';
import { SubNav } from '@/components/academy/sub-nav';
import { SessionForms } from '@/components/academy/teacher/session-forms';

export function generateMetadata(): Metadata {
  return { title: t('academy.teacherTitle') };
}

const TABS = ['', 'students', 'gradebook', 'sessions', 'analytics'] as const;
type Tab = (typeof TABS)[number];

export default async function TeacherGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : '';
  const g = await apiTry<AcademyGroupDto>(`/academy/groups/${id}`);
  if (!g || !g.permissions.includes('assignment.viewAll')) notFound();
  const can = (a: string) => g.permissions.includes(a as never);
  const base = `/muellim/qruplar/${g.id}`;
  return (
    <>
      <Link href="/muellim" className="back-link">
        <ArrowLeft aria-hidden />
        {t('academy.teacherTitle')}
      </Link>
      <div className="ph1 !mb-0">
        <div className="min-w-0">
          <h1>
            {g.code} · {g.name}
          </h1>
          <p className="flex flex-wrap items-center gap-2">
            <span>{g.program.title}</span>
            <GroupStatusBadge status={g.status} />
            {g.myRole && g.myRole !== 'STUDENT' ? (
              <span className="badge badge-muted">{t(`academy.role.${g.myRole}`)}</span>
            ) : null}
          </p>
        </div>
        {can('assignment.createDraft') ? (
          <div className="ph1-act">
            <Link href={`${base}/yeni-tapsiriq`} className="b b-brand" data-testid="new-assignment">
              <Plus aria-hidden />
              {t('academy.teacher.newAssignment')}
            </Link>
          </div>
        ) : null}
      </div>
      <SubNav
        label={g.code}
        items={[
          { href: base, label: 'academy.tabs.assignments', query: ['tab', ''] },
          {
            href: `${base}?tab=students`,
            label: 'academy.tabs.students',
            query: ['tab', 'students'],
          },
          {
            href: `${base}?tab=gradebook`,
            label: 'academy.tabs.gradebook',
            query: ['tab', 'gradebook'],
          },
          {
            href: `${base}?tab=sessions`,
            label: 'academy.tabs.sessions',
            query: ['tab', 'sessions'],
          },
          {
            href: `${base}?tab=analytics`,
            label: 'academy.tabs.analytics',
            query: ['tab', 'analytics'],
          },
        ]}
      />
      {tab === '' ? <AssignmentsTab groupId={g.id} /> : null}
      {tab === 'students' ? <StudentsTab groupId={g.id} /> : null}
      {tab === 'gradebook' ? <GradebookTab groupId={g.id} /> : null}
      {tab === 'sessions' ? <SessionsTab group={g} canManage={can('session.manage')} /> : null}
      {tab === 'analytics' ? <AnalyticsTab groupId={g.id} /> : null}
    </>
  );
}

async function AssignmentsTab({ groupId }: { groupId: string }) {
  const rows =
    (await apiTry<AcademyAssignmentListItemDto[]>(`/academy/groups/${groupId}/assignments`)) ?? [];
  if (!rows.length) return <EmptyState title={t('academy.empty.assignments')} />;
  return (
    <div className="tbl-wrap">
      <table className="tbl-admin" data-testid="teacher-assignments">
        <thead>
          <tr>
            <th>{t('academy.f.title')}</th>
            <th>{t('academy.f.status')}</th>
            <th>{t('academy.f.due')}</th>
            <th>{t('academy.f.submitted')}</th>
            <th>{t('academy.teacher.pending')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/muellim/tapsiriqlar/${a.id}`} className="ttl hover:underline">
                  {a.title}
                </Link>
                <div className="slug">
                  {t(`academy.type.${a.type}`)} · {fmtScore(a.maxScore)}
                </div>
              </td>
              <td>
                <AssignmentStatusBadge status={a.status} />
              </td>
              <td>{fmtZoned(a.dueAt)}</td>
              <td>
                {a.submittedCount} / {a.expectedCount}
              </td>
              <td>
                {a.pendingReview ? (
                  <span className="badge badge-warn">{a.pendingReview}</span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function StudentsTab({ groupId }: { groupId: string }) {
  const rows = (await apiTry<AcademyEnrollmentDto[]>(`/academy/groups/${groupId}/students`)) ?? [];
  if (!rows.length) return <EmptyState title={t('academy.empty.groups')} />;
  return (
    <div className="tbl-wrap">
      <table className="tbl-admin" data-testid="teacher-roster">
        <thead>
          <tr>
            <th>{t('academy.f.student')}</th>
            <th>{t('academy.f.status')}</th>
            <th>{t('academy.f.enrolled')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>
                <span className="ttl">{e.student.name}</span>
                {e.student.email ? <div className="slug">{e.student.email}</div> : null}
              </td>
              <td>
                <EnrollmentBadge status={e.status} />
              </td>
              <td>{fmtZoned(e.enrolledAt, { time: false })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function GradebookTab({ groupId }: { groupId: string }) {
  const gb = await apiTry<AcademyGradebookDto>(`/academy/groups/${groupId}/gradebook`);
  if (!gb) return <EmptyState title={t('academy.teacher.noPermission')} />;
  return (
    <div className="flex flex-col gap-3">
      <a
        href={`/api/academy/groups/${groupId}/gradebook/export`}
        className="b b-ghost b-sm self-end"
        download
      >
        <Download aria-hidden />
        {t('academy.teacher.exportCsv')}
      </a>
      <div className="tbl-wrap">
        <table className="tbl-admin ac-gb" data-testid="gradebook">
          <thead>
            <tr>
              <th>{t('academy.f.student')}</th>
              {gb.assignments.map((a) => (
                <th key={a.id} title={a.title}>
                  <Link href={`/muellim/tapsiriqlar/${a.id}`} className="hover:underline">
                    {a.title.length > 18 ? `${a.title.slice(0, 17)}…` : a.title}
                  </Link>
                  <div className="slug">/{fmtScore(a.maxScore)}</div>
                </th>
              ))}
              <th>{t('academy.f.average')}</th>
            </tr>
          </thead>
          <tbody>
            {gb.rows.map((r) => (
              <tr key={r.student.id}>
                <td>
                  <span className="ttl">{r.student.name}</span>
                  {r.enrollmentStatus !== 'ACTIVE' ? (
                    <div className="slug">
                      {t(`academy.enrollmentStatus.${r.enrollmentStatus}`)}
                    </div>
                  ) : null}
                </td>
                {r.cells.map((c) => (
                  <td key={c.assignmentId} title={t(`academy.status.${c.status}`)}>
                    {c.finalScore !== null ? (
                      <span
                        className={c.gradeStatus === 'RELEASED' ? 'font-semibold' : 'text-muted'}
                      >
                        {fmtScore(c.finalScore)}
                        {c.gradeStatus === 'DRAFT' ? '*' : ''}
                      </span>
                    ) : c.status === 'MISSED' ? (
                      <span className="text-error">✕</span>
                    ) : (
                      <span className="text-muted">·</span>
                    )}
                  </td>
                ))}
                <td>
                  <b>{fmtPct(r.average)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        * {t('academy.gradeStatus.DRAFT')} · ✕ {t('academy.status.MISSED')}
      </p>
    </div>
  );
}

async function SessionsTab({ group, canManage }: { group: AcademyGroupDto; canManage: boolean }) {
  const rows = (await apiTry<AcademySessionDto[]>(`/academy/groups/${group.id}/sessions`)) ?? [];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="box">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('academy.empty.sessions')}</p>
        ) : (
          <ul className="sup-list" data-testid="teacher-sessions">
            {rows.map((s) => (
              <li key={s.id}>
                <Link href={`/muellim/dersler/${s.id}`} className="ac-row">
                  <span className="flex min-w-0 flex-col gap-1">
                    <b className={s.status === 'CANCELLED' ? 'line-through' : undefined}>
                      {s.title}
                    </b>
                    <span className="ac-meta">
                      <span>{fmtZoned(s.startsAt, { tz: group.timezone })}</span>
                      {s.instructor ? <span>{s.instructor.name}</span> : null}
                      <span>{t('academy.sessions.marked', { n: s.attendanceMarked })}</span>
                    </span>
                  </span>
                  <ClassStatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canManage ? (
        <section className="box">
          <SessionForms groupId={group.id} timezone={group.timezone} />
        </section>
      ) : null}
    </div>
  );
}

async function AnalyticsTab({ groupId }: { groupId: string }) {
  const a = await apiTry<AcademyGroupAnalyticsDto>(`/academy/groups/${groupId}/analytics`);
  if (!a) return <EmptyState title={t('academy.teacher.noPermission')} />;
  return (
    <div className="flex flex-col gap-4" data-testid="analytics">
      <div className="kpis">
        {[
          { label: t('academy.analytics.active'), value: String(a.activeStudents) },
          { label: t('academy.analytics.completion'), value: fmtPct(a.completionRate) },
          { label: t('academy.analytics.avgGrade'), value: fmtPct(a.averageGrade) },
          { label: t('academy.analytics.attendance'), value: fmtPct(a.attendanceRate) },
          { label: t('academy.analytics.pending'), value: String(a.pendingReviews) },
          { label: t('academy.analytics.overdue'), value: String(a.overdue) },
        ].map((k) => (
          <div key={k.label} className="kpi">
            <b>{k.value}</b>
            <span className="kpi-l">{k.label}</span>
          </div>
        ))}
      </div>
      <div className="tbl-wrap">
        <table className="tbl-admin">
          <thead>
            <tr>
              <th>{t('academy.f.student')}</th>
              <th>{t('academy.analytics.completed')}</th>
              <th>{t('academy.analytics.avgGrade')}</th>
              <th>{t('academy.analytics.attendance')}</th>
              <th>{t('academy.analytics.missed')}</th>
              <th>{t('academy.analytics.attention')}</th>
            </tr>
          </thead>
          <tbody>
            {a.students.map((s) => (
              <tr key={s.student.id}>
                <td className="ttl">{s.student.name}</td>
                <td>
                  {s.completed} / {s.expected}
                </td>
                <td>{fmtPct(s.averageGrade)}</td>
                <td>{fmtPct(s.attendanceRate)}</td>
                <td>{s.missed}</td>
                <td>
                  {s.flags.attention ? (
                    <span className="ac-flag">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {t('academy.analytics.missed')}
                    </span>
                  ) : null}
                  {s.flags.attendanceWarning ? (
                    <span className="ac-flag">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {t('academy.analytics.attendanceWarning')}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t('academy.analytics.note')}</p>
    </div>
  );
}
