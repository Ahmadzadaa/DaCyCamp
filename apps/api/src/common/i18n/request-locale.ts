import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  t as sharedT,
  type Locale,
  type TKey,
} from '@dacy/shared';

interface Ctx {
  locale: Locale;
  /** admin marşrutu — məzmun həmişə mənbə dilində (redaktə tərcüməni mənbəyə yazmasın) */
  admin: boolean;
  /** withRawContent içində — tərcümə tətbiq olunmur (mənbəyə geri yazılan oxumalar) */
  raw?: boolean;
}
const store = new AsyncLocalStorage<Ctx>();

/** Hər sorğunu öz dili ilə işlədir: `dacy_locale` cookie-si (web ilə eyni), yoxdursa az */
export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  // cookie-parser hələ işləməyibsə (middleware sırası) — başlıqdan oxu
  const c =
    (req.cookies as Record<string, string> | undefined)?.[LOCALE_COOKIE] ??
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(az|en)`).exec(req.headers.cookie ?? '')?.[1];
  const path = req.originalUrl ?? req.url ?? '';
  store.run(
    { locale: isLocale(c) ? c : DEFAULT_LOCALE, admin: /^\/admin(\/|\?|$)/.test(path) },
    next,
  );
}

/** Cari sorğunun dili (sorğudan kənarda — cron, seed, idxal — az) */
export const reqLocale = (): Locale => store.getStore()?.locale ?? DEFAULT_LOCALE;

/**
 * Məzmun tərcüməsi rejimi: null — heç nəyə toxunma (sorğudan kənar: idxal, cron; admin; withRawContent),
 * 'az' — tərcümə sahələrini nəticədən sil, 'en' — tərcüməni tətbiq et və sil.
 */
export function contentMode(): Locale | null {
  const c = store.getStore();
  if (!c || c.admin || c.raw) return null;
  return c.locale;
}

/** Mənbə dilində oxumaq lazım olan iş (məs. oxuyub geri yazılan secret, sertifikat snapshot-ı) */
export function withRawContent<T>(fn: () => T): T {
  const c = store.getStore();
  return c ? store.run({ ...c, raw: true }, fn) : fn();
}

/** Ortaq lüğətdən cari sorğunun dilində mətn */
export const tr = (key: TKey, params?: Record<string, string | number>) =>
  sharedT(key, params, reqLocale());
