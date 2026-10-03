import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Crown, Flag, Medal, Trophy, Users } from 'lucide-react';
import type { ContestBoardDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { TrackBadge } from '@/components/app/track-badge';
import { fmtAgo } from '@/components/admin/format';

type Props = { params: Promise<{ stepId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stepId } = await params;
  const d = await apiTry<ContestBoardDto>(`/contests/${encodeURIComponent(stepId)}`);
  return { title: d ? `${d.contest.title} · ${t('hub.scoreboard')}` : t('hub.contestsTitle') };
}

export default async function ContestBoardPage({ params }: Props) {
  const { stepId } = await params;
  const d = await apiTry<ContestBoardDto>(`/contests/${encodeURIComponent(stepId)}`);
  if (!d) notFound();
  const c = d.contest;
  return (
    <div className="flex flex-col gap-6" style={{ ['--c' as string]: c.trackColor }}>
      <Link href="/yarislar" className="crumb-back !mb-0">
        <ArrowLeft aria-hidden />
        {t('hub.backToContests')}
      </Link>
      <section className="hero sm accent">
        <div className="min-w-0">
          <div className="hero-k">
            <TrackBadge color={c.trackColor}>{c.trackTitle}</TrackBadge>
            <span className="badge badge-mint">
              <Flag aria-hidden /> {t('hub.room')}
            </span>
          </div>
          <h1 className="mt-3">{c.title}</h1>
          <p>{c.courseTitle}</p>
          <div className="lp-facts">
            <div>
              <b>{c.tasks}</b>
              <span>{t('hub.tasks', { n: '' }).trim()}</span>
            </div>
            <div>
              <b>{c.points}</b>
              <span>{t('hub.points', { n: '' }).trim()}</span>
            </div>
            <div>
              <b>{c.participants}</b>
              <span>{t('hub.participants', { n: '' }).trim()}</span>
            </div>
            <div>
              <b>{c.finishers}</b>
              <span>{t('hub.finishers', { n: '' }).trim()}</span>
            </div>
          </div>
          <div className="hero-act">
            <Link href={c.url} className="b b-brand">
              {c.enrolled ? t('hub.enter') : t('hub.enroll')}
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
        <HeroArt kind="swords" />
      </section>

      <section aria-labelledby="sb-h">
        <h2 id="sb-h" className="h2 !mt-0 flex items-center gap-3">
          <Trophy aria-hidden className="size-6 text-de" />
          {t('hub.scoreboard')}
        </h2>
        {d.rows.length === 0 ? (
          <EmptyState icon={Flag} title={t('hub.boardEmpty')} />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl-admin lb">
              <thead>
                <tr>
                  <th className="w-20">{t('hub.lbRank')}</th>
                  <th>{t('hub.lbStudent')}</th>
                  <th>{t('hub.solved')}</th>
                  <th>{t('hub.lastSolve')}</th>
                  <th className="text-right">
                    <Medal aria-hidden className="inline size-4" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r, i) => (
                  <tr key={`${i}-${r.name}`} className={cn(r.me && 'me')}>
                    <td className="font-bold tabular-nums">
                      {r.rank === 1 ? (
                        <Crown aria-label="1" className="inline size-5 text-de" />
                      ) : (
                        `#${r.rank}`
                      )}
                    </td>
                    <td>
                      <span className="flex items-center gap-3">
                        <span className="avatar sm">{r.initials}</span>
                        <b>{r.name}</b>
                        {r.me ? <span className="lb-you">{t('hub.lbYou')}</span> : null}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      {r.solved} / {c.tasks}
                    </td>
                    <td className="dt">{fmtAgo(r.lastSolveAt)}</td>
                    <td className="text-right font-bold tabular-nums">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Users aria-hidden className="size-4" />
          {t('hub.participants', { n: c.participants })} · {t('hub.finishers', { n: c.finishers })}
        </p>
      </section>
    </div>
  );
}
