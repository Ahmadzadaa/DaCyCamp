import Link from 'next/link';
import type { MeSummaryDto } from '@dacy/shared';
import { t } from '@/lib/i18n';

/** Sidebar-ın altındakı «Həftəlik hədəf» kartı (skrinşot: 5 / 8 tapşırıq · 12 gün seriya) */
export function WeeklyGoal({ summary }: { summary: MeSummaryDto }) {
  const goal = Math.max(1, summary.weeklyGoal);
  const pct = Math.min(100, Math.round((summary.weekTasks / goal) * 100));
  const done = summary.weekTasks >= goal;
  return (
    <Link href="/fealiyyetim" className="goal" data-testid="weekly-goal">
      <b>{t('shell.weeklyGoal')}</b>
      <span
        className="goal-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(summary.weekTasks, goal)}
        aria-label={t('shell.weeklyGoal')}
      >
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="goal-txt">
        {done
          ? t('shell.weeklyGoalDone', { streak: summary.streakDays })
          : t('shell.weeklyGoalText', {
              done: summary.weekTasks,
              goal,
              streak: summary.streakDays,
            })}
      </span>
    </Link>
  );
}

/** Qonaq üçün sidebar altı: qeydiyyata çağırış */
export function GuestCta() {
  return (
    <div className="goal">
      <b>{t('shell.guestTitle')}</b>
      <span className="goal-txt">{t('shell.guestText')}</span>
      <span className="mt-3 flex gap-2">
        <Link href="/qeydiyyat" className="b b-brand b-sm flex-1">
          {t('nav.register')}
        </Link>
        <Link href="/giris" className="b b-sm flex-1 bg-navy-line text-on-dark hover:bg-navy">
          {t('nav.login')}
        </Link>
      </span>
    </div>
  );
}
