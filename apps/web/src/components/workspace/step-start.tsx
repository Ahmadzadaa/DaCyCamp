'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api/client';

/** Addım açılan kimi IN_PROGRESS yazır ("Qaldığınız yer") */
export function StepStart({ stepId, enabled }: { stepId: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    api(`/learn/steps/${stepId}/start`, { method: 'POST' }).catch(() => null);
  }, [stepId, enabled]);
  return null;
}
