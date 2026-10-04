import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flag, Medal, Swords, Users } from 'lucide-react';
import type { ContestDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { TrackTile } from '@/components/app/track-icon';

export function generateMetadata(): Metadata {
  return { title: t('hub.contestsTitle') };
}

export default async function ContestsPage() {
  const list = (await apiTry<ContestDto[]>('/contests')) ?? [];
  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('hub.contestsTitle')}</h1>
            <span className="badge badge-mint">
              <Flag aria-hidden />
              {t('hub.contestsBadge')}
            </span>
          </div>
          <p>{t('hub.contestsText')}</p>
        </div>
        <HeroArt kind="swords" />
      </section>

      {list.length === 0 ? (
        <EmptyState
          icon={Swords}
          title={t('hub.contestsEmpty')}
          description={t('hub.contestsEmptyHint')}
        />
      ) : (
        <div className="cards">
          {list.map((c) => {
            const pct = c.mine && c.tasks ? Math.round((c.mine.solved / c.tasks) * 100) : 0;
            return (
              <article key={c.stepId} className="kc" style={{ ['--c' as string]: c.trackColor }}>
                <span className="kind">
                  {t('hub.room')} · {c.trackTitle}
                </span>
                <h3>
                  <Link href={`/yarislar/${c.stepId}`}>{c.title}</Link>
                </h3>
                <span className="text-sm text-muted">{c.courseTitle}</span>
                <div className="contest-facts">
                  <span>
                    <Flag aria-hidden /> {t('hub.tasks', { n: c.tasks })}
                  </span>
                  <span>
                    <Medal aria-hidden /> {t('hub.points', { n: c.points })}
                  </span>
                  <span>
                    <Users aria-hidden /> {t('hub.participants', { n: c.participants })}
                  </span>
                </div>
                {c.mine && c.mine.solved > 0 ? (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>{t('hub.yourProgress')}</span>
                      <span>
                        {c.mine.solved} / {c.tasks} · {t('hub.points', { n: c.mine.points })}
                      </span>
                    </div>
                    <div className="prog">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null}
                <div className="ft">
                  <span className="dur">
                    <TrackTile color={c.trackColor} icon={c.trackIcon} />
                    <Link
                      href={`/yarislar/${c.stepId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {t('hub.scoreboard')}
                    </Link>
                  </span>
                  <Link href={c.url} className={`b b-sm ${c.enrolled ? 'b-brand' : 'b-outline'}`}>
                    {!c.enrolled
                      ? t('hub.enroll')
                      : c.mine && c.mine.solved > 0
                        ? t('hub.continue')
                        : t('hub.enter')}
                    {c.enrolled ? <ArrowRight aria-hidden /> : null}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
