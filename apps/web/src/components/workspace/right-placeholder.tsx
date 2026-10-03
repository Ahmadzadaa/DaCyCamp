import type { StepViewDto } from '@dacy/shared';
import { t } from '@/lib/i18n';

function CodeLines({ code, fallback }: { code: string; fallback: string }) {
  const lines = (code || fallback).split('\n');
  return (
    <div className="editor" aria-label="Kod redaktoru (yer tutucu)">
      {lines.map((l, i) => (
        <div key={i}>{l || ' '}</div>
      ))}
    </div>
  );
}

/** Mərhələ 2/3-ə qədər sağ panelin tam görünüşü (fayl tabları, redaktor, nəticə, düymələr) */
export function RightPlaceholder({ view }: { view: StepViewDto }) {
  const v = view.view;
  if (v.kind === 'sql' || v.kind === 'python') {
    const file = v.kind === 'sql' ? 'query.sql' : 'script.py';
    return (
      <div className="ws-right" data-theme="dark">
        <div className="ftabs">
          <span className="on">{file}</span>
          {v.dataset.map((d) => (
            <span key={d.path}>
              {d.filename}
              {v.kind === 'sql' ? ' (cədvəl)' : ''}
            </span>
          ))}
        </div>
        <CodeLines
          code={v.starter_code}
          fallback={v.kind === 'sql' ? '-- Sorğunuzu bura yazın' : '# Kodunuzu bura yazın'}
        />
        <div className="console">
          <div className="ch">
            <b>{t('ws.result')}</b>
            <span>{t('ws.console')}</span>
            {v.kind === 'python' ? <span>{t('ws.chart')}</span> : null}
          </div>
          <pre className="text-on-dark-muted">
            {t('ws.comingPhase', { phase: 2 })} — {v.kind === 'sql' ? 'DuckDB-WASM' : 'Pyodide'}
          </pre>
        </div>
        <div className="actions">
          <button type="button" className="b b-run" disabled title={t('ws.runShortcut')}>
            ▶ {t('ws.run')}
          </button>
          <span className="flex-1" />
          <button type="button" className="b b-brand" disabled>
            {t('ws.submitAndContinue')}
          </button>
        </div>
      </div>
    );
  }
  if (v.kind === 'terminal') {
    return (
      <div className="ws-right !grid-rows-[auto_1fr_auto]" data-theme="dark">
        <div className="ftabs">
          <span className="on">{t('ws.terminal')}</span>
          <span>{t('ws.files')}</span>
        </div>
        <div className="editor !bg-[#0a1424] [counter-reset:none]">
          <div className="!pl-4 before:!content-none">
            <span className="text-brand">student@dacy-lab</span>:~${' '}
            <span className="text-on-dark-muted">
              # {t('ws.comingPhase', { phase: 3 })} — {v.docker_image}
            </span>
          </div>
          <div className="!pl-4 before:!content-none">
            <span className="text-brand">student@dacy-lab</span>:~$ █
          </div>
        </div>
        <div className="actions">
          <button type="button" className="b b-run" disabled>
            ↻ {t('ws.resetLab')}
          </button>
          <span className="flex-1" />
          <button type="button" className="b b-brand" disabled>
            {t('common.continue')}
          </button>
        </div>
      </div>
    );
  }
  if (v.kind === 'ctf') {
    return (
      <div className="ws-right !grid-rows-[auto_1fr]" data-theme="dark">
        <div className="ftabs">
          <span className="on">{t('ws.questions')}</span>
          {v.attachments.length ? <span>{t('ws.files')}</span> : null}
        </div>
        <div className="flex flex-col gap-3 overflow-auto p-[18px]">
          {v.tasks.map((task, i) => (
            <div key={task.id} className={task.solved ? 'fq ok' : 'fq'}>
              <p>
                {i + 1}. {task.question}{' '}
                <span className="text-xs text-on-dark-muted">· {task.points} XP</span>
              </p>
              <div className="row">
                <input
                  placeholder="DACY{...}"
                  aria-label={`${t('ws.answer')} ${i + 1}`}
                  disabled
                  readOnly
                  value={task.solved ? '••••••' : ''}
                />
                <button
                  type="button"
                  className="b b-brand"
                  disabled
                  title={t('ws.comingPhase', { phase: 2 })}
                >
                  {t('ws.submit')}
                </button>
              </div>
              {task.solved ? (
                <div className="okm">
                  ✓ {t('ws.correct')} · +{task.points} XP
                </div>
              ) : null}
            </div>
          ))}
          <p className="text-xs text-on-dark-muted">{t('ws.comingPhase', { phase: 2 })}</p>
        </div>
      </div>
    );
  }
  return null;
}
