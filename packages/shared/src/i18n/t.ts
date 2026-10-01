import { az, type Dictionary } from './az';
import { en } from './en';

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type Locale = 'az' | 'en';
export const LOCALES: Locale[] = ['az', 'en'];

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

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
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
