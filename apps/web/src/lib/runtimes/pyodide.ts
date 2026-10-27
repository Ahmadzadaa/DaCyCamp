'use client';
import { getLocale, t } from '@/lib/i18n';
import type { AttachmentView } from '@dacy/shared';
export type { PyRunResult } from './python-engine';
import type { PyRunResult } from './python-engine';

let worker: Worker | null = null;
let serial = 0;
let pending: {
  id: number;
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

export function stopPython(message = t('ws.executionStopped')) {
  worker?.terminate();
  worker = null;
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(new Error(message));
    pending = null;
  }
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./python.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent) => {
      if (!pending) return;
      if (event.data.stage === 'running') {
        clearTimeout(pending.timer);
        pending.timer = setTimeout(() => stopPython(t('ws.timeout', { s: 12 })), 12_000);
        return;
      }
      if (event.data.id !== pending.id) return;
      const request = pending;
      pending = null;
      clearTimeout(request.timer);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.result);
    };
    worker.onerror = () => stopPython(t('ws.pyodideFailed', { src: 'Python' }));
  }
  return worker;
}

function request<T>(action: 'init' | 'run', code?: string, opts?: RunOptions): Promise<T> {
  if (pending) return Promise.reject(new Error(t('ws.executionBusy')));
  const current = getWorker();
  return new Promise<T>((resolve, reject) => {
    const id = ++serial;
    pending = {
      id,
      resolve: (value) => resolve(value as T),
      reject,
      timer: setTimeout(() => stopPython(t('ws.runtimeLoadTimeout')), 120_000),
    };
    current.postMessage({ id, action, code, opts, locale: getLocale() });
  });
}

type RunOptions = { tests?: string; datasets?: AttachmentView[]; stdin?: string };
export const getPyodide = () => request<null>('init');
export const runPython = (code: string, opts: RunOptions = {}) =>
  request<PyRunResult>('run', code, opts);
