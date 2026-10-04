import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Award, BookOpen, Check, Flame, Play, Route, Zap } from 'lucide-react';
import type { DashboardDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t, tList } from '@/lib/i18n';
import { cn, firstName, fmtNum } from '@/lib/utils';
import { HeroArt } from '@/components/app/hero-art';
import { stepLucide } from '@/components/app/step-icon';

export function generateMetadata(): Metadata {
  return { title: t('nav.dashboard') };
}

export default async function DashboardPage() {
  const d = await apiTry<DashboardDto>('/me/dashboard');
  if (!d) redirect('/giris?next=/panel');
  const days = tList('dash.days');
  const left = Math.max(0, d.weeklyGoal - d.weekTasks);
  const summary =
    d.courses.length === 0
      ? t('dash.weekSummaryNew')
      : d.weekTasks === 0
        ? t('dash.weekSummaryNone', { goal: d.weeklyGoal })
        : left === 0
          ? t('dash.weekSummaryDone', { done: d.weekTasks })
          : t('dash.weekSummary', { done: d.weekTasks, left });
  const StepIc = d.continue ? stepLucide(d.continue.stepType) : BookOpen;

  return (
    <div>
      <section className="hero">
        <div>
          <div className="hero-k">
            <h1>{t('dash.welcome', { name: firstName(d.user.name) })}</h1>
            {d.streakDays > 0 ? (
              <span className="badge badge-mint">
                <Flame aria-hidden />
                {t('dash.streakBadge', { n: d.streakDays })}
              </span>
            ) : null}
          </div>
          <p>{summary}</p>
          <div className="hero-act">
            {d.continue ? (
              <Link href={d.continue.url} className="b b-brand">
                <Play aria-hidden />
                {t('dash.continue')}
              </Link>
            ) : (
              <Link href="/kurslar" className="b b-brand">
                <BookOpen aria-hidden />
                {t('dash.pickCourse')}
              </Link>
            )}
            {d.activePath ? (
              <Link href={`/yol/${d.activePath.slug}`} className="b b-navy">
                <Route aria-hidden />
                {t('dash.openPath')}
              </Link>
            ) : null}
          </div>
        </div>
        <HeroArt kind="dashboard" />
      </section>

      <div className="dash">
        <div className="flex min-w-0 flex-col gap-6">
          {d.continue ? (
            <section
              className="cont"
              style={{ ['--c' as string]: d.continue.trackColor }}
              aria-label={t('dash.whereLeft')}
            >
              <span className="tic lg">
                <StepIc aria-hidden />
              </span>
              <div className="min-w-0">
                <small>{t('dash.whereLeft')}</small>
                <h2 className="truncate">{d.continue.stepTitle}</h2>
                <span className="cont-meta">
                  {t('dash.positionLine', {
                    course: d.continue.courseTitle,
                    m: d.continue.moduleNumber,
                    s: d.continue.stepNumber,
                  })}
                </span>
              </div>
              <Link href={d.continue.url} className="b b-dark">
                {t('dash.continue')}
                <ArrowRight aria-hidden />
              </Link>
            </section>
          ) : null}

          <section className="box" aria-labelledby="my-courses">
            <h2 id="my-courses" className="box-h">
              <BookOpen aria-hidden />
              {t('dash.myCourses')}
            </h2>
            {d.courses.length ? (
              <ul className="plist">
                {d.courses.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/kurs/${c.slug}`}
                      className="pi"
                      style={{ ['--c' as string]: c.trackColor }}
                    >
                      <b className="truncate">{c.title}</b>
                      <span className={cn('pi-pct', c.completedAt && 'done')}>
                        {c.completedAt ? (
                          <>
                            <Check aria-hidden /> {t('dash.courseDone')}
                          </>
                        ) : (
                          `${c.percent}%`
                        )}
                      </span>
                      <span className="bar" aria-hidden>
                        <i style={{ width: `${c.percent}%` }} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-muted">{t('dash.emptyDesc')}</p>
                <Link href="/kurslar" className="b b-brand b-sm">
                  {t('dash.browse')}
                </Link>
              </div>
            )}
            {d.courses.length ? (
              <Link href="/kurslar" className="box-more">
                {t('dash.allCourses')} <ArrowRight aria-hidden />
              </Link>
            ) : null}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="stats">
            <div className="stat">
              <Zap aria-hidden />
              <b>{fmtNum(d.xpTotal)}</b>
              <span>{t('dash.xp')}</span>
            </div>
            <div className="stat">
              <Flame aria-hidden />
              <b>{d.streakDays}</b>
              <span>{t('dash.streak', { n: d.streakDays })}</span>
            </div>
            <div className="stat">
              <Check aria-hidden />
              <b>{fmtNum(d.stepsCompleted)}</b>
              <span>{t('dash.tasksDone', { n: d.stepsCompleted })}</span>
            </div>
            <div className="stat">
              <Award aria-hidden />
              <b>{d.certificates}</b>
              <span>{t('dash.certificates', { n: d.certificates })}</span>
            </div>
          </div>

          <div className="box">
            <h2 className="box-h">{t('dash.thisWeek')}</h2>
            <ol className="week" aria-label={t('dash.thisWeek')}>
              {d.week.map((on, i) => (
                <li key={i}>
                  <i className={on ? 'on' : ''} title={days[i]} />
                  <span>{days[i]}</span>
                </li>
              ))}
            </ol>
          </div>

          {d.activePath ? (
            <div
              className="box"
              style={{ ['--c' as string]: d.activePath.trackColor }}
              data-testid="dash-active-path"
            >
              <h2 className="box-h">{t('dash.activePath')}</h2>
              <Link href={`/yol/${d.activePath.slug}`} className="font-bold hover:underline">
                {d.activePath.title}
              </Link>
              <div className="nbar">
                <i style={{ width: `${d.activePath.percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {d.activePath.next
                  ? t('dash.nextLine', { pct: d.activePath.percent, next: d.activePath.next.title })
                  : `${d.activePath.percent}% · ✓ ${t('dash.pathDone')}`}
              </p>
              {d.activePath.next ? (
                <Link href={d.activePath.next.url} className="b b-ghost b-sm mt-3 w-full">
                  {t('paths.continue')}
                  <ArrowRight aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : (
            <Link href="/baslangic" className="box path-cta" data-testid="dash-pick-path">
              <span className="tic lg" style={{ ['--c' as string]: 'var(--da)' }}>
                <Route aria-hidden />
              </span>
              <b>{t('dash.noPathTitle')}</b>
              <span className="text-sm text-muted">{t('dash.noPathText')}</span>
            </Link>
          )}

          {d.certificateItems.length ? (
            <div className="box">
              <h2 className="box-h">{t('cert.myTitle')}</h2>
              <ul className="flex flex-col gap-2">
                {d.certificateItems.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/sertifikat/${c.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                      data-testid="dash-cert"
                    >
                      <Award className="size-4 shrink-0" style={{ color: c.trackColor }} />
                      <span className="truncate">{c.courseTitle}</span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                        {c.serial}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/sertifikatlar" className="box-more">
                {t('nav.certificates')} <ArrowRight aria-hidden />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
