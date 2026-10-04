import { describe, expect, it } from 'vitest';
import { az } from '../i18n/az';
import { en } from '../i18n/en';
import { interpolate, t } from '../i18n/t';

/** Lüğətin bütün yarpaqları: ['nav.courses', 'Kurslar'], ... (massivlər ayrıca) */
function leaves(obj: unknown, prefix = ''): Array<[string, unknown]> {
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? leaves(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v] as [string, unknown]],
  );
}
/** Mətndəki parametr adları: {n}, {title}; cəm forması {n|a|b} də «n» sayılır */
const params = (s: string) =>
  [...new Set([...s.matchAll(/\{(\w+)(?:\|[^{}]*)?\}/g)].map((m) => m[1]))].sort();

describe('t', () => {
  it('parametrləri yerləşdirir', () => {
    expect(t('course.stepsDone', { done: 3, total: 10 })).toBe('3 / 10 addım');
  });
  it('defolt dil azərbaycancadır', () => {
    expect(t('nav.courses')).toBe('Kurslar');
    expect(t('nav.courses', undefined, 'en')).toBe('Courses');
  });
  it('ingilis dilində tək/cəm forması saya görə seçilir', () => {
    expect(t('catalog.count', { n: 1 }, 'en')).toBe('1 course');
    expect(t('catalog.count', { n: 0 }, 'en')).toBe('0 courses');
    expect(t('catalog.count', { n: 5 }, 'en')).toBe('5 courses');
    expect(t('hub.activityText', { days: 1, steps: 3 }, 'en')).toBe(
      'Over the past year you were active on 1 day and solved 3 exercises.',
    );
    // az-da sintaksis yoxdur — saydan sonra isim dəyişmir
    expect(t('catalog.count', { n: 5 })).toBe('5 kurs');
  });
  it('interpolate: naməlum parametr olduğu kimi qalır; parametrsiz cəm forması — cəm', () => {
    expect(interpolate('{a} {b}', { a: 1 })).toBe('1 {b}');
    expect(interpolate('{n|course|courses}')).toBe('courses');
  });
});

describe('ingilis lüğəti', () => {
  const azLeaves = new Map(leaves(az));
  const enLeaves = new Map(leaves(en));

  it('az-dakı hər açar en-də var və əksinə', () => {
    expect([...enLeaves.keys()].sort()).toEqual([...azLeaves.keys()].sort());
  });
  it('hər açarda parametrlər eynidir (interpolyasiya pozulmasın)', () => {
    // istisna: en-də yalnız tək/cəm seçimi üçün «n» (az-da saydan sonra isim dəyişmir)
    const plainParams = (s: string) =>
      [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
    const bad = [...azLeaves].filter(([k, v]) => {
      const e = enLeaves.get(k);
      if (typeof v !== 'string' || typeof e !== 'string') return false;
      const extra = params(e).filter((p) => !params(v).includes(p));
      return (
        plainParams(v).join() !== plainParams(e).join() ||
        extra.some((p) => p !== 'n') ||
        params(v).some((p) => !params(e).includes(p))
      );
    });
    expect(bad.map(([k]) => k)).toEqual([]);
  });
  it('massivlərin uzunluğu eynidir', () => {
    expect((en.dash.days as readonly string[]).length).toBe(az.dash.days.length);
  });
  it('ingilis mətnlərində azərbaycan hərfləri və tərcüməsiz qalmış mətn yoxdur', () => {
    const azChars = /[əğışçöüƏĞİŞÇÖÜ]/;
    const bad = [...enLeaves].filter(([, v]) => typeof v === 'string' && azChars.test(v));
    expect(bad).toEqual([]);
  });
  it('boş mətn yoxdur', () => {
    expect([...enLeaves].filter(([, v]) => v === '')).toEqual([]);
  });
});
