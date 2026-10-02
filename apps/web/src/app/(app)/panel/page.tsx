import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, BookOpen } from 'lucide-react';
import type { DashboardDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t, tList } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';

export const metadata: Metadata = { title: t('nav.dashboard') };

export default async function DashboardPage() {
  const d = await apiTry<DashboardDto>('/me/dashboard');
  if (!d) redirect('/giris?next=/panel');
  const days = tList('dash.days');
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_300px]">
      <div>
        {d.continue ? (
          <section className="cont">
            <div className="min-w-0">
              <small>{t('dash.whereLeft')}</small>
              <h2 className="truncate">{d.continue.stepTitle}</h2>
              <small>
                {d.continue.courseTitle} · {d.continue.moduleTitle}
              </small>
            </div>
            <Link href={d.continue.url} className="b b-brand">
              {t('dash.continue')}
            </Link>
          </section>
        ) : (
          <EmptyState
            icon={BookOpen}
            title={t('dash.empty')}
            description={t('dash.emptyDesc')}
            action={
              <Link href="/kurslar" className="b b-brand">
                {t('dash.browse')}
              </Link>
            }
          />
        )}
        {d.courses.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {d.courses.map((c) => (
              <Link
                key={c.slug}
                href={`/kurs/${c.slug}`}
                className="pi"
                style={{ ['--c' as string]: c.trackColor }}
              >
                <b className="truncate">{c.title}</b>
                <span>{c.percent}%</span>
                <div className="bar">
                  <i style={{ width: `${c.percent}%` }} />
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <aside className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-2 gap-3">
          <div className="stat">
            <b>{d.xpTotal.toLocaleString('az-AZ')}</b>
            <span>{t('dash.xp')}</span>
          </div>
          <div className="stat">
            <b>{d.streakDays} 🔥</b>
            <span>{t('dash.streak')}</span>
          </div>
          <div className="stat">
            <b>{d.stepsCompleted}</b>
            <span>{t('dash.tasksDone')}</span>
          </div>
          <div className="stat">
            <b>{d.certificates}</b>
            <span>{t('dash.certificates')}</span>
          </div>
        </div>
        <div className="box">
          <b>{t('dash.thisWeek')}</b>
          <div className="week" aria-label={t('dash.thisWeek')}>
            {d.week.map((on, i) => (
              <i key={i} className={on ? 'on' : ''} title={days[i]} />
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[10px] text-muted">
            {days.map((x) => (
              <span key={x} className="flex-1 text-center">
                {x}
              </span>
            ))}
          </div>
        </div>
        {d.certificateItems.length ? (
          <div className="box">
            <b>{t('cert.myTitle')}</b>
            <ul className="mt-2 flex flex-col gap-2">
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
            <Link
              href="/sertifikatlar"
              className="mt-2 inline-block text-xs text-muted hover:underline"
            >
              {t('nav.certificates')} →
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
