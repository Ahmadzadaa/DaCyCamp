import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseMapDto, CourseOutlineDto } from '@dacy/shared';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TrackBadge } from '@/components/app/track-badge';
import { ProgressRing } from '@/components/app/progress-ring';
import { CourseModules } from '@/components/app/course-modules';
import { EnrollButton } from '@/components/app/enroll-button';
import { LockedToast } from '@/components/app/locked-toast';
import { courseMeta } from '@/components/app/course-card';

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
  const mapDto = user ? await apiTry<CourseMapDto>(`/learn/courses/${slug}`) : null;
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

  return (
    <div className="grid gap-[22px] md:grid-cols-[1fr_320px]">
      <LockedToast active={!!sp.kilid} href={`/kurs/${slug}`} />
      <header className="chead md:col-span-2" style={{ ['--c' as string]: color }}>
        <TrackBadge color={color}>{outline.track.title}</TrackBadge>
        <h1>{outline.title}</h1>
        <p>{outline.description}</p>
        {completed ? (
          <p className="mt-3 inline-block rounded-lg bg-brand/15 px-3 py-1 text-sm font-semibold text-brand">
            🎉 {t('course.completedBanner')}
          </p>
        ) : null}
      </header>

      <div>
        {outline.modules.length === 0 ? (
          <div className="box text-muted">{t('catalog.emptyDesc')}</div>
        ) : (
          <CourseModules outline={outline} map={enrolled ? map : null} color={color} />
        )}
      </div>

      <aside className="flex flex-col gap-[14px]">
        <div className="box">
          <div className="flex items-center gap-4">
            <ProgressRing percent={percent} />
            <div>
              <div className="bigp">{percent}%</div>
              <small className="text-muted">{t('course.stepsDone', { done, total })}</small>
            </div>
          </div>
          <div className="mt-[14px]">
            {!user ? (
              <Link
                href={`/giris?next=${encodeURIComponent(`/kurs/${slug}`)}`}
                className="b b-brand w-full"
              >
                {t('course.enroll')}
              </Link>
            ) : !enrolled ? (
              <EnrollButton slug={slug} firstStepUrl={firstStep} />
            ) : continueUrl ? (
              <Link href={continueUrl} className="b b-brand w-full">
                {t('course.continue')}
              </Link>
            ) : firstStep ? (
              <Link href={firstStep} className="b b-dark w-full">
                {t('course.review')}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="box">
          <h2 className="mb-2 text-base">{t('course.inThisCourse')}</h2>
          <p className="text-sm text-muted">
            {courseMeta(outline).slice(1).join(' · ')}
            {outline.datasetCount
              ? ` · ${t('course.datasets', { n: outline.datasetCount })}`
              : ''}{' '}
            · {t('course.certificate')}
          </p>
          {outline.estimatedHours ? (
            <p className="mt-1 text-sm text-muted">
              {t('common.hoursApprox', { n: outline.estimatedHours })}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
