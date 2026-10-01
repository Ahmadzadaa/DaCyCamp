import { cookies } from 'next/headers';
import type { PublicUser } from '@dacy/shared';
import { ApiError } from './errors';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** Server component-lərdən API-yə sorğu; brauzerin cookie-lərini ötürür */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const cookie = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}), cookie },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      res.status,
      body.code ?? 'HTTP_ERROR',
      body.message ?? res.statusText,
      body.details,
    );
  }
  return (await res.json()) as T;
}

/** 401/403/404 → null (səhifə özü qərar verir) */
export async function apiTry<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && [401, 403, 404].includes(e.status)) return null;
    throw e;
  }
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  if (!store.get('dacy_at')) return null;
  return apiTry<PublicUser>('/auth/me');
}

export const isStaff = (u: PublicUser | null | undefined) =>
  !!u && (u.role === 'ADMIN' || u.role === 'INSTRUCTOR');
