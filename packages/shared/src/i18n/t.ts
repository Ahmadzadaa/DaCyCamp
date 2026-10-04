import { az, type Dictionary } from './az';
import { en } from './en';

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type Locale = 'az' | 'en';
export const LOCALES: Locale[] = ['az', 'en'];
export const DEFAULT_LOCALE: Locale = 'az';
/** Seçilmiş dil bu cookie-də saxlanır (web və API eyni adı oxuyur) */
export const LOCALE_COOKIE = 'dacy_locale';
export const isLocale = (v: unknown): v is Locale => v === 'az' || v === 'en';
/** Tarix/rəqəm formatı üçün BCP 47 teqi */
export const localeTag = (l: Locale) => (l === 'en' ? 'en-GB' : 'az-AZ');

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | readonly string[]
    ? `${P}${K}`
    : T[K] extends object
      ? Leaves<T[K], `${P}${K}.`>
      : never;
}[keyof T & string];
export type TKey = Leaves<Dictionary>;

const dictionaries: Record<Locale, DeepPartial<Dictionary>> = { az, en };

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

/**
 * `{name}` → parametr; `{n|course|courses}` → n = 1 olanda tək, qalan hallarda cəm forması
 * (yalnız en.ts-də lazımdır — azərbaycan dilində saydan sonra isim dəyişmir).
 */
export function interpolate(
  template: string,
  params: Record<string, string | number> = {},
): string {
  return template
    .replace(/\{(\w+)\|([^|{}]*)\|([^{}]*)\}/g, (_, k: string, one: string, many: string) =>
      k in params ? (Number(params[k]) === 1 ? one : many) : many,
    )
    .replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Lüğətdən mətn; tapılmasa az-a, o da yoxdursa açarın özünə düşür */
export function t(
  key: TKey,
  params?: Record<string, string | number>,
  locale: Locale = 'az',
): string {
  const v = lookup(dictionaries[locale], key) ?? lookup(az, key);
  if (typeof v === 'string') return interpolate(v, params);
  return key;
}

export function tList(key: TKey, locale: Locale = 'az'): readonly string[] {
  const v = lookup(dictionaries[locale], key) ?? lookup(az, key);
  return Array.isArray(v) ? (v as readonly string[]) : [];
}

export { az };
export type { Dictionary };
