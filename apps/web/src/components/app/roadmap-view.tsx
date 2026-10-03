'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  FolderGit2,
  GraduationCap,
  LogIn,
  Wrench,
} from 'lucide-react';
import type { RoadmapDto, RoadmapLevel, RoadmapSkill } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Səviyyə nərdivanı + seçilmiş səviyyənin bacarıqları. Tələbə «bilirəm» işarələyir (optimistik),
 * kursa bağlı bacarıq kurs bitəndə avtomatik ✓; hər səviyyə üçün hazırlıq = əsas bacarıqlar üzrə faiz.
 */
export function RoadmapView({
  roadmap,
  level,
  authed,
}: {
  roadmap: RoadmapDto;
  level: string;
  authed: boolean;
}) {
  const [checked, setChecked] = useState(() => new Set(roadmap.checked));
  const [busy, setBusy] = useState<string | null>(null);
  const levels = roadmap.content.levels;
  const idx = Math.max(
    0,
    levels.findIndex((l) => l.key === level),
  );
  const lv = levels[idx]!;
  const color = roadmap.track?.color ?? 'var(--da)';

  const viaCourse = (s: RoadmapSkill) => !!(s.course && roadmap.courses[s.course]?.completed);
  const isDone = (s: RoadmapSkill) => viaCourse(s) || checked.has(s.id);

  const readiness = useMemo(() => {
    const m = new Map<string, { done: number; total: number; pct: number }>();
    for (const l of levels) {
      const core = l.groups.flatMap((g) => g.skills).filter((s) => s.core);
      const done = core.filter(isDone).length;
      m.set(l.key, {
        done,
        total: core.length,
        pct: core.length ? Math.round((done / core.length) * 100) : 0,
      });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, checked, roadmap.courses]);

  async function toggle(s: RoadmapSkill) {
    if (!authed || viaCourse(s)) return;
    const next = !checked.has(s.id);
    setChecked((prev) => {
      const n = new Set(prev);
      if (next) n.add(s.id);
      else n.delete(s.id);
      return n;
    });
    setBusy(s.id);
    try {
      const r = await api<{ checked: string[] }>(
        `/roadmaps/${roadmap.slug}/checks/${encodeURIComponent(s.id)}`,
        { method: 'PUT', body: { checked: next } },
      );
      setChecked(new Set(r.checked));
    } catch (e) {
      setChecked((prev) => {
        const n = new Set(prev);
        if (next) n.delete(s.id);
        else n.add(s.id);
        return n;
      });
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const href = (key: string) => `/yollar?karyera=${roadmap.slug}&seviyye=${key}`;
  const cur = readiness.get(lv.key)!;
  const prev = levels[idx - 1];
  const next = levels[idx + 1];

  return (
    <div className="rm" style={{ ['--c' as string]: color }} data-testid="roadmap">
      {roadmap.description ? <p className="rm-desc">{roadmap.description}</p> : null}

      <ol className="rm-ladder" aria-label={t('roadmap.levels')}>
        {levels.map((l, i) => {
          const r = readiness.get(l.key)!;
          const on = l.key === lv.key;
          return (
            <li key={l.key} className={cn(on && 'on', r.pct === 100 && 'full')}>
              <Link
                href={href(l.key)}
                scroll={false}
                aria-current={on ? 'step' : undefined}
                data-testid={`level-${l.key}`}
              >
                <span className="rm-dot">{r.pct === 100 ? <Check aria-hidden /> : i + 1}</span>
                <span className="rm-step">
                  <b>{l.title}</b>
                  {l.duration ? <small>{l.duration}</small> : null}
                  {authed ? (
                    <span className="rm-mini" aria-label={t('roadmap.ready', { pct: r.pct })}>
                      <i style={{ width: `${r.pct}%` }} />
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="rm-body">
        <div className="flex min-w-0 flex-col gap-5">
          <header className="rm-level-h">
            <div className="min-w-0">
              <span className="rm-kicker">
                <GraduationCap aria-hidden />
                {t('roadmap.levels')} {idx + 1} / {levels.length}
                {lv.duration ? (
                  <>
                    <Clock aria-hidden className="ml-2" />
                    {lv.duration}
                  </>
                ) : null}
              </span>
              <h2>{lv.title}</h2>
              <p>{lv.summary}</p>
            </div>
            {authed ? (
              <div className="rm-ready" data-testid="level-ready">
                <span className="rm-ring" style={{ ['--p' as string]: `${cur.pct}` }}>
                  <b>{cur.pct}%</b>
                </span>
                <span>
                  <b className="block">{t('roadmap.readyTitle')}</b>
                  <small>{t('roadmap.readyLine', { done: cur.done, total: cur.total })}</small>
                </span>
              </div>
            ) : (
              <Link href={`/giris?next=${encodeURIComponent(href(lv.key))}`} className="rm-guest">
                <LogIn aria-hidden />
                <span>{t('roadmap.guestCta')}</span>
              </Link>
            )}
          </header>

          <div className="rm-groups">
            {lv.groups.map((g) => {
              const done = g.skills.filter(isDone).length;
              return (
                <section key={g.title} className="rm-group" aria-label={g.title}>
                  <h3>
                    {g.title}
                    <small>
                      {done}/{g.skills.length}
                    </small>
                  </h3>
                  <ul>
                    {g.skills.map((s) => (
                      <SkillRow
                        key={s.id}
                        s={s}
                        done={isDone(s)}
                        locked={viaCourse(s)}
                        authed={authed}
                        busy={busy === s.id}
                        course={s.course ? roadmap.courses[s.course] : undefined}
                        onToggle={() => toggle(s)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="rm-aside">
          <LevelAside lv={lv} />
          <div className="rm-nav">
            {prev ? (
              <Link href={href(prev.key)} scroll={false} className="b b-ghost b-sm">
                <ArrowLeft aria-hidden />
                {t('roadmap.prev', { title: prev.title })}
              </Link>
            ) : null}
            {next ? (
              <Link href={href(next.key)} scroll={false} className="b b-dark b-sm">
                {t('roadmap.next', { title: next.title })}
                <ArrowRight aria-hidden />
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SkillRow({
  s,
  done,
  locked,
  authed,
  busy,
  course,
  onToggle,
}: {
  s: RoadmapSkill;
  done: boolean;
  locked: boolean;
  authed: boolean;
  busy: boolean;
  course?: { title: string; completed: boolean; enrolled: boolean };
  onToggle: () => void;
}) {
  return (
    <li className={cn('rm-skill', done && 'done', !s.core && 'plus')} data-testid={`skill-${s.id}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={t('roadmap.markKnown', { title: s.title })}
        className="rm-check"
        disabled={!authed || locked || busy}
        onClick={onToggle}
      >
        {done ? <Check aria-hidden /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rm-skill-t">{s.title}</span>
          {!s.core ? (
            <span className="rm-plus" title={t('roadmap.plusHint')}>
              {t('roadmap.plus')}
            </span>
          ) : null}
          {locked ? <span className="rm-bycourse">✓ {t('roadmap.byCourse')}</span> : null}
        </div>
        {s.desc ? <p>{s.desc}</p> : null}
        {s.course && course ? (
          <Link href={`/kurs/${s.course}`} className="rm-course">
            <GraduationCap aria-hidden />
            {t('roadmap.learnOnPlatform')}: {course.title}
            <ArrowRight aria-hidden />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function LevelAside({ lv }: { lv: RoadmapLevel }) {
  return (
    <>
      {lv.expectations.length ? (
        <section className="box">
          <h3 className="box-h">
            <Briefcase aria-hidden />
            {t('roadmap.expectations')}
          </h3>
          <ul className="rm-list">
            {lv.expectations.map((e) => (
              <li key={e}>
                <Check aria-hidden />
                {e}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {lv.tools.length ? (
        <section className="box">
          <h3 className="box-h">
            <Wrench aria-hidden />
            {t('roadmap.tools')}
          </h3>
          <div className="rm-tools">
            {lv.tools.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </section>
      ) : null}
      {lv.project ? (
        <section className="rm-project">
          <h3>
            <FolderGit2 aria-hidden />
            {t('roadmap.project')}
          </h3>
          <b>{lv.project.title}</b>
          {lv.project.desc ? <p>{lv.project.desc}</p> : null}
          <small>{t('roadmap.projectHint')}</small>
        </section>
      ) : null}
    </>
  );
}
