import yaml from 'js-yaml';
import {
  mergeTranslation,
  splitStep,
  stepYamlSchema,
  yamlStepToDefinition,
  type ImportIssue,
  type SplitResult,
  type StepYaml,
} from '@dacy/shared';

/**
 * Kurs paketinin ingiliscə tərcüməsi:
 *   i18n/en/course.yaml        — { title, description }
 *   i18n/en/<NN-fəsil>.yaml    — { title, description, steps: { <addım açarı>: { ...addım sahələri } } }
 * Addım tərcüməsi mənbə addımın YAML-ının üzərinə birləşdirilir (yalnız mətn sahələri yazılır),
 * eyni sxemdən keçir və bölünür (config/secret). Qiymətləndirməni dəyişə biləcək hər şey
 * (tip, düzgün cavablar, variant sayı, CTF flag-ları) mənbə ilə eyni olmalıdır.
 */
export interface StepTranslation {
  i18n: { en: { title: string; config: unknown } };
  secretI18n: { en: unknown } | null;
  /** CTF sualları: açar → tərcümə */
  ctf: Map<string, { en: { question: string; hint?: string | null } }>;
}
export interface ModuleTranslation {
  title?: string;
  description?: string;
  steps: Record<string, Record<string, unknown>>;
  file: string;
}
export interface PackageTranslations {
  course: { title?: string; description?: string } | null;
  /** fəsil qovluğunun adı (01-giris) və ya açarı (giris) → tərcümə */
  modules: Map<string, ModuleTranslation>;
}

const PREFIX = 'i18n/en/';

export function loadTranslations(
  files: Map<string, Buffer>,
  errors: ImportIssue[],
): PackageTranslations {
  const out: PackageTranslations = { course: null, modules: new Map() };
  for (const [path, buf] of files) {
    if (!path.startsWith(PREFIX) || !/\.ya?ml$/.test(path)) continue;
    let raw: unknown;
    try {
      raw = yaml.load(buf.toString('utf8'), { schema: yaml.JSON_SCHEMA });
    } catch (e) {
      errors.push({ file: path, message: `YAML xətası: ${(e as Error).message.split('\n')[0]}` });
      continue;
    }
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = path.slice(PREFIX.length).replace(/\.ya?ml$/, '');
    if (name === 'course') {
      out.course = { title: str(r.title), description: str(r.description) };
      continue;
    }
    const steps = (r.steps ?? {}) as Record<string, Record<string, unknown>>;
    if (typeof steps !== 'object' || Array.isArray(steps)) {
      errors.push({ file: path, message: 'steps: açar → addım tərcüməsi xəritəsi olmalıdır' });
      continue;
    }
    out.modules.set(name, {
      title: str(r.title),
      description: str(r.description),
      steps,
      file: path,
    });
  }
  return out;
}

/** Fəsil tərcüməsi: qovluq adı (01-giris) və ya açar (giris) ilə */
export function moduleTranslation(
  t: PackageTranslations,
  dir: string,
  key: string,
): ModuleTranslation | undefined {
  return t.modules.get(dir) ?? t.modules.get(key);
}

/** Tərcümədəki massivlər mənbədəki ilə eyni uzunluqda olmalıdır (obyektlər — rekursiv) */
function checkShape(base: unknown, tr: unknown, path: string, out: string[]) {
  if (Array.isArray(tr)) {
    if (!Array.isArray(base)) return;
    if (tr.length !== base.length) {
      const what = /options$/.test(path) ? 'variantların sayı' : 'elementlərin sayı';
      out.push(`${path}: ${what} mənbə ilə eyni olmalıdır (${base.length} ≠ ${tr.length})`);
      return;
    }
    tr.forEach((x, i) => checkShape(base[i], x, `${path}[${i}]`, out));
    return;
  }
  if (tr && typeof tr === 'object' && base && typeof base === 'object' && !Array.isArray(base))
    for (const [k, v] of Object.entries(tr as Record<string, unknown>))
      checkShape((base as Record<string, unknown>)[k], v, path ? `${path}.${k}` : k, out);
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
const json = (v: unknown) => JSON.stringify(v ?? null);

/** Mənbə addımın xam YAML-ı + tərcümə → bölünmüş ingiliscə addım (və ya xətalar) */
export function translateStep(
  raw: Record<string, unknown>,
  enPartial: Record<string, unknown>,
  az: SplitResult,
  where: string,
  errors: ImportIssue[],
): StepTranslation | null {
  // sətir massivlərinin uzunluğu (variantlar, siyahılar) mənbə ilə eyni olmalıdır — birləşmə fərqlini səssizcə atır
  const shapeErrors: string[] = [];
  checkShape(raw, enPartial, '', shapeErrors);
  if (shapeErrors.length) {
    for (const m of shapeErrors) errors.push({ file: where, message: m });
    return null;
  }
  const merged = mergeTranslation(raw, { ...enPartial, type: raw.type }) as Record<string, unknown>;
  const parsed = stepYamlSchema.safeParse(merged);
  if (!parsed.success) {
    for (const i of parsed.error.issues)
      errors.push({ file: where, message: `${i.path.join('.') || 'addım'}: ${i.message}` });
    return null;
  }
  const en = splitStep(yamlStepToDefinition(parsed.data as StepYaml));
  const bad = (m: string) => {
    errors.push({ file: where, message: m });
    return null;
  };
  if (en.type !== az.type) return bad('tərcümədə addımın tipi dəyişib');
  if (en.xp !== az.xp) return bad('tərcümədə XP dəyişib');
  // qiymətləndirmə: quiz — variant sayı və düzgün cavablar, CTF — flag-lar və bal
  if (az.type === 'QUIZ') {
    const qa = (az.config as { questions: Array<{ options: string[] }> }).questions;
    const qe = (en.config as { questions: Array<{ options: string[] }> }).questions;
    if (qa.length !== qe.length) return bad('sualların sayı mənbə ilə eyni olmalıdır');
    for (const [i, q] of qa.entries())
      if (q.options.length !== qe[i]!.options.length)
        return bad(`sual ${i + 1}: variantların sayı mənbə ilə eyni olmalıdır`);
    const ca = (az.secret as { questions: Array<{ correct: number[] }> }).questions.map(
      (q) => q.correct,
    );
    const ce = (en.secret as { questions: Array<{ correct: number[] }> }).questions.map(
      (q) => q.correct,
    );
    if (json(ca) !== json(ce)) return bad('düzgün cavablar mənbə ilə eyni olmalıdır');
  }
  if (az.type === 'CTF') {
    const sig = (r: SplitResult) =>
      json(r.ctfTasks.map((t) => [t.key, t.answer ?? t.answerHash, t.points, t.caseSensitive]));
    if (sig(az) !== sig(en)) return bad('CTF sualları: açar, flag və bal mənbə ilə eyni olmalıdır');
  }
  // gizli olmayan texniki sahələr dəyişməsin (datasetlər, yoxlama rejimi, lab imici)
  for (const k of ['dataset', 'check', 'docker_image', 'time_limit_minutes', 'network'] as const) {
    const a = (az.config as unknown as Record<string, unknown>)[k];
    const e = (en.config as unknown as Record<string, unknown>)[k];
    if (json(a) !== json(e)) return bad(`«${k}» tərcümədə dəyişməməlidir`);
  }
  const ctf = new Map(
    en.ctfTasks.map((t) => [t.key, { en: { question: t.question, hint: t.hint ?? null } }]),
  );
  return {
    i18n: { en: { title: en.title, config: en.config } },
    secretI18n: en.secret ? { en: en.secret } : null,
    ctf,
  };
}
