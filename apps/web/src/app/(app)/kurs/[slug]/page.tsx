import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Award, Clock, PartyPopper, RotateCcw } from 'lucide-react';
import type { CourseMapDto, CourseOutlineDto, PathRefDto } from '@dacy/shared';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { fmtHours, initials } from '@/lib/utils';
import { TrackBadge } from '@/components/app/track-badge';
import { ProgressRing } from '@/components/app/progress-ring';
import { CourseModules } from '@/components/app/course-modules';
import { EnrollButton } from '@/components/app/enroll-button';
import { LockedToast } from '@/components/app/locked-toast';
import { HeroArt } from '@/components/app/hero-art';
import { courseKind, courseMeta } from '@/components/app/course-card';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ kilid?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiTry<CourseOutlineDto>(`/courses/${slug}`);
  return { title: c?.title ?? t('common.notFound') };
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const outline = await apiTry<CourseOutlineDto>(`/courses/${slug}`);
  if (!outline) notFound();
  const [mapDto, pathRefs] = await Promise.all([
    user ? apiTry<CourseMapDto>(`/learn/courses/${slug}`) : Promise.resolve(null),
    apiTry<PathRefDto[]>(`/paths/by-course/${slug}`).then((x) => x ?? []),
  ]);
  const map = mapDto?.map ?? null;
  const enrolled = !!mapDto?.enrolled;
  const color = outline.track.color;
  const total = map?.total ?? outline.modules.reduce((n, m) => n + m.steps.length, 0);
  const done = map?.done ?? 0;
  const percent = enrolled ? (map?.percent ?? 0) : 0;
  const firstStep = outline.modules[0]?.steps[0]
    ? `/kurs/${slug}/${outline.modules[0].key}/${outline.modules[0].steps[0].key}`
    : null;
  const continueUrl = mapDto?.continueUrl ?? firstStep;
  const completed = !!mapDto?.completedAt;
  const hours = fmtHours(outline.estimatedHours);
  const facts = [
    hours ? t('common.hoursShort', { n: hours }) : null,
    ...courseMeta(outline).slice(1),
  ].filter(Boolean);

  return (
    <div>
      <LockedToast active={!!sp.kilid} href={`/kurs/${slug}`} />
      <section className="hero sm accent" style={{ ['--c' as string]: color }}>
        <div className="min-w-0">
          <div className="hero-k">
            <TrackBadge color={color}>{outline.track.title}</TrackBadge>
            <span className="badge badge-mint">{t(`catalog.kind.${courseKind(outline)}`)}</span>
            <span className="badge badge-onhero">{t(`level.${outline.level}`)}</span>
          </div>
          <h1 className="mt-3">{outline.title}</h1>
          {outline.description ? <p>{outline.description}</p> : null}
          <div className="hero-meta">
            {outline.instructor ? (
              <div className="inst">
                <span className="ph on-hero">
                  {outline.instructor.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={outline.instructor.avatarUrl} alt="" />
                  ) : (
                    initials(outline.instructor.name)
                  )}
                </span>
                <div className="min-w-0">
                  <b className="text-white">{outline.instructor.name}</b>
                  {outline.instructor.title ? <span>{outline.instructor.title}</span> : null}
                </div>
              </div>
            ) : null}
            <span className="hero-fact">
              <Clock aria-hidden />
              {facts.join(' · ')}
            </span>
          </div>
          {completed ? (
            <div className="hero-act">
              <span className="done-pill">
                <PartyPopper aria-hidden />
                {t('course.completedBanner')}
              </span>
              {mapDto?.certificateId ? (
                <Link
                  href={`/sertifikat/${mapDto.certificateId}`}
                  className="b b-brand"
                  data-testid="course-cert"
                >
                  <Award aria-hidden />
                  {t('cert.open')}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <HeroArt kind="course" />
      </section>

      <div className="course">
        <div className="min-w-0">
          {outline.modules.length === 0 ? (
            <div className="box text-muted">{t('catalog.emptyDesc')}</div>
          ) : (
            <CourseModules outline={outline} map={enrolled ? map : null} color={color} />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="box">
            <div className="pring">
              <ProgressRing percent={percent} size={80} />
              <div>
                <div className="bigp">{percent}%</div>
                <small className="text-muted">{t('course.stepsDone', { done, total })}</small>
              </div>
            </div>
            <div className="mt-4">
              {!user ? (
                <Link
                  href={`/giris?next=${encodeURIComponent(`/kurs/${slug}`)}`}
                  className="b b-brand w-full"
                >
                  {t('course.enroll')}
                </Link>
              ) : !enrolled ? (
                <EnrollButton slug={slug} firstStepUrl={firstStep} />
              ) : continueUrl && !completed ? (
                <Link href={continueUrl} className="b b-brand w-full">
                  {t('course.continue')}
                  <ArrowRight aria-hidden />
                </Link>
              ) : firstStep ? (
                <Link href={firstStep} className="b b-dark w-full">
                  <RotateCcw aria-hidden />
                  {t('course.review')}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="box">
            <h2 className="box-h">{t('course.inThisCourse')}</h2>
            <p className="text-sm text-muted">
              {courseMeta(outline).slice(1).join(' · ')}
              {outline.datasetCount
                ? ` · ${t('course.datasets', { n: outline.datasetCount })}`
                : ''}{' '}
              · {t('course.certificate')}
            </p>
          </div>
          {pathRefs.length ? (
            <div className="box" data-testid="course-paths">
              <h2 className="box-h">{t('course.inPaths')}</h2>
              <div className="paths">
                {pathRefs.map((p) => (
                  <Link key={p.slug} href={`/yol/${p.slug}`}>
                    <span className="min-w-0">
                      <b className="block truncate text-[0.92rem]">{p.title}</b>
                      <span className="text-xs text-muted">
                        {t('course.partOfPathShort', { n: p.number })}
                      </span>
                    </span>
                    <span
                      className="badge badge-track"
                      style={{ ['--c' as string]: p.trackColor }}
                      aria-hidden
                    >
                      {p.number}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
