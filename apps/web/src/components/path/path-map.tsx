import Link from 'next/link';
import { Check, Lock, Star, Trophy } from 'lucide-react';
import type { PathItemDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TYPE_LABEL = {
  COURSE: () => t('paths.itemCourse'),
  PROJECT: () => t('paths.itemProject'),
  ASSESSMENT: () => t('paths.itemAssessment'),
  MILESTONE: () => t('paths.itemMilestone'),
} as const;

function meta(it: PathItemDto): string {
  const parts: string[] = [];
  if (it.estimatedHours) parts.push(t('cert.hours', { n: it.estimatedHours }));
  if (it.state === 'completed') {
    if (it.type === 'ASSESSMENT' && it.progress?.score != null)
      parts.push(
        `${t('paths.score', { n: Math.round(it.progress.score) })} · ${t('paths.passed')}`,
      );
    else parts.push(t('paths.completed'));
  } else if (it.state === 'submitted') parts.push(t('paths.submitted'));
  else if (it.type === 'COURSE' && it.course && it.course.total > 0 && it.course.enrolled)
    parts.push(t('paths.tasksOf', { done: it.course.done, total: it.course.total }));
  else if (it.state === 'locked')
    parts.push(it.type === 'MILESTONE' ? t('paths.afterAll') : t('paths.locked'));
  else if (
    it.type === 'ASSESSMENT' &&
    it.progress?.status === 'FAILED' &&
    it.progress.score != null
  )
    parts.push(`${t('paths.score', { n: Math.round(it.progress.score) })} · ${t('paths.failed')}`);
  return parts.join(' · ');
}

/** Şaquli yol xəritəsi (dizayndakı `.road2`): nöqtə + kart; seçmə addımlar kəsik çərçivəli çiplər kimi */
export function PathMap({
  items,
  color,
  enrolled,
}: {
  items: PathItemDto[];
  color: string;
  enrolled: boolean;
}) {
  // xəttin rənglənməsi: tamamlananlar yaşıl, cari addıma qədər istiqamət rəngi, qalanı boz
  const required = items.filter((i) => !i.isOptional);
  const doneCount = required.filter((i) => i.state === 'completed').length;
  const curIdx = required.findIndex((i) => i.state === 'current' || i.state === 'submitted');
  const n = Math.max(required.length, 1);
  const donePct = Math.round((doneCount / n) * 100);
  const curPct = curIdx >= 0 ? Math.round(((curIdx + 1) / n) * 100) : donePct;

  // ardıcıl seçmə addımları bir sıra çip kimi qruplaşdır
  const groups: Array<{ kind: 'node'; item: PathItemDto } | { kind: 'opt'; items: PathItemDto[] }> =
    [];
  for (const it of items) {
    if (it.isOptional) {
      const last = groups[groups.length - 1];
      if (last && last.kind === 'opt') last.items.push(it);
      else groups.push({ kind: 'opt', items: [it] });
    } else groups.push({ kind: 'node', item: it });
  }

  return (
    <ol
      className="road2"
      style={{
        ['--c' as string]: color,
        ['--done-pct' as string]: `${donePct}%`,
        ['--cur-pct' as string]: `${curPct}%`,
      }}
      data-testid="path-map"
    >
      {groups.map((g, gi) =>
        g.kind === 'opt' ? (
          <li key={`opt-${gi}`} className="opt" aria-label={t('paths.optional')}>
            {g.items.map((it) => (
              <Link key={it.id} href={it.url} className={cn(it.state === 'completed' && 'done')}>
                {t('paths.optionalPrefix', { title: it.title })}
                {it.state === 'completed' ? ' ✓' : ''}
              </Link>
            ))}
          </li>
        ) : (
          <Node key={g.item.id} it={g.item} enrolled={enrolled} />
        ),
      )}
    </ol>
  );
}

function Node({ it, enrolled }: { it: PathItemDto; enrolled: boolean }) {
  const ms = it.type === 'MILESTONE' || it.type === 'ASSESSMENT';
  const cls = cn(
    'node',
    it.state === 'completed' && 'done',
    it.state === 'current' && 'cur',
    it.state === 'submitted' && 'sub',
    it.state === 'locked' && 'lock',
    ms && 'ms',
  );
  const dot =
    it.state === 'completed' ? (
      <span>
        <Check aria-hidden />
      </span>
    ) : it.type === 'MILESTONE' ? (
      <span>
        <Trophy aria-hidden />
      </span>
    ) : it.type === 'ASSESSMENT' ? (
      <span>
        <Star aria-hidden />
      </span>
    ) : it.state === 'locked' ? (
      <span>
        <Lock aria-hidden />
      </span>
    ) : (
      <span>{it.number}</span>
    );
  const clickable = enrolled && it.state !== 'locked';
  const card = (
    <>
      <div className="ntop">
        <span className="ntype">
          {TYPE_LABEL[it.type]()}
          {it.type === 'COURSE' && it.course ? ` · ${t(`level.${it.course.level}`)}` : ''}
        </span>
      </div>
      <h4>{it.title}</h4>
      <div className="meta">{meta(it)}</div>
      {it.state === 'current' &&
      it.type === 'COURSE' &&
      it.course?.enrolled &&
      it.course.total > 0 ? (
        <div className="nbar">
          <i style={{ width: `${it.course.percent}%` }} />
        </div>
      ) : null}
    </>
  );
  return (
    <li className={cls} data-testid="path-node" data-state={it.state}>
      {it.state === 'current' ? <span className="here">{t('paths.youAreHere')}</span> : null}
      <div className="dot">{dot}</div>
      {clickable ? (
        <Link href={it.url} className="ncard">
          {card}
        </Link>
      ) : (
        <div className="ncard">{card}</div>
      )}
    </li>
  );
}
