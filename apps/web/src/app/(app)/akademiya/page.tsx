import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, ClipboardList, GraduationCap, Users, Video } from 'lucide-react';
import type { AcademyStudentOverviewDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { AssignmentRows } from '@/components/academy/assignment-rows';
import { ClassStatusBadge, EnrollmentBadge } from '@/components/academy/badges';
import { fmtScore, fmtZoned } from '@/components/academy/format';

export function generateMetadata(): Metadata {
  return { title: t('academy.title') };
}

export default async function AcademyOverviewPage() {
  const o = await apiTry<AcademyStudentOverviewDto>('/academy/me/overview');
  if (!o) notFound();
  if (o.groups.length === 0)
    return (
      <EmptyState
        icon={GraduationCap}
        title={t('academy.empty.groups')}
        description={t('academy.empty.groupsDesc')}
      />
    );
  const next = o.nextSession;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="box" aria-labelledby="ac-up">
          <div className="feed-h">
            <h2 id="ac-up" className="box-h !mb-0">
              <ClipboardList aria-hidden />
              {t('academy.overview.upcoming')}
            </h2>
            <Link href="/akademiya/tapsiriqlar" className="text-sm font-semibold">
              {t('academy.overview.allAssignments')}
            </Link>
          </div>
          {o.upcoming.length ? (
            <AssignmentRows rows={o.upcoming} />
          ) : (
            <p className="text-sm text-muted">{t('academy.empty.assignments')}</p>
          )}
        </section>

        <section className="box" aria-labelledby="ac-grades">
          <h2 id="ac-grades" className="box-h">
            <GraduationCap aria-hidden />
            {t('academy.overview.recentGrades')}
          </h2>
          {o.recentGrades.length ? (
            <ul className="sup-list">
              {o.recentGrades.map((g) => (
                <li key={g.assignmentId}>
                  <Link href={`/akademiya/tapsiriqlar/${g.assignmentId}`} className="ac-row">
                    <span className="flex min-w-0 flex-col gap-1">
                      <b className="truncate">{g.assignmentTitle}</b>
                      <span className="ac-meta">
                        <span>{g.groupCode}</span>
                        <span>{fmtZoned(g.releasedAt, { time: false })}</span>
                      </span>
                    </span>
                    <span className="ac-score">
                      {fmtScore(g.finalScore)} <small>/ {fmtScore(g.maxScore)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('academy.empty.grades')}</p>
          )}
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <section className="box" aria-labelledby="ac-next" data-testid="academy-next-session">
          <h2 id="ac-next" className="box-h">
            <CalendarClock aria-hidden />
            {t('academy.overview.nextSession')}
          </h2>
          {next ? (
            <div className="flex flex-col gap-2">
              <b>{next.title}</b>
              <span className="ac-meta">
                <span>{next.groupCode}</span>
                <span>{fmtZoned(next.startsAt)}</span>
                {next.status !== 'SCHEDULED' ? <ClassStatusBadge status={next.status} /> : null}
              </span>
              {next.meetingUrl ? (
                <a
                  href={next.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b b-brand b-sm self-start"
                >
                  <Video aria-hidden />
                  {t('academy.overview.join')}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">{t('academy.overview.noNext')}</p>
          )}
        </section>

        <section className="box" aria-labelledby="ac-groups">
          <h2 id="ac-groups" className="box-h">
            <Users aria-hidden />
            {t('academy.overview.myGroups')}
          </h2>
          <ul className="flex flex-col gap-3" data-testid="academy-groups">
            {o.groups.map((g) => (
              <li key={g.id} className="ac-item">
                <div className="ac-item-h">
                  <b>
                    {g.code} · {g.name}
                  </b>
                  <EnrollmentBadge status={g.enrollmentStatus} />
                </div>
                <span className="ac-meta">
                  <span>{g.programTitle}</span>
                  {g.instructors.length ? (
                    <span>
                      {t('academy.overview.instructors')}: <b>{g.instructors.join(', ')}</b>
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
