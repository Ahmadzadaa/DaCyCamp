import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Route } from 'lucide-react';
import { LEVELS, type CourseCardDto, type Level, type TrackDto } from '@dacy/shared';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CourseCard, courseKind, type CourseKind } from '@/components/app/course-card';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import {
  CatalogToolbar,
  ClearFilters,
  LevelPicker,
  MoreChips,
  type ChipOpt,
  type TopicOpt,
} from '@/components/app/catalog-controls';

export const metadata: Metadata = { title: t('nav.courses') };

type SP = {
  istiqamet?: string;
  seviyye?: string;
  q?: string;
  movzu?: string;
  nov?: string;
  muddet?: string;
  status?: string;
  sirala?: string;
};

function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/kurslar${s ? `?${s}` : ''}`;
}

/** «Mövzu» — kursda hansı praktika var (addım tiplərinə görə) */
const TOPICS: Array<{ value: string; label: TKey; has: (c: CourseCardDto) => boolean }> = [
  { value: 'sql', label: 'catalog.topicSql', has: (c) => !!c.stepTypeCounts.SQL },
  { value: 'python', label: 'catalog.topicPython', has: (c) => !!c.stepTypeCounts.PYTHON },
  { value: 'terminal', label: 'catalog.topicTerminal', has: (c) => !!c.stepTypeCounts.TERMINAL },
  { value: 'ctf', label: 'catalog.topicCtf', has: (c) => !!c.stepTypeCounts.CTF },
  { value: 'test', label: 'catalog.topicQuiz', has: (c) => !!c.stepTypeCounts.QUIZ },
];
const KINDS: CourseKind[] = ['course', 'project', 'room'];

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const level = (LEVELS as readonly string[]).includes(sp.seviyye ?? '')
    ? (sp.seviyye as Level)
    : undefined;
  const qs = new URLSearchParams();
  if (sp.istiqamet) qs.set('track', sp.istiqamet);
  if (level) qs.set('level', level);
  if (sp.q) qs.set('q', sp.q);
  const [tracks, fetched, user] = await Promise.all([
    apiFetch<TrackDto[]>('/tracks'),
    apiFetch<CourseCardDto[]>(`/courses${qs.size ? `?${qs}` : ''}`),
    getCurrentUser(),
  ]);

  // mövzu sayğacları — mövzu filtri tətbiq olunmamış siyahıdan
  const topicOpts: TopicOpt[] = TOPICS.map((tp) => ({
    value: tp.value,
    label: t(tp.label),
    count: fetched.filter(tp.has).length,
  }));

  let courses = fetched;
  const topic = TOPICS.find((tp) => tp.value === sp.movzu);
  if (topic) courses = courses.filter(topic.has);
  if (KINDS.includes(sp.nov as CourseKind))
    courses = courses.filter((c) => courseKind(c) === sp.nov);
  if (sp.muddet) {
    const h = (c: CourseCardDto) => c.estimatedHours ?? 0;
    courses = courses.filter((c) =>
      sp.muddet === 'qisa'
        ? h(c) > 0 && h(c) <= 3
        : sp.muddet === 'orta'
          ? h(c) > 3 && h(c) <= 8
          : h(c) > 8,
    );
  }
  if (user && sp.status) {
    courses = courses.filter((c) =>
      sp.status === 'davam'
        ? c.enrolled && !c.completed
        : sp.status === 'bitib'
          ? c.completed
          : !c.enrolled,
    );
  }
  if (sp.sirala === 'yeni')
    courses = [...courses].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  else if (sp.sirala === 'qisa')
    courses = [...courses].sort(
      (a, b) => (a.estimatedHours ?? Infinity) - (b.estimatedHours ?? Infinity),
    );
  else if (sp.sirala === 'ad')
    courses = [...courses].sort((a, b) => a.title.localeCompare(b.title, 'az'));

  const activeCount = [
    'istiqamet',
    'seviyye',
    'q',
    'movzu',
    'nov',
    'muddet',
    'status',
    'sirala',
  ].filter((k) => sp[k as keyof SP]).length;

  // görünən çiplər: Başlanğıc, Orta; qalanı «+N»-də (seçilibsə çölə çıxır)
  const shownLevels: Level[] = ['BEGINNER', 'INTERMEDIATE'];
  if (level === 'ADVANCED') shownLevels.push('ADVANCED');
  const moreOpts: ChipOpt[] = [
    ...(level === 'ADVANCED'
      ? []
      : [{ key: 'seviyye', value: 'ADVANCED', label: t('level.ADVANCED') }]),
    ...KINDS.filter((k) => k !== sp.nov).map((k) => ({
      key: 'nov',
      value: k,
      label: t(`catalog.kind.${k}`),
    })),
  ];

  return (
    <div className="flex flex-col">
      <section className="hero">
        <div>
          <div className="hero-k">
            <h1>{t('catalog.heroTitle')}</h1>
            <span className="badge badge-mint">{t('catalog.heroBadge')}</span>
          </div>
          <p>{t('catalog.heroText')}</p>
          <div className="hero-act">
            <Link href={user ? '/baslangic' : '/yollar'} className="b b-brand">
              <Route aria-hidden />
              {t('catalog.heroPath')}
            </Link>
            <LevelPicker />
          </div>
        </div>
        <HeroArt kind="catalog" />
      </section>

      <nav className="chips mt-8" aria-label={t('catalog.filters')}>
        <Link
          href={href(sp, { istiqamet: undefined, seviyye: undefined, nov: undefined })}
          className={cn('chip', !sp.istiqamet && !level && !sp.nov && 'on')}
        >
          {t('common.all')}
        </Link>
        {tracks.map((tr) => (
          <Link
            key={tr.slug}
            href={href(sp, { istiqamet: sp.istiqamet === tr.slug ? undefined : tr.slug })}
            className={cn('chip', sp.istiqamet === tr.slug && 'on')}
            style={{ ['--c' as string]: tr.color }}
            aria-current={sp.istiqamet === tr.slug ? 'true' : undefined}
          >
            <span className="cdot" aria-hidden />
            {tr.title}
          </Link>
        ))}
        {shownLevels.map((lv) => (
          <Link
            key={lv}
            href={href(sp, { seviyye: level === lv ? undefined : lv })}
            className={cn('chip', level === lv && 'on')}
            aria-current={level === lv ? 'true' : undefined}
          >
            {t(`level.${lv}`)}
          </Link>
        ))}
        {sp.nov && KINDS.includes(sp.nov as CourseKind) ? (
          <Link href={href(sp, { nov: undefined })} className="chip on">
            {t(`catalog.kind.${sp.nov as CourseKind}`)}
          </Link>
        ) : null}
        <MoreChips options={moreOpts} />
      </nav>

      <CatalogToolbar count={courses.length} topics={topicOpts} authed={!!user} />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={activeCount ? t('catalog.emptyFiltered') : t('catalog.empty')}
          description={activeCount ? undefined : t('catalog.emptyDesc')}
          action={<ClearFilters count={activeCount} />}
        />
      ) : (
        <div className="cards">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
