import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Award,
  BookCheck,
  CalendarCheck,
  Flag,
  Flame,
  Lightbulb,
  Route,
  Target,
  Trophy,
  UserCog,
  Zap,
} from 'lucide-react';
import type { ActivityDto, MeSummaryDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t, type TKey } from '@/lib/i18n';
import { cn, fmtNum } from '@/lib/utils';
import { HeroArt } from '@/components/app/hero-art';
import { fmtAgo, fmtDate } from '@/components/admin/format';

export const metadata: Metadata = { title: t('hub.activityTitle') };

const REASON_ICON: Record<string, typeof Zap> = {
  STEP_COMPLETED: BookCheck,
  CTF_TASK_SOLVED: Flag,
  HINT_USED: Lightbulb,
  COURSE_COMPLETED: Award,
  PATH_ITEM_COMPLETED: Route,
  PATH_COMPLETED: Trophy,
  MANUAL: UserCog,
};

function level(steps: number) {
  if (steps === 0) return 0;
  if (steps === 1) return 1;
  if (steps <= 3) return 2;
  if (steps <= 6) return 3;
  return 4;
}

export default async function ActivityPage() {
  const [a, s] = await Promise.all([
    apiTry<ActivityDto>('/me/activity'),
    apiTry<MeSummaryDto>('/me/summary'),
  ]);
  if (!a) redirect('/giris?next=/fealiyyetim');
  const months = t('dates.months').split(',');
  // həftə sütunları (B.e-dən başlayır)
  const weeks: ActivityDto['days'][] = [];
  for (let i = 0; i < a.days.length; i += 7) weeks.push(a.days.slice(i, i + 7));
  // ay adları: ayın ilk həftəsində; əvvəlki etiketdən ən azı 3 sütun sonra (üst-üstə düşməsin)
  let lastLabel = -10;
  const monthLabels = weeks.map((w, i) => {
    const d = new Date(`${w[0]!.date}T00:00:00Z`);
    const prev = i > 0 ? new Date(`${weeks[i - 1]![0]!.date}T00:00:00Z`) : null;
    const isNew = !prev || prev.getUTCMonth() !== d.getUTCMonth();
    if (!isNew || i - lastLabel < 3) return '';
    lastLabel = i;
    return months[d.getUTCMonth()] ?? '';
  });
  const maxTrack = Math.max(1, ...a.byTrack.map((x) => x.steps));
  const goal = s ? Math.max(1, s.weeklyGoal) : 1;
  const goalPct = s ? Math.min(100, Math.round((s.weekTasks / goal) * 100)) : 0;
  const kpis: Array<{ icon: typeof Zap; value: number; label: TKey }> = [
    { icon: Zap, value: a.totals.xp, label: 'hub.kpiXp' },
    { icon: BookCheck, value: a.totals.steps, label: 'hub.kpiSteps' },
    { icon: CalendarCheck, value: a.totals.activeDays, label: 'hub.kpiDays' },
    { icon: Flame, value: a.totals.bestStreak, label: 'hub.kpiBest' },
    { icon: Award, value: a.totals.certificates, label: 'hub.kpiCerts' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('hub.activityTitle')}</h1>
            {a.totals.currentStreak > 0 ? (
              <span className="badge badge-mint">
                <Flame aria-hidden />
                {t('hub.streakBadge', { n: a.totals.currentStreak })}
              </span>
            ) : null}
          </div>
          <p>
            {a.totals.activeDays
              ? t('hub.activityText', { days: a.totals.activeDays, steps: a.totals.steps })
              : t('hub.activityTextNone')}
          </p>
        </div>
        <HeroArt kind="activity" />
      </section>

      <div className="kpis five">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <span className="kpi-ic">
              <k.icon aria-hidden />
            </span>
            <b>{fmtNum(k.value)}</b>
            <span className="kpi-l">{t(k.label)}</span>
          </div>
        ))}
      </div>

      <section className="box" aria-labelledby="heat-h">
        <div className="feed-h">
          <h2 id="heat-h" className="box-h !mb-0">
            {t('hub.heatTitle')}
          </h2>
          <span className="heat-legend" aria-hidden>
            {t('hub.heatLess')}
            {[0, 1, 2, 3, 4].map((l) => (
              <i key={l} className={`l${l}`} />
            ))}
            {t('hub.heatMore')}
          </span>
        </div>
        <div className="heat-scroll">
          <div className="heat" role="img" aria-label={t('hub.heatTitle')}>
            <div className="heat-months" aria-hidden>
              {monthLabels.map((m, i) => (
                <span key={weeks[i]![0]!.date}>{m}</span>
              ))}
            </div>
            <div className="heat-grid">
              {weeks.map((w) => (
                <div key={w[0]!.date} className="heat-col">
                  {w.map((d) => (
                    <i
                      key={d.date}
                      className={`l${level(d.steps)}`}
                      title={t('hub.heatCell', {
                        date: fmtDate(`${d.date}T12:00:00Z`),
                        steps: d.steps,
                        xp: d.xp,
                      })}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="box" aria-labelledby="ev-h">
          <h2 id="ev-h" className="box-h">
            {t('hub.events')}
          </h2>
          {a.events.length === 0 ? (
            <p className="text-sm text-muted">{t('hub.eventsEmpty')}</p>
          ) : (
            <ul className="xp-feed">
              {a.events.map((e) => {
                const Icon = REASON_ICON[e.reason] ?? Zap;
                const body = (
                  <>
                    <span className={cn('notif-ic', e.amount < 0 && 'neg')}>
                      <Icon aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">
                        {e.title ?? t(`hub.reason.${e.reason}` as TKey)}
                      </b>
                      <span className="block truncate text-xs text-muted">
                        {t(`hub.reason.${e.reason}` as TKey)}
                        {e.context ? ` · ${e.context}` : ''} · {fmtAgo(e.at)}
                      </span>
                    </span>
                    <span className={cn('xp-amt', e.amount < 0 && 'neg')}>
                      {e.amount > 0 ? '+' : ''}
                      {e.amount} XP
                    </span>
                  </>
                );
                return (
                  <li key={e.id}>
                    {e.url ? (
                      <Link href={e.url} className="xp-row">
                        {body}
                      </Link>
                    ) : (
                      <div className="xp-row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          {s ? (
            <section className="box">
              <h2 className="box-h">
                <Target aria-hidden />
                {t('hub.goalCard')}
              </h2>
              <div className="flex items-end gap-2">
                <b className="text-3xl leading-none">{s.weekTasks}</b>
                <span className="pb-0.5 text-muted">/ {goal}</span>
              </div>
              <div className="nbar !h-2">
                <i style={{ width: `${goalPct}%`, background: 'var(--brand)' }} />
              </div>
              <Link href="/profil" className="box-more">
                {t('hub.goalChange')}
              </Link>
            </section>
          ) : null}
          <section className="box">
            <h2 className="box-h">{t('hub.byTrack')}</h2>
            {a.byTrack.length === 0 ? (
              <p className="text-sm text-muted">{t('hub.byTrackEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {a.byTrack.map((tr) => (
                  <li key={tr.title}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <b>{tr.title}</b>
                      <span className="text-muted">{tr.steps}</span>
                    </div>
                    <div className="nbar !mt-0 !h-2">
                      <i
                        style={{ width: `${(tr.steps / maxTrack) * 100}%`, background: tr.color }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
