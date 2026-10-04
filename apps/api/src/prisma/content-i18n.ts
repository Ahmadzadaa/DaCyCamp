import { Prisma } from '@prisma/client';
import { canonicalJson, mergeTranslation, pruneTranslation } from '@dacy/shared';
import { contentMode } from '../common/i18n/request-locale';

/**
 * Məzmun tərcümələri (Prisma query uzantısı). Tərcümə olunan modellərdə `i18n = {"en": {...}}`
 * (və Step/PathItem-də secret üçün `secretI18n`) saxlanılır. Tələbə sorğularında:
 *  - select-ə i18n (secret seçilibsə secretI18n) avtomatik əlavə olunur;
 *  - dil en-dirsə nəticədəki MÖVCUD sahələrin üzərinə yazılır (Json — dərin birləşmə, massivlər indekslə);
 *  - i18n/secretI18n nəticədən həmişə silinir (tələbəyə xam getmir).
 * Admin marşrutları, idxal və cron toxunulmaz qalır (contentMode() === null).
 *
 * Yazanda (update/upsert, istənilən kontekst): data mətn sahəsini dəyişirsə və i18n-i özü
 * yazmırsa, həmin sahənin köhnəlmiş tərcüməsi atılır (pruneTranslation) — admin AZ mətni
 * dəyişəndə köhnə EN mətn qalıb yeni məzmuna (məs. sualların yeni sırasına) yapışmasın.
 */
const I18N_MODELS = new Set([
  'Track',
  'Topic',
  'Course',
  'Module',
  'Step',
  'CtfTask',
  'LearningPath',
  'PathItem',
  'Roadmap',
]);
const SECRET_MODELS = new Set(['Step', 'PathItem']);

/** model → skalyar sahələr — Prisma DMMF-dən */
const SCALARS = new Map<string, Set<string>>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Set(m.fields.filter((f) => f.kind !== 'object').map((f) => f.name)),
  ]),
);

/** model → (əlaqə sahəsi → hədəf model) — Prisma DMMF-dən */
const RELATIONS = new Map<string, Map<string, string>>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Map(m.fields.filter((f) => f.kind === 'object').map((f) => [f.name, f.type])),
  ]),
);

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;

/** select/include ağacına i18n sahələrini əlavə edir */
function inject(model: string, args: Obj | undefined) {
  if (!args) return;
  const rel = RELATIONS.get(model);
  if (isPlain(args.select)) {
    const sel = args.select;
    if (I18N_MODELS.has(model)) sel.i18n = true;
    if (SECRET_MODELS.has(model) && sel.secret) sel.secretI18n = true;
    for (const [k, v] of Object.entries(sel)) {
      const target = rel?.get(k);
      if (target && isPlain(v)) inject(target, v);
    }
  }
  if (isPlain(args.include)) {
    for (const [k, v] of Object.entries(args.include)) {
      const target = rel?.get(k);
      if (target && isPlain(v)) inject(target, v);
    }
  }
}

function localize(node: unknown, en: boolean, seen = new Set<unknown>()): void {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const x of node) localize(x, en, seen);
    return;
  }
  if (!isPlain(node)) return;
  if ('i18n' in node) {
    const t = (node.i18n as Obj | null)?.en;
    if (en && isPlain(t))
      for (const [k, v] of Object.entries(t)) if (k in node) node[k] = mergeTranslation(node[k], v);
    delete node.i18n;
  }
  if ('secretI18n' in node) {
    const t = (node.secretI18n as Obj | null)?.en;
    if (en && isPlain(t) && 'secret' in node) node.secret = mergeTranslation(node.secret, t);
    delete node.secretI18n;
  }
  for (const v of Object.values(node)) localize(v, en, seen);
}

/** {locale: tərcümə} — hər dil üçün dəyişən sahələrin köhnəlmiş hissəsini atır */
function pruneLocales(all: unknown, prune: (tr: Obj) => unknown): Obj | null {
  if (!isPlain(all)) return null;
  const next: Obj = {};
  for (const [loc, tr] of Object.entries(all)) {
    if (!isPlain(tr)) continue;
    const p = prune(tr);
    if (p !== undefined) next[loc] = p;
  }
  return next;
}

type Delegate = { findUnique(args: unknown): Promise<Obj | null> };

/**
 * update/upsert: data-dakı mətn sahələri dəyişibsə i18n/secretI18n-in uyğun hissəsini atır.
 * Köhnə sətir əsas (genişlənməmiş) klientlə oxunur. Qeyd: interaktiv tranzaksiyada həmin
 * tranzaksiyanın yazmamış dəyişikliklərini görmür — tərcüməni özü yazan axınlar (idxal, seed)
 * i18n-i data-ya açıq qoyur və bu yoxlamadan keçmir.
 */
async function pruneOnWrite(base: unknown, model: string, operation: string, args: Obj) {
  const data = operation === 'upsert' ? args.update : args.data;
  if (!isPlain(data) || !isPlain(args.where)) return;
  const scalars = SCALARS.get(model);
  const wantI18n = !('i18n' in data);
  const wantSecret = SECRET_MODELS.has(model) && !('secretI18n' in data) && 'secret' in data;
  const fields = Object.keys(data).filter(
    (k) => scalars?.has(k) && k !== 'i18n' && k !== 'secretI18n',
  );
  if (!fields.length || (!wantI18n && !wantSecret)) return;
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  const delegate = (base as Record<string, Delegate>)[key];
  const select: Obj = Object.fromEntries(fields.map((f) => [f, true]));
  if (wantI18n) select.i18n = true;
  if (wantSecret) Object.assign(select, { secret: true, secretI18n: true });
  const old = await delegate.findUnique({ where: args.where, select });
  if (!old) return;
  if (wantI18n && old.i18n) {
    const next = pruneLocales(old.i18n, (tr) => {
      const out: Obj = {};
      for (const [k, v] of Object.entries(tr)) {
        const p = k in data ? pruneTranslation(old[k], data[k], v) : v;
        if (p !== undefined) out[k] = p;
      }
      return out;
    });
    if (next && canonicalJson(next) !== canonicalJson(old.i18n)) data.i18n = next;
  }
  if (wantSecret && old.secretI18n) {
    const next = pruneLocales(old.secretI18n, (tr) =>
      pruneTranslation(old.secret, data.secret, tr),
    );
    if (next && canonicalJson(next) !== canonicalJson(old.secretI18n))
      data.secretI18n = Object.keys(next).length ? next : Prisma.JsonNull;
  }
}

export const contentI18nExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'content-i18n',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (I18N_MODELS.has(model) && (operation === 'update' || operation === 'upsert'))
            await pruneOnWrite(client, model, operation, args as Obj);
          const mode = contentMode();
          if (!mode) return query(args);
          if (mode === 'en') inject(model, args as Obj);
          const result = await query(args);
          localize(result, mode === 'en');
          return result;
        },
      },
    },
  }),
);
