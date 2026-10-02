import type { StepViewDto } from '@dacy/shared';
import { Markdown } from '@/components/app/markdown';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { HintsBox } from './hints-box';

export function InstructionsPane({ view }: { view: StepViewDto }) {
  const v = view.view;
  if (v.kind === 'theory' || v.kind === 'quiz') return null;
  const kickerKey =
    v.kind === 'ctf' ? 'ws.roomOf' : v.kind === 'terminal' ? 'ws.labOf' : 'ws.taskOf';
  const done = view.state === 'completed';
  const tasks: string[] = v.kind === 'ctf' ? [] : v.tasks;
  return (
    <div className="ws-left">
      <div className="kicker">
        <span className="badge badge-track" style={{ ['--c' as string]: view.course.track.color }}>
          {t(kickerKey, { i: view.position.typeIndex, n: view.position.typeTotal })}
        </span>
        <span className="xp">{t('common.plusXp', { n: view.xp })}</span>
        {v.kind === 'terminal' ? (
          <span className="ml-auto text-[0.82rem] text-on-dark-muted">
            ⏱ {t('ws.timeLeft', { t: `${v.time_limit_minutes}:00` })}
          </span>
        ) : null}
      </div>
      <h1>{view.title}</h1>
      <Markdown content={v.instructions} assetMap={view.assets} dark />
      {tasks.length ? (
        <>
          <h4>{t('ws.task')}</h4>
          <div className="task">
            <ol>
              {tasks.map((task, i) => (
                <li key={i} className={cn(done && 'done')}>
                  {task}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
      {v.kind === 'ctf' && v.attachments.length ? (
        <>
          <h4>{t('ws.files')}</h4>
          <div className="task flex flex-col gap-2" style={{ borderLeftColor: 'var(--cy)' }}>
            {v.attachments.map((a) => (
              <div key={a.path} className="flex items-center gap-2">
                <span>
                  📄 {a.filename}
                  {a.size_bytes ? ` · ${(a.size_bytes / 1024).toFixed(1)} KB` : ''}
                </span>
                <a href={a.url} download className="b b-run b-sm ml-auto">
                  {t('common.download')}
                </a>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {v.kind !== 'ctf' ? (
        <HintsBox
          stepId={view.id}
          hintCount={v.hint_count}
          unlocked={v.hints_unlocked}
          penalty={v.hint_penalty_xp}
          preview={view.preview}
        />
      ) : null}
    </div>
  );
}
