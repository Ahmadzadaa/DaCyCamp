import { describe, expect, it } from 'vitest';
import { mergeTranslation, pruneTranslation } from '../content/i18n';
import { DEFAULT_ROADMAPS, roadmapContentSchema, type RoadmapContent } from '../content/roadmap';
import { buildRoadmapI18n, ROADMAPS_EN } from '../content/roadmap-en';

const AZ_LETTERS = /[əğıöüçşƏĞİÖÜÇŞ]/;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const strings = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(strings)
        : [];

/** Tələbəyə gedən EN xəritə — Prisma uzantısının etdiyi kimi */
function localized(r: (typeof DEFAULT_ROADMAPS)[number], content = r.content as RoadmapContent) {
  const i18n = buildRoadmapI18n({ ...r, content });
  return mergeTranslation(content, i18n?.en.content) as RoadmapContent;
}

describe('ilkin karyera xəritələrinin İngiliscə tərcüməsi', () => {
  for (const r of DEFAULT_ROADMAPS) {
    it(`${r.slug}: hər səviyyə, qrup və bacarıq tərcümə olunub, sxemdən keçir`, () => {
      const tr = ROADMAPS_EN[r.slug]!;
      expect(tr).toBeDefined();
      const content = r.content as RoadmapContent;
      const ids = content.levels.flatMap((l) => l.groups.flatMap((g) => g.skills.map((s) => s.id)));
      expect(Object.keys(tr.skills).sort()).toEqual([...ids].sort());
      expect(Object.keys(tr.levels).sort()).toEqual(content.levels.map((l) => l.key).sort());
      for (const lv of content.levels) {
        const t = tr.levels[lv.key]!;
        expect(t.groups).toHaveLength(lv.groups.length);
        expect(t.expectations).toHaveLength(lv.expectations.length);
        expect(t.tools).toHaveLength(lv.tools.length);
      }
      const en = localized(r);
      expect(roadmapContentSchema.safeParse(en).success).toBe(true);
      // tələbəyə gedən EN məzmunda AZ hərfi qalmayıb (bacarıq id-ləri istisna — onlar ASCII-dir)
      const bad = strings(en).filter((s) => AZ_LETTERS.test(s));
      expect(bad).toEqual([]);
      const head = buildRoadmapI18n({ ...r, content })!.en;
      expect(strings([head.title, head.tagline, head.description]).join(' ')).not.toMatch(
        AZ_LETTERS,
      );
    });
  }

  it('admin redaktəsi: dəyişən və yeni mətn AZ qalır, qalanı id ilə tutuşdurulur', () => {
    const r = DEFAULT_ROADMAPS[0]!;
    const content = clone(r.content) as RoadmapContent;
    const g = content.levels[0]!.groups[0]!;
    // admin qrupun əvvəlinə yeni bacarıq əlavə edir və ikinci bacarığın adını dəyişir
    g.skills.unshift({ id: 'new-skill', title: 'Yeni bacarıq', core: true });
    g.skills[2] = { ...g.skills[2]!, title: 'Dəyişdirilmiş ad' };
    // səviyyələrin sırası dəyişir
    content.levels.reverse();
    const en = localized(r, content);
    const lv = en.levels.find((l) => l.key === 'intern')!;
    const skills = lv.groups[0]!.skills;
    expect(skills[0]!.title).toBe('Yeni bacarıq');
    expect(skills[1]!.title).toBe('Core formulas');
    expect(skills[2]!.title).toBe('Dəyişdirilmiş ad');
    // izahı dəyişməyib — tərcümədə qalır
    expect(skills[2]!.desc).toBe('joining tables on a key');
    expect(lv.title).toBe('Intern Data Analyst');
    expect(en.levels[0]!.key).toBe('senior');
    expect(en.levels[0]!.summary).toMatch(/^You set the direction/);
  });

  it('admin başlığı dəyişibsə başlıq AZ qalır; ilkin olmayan xəritənin tərcüməsi yoxdur', () => {
    const r = DEFAULT_ROADMAPS[2]!;
    const i18n = buildRoadmapI18n({
      ...r,
      title: 'Kibertəhlükəsizlik mütəxəssisi',
      content: r.content as RoadmapContent,
    });
    expect(i18n!.en.title).toBeUndefined();
    expect(i18n!.en.tagline).toBe('Protecting systems and data from attacks');
    expect(
      buildRoadmapI18n({ slug: 'yeni', title: 'Yeni', content: r.content as RoadmapContent }),
    ).toBeNull();
  });
});

describe('pruneTranslation', () => {
  const quiz = {
    questions: [
      { text: 'Bir', options: ['a', 'b'] },
      { text: 'İki', options: ['c', 'd'] },
    ],
  };
  const tr = {
    questions: [
      { text: 'One', options: ['A', 'B'] },
      { text: 'Two', options: ['C', 'D'] },
    ],
  };

  it('dəyişməyən mənbədə tərcümə olduğu kimi qalır', () => {
    expect(pruneTranslation(quiz, clone(quiz), tr)).toEqual(tr);
  });

  it('suallar yer dəyişəndə köhnə EN mətn yeni sıraya yapışmır', () => {
    const swapped = { questions: [quiz.questions[1], quiz.questions[0]] };
    const p = pruneTranslation(quiz, swapped, tr);
    expect(p).toEqual({ questions: [{}, {}] });
    // tələbə AZ mənbəni görür (yanlış cavab açarı ilə EN mətn yox)
    expect(mergeTranslation(swapped, p)).toEqual(swapped);
  });

  it('yalnız dəyişən yarpaq atılır', () => {
    const edited = clone(quiz);
    edited.questions[0]!.options[1] = 'b2';
    const p = pruneTranslation(quiz, edited, tr) as typeof tr;
    expect(p.questions[0]).toEqual({ text: 'One' });
    expect(p.questions[1]).toEqual(tr.questions[1]);
  });

  it('sətir sahəsi dəyişəndə tərcüməsi atılır, tip dəyişəndə hamısı', () => {
    expect(pruneTranslation('Köhnə', 'Yeni', 'Old')).toBeUndefined();
    expect(pruneTranslation('Eyni', 'Eyni', 'Same')).toBe('Same');
    expect(pruneTranslation(quiz, null, tr)).toBeUndefined();
  });

  it('açar sırası fərqli olan eyni JSON dəyişmiş sayılmır (jsonb)', () => {
    expect(
      pruneTranslation({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }, { a: 'x' }),
    ).toEqual({
      a: 'x',
    });
  });
});
