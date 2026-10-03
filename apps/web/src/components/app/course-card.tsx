import Link from 'next/link';
import { ArrowRight, Check, Clock } from 'lucide-react';
import type { CourseCardDto, LevelLabels } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { fmtHours, initials } from '@/lib/utils';
import { LevelBars } from './level-bars';
import { TrackTile } from './track-icon';

export type CourseKind = 'course' | 'project' | 'room';

/** Etiket: kursun əsas addım tipinə görə — CTF üstünlük təşkil edirsə «Otaq», terminal lab-ları «Layihə» */
export function courseKind(c: Pick<CourseCardDto, 'stepTypeCounts' | 'stepCount'>): CourseKind {
  const ctf = c.stepTypeCounts.CTF ?? 0;
  const labs = c.stepTypeCounts.TERMINAL ?? 0;
  if (c.stepCount && ctf * 2 >= c.stepCount) return 'room';
  if (c.stepCount && labs * 2 >= c.stepCount) return 'project';
  return 'course';
}

export function courseMeta(c: CourseCardDto, levels?: LevelLabels): string[] {
  const parts = [levels?.[c.level] ?? t(`level.${c.level}`)];
  parts.push(t('common.modules', { n: c.moduleCount }));
  const kind = courseKind(c);
  if (kind === 'project') parts.push(t('catalog.labs', { n: c.stepTypeCounts.TERMINAL ?? 0 }));
  else if (kind === 'room') parts.push(t('catalog.rooms', { n: c.stepTypeCounts.CTF ?? 0 }));
  else parts.push(t('common.tasks', { n: c.stepCount }));
  return parts;
}

/**
 * Kurs kartı (dizayn v2 anatomiyası): etiket · 24px başlıq · səviyyə zolaqları · 4 sətir təsvir ·
 * müəllim · alt bölmə (istiqamət ikonu + müddət, «Başla» / «Davam et» + irəliləyiş).
 */
export function CourseCard({
  course,
  levels,
}: {
  course: CourseCardDto;
  /** admin-in dəyişdiyi səviyyə adları */
  levels?: LevelLabels;
}) {
  const c = course;
  const color = c.track.color;
  const hours = fmtHours(c.estimatedHours);
  const href = `/kurs/${c.slug}`;
  const inProgress = !!c.enrolled && !c.completed;
  const pct = c.percent ?? 0;
  return (
    <article className="kc" style={{ ['--c' as string]: color }} data-testid="course-card">
      <span className="kind">
        {t(`catalog.kind.${courseKind(c)}`)}
        {inProgress ? <> · {t('catalog.inProgress')}</> : null}
        {c.completed ? (
          <span className="badge badge-ok ml-auto">
            <Check aria-hidden /> {t('catalog.completed')}
          </span>
        ) : null}
      </span>
      <h3>
        <Link href={href}>{c.title}</Link>
      </h3>
      <LevelBars level={c.level} color={color} label={levels?.[c.level]} />
      {c.description ? <p>{c.description}</p> : null}
      {c.instructor ? (
        <div className="inst">
          <span className="ph">
            {c.instructor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.instructor.avatarUrl} alt="" />
            ) : (
              initials(c.instructor.name)
            )}
          </span>
          <div className="min-w-0">
            <b>{c.instructor.name}</b>
            {c.instructor.title ? <span>{c.instructor.title}</span> : null}
          </div>
        </div>
      ) : null}
      {inProgress ? (
        <div className="prog" aria-label={t('common.percent', { n: pct })}>
          <i style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <div className="ft">
        <span className="dur">
          <TrackTile color={color} icon={c.track.icon} slug={c.track.slug} />
          <span>
            <Clock className="clk" aria-hidden />
            {hours ? t('common.hoursShort', { n: hours }) : t('common.tasks', { n: c.stepCount })}
            {inProgress ? ` · ${pct}%` : ''}
          </span>
        </span>
        {inProgress ? (
          <Link href={href} className="b b-brand b-sm">
            {t('catalog.continue')}
            <ArrowRight aria-hidden />
          </Link>
        ) : c.completed ? (
          <Link href={href} className="b b-ghost b-sm">
            {t('catalog.review')}
          </Link>
        ) : (
          <Link href={href} className="b b-outline b-sm">
            {t('catalog.start')}
          </Link>
        )}
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="kc skel" aria-hidden>
      <span className="sk h-3 w-12" />
      <span className="sk h-7 w-4/5" />
      <span className="sk h-3.5 w-24" />
      <span className="sk h-3.5" />
      <span className="sk h-3.5" />
      <span className="sk h-3.5 w-3/4" />
      <div className="flex items-center gap-3">
        <span className="sk size-[38px] !rounded-full" />
        <span className="sk h-3.5 w-32" />
      </div>
      <div className="ft">
        <span className="sk h-4 w-20" />
        <span className="sk h-[34px] w-[70px] !rounded-[10px]" />
      </div>
    </div>
  );
}
