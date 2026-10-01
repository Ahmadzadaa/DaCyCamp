import Link from 'next/link';
import type { CourseCardDto } from '@dacy/shared';
import { TrackBadge } from './track-badge';
import { TrackMotif } from './track-motif';
import { t } from '@/lib/i18n';
import { fmtHours } from '@/lib/utils';

export function courseMeta(c: CourseCardDto): string[] {
  const parts = [t(`level.${c.level}`)];
  parts.push(t('common.modules', { n: c.moduleCount }));
  const labs = c.stepTypeCounts.TERMINAL ?? 0;
  const rooms = c.stepTypeCounts.CTF ?? 0;
  if (labs && labs * 2 >= c.stepCount) parts.push(t('catalog.labs', { n: labs }));
  else if (rooms && rooms * 2 >= c.stepCount) parts.push(t('catalog.rooms', { n: rooms }));
  else parts.push(t('common.tasks', { n: c.stepCount }));
  return parts;
}

export function CourseCard({ course, icon }: { course: CourseCardDto; icon?: string | null }) {
  const hours = fmtHours(course.estimatedHours);
  const cta = course.completed
    ? t('catalog.completed')
    : course.enrolled
      ? t('catalog.continue')
      : t('catalog.start');
  return (
    <article className="cc" style={{ ['--c' as string]: course.track.color }}>
      <Link href={`/kurs/${course.slug}`} className="top block" aria-hidden tabIndex={-1}>
        <TrackMotif icon={icon} slug={course.track.slug} />
      </Link>
      <div className="bd">
        <TrackBadge color={course.track.color} className="self-start">
          {course.track.title}
        </TrackBadge>
        <h3>
          <Link href={`/kurs/${course.slug}`} className="hover:underline">
            {course.title}
          </Link>
        </h3>
        <div className="meta">
          {courseMeta(course).map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        {course.enrolled && !course.completed ? (
          <div
            className="h-1.5 overflow-hidden rounded bg-line"
            aria-label={t('common.percent', { n: course.percent ?? 0 })}
          >
            <i
              className="block h-full"
              style={{ width: `${course.percent ?? 0}%`, background: course.track.color }}
            />
          </div>
        ) : null}
        <div className="foot">
          <span>{hours ? t('common.hoursApprox', { n: hours }) : ' '}</span>
          <Link href={`/kurs/${course.slug}`} className="b b-brand b-sm">
            {cta}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="cc">
      <div className="top sk !rounded-none" />
      <div className="bd">
        <div className="sk h-5 w-28" />
        <div className="sk h-6 w-3/4" />
        <div className="sk h-4 w-1/2" />
        <div className="foot">
          <div className="sk h-4 w-14" />
          <div className="sk h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
