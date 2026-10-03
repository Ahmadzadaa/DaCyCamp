import type { Metadata } from 'next';
import Link from 'next/link';
import { Crown, EyeOff, Trophy } from 'lucide-react';
import type { LeaderboardDto, LeaderboardPeriod } from '@dacy/shared';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t, type TKey } from '@/lib/i18n';
import { cn, fmtNum } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';

export const metadata: Metadata = { title: t('hub.lbTitle') };

const PERIODS: Array<{ key: LeaderboardPeriod; label: TKey }> = [
  { key: 'week', label: 'hub.lbWeek' },
  { key: 'month', label: 'hub.lbMonth' },
  { key: 'all', label: 'hub.lbAll' },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dovr?: string }>;
}) {
  const { dovr } = await searchParams;
  const period = PERIODS.find((p) => p.key === dovr)?.key ?? 'week';
  const [lb, user] = await Promise.all([
    apiTry<LeaderboardDto>(`/leaderboard?period=${period}`),
    getCurrentUser(),
  ]);
  const rows = lb?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meInTop = rows.some((r) => r.me);

  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('hub.lbTitle')}</h1>
            <span className="badge badge-mint">{t('hub.lbBadge')}</span>
          </div>
          <p>{t('hub.lbText')}</p>
        </div>
        <HeroArt kind="trophy" />
      </section>

      <nav className="tabs !mb-0" aria-label={t('hub.lbTitle')}>
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={p.key === 'week' ? '/liderler' : `/liderler?dovr=${p.key}`}
            className={cn(period === p.key && 'on')}
            aria-current={period === p.key ? 'page' : undefined}
          >
            {t(p.label)}
          </Link>
        ))}
        {lb ? (
          <span className="ml-auto self-center text-sm text-muted">
            {t('hub.lbParticipants', { n: lb.participants })}
          </span>
        ) : null}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title={t('hub.lbEmpty')} description={t('hub.lbEmptyHint')} />
      ) : (
        <>
          <div className="podium">
            {[podium[1], podium[0], podium[2]].map((r, i) =>
              r ? (
                <div
                  key={`pod-${i}`}
                  className={cn('pod', `p${r.rank <= 3 ? r.rank : 3}`, r.me && 'me')}
                >
                  {r.rank === 1 ? <Crown className="pod-crown" aria-hidden /> : null}
                  <span className="avatar pod-av">{r.initials}</span>
                  <b>
                    {r.name}
                    {r.me ? <span className="lb-you">{t('hub.lbYou')}</span> : null}
                  </b>
                  <span className="pod-xp">{fmtNum(r.xp)} XP</span>
                  <span className="pod-base">{r.rank}</span>
                </div>
              ) : (
                <div key={`empty-${i}`} className="pod ghost" aria-hidden />
              ),
            )}
          </div>

          {rest.length ? (
            <div className="tbl-wrap">
              <table className="tbl-admin lb">
                <thead>
                  <tr>
                    <th className="w-20">{t('hub.lbRank')}</th>
                    <th>{t('hub.lbStudent')}</th>
                    <th className="text-right">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r, i) => (
                    <tr key={`${i}-${r.rank}-${r.name}`} className={cn(r.me && 'me')}>
                      <td className="font-bold tabular-nums">#{r.rank}</td>
                      <td>
                        <span className="flex items-center gap-3">
                          <span className="avatar sm">{r.initials}</span>
                          <b>{r.name}</b>
                          {r.me ? <span className="lb-you">{t('hub.lbYou')}</span> : null}
                        </span>
                      </td>
                      <td className="text-right font-bold tabular-nums">{fmtNum(r.xp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}

      {!user ? (
        <Link href="/giris?next=/liderler" className="lb-me">
          {t('hub.lbLogin')}
        </Link>
      ) : lb?.me?.hidden ? (
        <Link href="/profil" className="lb-me">
          <EyeOff aria-hidden />
          {t('hub.lbHidden')}
        </Link>
      ) : lb?.me && !meInTop ? (
        <div className="lb-me">
          <b>{t('hub.lbYourRank')}:</b>
          {lb.me.rank ? (
            <>
              <span className="font-bold">#{lb.me.rank}</span>
              <span className="text-muted">· {fmtNum(lb.me.xp)} XP</span>
            </>
          ) : (
            <span className="text-muted">{t('hub.lbNotRanked')}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
