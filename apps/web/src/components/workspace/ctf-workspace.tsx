'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lightbulb } from 'lucide-react';
import type { CtfAnswerResultDto, CtfStudentView, HintResultDto, StepViewDto } from '@dacy/shared';
import { api, ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAfterComplete } from './use-complete';
import { CtfLabTab } from './ctf-lab-tab';

type TaskState = CtfStudentView['tasks'][number] & {
  answer: string;
  wrong?: boolean;
  busy?: boolean;
  xp?: number;
};

export function CtfWorkspace({ view, ctf }: { view: StepViewDto; ctf: CtfStudentView }) {
  const after = useAfterComplete(view.course.slug);
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskState[]>(ctf.tasks.map((x) => ({ ...x, answer: '' })));
  const [tab, setTab] = useState<'questions' | 'files' | 'terminal'>('questions');
  const [done, setDone] = useState<CtfAnswerResultDto | null>(null);
  const q = view.preview ? '?preview=1' : '';
  const patch = (id: string, p: Partial<TaskState>) =>
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function submit(task: TaskState) {
    if (!task.answer.trim()) return;
    patch(task.id, { busy: true, wrong: false });
    try {
      const r = await api<CtfAnswerResultDto>(`/learn/ctf-tasks/${task.id}/answer${q}`, {
        method: 'POST',
        body: { answer: task.answer },
      });
      if (r.correct) {
        patch(task.id, { solved: true, busy: false, xp: r.xpAwarded });
        router.refresh(); // başlıqdakı XP və irəliləyiş yenilənsin
        toast(`🎉 ${t('ws.correct')}`, {
          description: r.xpAwarded ? t('common.plusXp', { n: r.xpAwarded }) : undefined,
        });
        if (r.solvedAll) {
          setDone(r);
          toast(`🏁 ${t('ws.ctfAllSolved')}`);
          if (r.certificateId && !view.preview)
            toast(`🏅 ${t('cert.earned')}`, {
              action: {
                label: t('cert.open'),
                onClick: () => router.push(`/sertifikat/${r.certificateId}`),
              },
              duration: 8000,
            });
        }
      } else {
        patch(task.id, { wrong: true, busy: false });
      }
    } catch (e) {
      patch(task.id, { busy: false });
      toast.error(
        e instanceof ApiError && e.status === 429 ? t('ws.rateLimited') : errorMessage(e),
      );
    }
  }

  async function hint(task: TaskState) {
    if (
      ctf.hint_penalty_xp > 0 &&
      !view.preview &&
      !window.confirm(t('ws.hintConfirm', { n: ctf.hint_penalty_xp }))
    )
      return;
    try {
      const r = await api<HintResultDto>(`/learn/ctf-tasks/${task.id}/hint${q}`, {
        method: 'POST',
      });
      patch(task.id, { hint: r.hint });
      if (r.xpPenalty > 0) toast(t('ws.hintUnlocked', { n: r.xpPenalty }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const allSolved = tasks.every((x) => x.solved);
  return (
    <div className="ws-right !grid-rows-[auto_1fr]">
      <div className="ftabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'questions'}
          className={cn(tab === 'questions' && 'on')}
          onClick={() => setTab('questions')}
        >
          {t('ws.questions')}
        </button>
        {ctf.attachments.length ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'files'}
            className={cn(tab === 'files' && 'on')}
            onClick={() => setTab('files')}
          >
            {t('ws.files')}
          </button>
        ) : null}
        {ctf.has_terminal ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'terminal'}
            className={cn(tab === 'terminal' && 'on')}
            onClick={() => setTab('terminal')}
          >
            {t('ws.terminal')}
          </button>
        ) : null}
      </div>
      {tab === 'terminal' ? (
        <CtfLabTab stepId={view.id} preview={view.preview} />
      ) : tab === 'files' ? (
        <div className="flex flex-col gap-2 overflow-auto p-[18px]">
          {ctf.attachments.map((a) => (
            <div key={a.path} className="fq flex items-center gap-3">
              <span className="flex-1">
                📄 {a.filename}
                {a.size_bytes ? ` · ${(a.size_bytes / 1024).toFixed(1)} KB` : ''}
              </span>
              <a href={a.url} download className="b b-run b-sm">
                {t('common.download')}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-auto p-[18px]">
          {tasks.map((task, i) => (
            <form
              key={task.id}
              className={cn('fq', task.solved && 'ok', task.wrong && 'border-error')}
              onSubmit={(e) => {
                e.preventDefault();
                void submit(task);
              }}
              data-testid={`ctf-task-${i + 1}`}
            >
              <p>
                {i + 1}. {task.question}{' '}
                <span className="text-xs text-on-dark-muted">· {task.points} XP</span>
              </p>
              <div className="row">
                <input
                  value={task.solved ? '••••••' : task.answer}
                  onChange={(e) => patch(task.id, { answer: e.target.value, wrong: false })}
                  placeholder="DACY{...}"
                  aria-label={`${t('ws.answer')} ${i + 1}`}
                  readOnly={task.solved}
                  disabled={task.solved}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  disabled={task.solved || !task.answer.trim()}
                  loading={task.busy}
                >
                  {t('ws.submit')}
                </Button>
              </div>
              {task.solved ? (
                <div className="okm">
                  ✓ {t('ws.correct')}
                  {task.xp ? ` · +${task.xp} XP` : ''}
                </div>
              ) : task.wrong ? (
                <div className="mt-1.5 text-[0.82rem] text-error">✗ {t('ws.ctfWrong')}</div>
              ) : null}
              {task.hint ? (
                <p className="mt-2 rounded-md bg-navy-3 px-3 py-2 text-sm">💡 {task.hint}</p>
              ) : task.hint_available && !task.solved ? (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-on-dark-muted hover:text-on-dark"
                  onClick={() => void hint(task)}
                >
                  <Lightbulb className="size-3.5" />{' '}
                  {ctf.hint_penalty_xp > 0 && !view.preview
                    ? t('ws.hintCost', { n: ctf.hint_penalty_xp })
                    : t('ws.hintFree')}
                </button>
              ) : null}
            </form>
          ))}
          {allSolved ? (
            <div className="flex items-center gap-3 rounded-lg border border-ok bg-ok/10 px-4 py-3">
              <span className="font-semibold text-ok">🏁 {t('ws.ctfAllSolved')}</span>
              <span className="flex-1" />
              {done ? (
                <Button type="button" onClick={() => after(done, view.preview)}>
                  {view.next ? `${t('common.continue')} →` : t('ws.backToCourse')}
                </Button>
              ) : (
                <Link
                  href={
                    view.next
                      ? `/kurs/${view.course.slug}/${view.next.moduleKey}/${view.next.stepKey}${view.preview ? '?onizle=1' : ''}`
                      : `/kurs/${view.course.slug}`
                  }
                  className="b b-brand"
                >
                  {view.next ? `${t('common.continue')} →` : t('ws.backToCourse')}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
