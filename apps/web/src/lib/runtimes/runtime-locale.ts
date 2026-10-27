import { t, isLocale, type Locale, type TKey } from '@dacy/shared';

let workerLocale: Locale = 'az';
export function setRuntimeLocale(locale: Locale) {
  workerLocale = locale;
}
export function runtimeT(key: TKey, params?: Record<string, string | number>) {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : workerLocale;
  return t(key, params, isLocale(lang) ? lang : 'az');
}
