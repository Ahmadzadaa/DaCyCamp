import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Compass, Route } from 'lucide-react';
import type { PathCardDto, TrackDto } from '@dacy/shared';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { PathCard } from '@/components/app/path-card';

export const metadata: Metadata = { title: t('nav.paths') };

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ istiqamet?: string }>;
}) {
  const sp = await searchParams;
  const [tracks, paths, user] = await Promise.all([
    apiFetch<TrackDto[]>('/tracks'),
    apiFetch<PathCardDto[]>(
      `/paths${sp.istiqamet ? `?track=${encodeURIComponent(sp.istiqamet)}` : ''}`,
    ),
    getCurrentUser(),
  ]);
  return (
    <div className="flex flex-col">
      <section className="hero">
        <div>
          <div className="hero-k">
            <h1>{t('paths.title')}</h1>
            <span className="badge badge-mint">{t('paths.heroBadge')}</span>
          </div>
          <p>{t('paths.heroText')}</p>
          <div className="hero-act">
            <Link href={user ? '/baslangic' : '/qeydiyyat'} className="b b-brand">
              <Compass aria-hidden />
              {t('paths.findMine')}
            </Link>
            <Link href="/kurslar" className="b b-navy">
              <BookOpen aria-hidden />
              {t('paths.browseCourses')}
            </Link>
          </div>
        </div>
        <HeroArt kind="route" />
      </section>

      <nav className="chips mt-8" aria-label={t('common.track')}>
        <Link
          href="/yollar"
          className={cn('chip', !sp.istiqamet && 'on')}
          aria-current={!sp.istiqamet ? 'page' : undefined}
        >
          {t('paths.all')}
        </Link>
        {tracks.map((tr) => (
          <Link
            key={tr.slug}
            href={`/yollar?istiqamet=${tr.slug}`}
            className={cn('chip', sp.istiqamet === tr.slug && 'on')}
            style={{ ['--c' as string]: tr.color }}
            aria-current={sp.istiqamet === tr.slug ? 'page' : undefined}
          >
            <span className="cdot" aria-hidden />
            {tr.title}
          </Link>
        ))}
      </nav>
      <div className="tb">
        <span className="cnt">
          <b>{paths.length}</b> {t('paths.countUnit')}
        </span>
      </div>
      {paths.length === 0 ? (
        <EmptyState icon={Route} title={t('paths.empty')} description={t('paths.emptyDesc')} />
      ) : (
        <div className="cards">
          {paths.map((p) => (
            <PathCard key={p.id} path={p} />
          ))}
        </div>
      )}
    </div>
  );
}
