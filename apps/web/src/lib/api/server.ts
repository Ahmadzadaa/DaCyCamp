import { cookies, headers } from 'next/headers';
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
  // ziyarətçinin IP-si API-yə ötürülür: əks halda bütün anonim SSR sorğuları Next serverinin
  // tək IP-si ilə gəlir və API limitini (300/dəq) bölüşür — bir bot hamı üçün səhifələri sındırardı.
  // API bunu yalnız etibarlı proksidən qəbul edir (TRUST_PROXY).
  const xff = (await headers()).get('x-forwarded-for');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
      cookie,
      ...(xff ? { 'x-forwarded-for': xff } : {}),
    },
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
