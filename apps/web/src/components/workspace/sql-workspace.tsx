'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Play, RotateCcw, Square } from 'lucide-react';
import {
  resultHash,
  type CheckMode,
  type CodeSubmitResultDto,
  type SqlStudentView,
  type StepViewDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CodeEditor } from './code-editor';
import { useCodeDraft } from './use-code-draft';
import { ResultTable } from './result-table';
import { useAfterComplete } from './use-complete';
import type { RunResult, SqlSession } from '@/lib/runtimes/duckdb';

type Tab = 'result' | 'console';

export function SqlWorkspace({ view, sql }: { view: StepViewDto; sql: SqlStudentView }) {
  const after = useAfterComplete(view.course.slug);
  const { code, setCode, reset, dirty } = useCodeDraft(view.id, sql.starter_code, view.learnerId);
  const [session, setSession] = useState<SqlSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMsg, setStatusMsg] = useState<string>(t('ws.loadingRuntime'));
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [preview, setPreview] = useState<{ name: string; result: RunResult } | null>(null);
  const [consoleText, setConsoleText] = useState<string>('');
  const [tab, setTab] = useState<Tab>('result');
  const [fileTab, setFileTab] = useState<string>('query');
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const runtime = useRef<typeof import('@/lib/runtimes/duckdb') | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const version = ++generation.current;
    let opened: SqlSession | null = null;
    setRun(null);
    setPreview(null);
    setStatus('loading');
    setStatusMsg(t('ws.loadingRuntime'));
    setVerdict(null);
    busy.current = false;
    setRunning(false);
    setSubmitting(false);
    setSession(null);
    (async () => {
      try {
        const mod = await import('@/lib/runtimes/duckdb');
        if (!alive) return;
        runtime.current = mod;
        const s = await mod.openSession(sql.dataset, controller.signal);
        if (!alive) {
          await mod.closeSession(s);
          return;
        }
        opened = s;
        setSession(s);
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
      controller.abort();
      generation.current = version + 1;
      if (opened) void runtime.current?.closeSession(opened);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id, attempt]);

  const execute = useCallback(async (): Promise<RunResult | null> => {
    if (!session || !runtime.current || busy.current) return null;
    const version = generation.current;
    busy.current = true;
    setRunning(true);
    setVerdict(null);
    setPreview(null);
    setFileTab('query');
    try {
      const r = await runtime.current.runSql(session, code);
      if (version !== generation.current) return null;
      setRun(r);
      setConsoleText(`✓ ${t('ws.rowsMs', { n: r.result.rows.length, ms: r.ms })}`);
      setTab('result');
      return r;
    } catch (e) {
      if (version !== generation.current) return null;
      const msg = e instanceof Error ? e.message : String(e);
      if (session.closed) {
        setStatus('error');
        setStatusMsg(t('ws.executionStopped'));
      }
      setRun(null);
      setConsoleText(`${t('ws.sqlError')}: ${msg}`);
      setTab('console');
      return null;
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setRunning(false);
      }
    }
  }, [session, code]);

  async function previewTable(name: string) {
    if (!session || !runtime.current || busy.current) return;
    const version = generation.current;
    busy.current = true;
    setFileTab(name);
    try {
      const r = await runtime.current.runSql(session, `SELECT * FROM "${name}" LIMIT 50`, 50);
      if (version !== generation.current) return;
      setPreview({ name, result: r });
      setTab('result');
    } catch (e) {
      if (version !== generation.current) return;
      if (session.closed) {
        setStatus('error');
        setStatusMsg(t('ws.executionStopped'));
      }
      setConsoleText(`${t('ws.sqlError')}: ${e instanceof Error ? e.message : String(e)}`);
      setTab('console');
    } finally {
      if (version === generation.current) busy.current = false;
    }
  }

  async function submit() {
    if (busy.current || submitting) return;
    const version = generation.current;
    setSubmitting(true);
    try {
      const r = await execute();
      if (!r) {
        setVerdict({ ok: false, text: t('ws.runFirst') });
        return;
      }
      const mode = (
        sql.check === 'result_match_unordered' ? 'result_match_unordered' : 'result_match'
      ) as CheckMode;
      const row_hash = await resultHash(r.result, mode);
      const res = await api<CodeSubmitResultDto>(
        `/learn/steps/${view.id}/submit${view.preview ? '?preview=1' : ''}`,
        {
          method: 'POST',
          body: {
            kind: 'sql',
            query: code,
            row_hash,
            row_count: r.result.rows.length,
            columns: r.result.columns,
          },
        },
      );
      if (version !== generation.current) return;
      if (res.passed) {
        setVerdict({ ok: true, text: `✓ ${t('ws.passed')}` });
        after(res, view.preview);
      } else {
        setVerdict({ ok: false, text: `✗ ${res.message ?? t('ws.failed')}` });
      }
    } catch (e) {
      if (version === generation.current) toast.error(errorMessage(e));
    } finally {
      if (version === generation.current) setSubmitting(false);
    }
  }

  const shown = preview ? preview.result : run;
  return (
    <div className="ws-right" data-theme="dark">
      <div className="ftabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={fileTab === 'query'}
          className={cn(fileTab === 'query' && 'on')}
          onClick={() => setFileTab('query')}
        >
          query.sql
        </button>
        {(
          session?.tables ??
          sql.dataset.map((d) => ({
            name: d.filename.replace(/\.[^.]+$/, ''),
            filename: d.filename,
            path: d.path,
          }))
        ).map((tb) => (
          <button
            key={tb.name}
            type="button"
            role="tab"
            aria-selected={fileTab === tb.name}
            className={cn(fileTab === tb.name && 'on')}
            onClick={() => previewTable(tb.name)}
            disabled={!session}
          >
            {t('ws.tableTab', { name: tb.name })}
          </button>
        ))}
        {dirty ? (
          <button
            type="button"
            className="ftab-reset"
            onClick={reset}
            disabled={running || submitting}
            title={t('ws.resetCode')}
            aria-label={t('ws.resetCode')}
          >
            <RotateCcw className="size-3.5" />
          </button>
        ) : null}
        {status === 'error' ? (
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {t('ws.retryRuntime')}
          </button>
        ) : null}
        <span
          role="status"
          className={cn(
            'ml-auto self-center px-3 text-xs',
            status === 'error' ? 'text-error-ink' : 'text-on-dark-muted',
          )}
        >
          {statusMsg}
        </span>
      </div>
      <CodeEditor
        value={code}
        onChange={(value) => {
          setCode(value);
          setRun(null);
          setVerdict(null);
        }}
        language="sql"
        readOnly={running || submitting}
        onRun={() => void execute()}
      />
      <div className="console" data-testid="sql-console">
        <div className="ch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'result'}
            className={cn(
              'border-0 bg-transparent p-0 font-[inherit]',
              tab === 'result' ? 'font-bold text-on-dark' : 'text-on-dark-muted',
            )}
            onClick={() => setTab('result')}
          >
            {preview ? t('ws.preview', { name: preview.name }) : t('ws.result')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'console'}
            className={cn(
              'border-0 bg-transparent p-0 font-[inherit]',
              tab === 'console' ? 'font-bold text-on-dark' : 'text-on-dark-muted',
            )}
            onClick={() => setTab('console')}
          >
            {t('ws.console')}
          </button>
          {shown ? (
            <span className="ml-auto">
              {t('ws.rowsMs', { n: shown.result.rows.length, ms: shown.ms })}
            </span>
          ) : null}
        </div>
        {tab === 'result' ? (
          shown ? (
            <ResultTable table={shown.result} />
          ) : (
            <pre className="text-on-dark-muted">{t('ws.noResult')}</pre>
          )
        ) : (
          <pre className={consoleText.startsWith(t('ws.sqlError')) ? 'text-error-ink' : undefined}>
            {consoleText || t('ws.noOutput')}
          </pre>
        )}
      </div>
      <div className="actions">
        <Button
          type="button"
          variant="run"
          onClick={() => void execute()}
          loading={running}
          disabled={status !== 'ready' || running || submitting}
          title={t('ws.runShortcut')}
        >
          <Play className="size-4" />
          {t('ws.run')}
        </Button>
        {running ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (session) void runtime.current?.closeSession(session);
            }}
          >
            <Square className="size-4" />
            {t('ws.stopExecution')}
          </Button>
        ) : null}
        {verdict ? <span className={cn('res', !verdict.ok && 'bad')}>{verdict.text}</span> : null}
        <span className="flex-1" />
        <Button
          type="button"
          onClick={submit}
          loading={submitting}
          disabled={status !== 'ready' || running || submitting}
          data-testid="submit-sql"
        >
          {t('ws.submitAndContinue')}
        </Button>
      </div>
    </div>
  );
}
