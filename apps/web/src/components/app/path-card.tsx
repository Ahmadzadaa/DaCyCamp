import Link from 'next/link';
import type { PathCardDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TrackBadge } from './track-badge';

export function pathFacts(p: PathCardDto): string[] {
  const parts = [t(`level.${p.level}`), t('paths.courses', { n: p.courseCount })];
  if (p.projectCount) parts.push(t('paths.projects', { n: p.projectCount }));
  if (p.assessmentCount) parts.push(t('paths.assessments', { n: p.assessmentCount }));
  if (p.estimatedHours) parts.push(t('paths.hoursTotal', { n: p.estimatedHours }));
  return parts;
}

/** Yollar siyahısındakı kart — kurs kartı ilə eyni dil, üstündə istiqamət rəngli zolaq */
export function PathCard({ path }: { path: PathCardDto }) {
  const pct = path.enrolled ? (path.percent ?? 0) : null;
  return (
    <Link
      href={`/yol/${path.slug}`}
      className="box group flex flex-col gap-3 overflow-hidden p-0 transition hover:border-brand"
      style={{ ['--c' as string]: path.track.color }}
      data-testid="path-card"
    >
      <div className="h-2" style={{ background: path.track.color }} />
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="flex items-center gap-2">
          <TrackBadge color={path.track.color}>{path.track.title}</TrackBadge>
          <span className="text-xs text-muted">· {t('paths.careerPath')}</span>
          {path.isActive ? (
            <span className="ml-auto rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
              {t('paths.activeBadge')}
            </span>
          ) : null}
        </div>
        <h3 className="text-lg font-bold leading-snug group-hover:underline">{path.title}</h3>
        <p className="line-clamp-3 text-sm text-muted">{path.description}</p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {pathFacts(path).map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        {pct !== null ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{path.completedAt ? t('paths.completed') : t('paths.enrolled')}</span>
              <span>{pct}%</span>
            </div>
            <div className="nbar !mt-0">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <span className={cn('b b-brand b-sm self-start')}>{t('paths.start')}</span>
        )}
      </div>
    </Link>
  );
}
