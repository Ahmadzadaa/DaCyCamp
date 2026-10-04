import { Prisma } from '@prisma/client';
import { mergeTranslation } from '@dacy/shared';
import { contentMode } from '../common/i18n/request-locale';

/**
 * Məzmun tərcümələri (Prisma query uzantısı). Tərcümə olunan modellərdə `i18n = {"en": {...}}`
 * (və Step/PathItem-də secret üçün `secretI18n`) saxlanılır. Tələbə sorğularında:
 *  - select-ə i18n (secret seçilibsə secretI18n) avtomatik əlavə olunur;
 *  - dil en-dirsə nəticədəki MÖVCUD sahələrin üzərinə yazılır (Json — dərin birləşmə, massivlər indekslə);
 *  - i18n/secretI18n nəticədən həmişə silinir (tələbəyə xam getmir).
 * Admin marşrutları, idxal və cron toxunulmaz qalır (contentMode() === null).
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

export const contentI18nExtension = Prisma.defineExtension({
  name: 'content-i18n',
  query: {
    $allModels: {
      async $allOperations({ model, args, query }) {
        const mode = contentMode();
        if (!mode) return query(args);
        if (mode === 'en') inject(model, args as Obj);
        const result = await query(args);
        localize(result, mode === 'en');
        return result;
      },
    },
  },
});
