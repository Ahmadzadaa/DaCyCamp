'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Play, RotateCcw } from 'lucide-react';
import type { CodeSubmitResultDto, PythonStudentView, StepViewDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CodeEditor } from './code-editor';
import { useCodeDraft } from './use-code-draft';
import { useAfterComplete } from './use-complete';
import type { PyRunResult } from '@/lib/runtimes/pyodide';

type Tab = 'stdout' | 'stderr' | 'plots' | 'stdin';

export function PythonWorkspace({ view, py }: { view: StepViewDto; py: PythonStudentView }) {
  const after = useAfterComplete(view.course.slug);
  const { code, setCode, reset, dirty } = useCodeDraft(view.id, py.starter_code);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMsg, setStatusMsg] = useState<string>(t('ws.loadingRuntime'));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [tab, setTab] = useState<Tab>('stdout');
  // input() üçün dəyərlər — hər sətir bir input() çağırışı (brauzerin prompt pəncərəsi əvəzinə)
  const [stdin, setStdin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const runtime = useRef<typeof import('@/lib/runtimes/pyodide') | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import('@/lib/runtimes/pyodide');
        runtime.current = mod;
        await mod.getPyodide();
        if (!alive) return;
        setStatus('ready');
        setStatusMsg(t('ws.runtimeReady'));
      } catch (e) {
        if (!alive) return;
        setStatus('error');
        setStatusMsg(t('ws.runtimeError', { msg: e instanceof Error ? e.message : String(e) }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const execute = useCallback(
    async (withTests: boolean): Promise<PyRunResult | null> => {
      if (!runtime.current || status !== 'ready') return null;
      setRunning(true);
      setVerdict(null);
      try {
        const r = await runtime.current.runPython(code, {
          tests: withTests ? py.tests : undefined,
          datasets: py.dataset,
          stdin,
        });
        setResult(r);
        setTab(r.error ? 'stderr' : r.images.length ? 'plots' : 'stdout');
        return r;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setResult({
          stdout: '',
          stderr: msg,
          error: msg,
          passed: withTests ? false : null,
          images: [],
          ms: 0,
        });
        setTab('stderr');
        return null;
      } finally {
        setRunning(false);
      }
    },
    [code, py.tests, py.dataset, status, stdin],
  );

  async function submit() {
    setSubmitting(true);
    try {
      const r = await execute(true);
      if (!r) return;
      const passed = r.passed === true;
      const res = await api<CodeSubmitResultDto>(
        `/learn/steps/${view.id}/submit${view.preview ? '?preview=1' : ''}`,
        {
          method: 'POST',
          body: {
            kind: 'python',
            code,
            passed,
            stdout: r.stdout.slice(0, 10_000),
            error: r.error ?? undefined,
          },
        },
      );
      if (res.passed) {
        setVerdict({ ok: true, text: `✓ ${t('ws.testsPassed')}` });
        after(res, view.preview);
      } else {
        setVerdict({ ok: false, text: `✗ ${t('ws.testsFailed')}` });
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const tabBtn = (k: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === k}
      className={cn(
        'border-0 bg-transparent p-0 font-[inherit]',
        tab === k ? 'font-bold text-on-dark' : 'text-on-dark-muted',
      )}
      onClick={() => setTab(k)}
    >
      {label}
    </button>
  );

  return (
    <div className="ws-right" data-theme="dark">
      <div className="ftabs">
        <span className="on">script.py</span>
        {py.dataset.map((d) => (
          <span key={d.path} title={d.path}>
            {d.filename}
          </span>
        ))}
        {dirty ? (
          <button
            type="button"
            className="ftab-reset"
            onClick={reset}
            title={t('ws.resetCode')}
            aria-label={t('ws.resetCode')}
          >
            <RotateCcw className="size-3.5" />
          </button>
        ) : null}
        <span
          className={cn(
            'ml-auto self-center px-3 text-xs',
            status === 'error' ? 'text-error' : 'text-on-dark-muted',
          )}
        >
          {statusMsg}
        </span>
      </div>
      <CodeEditor
        value={code}
        onChange={setCode}
        language="python"
        onRun={() => void execute(false)}
      />
      <div className="console" data-testid="py-console">
        <div className="ch" role="tablist">
          {tabBtn('stdout', t('ws.console'))}
          {tabBtn('stderr', t('ws.stderr'))}
          {tabBtn('plots', t('ws.chart'))}
          {tabBtn('stdin', stdin.trim() ? `${t('ws.stdinTab')} •` : t('ws.stdinTab'))}
          {result ? (
            <span className="ml-auto">
              {result.ms} ms
              {result.passed !== null
                ? ` · ${result.passed ? t('ws.testsPassed') : t('ws.testsFailed')}`
                : ''}
            </span>
          ) : null}
        </div>
        {tab === 'stdin' ? (
          <div className="flex flex-col gap-1.5 p-3">
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={t('ws.stdinPlaceholder')}
              aria-label={t('ws.stdinTab')}
              data-testid="py-stdin"
              className="w-full resize-y rounded-lg border border-navy-line bg-navy px-3 py-2 font-mono text-[13px] text-on-dark outline-none placeholder:text-on-dark-muted focus:border-brand"
            />
            <p className="font-sans text-xs text-on-dark-muted">{t('ws.stdinHint')}</p>
          </div>
        ) : tab === 'stdout' ? (
          <pre>{result ? result.stdout || t('ws.noOutput') : t('ws.pythonCdnNote')}</pre>
        ) : tab === 'stderr' ? (
          <pre className={result?.error ? 'text-error' : undefined}>
            {result ? (result.error ?? (result.stderr || t('ws.noOutput'))) : t('ws.noOutput')}
          </pre>
        ) : (
          <div className="flex flex-wrap gap-3 p-3">
            {result?.images.length ? (
              result.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={`data:image/png;base64,${img}`}
                  alt={`${t('ws.chart')} ${i + 1}`}
                  className="max-h-72 rounded-md bg-white"
                />
              ))
            ) : (
              <pre className="text-on-dark-muted">{t('ws.noOutput')}</pre>
            )}
          </div>
        )}
      </div>
      <div className="actions">
        <Button
          type="button"
          variant="run"
          onClick={() => void execute(false)}
          loading={running && !submitting}
          disabled={status !== 'ready'}
          title={t('ws.runShortcut')}
        >
          <Play className="size-4" />
          {t('ws.run')}
        </Button>
        {verdict ? <span className={cn('res', !verdict.ok && 'bad')}>{verdict.text}</span> : null}
        <span className="flex-1" />
        <Button
          type="button"
          onClick={submit}
          loading={submitting}
          disabled={status !== 'ready'}
          data-testid="submit-python"
        >
          {t('ws.submitAndContinue')}
        </Button>
      </div>
    </div>
  );
}
