import { INestApplication } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { DEFAULT_ROADMAPS } from '@dacy/shared';
import { createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentSyncService } from '../src/import-export/content-sync.service';

type Agent = Awaited<ReturnType<typeof login>>;

/** Kurs məzmununun tərcüməsi: paketdə i18n/en → tələbə en-də ingiliscə görür; az, admin — mənbə */
describe('Məzmun tərcüməsi (i18n/en)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let az: Agent;
  let en: Agent;
  const slug = 'tercume-kursu';

  const lang = (a: Agent, l: 'az' | 'en') =>
    (a as unknown as { jar: { setCookie(c: string): void } }).jar.setCookie(
      `dacy_locale=${l}; Path=/`,
    );

  function pkg(enModule: string | null = EN_MODULE) {
    const zip = new AdmZip();
    const add = (p: string, s: string) => zip.addFile(`paket/${p}`, Buffer.from(s, 'utf8'));
    add(
      'course.yaml',
      `track: data-analytics\ntitle: Tərcümə kursu\nslug: ${slug}\nlevel: beginner\ndescription: Azərbaycanca təsvir\npublished: true\nsequential: false\n`,
    );
    add('modules/01-giris/module.yaml', 'title: Giriş\ndescription: Fəslin təsviri\n');
    add(
      'modules/01-giris/01-ders.md',
      '---\ntitle: Salam\nxp: 10\n---\n# Salam\nAzərbaycanca mətn',
    );
    add(
      'modules/01-giris/02-test.yaml',
      [
        'type: quiz',
        'title: Test',
        'pass_score: 100',
        'questions:',
        '  - text: Hansı doğrudur?',
        '    options: [Bəli, Xeyr]',
        '    correct: [1]',
        '    explanation: Çünki belədir',
        '  - text: Qruplara ayır',
        '    type: classify',
        '    buckets:',
        '      - name: Meyvə',
        '        items: [Alma, Armud]',
        '      - name: Tərəvəz',
        '        items: [Kök]',
        '',
      ].join('\n'),
    );
    add(
      'modules/01-giris/03-otaq.yaml',
      'type: ctf\ntitle: Otaq\ninstructions: tap\ntasks:\n  - question: Flag nədir?\n    answer: dacy{1}\n    hint: Bax\n',
    );
    add(
      'modules/01-giris/04-py.yaml',
      'type: python\ntitle: Python\ninstructions: Yaz\nstarter_code: "x = ..."\nsolution: "x = 1"\ntests: "assert x == 1, \'x 1 olmalıdır\'"\nhints: [Birinci ipucu]\n',
    );
    add('i18n/en/course.yaml', 'title: Translation course\ndescription: English description\n');
    if (enModule) add('i18n/en/01-giris.yaml', enModule);
    return zip.toBuffer();
  }
  const EN_MODULE = [
    'title: Introduction',
    'description: Chapter description',
    'steps:',
    '  ders:',
    '    title: Hello',
    '    content: "# Hello\\nEnglish text"',
    '  test:',
    '    title: Quiz',
    '    questions:',
    '      - text: Which is true?',
    '        options: [Yes, No]',
    '        explanation: Because it is',
    '      - text: Sort into groups',
    '        buckets:',
    '          - name: Fruit',
    '            items: [Apple, Pear]',
    '          - name: Vegetable',
    '            items: [Carrot]',
    '  otaq:',
    '    title: Room',
    '    instructions: find it',
    '    tasks:',
    '      - question: What is the flag?',
    '        answer: dacy{1}',
    '        hint: Look',
    '  py:',
    '    title: Python EN',
    '    instructions: Write',
    '    tests: "assert x == 1, \'x must be 1\'"',
    '    hints: [First hint]',
    '',
  ].join('\n');

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    admin = await login(app, 'admin@test.local', 'Admin123!');
    az = await login(app, 'telebe@test.local', 'Telebe123!');
    await az
      .post('/auth/register')
      .send({ name: 'İngilis', email: 'en@test.local', password: 'English123!' });
    en = await login(app, 'en@test.local', 'English123!');
    lang(en, 'en');
    lang(admin, 'en');
  });
  afterAll(() => app.close());

  it('paket tərcümə ilə idxal olunur', async () => {
    const r = await admin.post('/admin/import/apply').attach('file', pkg(), 'p.zip');
    expect(r.body.errors).toEqual([]);
    expect(r.body.ok).toBe(true);
    for (const a of [az, en])
      expect((await a.post(`/courses/${slug}/enroll`)).status).toBeLessThan(300);
  });

  it('kataloq və kurs səhifəsi: en — ingiliscə, az — mənbə', async () => {
    const card = async (a: Agent) =>
      (
        (await a.get('/courses')).body as Array<{
          slug: string;
          title: string;
          description: string;
        }>
      ).find((c) => c.slug === slug)!;
    expect(await card(en)).toMatchObject({
      title: 'Translation course',
      description: 'English description',
    });
    expect(await card(az)).toMatchObject({
      title: 'Tərcümə kursu',
      description: 'Azərbaycanca təsvir',
    });
    const page = (await en.get(`/learn/courses/${slug}`)).body;
    expect(JSON.stringify(page)).toContain('Introduction');
    expect(JSON.stringify(page)).not.toContain('Giriş');
    expect(JSON.stringify(page)).not.toContain('i18n');
  });

  it('dərs, test, CTF, Python: en-də ingiliscə; secret və i18n sahələri tələbəyə getmir', async () => {
    const view = async (a: Agent, key: string) =>
      (await a.get(`/learn/courses/${slug}/steps/giris/${encodeURIComponent(key)}`)).body;
    const lesson = await view(en, 'ders');
    expect(lesson.title).toBe('Hello');
    expect(JSON.stringify(lesson)).toContain('English text');
    expect((await view(az, 'ders')).title).toBe('Salam');

    const quiz = await view(en, 'test');
    const json = JSON.stringify(quiz);
    expect(json).toContain('Which is true?');
    expect(json).toContain('Carrot');
    expect(json).not.toMatch(/secretI18n|"i18n"|"correct"/);

    const py = await view(en, 'py');
    expect(JSON.stringify(py)).toContain('x must be 1');
    expect((await view(az, 'py')).title).toBe('Python');
  });

  it('qiymətləndirmə dildən asılı deyil; izah və ipucu sorğunun dilində', async () => {
    const step = await prisma.step.findFirstOrThrow({
      where: { key: 'test', module: { course: { slug } } },
    });
    const cfg = step.config as { questions: Array<{ options: string[] }> };
    const sec = step.secret as { questions: Array<{ correct: number[] }> };
    const answers = sec.questions.map((q) => q.correct);
    const r = await en.post(`/learn/steps/${step.id}/submit`).send({ kind: 'quiz', answers });
    expect(r.body.passed).toBe(true);
    expect(JSON.stringify(r.body)).toContain('Because it is');
    const r2 = await az.post(`/learn/steps/${step.id}/submit`).send({ kind: 'quiz', answers });
    expect(r2.body.passed).toBe(true);
    expect(JSON.stringify(r2.body)).toContain('Çünki belədir');
    expect(cfg.questions[0]!.options).toEqual(['Bəli', 'Xeyr']); // mənbə dəyişməyib

    const py = await prisma.step.findFirstOrThrow({
      where: { key: 'py', module: { course: { slug } } },
    });
    expect((await en.post(`/learn/steps/${py.id}/hints/0`)).body.hint).toBe('First hint');
    expect((await az.post(`/learn/steps/${py.id}/hints/0`)).body.hint).toBe('Birinci ipucu');

    const task = await prisma.ctfTask.findFirstOrThrow({ where: { step: { key: 'otaq' } } });
    expect((await en.post(`/learn/ctf-tasks/${task.id}/hint`)).body.hint).toBe('Look');
    expect((await en.post(`/learn/ctf-tasks/${task.id}/answer`)).status).toBeLessThan(500);
  });

  it('admin marşrutları həmişə mənbəni görür (redaktə tərcüməni mənbəyə yazmasın)', async () => {
    // admin en cookie-si ilə də mənbəni görür
    const list = JSON.stringify((await admin.get('/admin/courses')).body);
    expect(list).toContain('Tərcümə kursu');
    expect(list).not.toContain('Translation course');
    const course = await prisma.course.findUniqueOrThrow({ where: { slug } });
    expect(course.title).toBe('Tərcümə kursu');
  });

  it('API açılanda mövcud kursun tərcüməsi yenilənir (məzmun və irəliləyiş toxunulmaz)', async () => {
    const changed = EN_MODULE.replace('title: Introduction', 'title: Getting started');
    const n = await app.get(ContentSyncService)['pkg'].applyTranslations(pkg(changed));
    expect(n).toBeGreaterThan(0);
    const m = await prisma.module.findFirstOrThrow({ where: { key: 'giris', course: { slug } } });
    expect((m.i18n as { en: { title: string } }).en.title).toBe('Getting started');
    expect(m.title).toBe('Giriş');
    expect(await app.get(ContentSyncService)['pkg'].applyTranslations(pkg(changed))).toBe(0);
  });

  it('qiymətləndirməni dəyişən tərcümə rədd edilir', async () => {
    const bad = EN_MODULE.replace('options: [Yes, No]', 'options: [Yes, No, Maybe]');
    const v = await admin.post('/admin/import/validate').attach('file', pkg(bad), 'p.zip');
    expect(v.body.ok).toBe(false);
    expect(JSON.stringify(v.body.errors)).toContain('variantların sayı');
    const flag = EN_MODULE.replace('answer: dacy{1}', 'answer: dacy{2}');
    const v2 = await admin.post('/admin/import/validate').attach('file', pkg(flag), 'p.zip');
    expect(v2.body.ok).toBe(false);
  });

  it('admin AZ mətni dəyişəndə həmin sahənin köhnə EN tərcüməsi atılır, sync onu qaytarmır', async () => {
    const step = await prisma.step.findFirstOrThrow({
      where: { key: 'test', module: { course: { slug } } },
    });
    const def = (await admin.get(`/admin/steps/${step.id}`)).body.definition;
    // admin birinci sualın variantlarının yerini dəyişir (düzgün cavab da dəyişir)
    def.questions[0].options = ['Xeyr', 'Bəli'];
    def.questions[0].correct = [0];
    expect((await admin.put(`/admin/steps/${step.id}`).send(def)).status).toBe(200);
    const view = async () =>
      JSON.stringify((await en.get(`/learn/courses/${slug}/steps/giris/test`)).body);
    const check = async () => {
      const json = await view();
      expect(json).toContain('Which is true?'); // sualın mətni dəyişməyib — EN qalır
      expect(json).toContain('Xeyr'); // variantlar dəyişib — AZ mənbə göstərilir
      expect(json).not.toContain('"Yes"'); // köhnə EN variantlar yeni cavab açarına yapışmır
      expect(json).toContain('Carrot'); // ikinci sual toxunulmaz
    };
    await check();
    // API yenidən açılanda paketin tərcüməsi dəyişdirilmiş sahəyə qayıtmır
    await app.get(ContentSyncService)['pkg'].applyTranslations(pkg());
    await check();
    // qiymətləndirmə yeni cavab açarı ilə gedir (EN-də də)
    const fresh = await prisma.step.findUniqueOrThrow({ where: { id: step.id } });
    const answers = (fresh.secret as { questions: Array<{ correct: unknown }> }).questions.map(
      (q) => q.correct,
    );
    expect((answers[0] as number[])[0]).toBe(0);
    const r = await en.post(`/learn/steps/${step.id}/submit`).send({ kind: 'quiz', answers });
    expect(r.body.passed).toBe(true);
  });

  it('karyera xəritəsi: en-də ingiliscə; admin dəyişdirdiyi bacarıq AZ qalır', async () => {
    const src = DEFAULT_ROADMAPS[0]!;
    const body = { ...src, isPublished: true };
    const created = await admin.post('/admin/roadmaps').send(body);
    expect(created.status).toBe(201);
    const get = async (a: Agent) => (await a.get(`/roadmaps/${src.slug}`)).body;
    const e1 = await get(en);
    expect(e1.tagline).toBe('From data to business decisions: Excel, SQL, BI and statistics');
    expect(e1.content.levels[0].groups[0].skills[0].title).toBe('Core formulas');
    expect(JSON.stringify(e1)).not.toMatch(/[əğıöüçşƏĞİÖÜÇŞ]/);
    expect((await get(az)).tagline).toBe(src.tagline);
    // admin bir bacarığın adını dəyişir və qrupun əvvəlinə yeni bacarıq əlavə edir
    const edited = JSON.parse(JSON.stringify(body));
    edited.content.levels[0].groups[0].skills[0].title = 'Excel formulları';
    edited.content.levels[0].groups[0].skills.unshift({ id: 'yeni', title: 'Yeni', core: true });
    expect((await admin.put(`/admin/roadmaps/${created.body.id}`).send(edited)).status).toBe(200);
    const skills = (await get(en)).content.levels[0].groups[0].skills;
    expect(skills.map((x: { title: string }) => x.title).slice(0, 3)).toEqual([
      'Yeni',
      'Excel formulları',
      'XLOOKUP / VLOOKUP',
    ]);
    expect(skills[2].desc).toBe('joining tables on a key');
    // admin həmişə mənbəni görür
    const adm = (await admin.get(`/admin/roadmaps/${created.body.id}`)).body;
    expect(adm.tagline).toBe(src.tagline);
  });

  it('mövzu və istiqamət: admin formasındakı İngiliscə variant; AZ dəyişəndə köhnə EN atılır', async () => {
    const c = await admin.post('/admin/topics').send({
      slug: 'python',
      title: 'Python',
      description: 'Python üzrə qısa dərslər',
      en: { description: 'Short Python lessons' },
    });
    expect(c.status).toBe(201);
    expect(c.body.en).toEqual({ description: 'Short Python lessons' });
    const topic = async (a: Agent) =>
      (
        (await a.get('/topics')).body as Array<{ slug: string; description: string; en?: unknown }>
      ).find((x) => x.slug === 'python')!;
    expect((await topic(en)).description).toBe('Short Python lessons');
    expect((await topic(az)).description).toBe('Python üzrə qısa dərslər');
    expect((await topic(en)).en).toBeUndefined(); // tələbəyə xam tərcümə getmir
    // admin yalnız AZ təsviri dəyişir (EN göndərmir) — köhnə EN təsvir atılır
    await admin.patch(`/admin/topics/${c.body.id}`).send({ description: 'Yeni təsvir' });
    expect((await topic(en)).description).toBe('Yeni təsvir');
    const tr = (await admin.get('/admin/tracks')).body[0];
    const u = await admin
      .patch(`/admin/tracks/${tr.id}`)
      .send({
        description: 'Datanı təhlil edənlər üçün',
        en: { description: 'For data analysts' },
      });
    expect(u.body.en.description).toBe('For data analysts');
    const tracks = (await en.get('/tracks')).body as Array<{ slug: string; description: string }>;
    expect(tracks.find((x) => x.slug === tr.slug)!.description).toBe('For data analysts');
  });
});
