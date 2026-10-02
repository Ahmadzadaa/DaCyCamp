'use client';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtCountdown } from '@/lib/labs';

export const LAB_TICK_EVENT = 'dacy:lab-tick';
export interface LabTickDetail {
  stepId: string;
  remaining: number;
  live: boolean;
}

/** Sol paneldəki «⏱ mm:ss qalıb» — sağ paneldəki useLab geri sayımını dinləyir (öz sorğusu yoxdur) */
export function LabCountdown({ stepId, minutes }: { stepId: string; minutes: number }) {
  const [tick, setTick] = useState<LabTickDetail | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<LabTickDetail>).detail;
      if (d.stepId === stepId) setTick(d);
    };
    window.addEventListener(LAB_TICK_EVENT, on);
    return () => window.removeEventListener(LAB_TICK_EVENT, on);
  }, [stepId]);
  const text = tick?.live ? fmtCountdown(tick.remaining) : `${minutes}:00`;
  return (
    <span
      className={cn(
        'ml-auto text-[0.82rem] text-on-dark-muted',
        tick?.live && tick.remaining < 300 && 'text-de',
      )}
      data-testid="lab-countdown"
    >
      ⏱ {t('ws.timeLeft', { t: text })}
    </span>
  );
}
