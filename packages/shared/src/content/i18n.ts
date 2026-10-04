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

/** Açarları sıralanmış JSON — jsonb açar sırasını dəyişdiyi üçün müqayisə bununla aparılır */
export function canonicalJson(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    isPlain(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]]),
        )
      : x,
  );
}

/**
 * Mənbə dəyişəndə köhnəlmiş tərcüməni atır: tərcümənin hər yarpağı yalnız tərcümə etdiyi mənbə
 * yarpağı (eyni yolda) dəyişməyibsə qalır. Admin AZ mətni redaktə edəndə köhnə EN mətn yeni mənaya
 * yapışmasın — məs. sualların sırası dəyişəndə EN sual başqa sualın cavab açarına düşməsin.
 * Qaytarır: qalan tərcümə (boş obyekt ola bilər) və ya undefined (tamamilə köhnəlib).
 */
export function pruneTranslation(before: unknown, after: unknown, tr: unknown): unknown {
  if (tr === undefined || tr === null) return tr;
  if (canonicalJson(before ?? null) === canonicalJson(after ?? null)) return tr;
  if (isPlain(tr)) {
    if (!isPlain(before) || !isPlain(after)) return undefined;
    const out: Obj = {};
    for (const [k, v] of Object.entries(tr)) {
      const p = pruneTranslation(before[k], after[k], v);
      if (p !== undefined) out[k] = p;
    }
    return out;
  }
  if (Array.isArray(tr) && tr.length && tr.every(isPlain)) {
    if (!Array.isArray(before) || !Array.isArray(after)) return undefined;
    return tr.map((x, i) => pruneTranslation(before[i], after[i], x) ?? {});
  }
  return undefined;
}

/** Tərcümə dilləri (mənbə — az) */
export const CONTENT_LOCALES = ['en'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
