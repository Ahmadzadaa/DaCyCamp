'use client';
import { RotateCcw } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtCountdown } from '@/lib/labs';
import { LabPanel } from './lab-panel';
import { useLab } from './use-lab';

/** CTF otağında istəyə bağlı konteyner terminalı (docker_image verilibsə) — yoxlama skripti yoxdur, yalnız mühit */
export function CtfLabTab({ stepId, preview }: { stepId: string; preview: boolean }) {
  const lab = useLab(stepId, preview);
  const s = lab.session;
  return (
    <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
      <LabPanel lab={lab} image={s?.image ?? ''} minutes={60} preview={preview} />
      <div className="flex items-center gap-3 border-t border-navy-line bg-navy px-3 py-2 text-xs text-on-dark-muted">
        {lab.live || s?.status === 'STARTING' ? (
          <span className={cn('font-mono', lab.remaining < 300 && 'text-de')}>
            {t('ws.labExpiresIn', { t: fmtCountdown(lab.remaining) })}
          </span>
        ) : (
          <span>{t('ws.labTerminalOf')}</span>
        )}
        <span className="flex-1" />
        {s ? (
          <button
            type="button"
            className="b b-run b-sm"
            disabled={lab.busy !== null}
            onClick={() => {
              if (window.confirm(t('ws.labResetConfirm'))) void lab.start(true);
            }}
          >
            <RotateCcw className="size-3.5" /> {t('ws.resetLab')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
