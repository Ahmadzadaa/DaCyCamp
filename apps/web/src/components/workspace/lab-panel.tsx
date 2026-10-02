'use client';
import dynamic from 'next/dynamic';
import { Loader2, Play } from 'lucide-react';
import type { LabSessionDto } from '@dacy/shared';
import { t } from '@/lib/i18n';

// xterm.js yalnız brauzerdə işləyir (import zamanı `self` istifadə edir) — SSR-dən kənar
const LabTerminal = dynamic(() => import('./lab-terminal').then((m) => m.LabTerminal), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[240px] items-center justify-center bg-[#0a1424] text-sm text-on-dark-muted">
      {t('ws.loadingEditor')}
    </div>
  ),
});

type Lab = {
  session: LabSessionDto | null | undefined;
  busy: 'start' | 'stop' | 'check' | null;
  remaining: number;
  live: boolean;
  start: (reset?: boolean) => Promise<LabSessionDto | null>;
};

/** Sağ panelin orta hissəsi: başlat ekranı / hazırlanır / terminal / bitdi */
export function LabPanel({
  lab,
  image,
  minutes,
  preview,
}: {
  lab: Lab;
  image: string;
  minutes: number;
  preview: boolean;
}) {
  const s = lab.session;
  if (s === undefined)
    return (
      <Center>
        <Loader2 className="size-5 animate-spin" />
      </Center>
    );
  if (lab.live && s) return <LabTerminal sessionId={s.id} />;
  if (s?.status === 'STARTING' && lab.remaining > 0)
    return (
      <Center>
        <Loader2 className="size-6 animate-spin text-brand" />
        <p>{t('ws.labStarting')}</p>
        <p className="font-mono text-xs text-on-dark-muted">{image}</p>
      </Center>
    );
  const ended =
    s &&
    (s.status === 'EXPIRED' ||
      (s.status !== 'FAILED' && lab.remaining === 0 && s.status !== 'STOPPED'));
  return (
    <Center>
      {s?.status === 'FAILED' ? (
        <p className="max-w-md text-error">{t('ws.labFailed', { msg: s.message ?? '' })}</p>
      ) : ended ? (
        <p className="text-on-dark-muted">{t('ws.labExpired')}</p>
      ) : s?.status === 'STOPPED' ? (
        <p className="text-on-dark-muted">{t('ws.labStopped')}</p>
      ) : (
        <p className="max-w-md text-on-dark-muted">{t('ws.labStartHint', { n: minutes })}</p>
      )}
      <p className="font-mono text-xs text-on-dark-muted">{image}</p>
      {preview ? <p className="text-xs text-de">{t('ws.labPreviewNote')}</p> : null}
      <button
        type="button"
        className="b b-brand"
        onClick={() => void lab.start(!!s)}
        disabled={lab.busy === 'start'}
        data-testid="lab-start"
      >
        {lab.busy === 'start' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {t('ws.labStart')}
      </button>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 bg-[#0a1424] p-6 text-center text-sm text-on-dark">
      {children}
    </div>
  );
}
