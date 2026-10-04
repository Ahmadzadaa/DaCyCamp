import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  t as sharedT,
  tList as sharedTList,
  type Locale,
  type TKey,
} from '@dacy/shared';

let browserLocale: Locale | undefined;

/**
 * Cari dil (defolt — az). Seçim `dacy_locale` cookie-sindədir.
 * - Serverdə (server komponentləri və client komponentlərin SSR-i): Next-in sorğuya bağlı
 *   yaddaşından (AsyncLocalStorage) həmin sorğunun cookie-si oxunur — paralel sorğular qarışmır.
 * - Brauzerdə: root layout-un serverdə qoyduğu <html lang> — hidrasiya SSR ilə eyni dildə gedir.
 * Dil dəyişəndə səhifə tam yenilənir (LanguageSwitcher).
 */
export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    if (!browserLocale) {
      const lang = document.documentElement.lang;
      browserLocale = isLocale(lang) ? lang : DEFAULT_LOCALE;
    }
    return browserLocale;
  }
  const store = workUnitAsyncStorage.getStore();
  if (store?.type === 'request') {
    const v = store.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(v)) return v;
  }
  return DEFAULT_LOCALE;
}

export const t = (key: TKey, params?: Record<string, string | number>) =>
  sharedT(key, params, getLocale());
export const tList = (key: TKey) => sharedTList(key, getLocale());
export type { Locale, TKey };
