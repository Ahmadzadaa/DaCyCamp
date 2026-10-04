import type { Metadata } from 'next';
import { getLevelLabels } from '@/lib/level-labels';
import Link from 'next/link';
import { BookOpen, Compass, Route } from 'lucide-react';
import type { PathCardDto, RoadmapDto, RoadmapSummaryDto } from '@dacy/shared';
import { apiFetch, apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { PathCard } from '@/components/app/path-card';
import { TrackTile } from '@/components/app/track-icon';
import { RoadmapView } from '@/components/app/roadmap-view';

export function generateMetadata(): Metadata {
  return { title: t('roadmap.heroTitle') };
}

/**
 * Karyera yolları: peşə tabları → səviyyə nərdivanı (Intern → Senior) → bacarıqlar.
 * Aşağıda həmin istiqamətin praktiki yolları (kurs + layihə + imtahan).
 */
export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ karyera?: string; seviyye?: string }>;
}) {
  const levels = await getLevelLabels();
  const sp = await searchParams;
  const [list, user] = await Promise.all([
    apiFetch<RoadmapSummaryDto[]>('/roadmaps'),
    getCurrentUser(),
  ]);
  const current = list.find((r) => r.slug === sp.karyera) ?? list[0];
  const [roadmap, paths] = await Promise.all([
    current ? apiTry<RoadmapDto>(`/roadmaps/${current.slug}`) : Promise.resolve(null),
    apiFetch<PathCardDto[]>(
      `/paths${current?.track ? `?track=${encodeURIComponent(current.track.slug)}` : ''}`,
    ),
  ]);
  const level =
    roadmap?.content.levels.find((l) => l.key === sp.seviyye)?.key ??
    roadmap?.content.levels[0]?.key;

  return (
    <div className="flex flex-col">
      <section className="hero">
        <div>
          <div className="hero-k">
            <h1>{t('roadmap.heroTitle')}</h1>
            <span className="badge badge-mint">{t('roadmap.heroBadge')}</span>
          </div>
          <p>{t('roadmap.heroText')}</p>
          <div className="hero-act">
            <Link href={user ? '/baslangic' : '/qeydiyyat'} className="b b-brand">
              <Compass aria-hidden />
              {t('roadmap.pickPath')}
            </Link>
            <Link href="/kurslar" className="b b-navy">
              <BookOpen aria-hidden />
              {t('roadmap.browse')}
            </Link>
          </div>
        </div>
        <HeroArt kind="route" />
      </section>

      {list.length === 0 || !roadmap || !level ? (
        <div className="mt-8">
          <EmptyState
            icon={Route}
            title={t('roadmap.empty')}
            description={t('roadmap.emptyDesc')}
          />
        </div>
      ) : (
        <>
          <nav className="rm-careers" aria-label={t('roadmap.careers')}>
            {list.map((r) => {
              const on = r.slug === roadmap.slug;
              const color = r.track?.color ?? 'var(--da)';
              return (
                <Link
                  key={r.slug}
                  href={`/yollar?karyera=${r.slug}`}
                  scroll={false}
                  className={cn('rm-career', on && 'on')}
                  style={{ ['--c' as string]: color }}
                  aria-current={on ? 'page' : undefined}
                  data-testid={`career-${r.slug}`}
                >
                  <TrackTile color={color} icon={r.track?.icon} slug={r.track?.slug ?? r.slug} />
                  <span className="min-w-0">
                    <b>{r.title}</b>
                    {r.tagline ? <small>{r.tagline}</small> : null}
                  </span>
                </Link>
              );
            })}
          </nav>

          <RoadmapView key={roadmap.slug} roadmap={roadmap} level={level} authed={!!user} />

          {paths.length ? (
            <section className="mt-14" aria-labelledby="rm-practical">
              <div className="rm-sec-h">
                <h2 id="rm-practical">{t('roadmap.practicalTitle')}</h2>
                <p>{t('roadmap.practicalText')}</p>
              </div>
              <div className="cards">
                {paths.map((p) => (
                  <PathCard key={p.id} path={p} levels={levels} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
