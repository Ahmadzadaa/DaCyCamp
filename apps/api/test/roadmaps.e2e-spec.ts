import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_ROADMAPS, STEP_TYPES, stepDefinitionStrict } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** Karyera xəritələri (yalnız admin dəyişir), səviyyə adları, «nümunə ilə yarat» addımları */
describe('roadmaps + settings + step templates', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ad: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let st: ReturnType<typeof agent>;
  let studentId: string;
  let courseId: string;
  const de = DEFAULT_ROADMAPS.find((r) => r.slug === 'data-engineer')!;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    studentId = b.student.id;
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'python-esaslar',
        title: 'Python əsasları',
        order: 1,
        isPublished: true,
      },
    });
    courseId = course.id;
    // bir bacarığı kursa bağla
    const content = structuredClone(de.content);
    content.levels[0]!.groups[1]!.skills[0]!.course = 'python-esaslar';
    await prisma.roadmap.create({
      data: {
        slug: de.slug,
        title: de.title,
        tagline: de.tagline ?? null,
        description: de.description ?? null,
        trackId: b.track.id,
        order: 1,
        content: content as unknown as Prisma.InputJsonValue,
      },
    });
    ad = await login(app, 'admin@test.local', 'Admin123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    st = await login(app, 'telebe@test.local', 'Telebe123!');
  });
  afterAll(() => app.close());

  describe('karyera xəritələri', () => {
    it('ictimai siyahı və məzmun (qonaq)', async () => {
      const list = await agent(app).get('/roadmaps');
      expect(list.status).toBe(200);
      expect(list.body).toEqual([
        expect.objectContaining({
          slug: 'data-engineer',
          levels: expect.arrayContaining([expect.objectContaining({ key: 'intern' })]),
        }),
      ]);
      const r = await agent(app).get('/roadmaps/data-engineer');
      expect(r.status).toBe(200);
      expect(r.body.content.levels).toHaveLength(4);
      expect(r.body.checked).toEqual([]);
      expect(r.body.courses['python-esaslar']).toEqual({
        title: 'Python əsasları',
        enrolled: false,
        completed: false,
      });
      expect((await agent(app).get('/roadmaps/yoxdur')).status).toBe(404);
    });

    it('tələbə bacarığı işarələyir; naməlum bacarıq 404; qonaq 401', async () => {
      const skill = de.content.levels[0]!.groups[0]!.skills[0]!.id;
      const r = await st.put(`/roadmaps/data-engineer/checks/${skill}`).send({ checked: true });
      expect(r.status).toBe(200);
      expect(r.body.checked).toEqual([skill]);
      expect((await st.get('/roadmaps/data-engineer')).body.checked).toEqual([skill]);
      const off = await st.put(`/roadmaps/data-engineer/checks/${skill}`).send({ checked: false });
      expect(off.body.checked).toEqual([]);
      expect(
        (await st.put('/roadmaps/data-engineer/checks/yoxdur').send({ checked: true })).status,
      ).toBe(404);
      expect(
        (await agent(app).put(`/roadmaps/data-engineer/checks/${skill}`).send({ checked: true }))
          .status,
      ).toBe(401);
    });

    it('bağlı kurs bitəndə məzmunda «completed» görünür', async () => {
      await prisma.enrollment.create({
        data: { userId: studentId, courseId, percent: 100, completedAt: new Date() },
      });
      const r = await st.get('/roadmaps/data-engineer');
      expect(r.body.courses['python-esaslar']).toEqual({
        title: 'Python əsasları',
        enrolled: true,
        completed: true,
      });
    });

    it('yalnız admin dəyişir: müəllim və tələbə 403', async () => {
      for (const who of [ins, st]) {
        expect((await who.get('/admin/roadmaps')).status).toBe(403);
        expect((await who.post('/admin/roadmaps').send({})).status).toBe(403);
      }
      const list = await ad.get('/admin/roadmaps');
      expect(list.status).toBe(200);
      expect(list.body[0]).toMatchObject({ slug: 'data-engineer', track: 'data-analytics' });
      expect(list.body[0].skillCount).toBeGreaterThan(40);
    });

    it('admin yaradır, redaktə edir, sıralayır, silir; validasiya və audit', async () => {
      const body = {
        slug: 'bi-analyst',
        title: 'BI Analyst',
        track: 'data-analytics',
        isPublished: true,
        content: {
          levels: [
            {
              key: 'intern',
              title: 'Intern',
              summary: 'Başlanğıc',
              groups: [{ title: 'Excel', skills: [{ id: 'bi-excel', title: 'Pivot' }] }],
            },
          ],
        },
      };
      const created = await ad.post('/admin/roadmaps').send(body);
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ slug: 'bi-analyst', track: 'data-analytics' });
      expect((await ad.post('/admin/roadmaps').send(body)).status).toBe(409);
      // təkrar bacarıq id-si rədd edilir
      const dup = structuredClone(body);
      dup.slug = 'dup';
      dup.content.levels[0]!.groups[0]!.skills.push({ id: 'bi-excel', title: 'Təkrar' });
      expect((await ad.post('/admin/roadmaps').send(dup)).status).toBe(400);
      // naməlum istiqamət
      expect(
        (await ad.post('/admin/roadmaps').send({ ...body, slug: 'x2', track: 'yoxdur' })).status,
      ).toBe(400);
      // redaktə: başlıq + gizlət → ictimai siyahıda yoxdur
      const upd = await ad
        .put(`/admin/roadmaps/${created.body.id}`)
        .send({ ...body, title: 'BI Analitik', isPublished: false });
      expect(upd.status).toBe(200);
      expect(upd.body.title).toBe('BI Analitik');
      expect((await agent(app).get('/roadmaps')).body.map((r: { slug: string }) => r.slug)).toEqual(
        ['data-engineer'],
      );
      expect((await agent(app).get('/roadmaps/bi-analyst')).status).toBe(404);
      // sıra
      const all = (await ad.get('/admin/roadmaps')).body as Array<{ id: string }>;
      const reordered = [...all].reverse().map((r) => r.id);
      expect((await ad.patch('/admin/roadmaps/reorder').send({ ids: reordered })).status).toBe(200);
      expect(
        ((await ad.get('/admin/roadmaps')).body as Array<{ id: string }>).map((r) => r.id),
      ).toEqual(reordered);
      // sil
      expect((await ad.delete(`/admin/roadmaps/${created.body.id}`)).status).toBe(200);
      const actions = (await ad.get('/admin/audit')).body.items.map(
        (i: { action: string }) => i.action,
      );
      for (const a of ['roadmap.create', 'roadmap.update', 'roadmap.reorder', 'roadmap.delete'])
        expect(actions).toContain(a);
    });
  });

  describe('səviyyə adları', () => {
    it('standart adlar; admin dəyişir, müəllim/tələbə 403', async () => {
      expect((await agent(app).get('/settings/levels')).body).toEqual({
        BEGINNER: 'Başlanğıc',
        INTERMEDIATE: 'Orta',
        ADVANCED: 'Çətin',
      });
      const next = { BEGINNER: 'Sıfırdan', INTERMEDIATE: 'Orta', ADVANCED: 'Peşəkar' };
      expect((await ins.put('/admin/settings/levels').send(next)).status).toBe(403);
      expect((await ad.put('/admin/settings/levels').send({ BEGINNER: '' })).status).toBe(400);
      const r = await ad.put('/admin/settings/levels').send(next);
      expect(r.status).toBe(200);
      expect((await agent(app).get('/settings/levels')).body).toEqual(next);
    });
  });

  describe('nümunə ilə yaradılan addımlar', () => {
    it('hər tip işlək nümunə ilə yaranır (terminal yalnız yoxlama skriptini gözləyir)', async () => {
      const m = await ad.post(`/admin/courses/${courseId}/modules`).send({ title: 'Şablonlar' });
      expect(m.status).toBe(201);
      for (const type of STEP_TYPES) {
        const r = await ad
          .post(`/admin/modules/${m.body.id}/steps`)
          .send({ type, title: `Şablon ${type}`, template: true });
        expect(r.status).toBe(201);
        const strict = stepDefinitionStrict.safeParse(r.body.definition);
        if (type === 'TERMINAL') {
          expect(r.body.issues.map((i: { path: string }) => i.path)).toEqual(['check_script']);
        } else {
          expect(r.body.issues).toEqual([]);
          expect(strict.success).toBe(true);
        }
      }
      // CTF cavabı heş kimi saxlanılır, açıq mətn kimi yox
      const ctf = await prisma.ctfTask.findFirst({ where: { step: { title: 'Şablon CTF' } } });
      expect(ctf?.answerHash).toBeTruthy();
      expect(ctf?.answerHash).not.toContain('DACY{numune}');
      // template olmadan — boş
      const empty = await ad
        .post(`/admin/modules/${m.body.id}/steps`)
        .send({ type: 'SQL', title: 'Boş SQL' });
      expect(empty.body.issues.length).toBeGreaterThan(0);
    });
  });
});
