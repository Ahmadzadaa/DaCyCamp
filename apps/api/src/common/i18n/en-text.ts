import { Prisma } from '@prisma/client';
import type { EnTextInput } from '@dacy/shared';

type EnText = { title?: string; description?: string };

/**
 * Admin formasının `en` sahəsi → `i18n` sütunu. undefined — sütuna toxunma (köhnəlmiş hissəni
 * Prisma uzantısı atır); boş forma — tərcümə yoxdur (null).
 */
export function enToI18n(
  en: EnTextInput,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (en === undefined) return undefined;
  const v = Object.fromEntries(
    Object.entries(en ?? {}).filter(([, x]) => typeof x === 'string' && x.trim() !== ''),
  );
  return Object.keys(v).length ? { en: v } : Prisma.JsonNull;
}

/** `i18n` sütunu → admin DTO-nun `en` sahəsi (tələbə sorğusunda i18n silinir → undefined) */
export function enOf(i18n: unknown): EnText | null | undefined {
  if (i18n === undefined) return undefined;
  const en = (i18n as { en?: unknown } | null)?.en;
  if (!en || typeof en !== 'object') return null;
  const { title, description } = en as EnText;
  return { title, description };
}
