'use client';
import { ApiError } from './errors';

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => setTimeout(() => (refreshing = null), 0));
  }
  return refreshing;
}

export interface ApiInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  raw?: boolean;
}

/** Brauzerdən /api/* (Next rewrite → NestJS). 401-də bir dəfə refresh edib təkrar cəhd edir. */
export async function api<T>(path: string, init: ApiInit = {}, retry = true): Promise<T> {
  const { body, raw, headers, ...rest } = init;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: { ...(isForm ? {} : { 'content-type': 'application/json' }), ...(headers ?? {}) },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return api<T>(path, init, false);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      res.status,
      data.code ?? 'HTTP_ERROR',
      data.message ?? res.statusText,
      data.details,
    );
  }
  if (raw) return res as unknown as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export { ApiError };
