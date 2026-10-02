import type { Metadata } from 'next';
import Link from 'next/link';
import { Route } from 'lucide-react';
import type { PathCardDto, TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { PathCard } from '@/components/app/path-card';

export const metadata: Metadata = { title: t('nav.paths') };

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ istiqamet?: string }>;
}) {
  const sp = await searchParams;
  const [tracks, paths] = await Promise.all([
    apiFetch<TrackDto[]>('/tracks'),
    apiFetch<PathCardDto[]>(
      `/paths${sp.istiqamet ? `?track=${encodeURIComponent(sp.istiqamet)}` : ''}`,
    ),
  ]);
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl">{t('paths.title')}</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">{t('paths.subtitle')}</p>
      </header>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t('common.track')}>
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
            {tr.title}
          </Link>
        ))}
      </div>
      {paths.length === 0 ? (
        <EmptyState icon={Route} title={t('paths.empty')} description={t('paths.emptyDesc')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <PathCard key={p.id} path={p} />
          ))}
        </div>
      )}
    </div>
  );
}
