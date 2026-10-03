'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Lock } from 'lucide-react';
import type { PracticeDto, StepType } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { StepIcon } from '@/components/app/step-icon';
import { TrackTile } from '@/components/app/track-icon';

type Status = 'all' | 'open' | 'done';
const TYPES: StepType[] = ['SQL', 'PYTHON', 'TERMINAL', 'CTF'];

/** Təcrübə siyahısı: tip çipləri (sayğacla) + status seçimi; kurslar üzrə qruplaşdırılır */
export function PracticeList({ data }: { data: PracticeDto }) {
  const [type, setType] = useState<StepType | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');

  const groups = useMemo(
    () =>
      data.courses
        .map((c) => ({
          ...c,
          tasks: c.tasks.filter(
            (x) =>
              (type === 'all' || x.type === type) &&
              (status === 'all' ||
                (status === 'done' ? x.state === 'completed' : x.state !== 'completed')),
          ),
        }))
        .filter((c) => c.tasks.length > 0),
    [data, type, status],
  );

  return (
    <>
      <div className="tb !my-0">
        <div className="chips" role="radiogroup" aria-label={t('catalog.topic')}>
          <button
            type="button"
            role="radio"
            aria-checked={type === 'all'}
            className={cn('chip', type === 'all' && 'on')}
            onClick={() => setType('all')}
          >
            {t('hub.practiceAll')} <span className="chip-n">{data.counts.total}</span>
          </button>
          {TYPES.filter((ty) => data.counts.byType[ty]).map((ty) => (
            <button
              key={ty}
              type="button"
              role="radio"
              aria-checked={type === ty}
              className={cn('chip', type === ty && 'on')}
              onClick={() => setType(ty)}
            >
              {t(`stepTypeShort.${ty}`)} <span className="chip-n">{data.counts.byType[ty]}</span>
            </button>
          ))}
        </div>
        <div className="seg ml-auto" role="radiogroup" aria-label={t('common.status')}>
          {(
            [
              ['all', 'hub.statusAll'],
              ['open', 'hub.statusOpen'],
              ['done', 'hub.statusDone'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={status === k}
              className={cn(status === k && 'on')}
              onClick={() => setStatus(k)}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="box text-muted">{t('hub.filterEmpty')}</p>
      ) : (
        groups.map((c) => {
          const all = data.courses.find((x) => x.slug === c.slug)!;
          const done = all.tasks.filter((x) => x.state === 'completed').length;
          return (
            <section key={c.slug} className="box !p-0" style={{ ['--c' as string]: c.trackColor }}>
              <header className="prac-h">
                <TrackTile color={c.trackColor} icon={c.trackIcon} />
                <div className="min-w-0 flex-1">
                  <Link href={`/kurs/${c.slug}`} className="font-bold hover:underline">
                    {c.title}
                  </Link>
                  <div className="text-xs text-muted">{c.trackTitle}</div>
                </div>
                <span className="text-sm font-semibold text-muted">
                  {done} / {all.tasks.length}
                </span>
              </header>
              <ul className="prac-list">
                {c.tasks.map((x) => {
                  const locked = x.state === 'locked';
                  const ok = x.state === 'completed';
                  return (
                    <li key={x.id} className={cn(locked && 'lock')}>
                      <StepIcon type={x.type} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{x.title}</b>
                        <span className="text-xs text-muted">
                          {x.moduleTitle} · {t('common.xp', { n: x.xp })}
                        </span>
                      </span>
                      {ok ? (
                        <>
                          <span className="badge badge-ok">
                            <Check aria-hidden /> {t('hub.statusDone')}
                          </span>
                          <Link href={x.url} className="b b-ghost b-xs">
                            {t('hub.review')}
                          </Link>
                        </>
                      ) : locked ? (
                        <span className="badge badge-muted">
                          <Lock aria-hidden /> {t('hub.statusLocked')}
                        </span>
                      ) : (
                        <Link href={x.url} className="b b-brand b-xs">
                          {t('hub.solve')}
                          <ArrowRight aria-hidden />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
