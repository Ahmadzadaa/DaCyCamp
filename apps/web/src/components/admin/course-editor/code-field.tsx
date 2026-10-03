'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { CheckCircle2, FlaskConical, XCircle } from 'lucide-react';
import type { AssetDto, AttachmentView } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ResultTable } from '@/components/workspace/result-table';
import type { RunResult } from '@/lib/runtimes/duckdb';
import type { PyRunResult } from '@/lib/runtimes/pyodide';

// Monaco yalnız brauzerdə yüklənir (SSR-də window yoxdur)
const CodeEditor = dynamic(
  () => import('@/components/workspace/code-editor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="code-field grid place-items-center text-sm text-on-dark-muted">
        {t('ws.loadingEditor')}
      </div>
    ),
  },
);

/** Admin formalarında kod sahəsi: sintaksis rəngləmə, Tab ilə girinti, Ctrl/Cmd+Enter */
export function CodeField({
  value,
  onChange,
  language,
  height = 200,
  label,
  onRun,
}: {
  /** Field avtomatik id ötürür; Monaco-da istifadə olunmur */
  id?: string;
  value: string;
  onChange: (v: string) => void;
  language: 'sql' | 'python';
  height?: number;
  label?: string;
  onRun?: () => void;
}) {
  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={language}
      height={height}
      ariaLabel={label}
      onRun={onRun}
    />
  );
}

const toAttachments = (paths: string[], assets: AssetDto[]): AttachmentView[] =>
  paths
    .map((p) => assets.find((a) => a.path === p))
    .filter((a): a is AssetDto => !!a)
    .map((a) => ({ path: a.path, url: a.url, filename: a.filename, size_bytes: a.sizeBytes }));

type SqlOutcome = { ok: true; run: RunResult } | { ok: false; error: string };

/** Müəllim həllini tələbənin görəcəyi datasetlərlə brauzerdə (DuckDB-WASM) işlədir */
export function SqlSolutionCheck({
  solution,
  dataset,
  assets,
}: {
  solution: string;
  dataset: string[];
  assets: AssetDto[];
}) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<SqlOutcome | null>(null);

  async function run() {
    setBusy(true);
    try {
      const rt = await import('@/lib/runtimes/duckdb');
      const session = await rt.openSession(toAttachments(dataset, assets));
      try {
        setOut({ ok: true, run: await rt.runSql(session, solution) });
      } finally {
        await session.conn.close();
      }
    } catch (e) {
      setOut({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sol-check md:col-span-2" data-testid="sql-solution-check">
      <div className="sol-check-h">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={run}
          disabled={busy || !solution.trim()}
        >
          <FlaskConical className="size-4" />
          {busy ? t('ws.running') : t('admin.trySolution')}
        </Button>
        <span className="text-xs text-muted">{t('admin.trySolutionHint')}</span>
      </div>
      {out ? (
        <div className="sol-check-out">
          {out.ok ? (
            <>
              <div className="sol-check-status ok">
                <CheckCircle2 className="size-4" />
                {t('ws.rowsMs', { n: out.run.result.rows.length, ms: out.run.ms })}
              </div>
              <ResultTable table={out.run.result} max={50} />
            </>
          ) : (
            <div className="sol-check-status err">
              <XCircle className="size-4" />
              <span className="font-mono text-xs">
                {t('ws.sqlError')}: {out.error}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Müəllim həllini (və ya başlanğıc kodu) testlərlə brauzerdə (Pyodide) işlədir */
export function PythonSolutionCheck({
  solution,
  starter,
  tests,
  dataset,
  assets,
}: {
  solution: string;
  starter: string;
  tests: string;
  dataset: string[];
  assets: AssetDto[];
}) {
  const [busy, setBusy] = useState<null | 'solution' | 'starter'>(null);
  const [out, setOut] = useState<{ which: 'solution' | 'starter'; r: PyRunResult } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function run(which: 'solution' | 'starter') {
    setBusy(which);
    setLoadErr(null);
    try {
      const rt = await import('@/lib/runtimes/pyodide');
      const r = await rt.runPython(which === 'solution' ? solution : starter, {
        tests,
        datasets: toAttachments(dataset, assets),
      });
      setOut({ which, r });
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // başlanğıc kod testləri keçirsə tapşırıq mənasızdır — müəllimə xəbərdarlıq
  const starterPasses = out?.which === 'starter' && out.r.passed === true;
  const good = out ? (out.which === 'solution' ? out.r.passed : out.r.passed === false) : null;

  return (
    <div className="sol-check md:col-span-2" data-testid="py-solution-check">
      <div className="sol-check-h">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => run('solution')}
          disabled={!!busy || !solution.trim()}
        >
          <FlaskConical className="size-4" />
          {busy === 'solution' ? t('ws.running') : t('admin.trySolutionTests')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => run('starter')}
          disabled={!!busy || !tests.trim()}
        >
          {busy === 'starter' ? t('ws.running') : t('admin.tryStarterTests')}
        </Button>
        <span className="text-xs text-muted">{t('admin.trySolutionHintPy')}</span>
      </div>
      {loadErr ? (
        <div className="sol-check-out">
          <div className="sol-check-status err">
            <XCircle className="size-4" />
            {t('ws.runtimeError', { msg: loadErr })}
          </div>
        </div>
      ) : out ? (
        <div className="sol-check-out">
          <div className={`sol-check-status ${good ? 'ok' : 'err'}`}>
            {good ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {out.which === 'solution'
              ? out.r.passed === null
                ? t('admin.noTestsYet')
                : out.r.passed
                  ? t('admin.solutionPasses')
                  : t('admin.solutionFails')
              : starterPasses
                ? t('admin.starterPasses')
                : t('admin.starterFails')}
            <span className="ml-auto text-xs opacity-70">{out.r.ms} ms</span>
          </div>
          {out.r.stdout || out.r.error ? (
            <pre className="sol-check-pre">
              {out.r.stdout}
              {out.r.error ? `\n${out.r.error}` : ''}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
