import Link from 'next/link';
import { ArrowRight, Check, Clock } from 'lucide-react';
import type { LevelLabels, PathCardDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { fmtHours } from '@/lib/utils';
import { LevelBars } from './level-bars';
import { TrackTile } from './track-icon';

export function pathFacts(p: PathCardDto, levels?: LevelLabels): string[] {
  const parts = [
    levels?.[p.level] ?? t(`level.${p.level}`),
    t('paths.courses', { n: p.courseCount }),
  ];
  if (p.projectCount) parts.push(t('paths.projects', { n: p.projectCount }));
  if (p.assessmentCount) parts.push(t('paths.assessments', { n: p.assessmentCount }));
  if (p.estimatedHours) parts.push(t('paths.hoursTotal', { n: p.estimatedHours }));
  return parts;
}

/** Yol kartı — kurs kartı ilə eyni anatomiya: «YOL» etiketi, səviyyə, təsvir, tərkib, alt bölmə */
export function PathCard({ path: p, levels }: { path: PathCardDto; levels?: LevelLabels }) {
  const color = p.track.color;
  const href = `/yol/${p.slug}`;
  const pct = p.enrolled ? (p.percent ?? 0) : null;
  const hours = fmtHours(p.estimatedHours);
  const parts = [
    t('paths.courses', { n: p.courseCount }),
    p.projectCount ? t('paths.projects', { n: p.projectCount }) : null,
    p.assessmentCount ? t('paths.assessments', { n: p.assessmentCount }) : null,
  ].filter(Boolean);
  return (
    <article className="kc" style={{ ['--c' as string]: color }} data-testid="path-card">
      <span className="kind">
        {t('paths.kind')} · {p.track.title}
        {p.isActive ? (
          <span className="badge badge-mint ml-auto">{t('paths.activeBadge')}</span>
        ) : null}
        {p.completedAt ? (
          <span className="badge badge-ok ml-auto">
            <Check aria-hidden /> {t('paths.completed')}
          </span>
        ) : null}
      </span>
      <h3>
        <Link href={href}>{p.title}</Link>
      </h3>
      <LevelBars level={p.level} color={color} label={levels?.[p.level]} />
      {p.description ? <p>{p.description}</p> : null}
      <div className="path-parts">{parts.join(' · ')}</div>
      {pct !== null && !p.completedAt ? (
        <div className="prog" aria-label={t('common.percent', { n: pct })}>
          <i style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <div className="ft">
        <span className="dur">
          <TrackTile color={color} icon={p.track.icon} slug={p.track.slug} />
          <span>
            <Clock className="clk" aria-hidden />
            {hours ? t('paths.hoursTotal', { n: hours }) : t('paths.courses', { n: p.courseCount })}
            {pct !== null && !p.completedAt ? ` · ${pct}%` : ''}
          </span>
        </span>
        {pct !== null && !p.completedAt ? (
          <Link href={href} className="b b-brand b-sm">
            {t('paths.continue')}
            <ArrowRight aria-hidden />
          </Link>
        ) : (
          <Link href={href} className="b b-outline b-sm">
            {p.completedAt ? t('paths.view') : t('paths.start')}
          </Link>
        )}
      </div>
    </article>
  );
}
