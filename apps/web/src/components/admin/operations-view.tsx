'use client';
import { useState } from 'react';
import { Activity, Database, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { fmtZoned } from '@/components/academy/format';
export interface OperationsData {
  state: {
    health?: { web: boolean; api: boolean; ok: boolean; at: string };
    backup?: { ok: boolean; at: string; remote: string; tables: number; files: number };
  } | null;
  supervisor: { services: Array<{ name: string; restarts: number; status: string }> } | null;
  notifications: { pending: number; failed: number };
  executions: { active: number; waiting: number };
  alerts: Array<{ event: string; message: string; at: string }>;
  pythonConfigured: boolean;
  mailTransport: string;
  remoteConfigured: boolean;
  alertEmailConfigured: boolean;
}
export function OperationsView({ initial }: { initial: OperationsData }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function reload() {
    setBusy(true);
    try {
      setData(await api('/admin/operations'));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6" data-testid="operations">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('reliability.operations')}</h1>
          <p className="mt-2 text-muted">{t('reliability.operationsHint')}</p>
        </div>
        <Button variant="outline" loading={busy} onClick={() => void reload()}>
          <RefreshCw className="size-4" />
          {t('reliability.refresh')}
        </Button>
      </div>
      {error ? (
        <p className="dlg-alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="box">
          <Activity className="mb-3 size-6 text-brand" />
          <h2 className="text-lg font-bold">Web / API</h2>
          <p className="mt-2">
            {t(
              data.state?.health
                ? data.state.health.ok
                  ? 'reliability.healthy'
                  : 'reliability.unhealthy'
                : 'reliability.unknown',
            )}
          </p>
          {data.supervisor?.services.map((s) => (
            <p key={s.name} className="mt-2 text-sm text-muted">
              {s.name}: {s.status} · {t('reliability.restarts')}: {s.restarts}
            </p>
          ))}
        </section>
        <section className="box">
          <Database className="mb-3 size-6 text-brand" />
          <h2 className="text-lg font-bold">{t('reliability.backup')}</h2>
          <p className="mt-2">
            {data.state?.backup?.at ? fmtZoned(data.state.backup.at) : t('reliability.unknown')}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t(
              !data.remoteConfigured
                ? 'reliability.remoteMissing'
                : data.state?.backup?.remote === 'copied'
                  ? 'reliability.remoteReady'
                  : 'reliability.remotePending',
            )}
          </p>
          {data.state?.backup && !data.state.backup.ok ? (
            <p className="mt-2 text-sm text-error-ink">{t('reliability.unhealthy')}</p>
          ) : null}
        </section>
        <section className="box">
          <Mail className="mb-3 size-6 text-brand" />
          <h2 className="text-lg font-bold">{t('reliability.mail')}</h2>
          <p className="mt-2">
            {t(
              data.mailTransport === 'smtp'
                ? 'reliability.mailSmtp'
                : data.mailTransport === 'file'
                  ? 'reliability.mailLocal'
                  : 'reliability.mailDisabled',
            )}
          </p>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="box">
          <ShieldCheck className="mb-3 size-6 text-brand" />
          <h2 className="text-lg font-bold">{t('reliability.execution')}</h2>
          <p className="mt-2">
            Python: {t(data.pythonConfigured ? 'reliability.healthy' : 'reliability.unhealthy')}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t('reliability.active')}: {data.executions.active} · {t('reliability.waiting')}:{' '}
            {data.executions.waiting}
          </p>
        </section>
        <section className="box">
          <h2 className="text-lg font-bold">{t('reliability.notifications')}</h2>
          <p className="mt-2">
            {t('reliability.pending')}: {data.notifications.pending}
          </p>
          <p className="mt-2">
            {t('reliability.failed')}: {data.notifications.failed}
          </p>
        </section>
      </div>
      <section className="box">
        <h2 className="text-lg font-bold">{t('reliability.alerts')}</h2>
        {data.alerts.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {data.alerts.map((alert, i) => (
              <li key={i} className="rounded-xl bg-soft p-3">
                <p>{alert.message}</p>
                <p className="mt-1 text-xs text-muted">{fmtZoned(alert.at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">{t('reliability.noAlerts')}</p>
        )}
      </section>
    </div>
  );
}
