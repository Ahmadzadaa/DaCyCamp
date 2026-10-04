/**
 * Məzmun tərcüməsinin birləşdirilməsi (idxal və oxuma eyni qaydanı işlədir):
 * obyekt — dərin, obyekt massivi — indekslə (quiz sualları, qruplar), qalan massiv/dəyər — əvəz.
 * Boş tərcümə (undefined/null/'') mənbəni saxlayır; sətir massivi yalnız eyni uzunluqda əvəz edir
 * (variantların sayı dəyişməsin — qiymətləndirmə indekslə gedir).
 */
type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;

export function mergeTranslation(base: unknown, tr: unknown): unknown {
  if (tr === undefined || tr === null || tr === '') return base;
  if (isPlain(base) && isPlain(tr)) {
    const out: Obj = { ...base };
    for (const [k, v] of Object.entries(tr)) out[k] = k in base ? mergeTranslation(base[k], v) : v;
    return out;
  }
  if (Array.isArray(base) && Array.isArray(tr)) {
    if (tr.length && tr.every(isPlain))
      return base.map((x, i) => (i < tr.length ? mergeTranslation(x, tr[i]) : x));
    return tr.length === base.length || !base.length ? tr : base;
  }
  return tr;
}

/** Tərcümə dilləri (mənbə — az) */
export const CONTENT_LOCALES = ['en'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
