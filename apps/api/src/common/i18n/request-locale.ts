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

const store = new AsyncLocalStorage<Locale>();

/** Hər sorğunu öz dili ilə işlədir: `dacy_locale` cookie-si (web ilə eyni), yoxdursa az */
export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  // cookie-parser hələ işləməyibsə (middleware sırası) — başlıqdan oxu
  const c =
    (req.cookies as Record<string, string> | undefined)?.[LOCALE_COOKIE] ??
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(az|en)`).exec(req.headers.cookie ?? '')?.[1];
  store.run(isLocale(c) ? c : DEFAULT_LOCALE, next);
}

/** Cari sorğunun dili (sorğudan kənarda — cron, seed — az) */
export const reqLocale = (): Locale => store.getStore() ?? DEFAULT_LOCALE;

/** Ortaq lüğətdən cari sorğunun dilində mətn */
export const tr = (key: TKey, params?: Record<string, string | number>) =>
  sharedT(key, params, reqLocale());
