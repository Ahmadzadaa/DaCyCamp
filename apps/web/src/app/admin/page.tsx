import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Plus,
  SquareTerminal,
  TrendingUp,
  Upload,
  Users,
  UserCheck,
  Layers,
} from 'lucide-react';
import type { AdminOverviewDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t, tList } from '@/lib/i18n';
import { fmtNum } from '@/lib/utils';
import { ActivityFeed } from '@/components/admin/activity-feed';

export const metadata: Metadata = { title: `${t('adminHome.title')} · ${t('app.admin')}` };

export default async function AdminHome() {
  const o = await apiFetch<AdminOverviewDto>('/admin/overview');
  const max = Math.max(1, ...o.activity.map((d) => d.steps));
  const total = o.activity.reduce((n, d) => n + d.steps, 0);
  const days = tList('dash.days');
  const tiles = [
    {
      icon: BookOpen,
      value: o.courses.all,
      label: t('adminHome.courses'),
      hint: t('adminHome.coursesHint', {
        published: o.courses.published,
        draft: o.courses.draft,
        archived: o.courses.archived,
      }),
      href: '/admin/kurslar',
    },
    {
      icon: Users,
      value: o.students,
      label: t('adminHome.students'),
      hint: o.newStudents7d ? t('adminHome.studentsHint', { n: o.newStudents7d }) : null,
      href: '/admin/telebeler',
    },
    { icon: TrendingUp, value: o.enrollments, label: t('adminHome.enrollments'), hint: null },
    {
      icon: UserCheck,
      value: o.activeLearners7d,
      label: t('adminHome.activeLearners'),
      hint: null,
    },
    { icon: Award, value: o.certificates, label: t('adminHome.certificates'), hint: null },
    {
      icon: ClipboardCheck,
      value: o.pendingReviews,
      label: t('adminHome.pendingReviews'),
      hint: null,
      href: '/admin/layiheler',
      alert: o.pendingReviews > 0,
    },
    {
      icon: SquareTerminal,
      value: o.activeLabs,
      label: t('adminHome.activeLabs'),
      hint: null,
      href: '/admin/lablar',
    },
    {
      icon: Layers,
      value: o.tracks,
      label: t('adminHome.tracks'),
      hint: null,
      href: '/admin/istiqametler',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="ph1 !mb-0">
        <div>
          <h1>{t('adminHome.title')}</h1>
          <p>{t('adminHome.subtitle')}</p>
        </div>
        <div className="ph1-act">
          <Link href="/admin/idxal" className="b b-ghost">
            <Upload aria-hidden />
            {t('adminHome.quickImport')}
          </Link>
          <Link href="/admin/kurslar/yeni" className="b b-brand">
            <Plus aria-hidden />
            {t('adminHome.quickNew')}
          </Link>
        </div>
      </div>

      <div className="kpis">
        {tiles.map((k) => {
          const Icon = k.icon;
          const body = (
            <>
              <span className="kpi-ic">
                <Icon aria-hidden />
              </span>
              <b>{fmtNum(k.value)}</b>
              <span className="kpi-l">{k.label}</span>
              {k.hint ? <span className="kpi-h">{k.hint}</span> : null}
            </>
          );
          return k.href ? (
            <Link key={k.label} href={k.href} className={`kpi${k.alert ? ' alert' : ''}`}>
              {body}
            </Link>
          ) : (
            <div key={k.label} className="kpi">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="box" aria-labelledby="act-h">
          <div className="feed-h">
            <h2 id="act-h" className="box-h !mb-0">
              {t('adminHome.activity')}
            </h2>
            <span className="text-sm text-muted">
              {t('adminHome.activityTotal', { n: fmtNum(total) })}
            </span>
          </div>
          <div className="spark" role="img" aria-label={t('adminHome.activity')}>
            {o.activity.map((d) => {
              const dow = (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7;
              return (
                <div key={d.date} className="spark-col" title={`${d.date}: ${d.steps}`}>
                  <span className="spark-v">{d.steps || ''}</span>
                  <i
                    style={{ height: `${Math.max(4, (d.steps / max) * 100)}%` }}
                    className={d.steps ? 'on' : ''}
                  />
                  <span className="spark-d">{days[dow]}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="box" aria-labelledby="top-h">
          <h2 id="top-h" className="box-h">
            {t('adminHome.topCourses')}
          </h2>
          {o.topCourses.length === 0 ? (
            <p className="text-sm text-muted">{t('adminHome.noCourses')}</p>
          ) : (
            <ul className="plist">
              {o.topCourses.map((c) => {
                const pct = c.enrollments ? Math.round((c.completed / c.enrollments) * 100) : 0;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/admin/kurslar/${c.slug}`}
                      className="pi"
                      style={{ ['--c' as string]: c.trackColor }}
                    >
                      <b className="truncate">{c.title}</b>
                      <span className="pi-pct">{fmtNum(c.enrollments)}</span>
                      <span className="bar" aria-hidden>
                        <i style={{ width: `${pct}%` }} />
                      </span>
                      <span className="col-span-2 -mt-1 text-xs text-muted">
                        {t('adminHome.completedOf', { done: c.completed, total: c.enrollments })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ActivityFeed limit={8} />
    </div>
  );
}
