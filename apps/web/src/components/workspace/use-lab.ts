'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LabCheckResultDto, LabSessionDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { LAB_TICK_EVENT, type LabTickDetail } from './lab-countdown';

const LIVE = new Set(['STARTING', 'RUNNING', 'PASSED']);

/** Lab sessiyasının həyat dövrü: cari vəziyyət, başlat/sıfırla/dayandır/yoxla, geri sayım, STARTING zamanı sorğulama */
export function useLab(stepId: string, preview: boolean) {
  const q = preview ? '?preview=1' : '';
  const [session, setSession] = useState<LabSessionDto | null | undefined>(undefined);
  const [busy, setBusy] = useState<'start' | 'stop' | 'check' | null>(null);
  const [remaining, setRemaining] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setSession(await api<LabSessionDto | null>(`/learn/labs/steps/${stepId}`));
    } catch (e) {
      toast.error(errorMessage(e));
      setSession(null);
    }
  }, [stepId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // konteyner hazırlanarkən sorğula
  useEffect(() => {
    if (session?.status !== 'STARTING') return;
    const t = setInterval(() => void refresh(), 1500);
    return () => clearInterval(t);
  }, [session?.status, refresh]);

  // geri sayım
  useEffect(() => {
    if (!session || !LIVE.has(session.status) || session.endedAt) {
      setRemaining(0);
      return;
    }
    const end = new Date(session.expiresAt).getTime();
    let fired = false;
    const tick = () => {
      const r = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0 && !fired) {
        fired = true;
        setTimeout(() => void refresh(), 2000);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, refresh]);

  const start = useCallback(
    async (reset = false) => {
      setBusy('start');
      try {
        const s = await api<LabSessionDto>(`/learn/labs/steps/${stepId}/start${q}`, {
          method: 'POST',
          body: { reset },
        });
        setSession(s);
        return s;
      } catch (e) {
        toast.error(errorMessage(e));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [stepId, q],
  );

  const stop = useCallback(async () => {
    if (!session) return;
    setBusy('stop');
    try {
      setSession(await api<LabSessionDto>(`/learn/labs/${session.id}/stop`, { method: 'POST' }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }, [session]);

  const check = useCallback(async (): Promise<LabCheckResultDto | null> => {
    if (!session) return null;
    setBusy('check');
    try {
      const r = await api<LabCheckResultDto>(`/learn/labs/${session.id}/check${q}`, {
        method: 'POST',
      });
      if (r.passed)
        setSession({ ...session, status: 'PASSED', passedAt: new Date().toISOString() });
      return r;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  }, [session, q]);

  const live =
    !!session &&
    (session.status === 'RUNNING' || session.status === 'PASSED') &&
    !session.endedAt &&
    remaining > 0;

  // sol paneldəki sayğac üçün
  useEffect(() => {
    const detail: LabTickDetail = { stepId, remaining, live };
    window.dispatchEvent(new CustomEvent(LAB_TICK_EVENT, { detail }));
  }, [stepId, remaining, live]);

  return { session, busy, remaining, live, start, stop, check, refresh };
}
