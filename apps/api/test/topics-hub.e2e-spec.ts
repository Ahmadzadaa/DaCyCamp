import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { splitStep } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** Qeyd 5 (mövzular + səviyyə filtri) və v2 hub: panel xülasəsi, bildirişlər, fəaliyyət, liderlər, yarışlar */
describe('topics + hub', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ad: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let st: ReturnType<typeof agent>;
  let courseId: string;
  let otherId: string;
  const stepIds: string[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'python-giris',
        title: 'Python giriş',
        order: 1,
        isPublished: true,
        publishedAt: new Date(),
        sequential: false,
        level: 'BEGINNER',
      },
    });
    courseId = course.id;
    const other = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'sql-cetin',
        title: 'SQL çətin',
        order: 2,
        isPublished: true,
        publishedAt: new Date(),
        level: 'ADVANCED',
      },
    });
    otherId = other.id;
    const m = await prisma.module.create({
      data: { courseId, key: 'giris', title: 'Giriş', order: 1, isPublished: true },
    });
    const defs = [
      { key: 'a', def: { type: 'theory' as const, title: 'A', xp: 10, content: 'bir' } },
      {
        key: 'flag',
        def: {
          type: 'ctf' as const,
          title: 'Bayraq',
          xp: 50,
          instructions: 'x',
          attachments: [],
          hint_penalty_xp: 0,
          tasks: [
            { key: 't1', question: 'q', answer: 'DACY{x}', points: 50, case_sensitive: false },
          ],
        },
      },
    ];
    for (const [i, d] of defs.entries()) {
      const s = splitStep(d.def);
      const row = await prisma.step.create({
        data: {
          moduleId: m.id,
          key: d.key,
          type: s.type,
          title: s.title,
          xp: s.xp,
          order: i + 1,
          isPublished: true,
          config: s.config as unknown as Prisma.InputJsonValue,
          secret: s.secret ? (s.secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      for (const t of s.ctfTasks)
        await prisma.ctfTask.create({
          data: {
            stepId: row.id,
            key: t.key,
            order: t.order,
            question: t.question,
            points: t.points,
            caseSensitive: t.caseSensitive,
            answerHash: 'hash',
          },
        });
      stepIds.push(row.id);
    }
    ad = await login(app, 'admin@test.local', 'Admin123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    st = await login(app, 'telebe@test.local', 'Telebe123!');
  });
  afterAll(() => app.close());

  describe('mövzular', () => {
    let pythonId: string;
    let excelId: string;

    it('tələbə mövzu yarada bilmir; heyət yaradır, slug təkrarı 409', async () => {
      expect((await st.post('/admin/topics').send({ slug: 'x', title: 'X' })).status).toBe(403);
      const r = await ins
        .post('/admin/topics')
        .send({ slug: 'python', title: 'Python', color: '#3776AB' });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        slug: 'python',
        title: 'Python',
        isPublished: true,
        order: 1,
      });
      pythonId = r.body.id;
      const e = await ad.post('/admin/topics').send({ slug: 'excel', title: 'Excel' });
      expect(e.status).toBe(201);
      expect(e.body.order).toBe(2);
      excelId = e.body.id;
      expect((await ad.post('/admin/topics').send({ slug: 'python', title: 'P2' })).status).toBe(
        409,
      );
      expect((await ad.post('/admin/topics').send({ slug: 'Böyük hərf', title: 'X' })).status).toBe(
        400,
      );
    });

    it('kursa mövzu təyin etmək; naməlum id 400', async () => {
      const bad = await ad.patch(`/admin/courses/${courseId}`).send({ topicIds: ['yoxdur'] });
      expect(bad.status).toBe(400);
      const r = await ad.patch(`/admin/courses/${courseId}`).send({ topicIds: [pythonId] });
      expect(r.status).toBe(200);
      expect(r.body.topics).toEqual([
        expect.objectContaining({ id: pythonId, slug: 'python', title: 'Python' }),
      ]);
      // topicIds verilməyən PATCH mövzulara toxunmur
      const keep = await ad.patch(`/admin/courses/${courseId}`).send({ instructorName: 'Aysel' });
      expect(keep.body.topics).toHaveLength(1);
    });

    it('kataloq: kartda mövzular, ?topic= filtri, ictimai siyahıda say', async () => {
      const all = await agent(app).get('/courses');
      expect(all.status).toBe(200);
      const card = all.body.find((c: { slug: string }) => c.slug === 'python-giris');
      expect(card.topics).toEqual([expect.objectContaining({ slug: 'python' })]);
      const f = await agent(app).get('/courses?topic=python');
      expect(f.body.map((c: { slug: string }) => c.slug)).toEqual(['python-giris']);
      expect((await agent(app).get('/courses?topic=excel')).body).toHaveLength(0);
      const pub = await agent(app).get('/topics');
      expect(pub.body).toEqual([
        expect.objectContaining({ slug: 'python', courseCount: 1 }),
        expect.objectContaining({ slug: 'excel', courseCount: 0 }),
      ]);
      const detail = await agent(app).get('/courses/python-giris');
      expect(detail.body.topics).toEqual([expect.objectContaining({ slug: 'python' })]);
    });

    it('gizli mövzu kataloqda görünmür, adminə görünür', async () => {
      expect((await ad.patch(`/admin/topics/${excelId}`).send({ isPublished: false })).status).toBe(
        200,
      );
      const pub = await agent(app).get('/topics');
      expect(pub.body.map((x: { slug: string }) => x.slug)).toEqual(['python']);
      const adm = await ad.get('/admin/topics');
      expect(adm.body).toHaveLength(2);
      expect((await st.get('/admin/topics')).status).toBe(403);
    });

    it('admin kurs siyahısı: mövzu və səviyyə filtri', async () => {
      const byTopic = await ad.get('/admin/courses?topic=python');
      expect(byTopic.body.courses.map((c: { slug: string }) => c.slug)).toEqual(['python-giris']);
      const byLevel = await ad.get('/admin/courses?level=ADVANCED');
      expect(byLevel.body.courses.map((c: { id: string }) => c.id)).toEqual([otherId]);
      expect((await agent(app).get('/courses?level=ADVANCED')).body).toHaveLength(1);
    });

    it('sıralama: bütün id-lər tələb olunur', async () => {
      expect((await ad.patch('/admin/topics/reorder').send({ ids: [excelId] })).status).toBe(400);
      expect(
        (await ad.patch('/admin/topics/reorder').send({ ids: [excelId, pythonId] })).status,
      ).toBe(200);
      const adm = await ad.get('/admin/topics');
      expect(adm.body.map((x: { slug: string }) => x.slug)).toEqual(['excel', 'python']);
    });

    it('kurs surəti mövzuları saxlayır; mövzu silinəndə kurs qalır', async () => {
      const copy = await ad.post(`/admin/courses/${courseId}/copy`);
      expect(copy.status).toBe(201);
      expect(copy.body.topics).toEqual([expect.objectContaining({ slug: 'python' })]);
      expect((await ad.delete(`/admin/topics/${pythonId}`)).status).toBe(200);
      const c = await ad.get(`/admin/courses/${courseId}`);
      expect(c.status).toBe(200);
      expect(c.body.topics).toEqual([]);
      const audit = await ad.get('/admin/audit');
      const actions = audit.body.items.map((i: { action: string }) => i.action);
      for (const a of ['topic.create', 'topic.update', 'topic.reorder', 'topic.delete'])
        expect(actions).toContain(a);
      const created = audit.body.items.find((i: { action: string }) => i.action === 'topic.create');
      expect(created.entityType).toBe('TOPIC');
    });
  });

  describe('hub və panel', () => {
    beforeAll(async () => {
      expect((await st.post('/courses/python-giris/enroll')).status).toBe(201);
      expect((await st.post(`/learn/steps/${stepIds[0]}/complete`)).status).toBe(200);
    });

    it('addımı eyni anda bir neçə dəfə açmaq 500 vermir (unikal sətir yarışı)', async () => {
      const rs = await Promise.all(
        Array.from({ length: 6 }, () => st.post(`/learn/steps/${stepIds[1]}/start`)),
      );
      expect(rs.map((r) => r.status)).toEqual(Array(6).fill(rs[0].status));
      expect(rs[0].status).toBeLessThan(300);
      expect(await prisma.stepProgress.count({ where: { stepId: stepIds[1] } })).toBe(1);
    });

    it('xülasə və həftəlik hədəf (profil)', async () => {
      const s = await st.get('/me/summary');
      expect(s.status).toBe(200);
      expect(s.body).toMatchObject({ xpTotal: 10, weekTasks: 1, weeklyGoal: 8, streakDays: 1 });
      expect(s.body.pendingReviews).toBeUndefined();
      expect((await st.patch('/me').send({ weeklyGoal: 51 })).status).toBe(400);
      expect((await st.patch('/me').send({ weeklyGoal: 5 })).status).toBe(200);
      expect((await st.get('/me/summary')).body.weeklyGoal).toBe(5);
      const staff = await ad.get('/me/summary');
      expect(staff.body.pendingReviews).toBe(0);
    });

    it('bildirişlər: yeni kurslar oxunmamış, «oxundu» sayğacı sıfırlayır', async () => {
      const n = await st.get('/me/notifications');
      expect(n.status).toBe(200);
      const fresh = n.body.filter(
        (x: { kind: string; unread: boolean }) => x.kind === 'new_course',
      );
      // yazıldığı kurs «yeni» sayılmır — yalnız SQL çətin
      expect(fresh.map((x: { url: string }) => x.url)).toEqual(['/kurs/sql-cetin']);
      expect(fresh[0].unread).toBe(true);
      expect((await st.get('/me/summary')).body.unreadNotifications).toBeGreaterThan(0);
      expect((await st.post('/me/notifications/seen')).status).toBeLessThan(300);
      expect((await st.get('/me/summary')).body.unreadNotifications).toBe(0);
    });

    it('fəaliyyət, təcrübə, imtahanlar, layihələr', async () => {
      const a = await st.get('/me/activity');
      expect(a.status).toBe(200);
      expect(a.body.days.length).toBeGreaterThanOrEqual(365);
      expect(a.body.totals).toMatchObject({ xp: 10, steps: 1, activeDays: 1, currentStreak: 1 });
      const p = await st.get('/me/practice');
      expect(p.status).toBe(200);
      expect(p.body.counts).toMatchObject({ total: 1, done: 0 });
      expect(p.body.courses[0].tasks[0]).toMatchObject({ type: 'CTF', title: 'Bayraq' });
      expect((await st.get('/me/exams')).status).toBe(200);
      expect((await st.get('/me/projects')).status).toBe(200);
      expect((await agent(app).get('/me/activity')).status).toBe(401);
    });

    it('liderlər: qonaq görür, gizlənən istifadəçi siyahıda olmur', async () => {
      const g = await agent(app).get('/leaderboard?period=all');
      expect(g.status).toBe(200);
      expect(g.body.me).toBeNull();
      expect(g.body.rows[0]).toMatchObject({ rank: 1, xp: 10, me: false });
      const mine = await st.get('/leaderboard?period=week');
      expect(mine.body.me).toMatchObject({ rank: 1, xp: 10, hidden: false });
      expect((await st.patch('/me').send({ showOnLeaderboard: false })).status).toBe(200);
      const hidden = await st.get('/leaderboard?period=week');
      expect(hidden.body.rows).toHaveLength(0);
      expect(hidden.body.me).toMatchObject({ hidden: true });
      // naməlum dövr → həftə
      expect((await agent(app).get('/leaderboard?period=il')).body.period).toBe('week');
    });

    it('yarışlar: CTF otaqları və cədvəl', async () => {
      const list = await agent(app).get('/contests');
      expect(list.status).toBe(200);
      expect(list.body).toEqual([
        expect.objectContaining({ stepId: stepIds[1], title: 'Bayraq', tasks: 1, points: 50 }),
      ]);
      const board = await st.get(`/contests/${stepIds[1]}`);
      expect(board.status).toBe(200);
      expect((await agent(app).get('/contests/yoxdur')).status).toBe(404);
    });

    it('admin ümumi baxış və axtarış yalnız heyət üçün', async () => {
      expect((await st.get('/admin/overview')).status).toBe(403);
      const o = await ins.get('/admin/overview');
      expect(o.status).toBe(200);
      expect(o.body).toMatchObject({ students: 1, enrollments: 1, tracks: 1 });
      const s = await ad.get('/admin/search?q=python');
      expect(s.status).toBe(200);
      expect(s.body.courses.map((c: { slug: string }) => c.slug)).toContain('python-giris');
      expect((await st.get('/admin/search?q=python')).status).toBe(403);
    });
  });
});
