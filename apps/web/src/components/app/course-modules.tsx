'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Lock } from 'lucide-react';
import type { CourseMapDto, CourseOutlineDto } from '@dacy/shared';
import { StepIcon } from './step-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type MapModule = CourseMapDto['map']['modules'][number];

/** Fəsillər kartlarda: tamamlanan yaşıl, aktiv vurğulanmış, növbətilər kilidli (dizayn v2) */
export function CourseModules({
  outline,
  map,
  color,
}: {
  outline: CourseOutlineDto;
  map: CourseMapDto['map'] | null;
  color: string;
}) {
  const modules: MapModule[] = map
    ? map.modules
    : outline.modules.map((m) => ({
        ...m,
        isPublished: true,
        state: 'locked' as const,
        done: 0,
        total: m.steps.length,
        steps: m.steps.map((s, i) => ({
          ...s,
          state: 'locked' as const,
          index: i,
          moduleKey: m.key,
          score: null,
          attempts: 0,
        })),
      }));
  const defaultOpen = map
    ? (modules.find((m) => m.state === 'active') ?? modules[0])?.id
    : modules[0]?.id;
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen ? [defaultOpen] : []));
  const neutral = !map;
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mods" style={{ ['--c' as string]: color }}>
      {modules.map((m, mi) => {
        const isOpen = open.has(m.id);
        const cls = neutral
          ? ''
          : m.state === 'done'
            ? 'done'
            : m.state === 'active'
              ? 'act'
              : 'locked';
        const sub = neutral
          ? t('course.stepsCount', { n: m.total })
          : m.state === 'done'
            ? `${t('course.stepsCount', { n: m.total })} · ${t('course.moduleDone')}`
            : m.state === 'locked'
              ? `${t('course.stepsCount', { n: m.total })} · ${t('course.moduleLocked')}`
              : `${t('course.stepsCount', { n: m.total })} · ${t('course.moduleProgress', { done: m.done, total: m.total })}`;
        return (
          <section key={m.id} className={cn('mod', cls)}>
            <button
              type="button"
              className="mod-h"
              aria-expanded={isOpen}
              onClick={() => toggle(m.id)}
            >
              <span className="mod-n">
                {!neutral && m.state === 'done' ? <Check aria-hidden /> : mi + 1}
              </span>
              <div className="min-w-0">
                <h2>{m.title}</h2>
                <small>{sub}</small>
              </div>
              {!neutral && m.state === 'active' ? (
                <span className="mod-bar" aria-hidden>
                  <i style={{ width: `${m.total ? (m.done / m.total) * 100 : 0}%` }} />
                </span>
              ) : null}
              <ChevronDown className={cn('mod-chev', isOpen && 'open')} aria-hidden />
            </button>
            {isOpen ? (
              <ul className="steps mod-steps-enter">
                {m.steps.map((s) => {
                  const href = `/kurs/${outline.slug}/${m.key}/${s.key}`;
                  const locked = neutral || s.state === 'locked';
                  const ok = !neutral && s.state === 'completed';
                  const status = neutral ? (
                    t('common.xp', { n: s.xp })
                  ) : ok ? (
                    <>
                      <Check aria-hidden /> {t('common.xp', { n: s.xp })}
                    </>
                  ) : locked ? (
                    <Lock aria-label={t('course.lockedToast')} />
                  ) : (
                    <>
                      {t('course.stepCurrent')} <ArrowRight aria-hidden />
                    </>
                  );
                  const inner = (
                    <>
                      <StepIcon type={s.type} />
                      <span className="truncate">{s.title}</span>
                      <span className="st">{status}</span>
                    </>
                  );
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        ok && 'ok',
                        locked && !neutral && 'lock',
                        !locked && !ok && 'cur',
                      )}
                    >
                      {locked ? (
                        <span title={neutral ? undefined : t('course.lockedToast')}>{inner}</span>
                      ) : (
                        <Link href={href}>{inner}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
