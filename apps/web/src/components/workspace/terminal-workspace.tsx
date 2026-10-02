'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import type { LabCheckResultDto, StepViewDto, TerminalStudentView } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtCountdown } from '@/lib/labs';
import { LabPanel } from './lab-panel';
import { useAfterComplete } from './use-complete';
import { useLab } from './use-lab';

type Tab = 'terminal' | 'info';

export function TerminalWorkspace({
  view,
  term,
}: {
  view: StepViewDto;
  term: TerminalStudentView;
}) {
  const after = useAfterComplete(view.course.slug);
  const lab = useLab(view.id, view.preview);
  const [tab, setTab] = useState<Tab>('terminal');
  const [result, setResult] = useState<LabCheckResultDto | null>(null);
  // addım bir dəfə keçilibsə (bu sessiyada və ya əvvəl) «Davam et» açıq qalır — lab sıfırlansa belə
  const [done, setDone] = useState(view.state === 'completed');
  const s = lab.session;
  const passedNow = s?.status === 'PASSED';
  const passed = passedNow || done;

  async function runCheck() {
    const r = await lab.check();
    if (!r) return;
    setResult(r);
    if (r.passed) setDone(true);
    if (r.passed)
      toast(`✓ ${t('ws.labPassed')}`, {
        description: r.complete?.xpAwarded
          ? t('ws.earned', { n: r.complete.xpAwarded })
          : undefined,
      });
    else toast.error(t('ws.labNotPassed'));
  }

  function reset() {
    if (!window.confirm(t('ws.labResetConfirm'))) return;
    setResult(null);
    void lab.start(true);
  }

  function cont() {
    if (result?.complete) after(result.complete, view.preview);
    else
      after(
        {
          xpAwarded: 0,
          coursePercent: view.coursePercent,
          courseCompleted: false,
          next: view.next,
        },
        view.preview,
      );
  }

  const statusText =
    passedNow || (done && !(result && !result.passed))
      ? t('ws.labPassed')
      : result && !result.passed
        ? t('ws.labNotPassed')
        : lab.live
          ? t('ws.labRunning')
          : s?.status === 'STARTING'
            ? t('ws.labStarting')
            : '';

  return (
    <div className="ws-right">
      <div className="ftabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'terminal'}
          className={cn(tab === 'terminal' && 'on')}
          onClick={() => setTab('terminal')}
        >
          {t('ws.terminal')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'info'}
          className={cn(tab === 'info' && 'on')}
          onClick={() => setTab('info')}
        >
          {t('ws.labInfo')}
        </button>
        <span className="ml-auto flex items-center gap-3 pr-3 text-[0.82rem] text-on-dark-muted">
          {lab.live || s?.status === 'STARTING' ? (
            <span
              className={cn('font-mono', lab.remaining < 300 && 'text-de')}
              data-testid="lab-timer"
            >
              {t('ws.labExpiresIn', { t: fmtCountdown(lab.remaining) })}
            </span>
          ) : null}
          {s?.driver === 'mock' ? <span title={t('ws.labMockNote')}>mock</span> : null}
        </span>
      </div>

      <div className="min-h-0 overflow-hidden">
        {tab === 'terminal' ? (
          <LabPanel
            lab={lab}
            image={term.docker_image}
            minutes={term.time_limit_minutes}
            preview={view.preview}
          />
        ) : (
          <div className="h-full overflow-auto bg-[#0a1424] p-5 text-sm">
            <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="text-on-dark-muted">{t('ws.labImage')}</dt>
              <dd className="font-mono">{term.docker_image}</dd>
              <dt className="text-on-dark-muted">{t('ws.labTimeLimit')}</dt>
              <dd>{t('ws.labMinutes', { n: term.time_limit_minutes })}</dd>
              <dt className="text-on-dark-muted">{t('ws.labNetwork')}</dt>
              <dd>{term.network ? t('ws.labNetworkOn') : t('ws.labNetworkOff')}</dd>
              <dt className="text-on-dark-muted">Status</dt>
              <dd>{s ? s.status : '—'}</dd>
            </dl>
            <p className="mt-4 max-w-md text-on-dark-muted">{t('ws.labHowTo')}</p>
            {s?.driver === 'mock' ? (
              <p className="mt-2 max-w-md text-xs text-de">{t('ws.labMockNote')}</p>
            ) : null}
          </div>
        )}
      </div>

      {result ? (
        <div className="console max-h-44">
          <div className="ch">
            <b>{t('ws.labCheckOutput')}</b>
            <span className="ml-auto">
              {result.passed ? '✓' : '✗'} exit {result.exitCode}
            </span>
          </div>
          <pre className={result.passed ? 'text-ok' : 'text-error'} data-testid="lab-check-output">
            {result.output.trim() || (result.passed ? t('ws.labPassed') : t('ws.labNotPassed'))}
          </pre>
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="b b-run"
          onClick={reset}
          disabled={!s || lab.busy !== null}
          data-testid="lab-reset"
        >
          <RotateCcw className="size-4" /> {t('ws.resetLab')}
        </button>
        {lab.live && !passedNow ? (
          <button
            type="button"
            className="b b-run"
            onClick={() => void runCheck()}
            disabled={lab.busy !== null}
            data-testid="lab-check"
          >
            {lab.busy === 'check' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {lab.busy === 'check' ? t('ws.labChecking') : t('ws.labCheck')}
          </button>
        ) : null}
        <span className={cn('res', result && !result.passed && !passedNow && 'bad')}>
          {statusText}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          className="b b-brand"
          disabled={!passed}
          onClick={cont}
          data-testid="lab-continue"
        >
          {view.next ? `${t('common.continue')} →` : t('ws.backToCourse')}
        </button>
      </div>
    </div>
  );
}
