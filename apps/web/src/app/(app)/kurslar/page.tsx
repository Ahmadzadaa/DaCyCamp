import type { Metadata } from 'next';
import Link from 'next/link';
import { LEVELS, type CourseCardDto, type Level, type TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CourseCard } from '@/components/app/course-card';
import { EmptyState } from '@/components/app/empty-state';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = { title: t('nav.courses') };

type SP = { istiqamet?: string; seviyye?: string; q?: string };

function chipHref(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const merged = { ...sp, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return `/kurslar${s ? `?${s}` : ''}`;
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const level = (LEVELS as readonly string[]).includes(sp.seviyye ?? '')
    ? (sp.seviyye as Level)
    : undefined;
  const qs = new URLSearchParams();
  if (sp.istiqamet) qs.set('track', sp.istiqamet);
  if (level) qs.set('level', level);
  if (sp.q) qs.set('q', sp.q);
  const [tracks, courses] = await Promise.all([
    apiFetch<TrackDto[]>('/tracks'),
    apiFetch<CourseCardDto[]>(`/courses${qs.size ? `?${qs}` : ''}`),
  ]);
  const iconBySlug = new Map(tracks.map((tr) => [tr.slug, tr.icon]));
  const filtered = !!(sp.istiqamet || level || sp.q);

  return (
    <div className="cat">
      <section className="cat-hero">
        <div>
          <h1>{t('catalog.heroTitle')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
        <Link href={chipHref(sp, { seviyye: 'BEGINNER' })} className="b b-brand">
          {t('catalog.heroCta')}
        </Link>
      </section>

      <nav className="my-5 flex flex-wrap gap-2" aria-label="Filtrlər">
        <Link
          href={chipHref(sp, { istiqamet: undefined, seviyye: undefined })}
          className={cn('chip', !sp.istiqamet && !level && 'on')}
        >
          {t('common.all')}
        </Link>
        {tracks.map((tr) => (
          <Link
            key={tr.slug}
            href={chipHref(sp, { istiqamet: sp.istiqamet === tr.slug ? undefined : tr.slug })}
            className={cn('chip', sp.istiqamet === tr.slug && 'on')}
          >
            {tr.title}
          </Link>
        ))}
        {LEVELS.map((lv) => (
          <Link
            key={lv}
            href={chipHref(sp, { seviyye: level === lv ? undefined : lv })}
            className={cn('chip', level === lv && 'on')}
          >
            {t(`level.${lv}`)}
          </Link>
        ))}
        {sp.q ? (
          <Link href={chipHref(sp, { q: undefined })} className="chip on">
            „{sp.q}” ✕
          </Link>
        ) : null}
      </nav>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filtered ? t('catalog.emptyFiltered') : t('catalog.empty')}
          description={filtered ? undefined : t('catalog.emptyDesc')}
          action={
            filtered ? (
              <Link href="/kurslar" className="b b-ghost">
                {t('common.all')}
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} icon={iconBySlug.get(c.track.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}
