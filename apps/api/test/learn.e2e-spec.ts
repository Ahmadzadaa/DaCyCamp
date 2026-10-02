import { INestApplication } from '@nestjs/common';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { splitStep } from '@dacy/shared';

describe('student flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let st: ReturnType<typeof agent>;
  const slug = 'sql-kurs';
  const stepIds: string[] = [];
  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug,
        title: 'SQL kursu',
        order: 1,
        isPublished: true,
        sequential: true,
      },
    });
    const m1 = await prisma.module.create({
      data: { courseId: course.id, key: 'giris', title: 'Giriş', order: 1, isPublished: true },
    });
    const m2 = await prisma.module.create({
      data: { courseId: course.id, key: 'iki', title: 'İki', order: 2, isPublished: true },
    });
    const defs = [
      {
        m: m1.id,
        key: 'a',
        def: { type: 'theory' as const, title: 'A', xp: 10, content: 'salam' },
      },
      {
        m: m1.id,
        key: 'b',
        def: {
          type: 'quiz' as const,
          title: 'B',
          xp: 30,
          pass_score: 70,
          shuffle_questions: false,
          questions: [
            {
              text: 'q1',
              type: 'single' as const,
              options: ['x', 'y'],
              correct: [1],
              explanation: 'izah',
            },
            { text: 'q2', type: 'multiple' as const, options: ['x', 'y', 'z'], correct: [0, 2] },
          ],
        },
      },
      { m: m2.id, key: 'c', def: { type: 'theory' as const, title: 'C', xp: 10, content: 'son' } },
    ];
    for (const [i, d] of defs.entries()) {
      const s = splitStep(d.def);
      const row = await prisma.step.create({
        data: {
          moduleId: d.m,
          key: d.key,
          type: s.type,
          title: s.title,
          xp: s.xp,
          order: d.m === m1.id ? i + 1 : 1,
          isPublished: true,
          config: s.config as unknown as Prisma.InputJsonValue,
          secret: s.secret ? (s.secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      stepIds.push(row.id);
    }
    st = await login(app, 'telebe@test.local', 'Telebe123!');
  });
  afterAll(() => app.close());

  it('yazılmadan addım 403 NOT_ENROLLED; yazılma idempotentdir', async () => {
    expect((await st.get(`/learn/courses/${slug}/steps/giris/a`)).status).toBe(403);
    expect((await st.post(`/courses/${slug}/enroll`)).status).toBe(201);
    expect((await st.post(`/courses/${slug}/enroll`)).status).toBe(201);
    expect(await prisma.enrollment.count()).toBe(1);
  });

  it('kurs xəritəsi: ilk addım açıq, qalanı kilidli', async () => {
    const r = await st.get(`/learn/courses/${slug}`);
    expect(r.status).toBe(200);
    expect(r.body.map.modules[0].steps.map((s: { state: string }) => s.state)).toEqual([
      'available',
      'locked',
    ]);
    expect(r.body.map.modules[1].state).toBe('locked');
    expect(r.body.continueUrl).toBe(`/kurs/${slug}/giris/a`);
  });

  it('kilidli addım 403 STEP_LOCKED (həm oxu, həm yazı)', async () => {
    const r = await st.get(`/learn/courses/${slug}/steps/giris/b`);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('STEP_LOCKED');
    expect(
      (
        await st
          .post(`/learn/steps/${stepIds[1]}/submit`)
          .send({ kind: 'quiz', answers: [[1], [0, 2]] })
      ).status,
    ).toBe(403);
  });

  it('nəzəri addım: görünüşdə secret yoxdur; tamamlama XP verir, ikinci dəfə vermir', async () => {
    const v = await st.get(`/learn/courses/${slug}/steps/giris/a`);
    expect(v.status).toBe(200);
    expect(v.body.view.kind).toBe('theory');
    expect(v.body.position).toEqual({ index: 1, total: 3, typeIndex: 1, typeTotal: 2 });
    expect((await st.post(`/learn/steps/${stepIds[0]}/start`)).status).toBe(200);
    const c1 = await st.post(`/learn/steps/${stepIds[0]}/complete`);
    expect(c1.status).toBe(200);
    expect(c1.body.xpAwarded).toBe(10);
    expect(c1.body.coursePercent).toBe(33);
    expect(c1.body.next).toEqual({ moduleKey: 'giris', stepKey: 'b' });
    const c2 = await st.post(`/learn/steps/${stepIds[0]}/complete`);
    expect(c2.body.xpAwarded).toBe(0);
    const me = await st.get('/auth/me');
    expect(me.body.xpTotal).toBe(10);
  });

  it('quiz: görünüşdə düzgün cavab yoxdur; keçid balı altı IN_PROGRESS qalır', async () => {
    const v = await st.get(`/learn/courses/${slug}/steps/giris/b`);
    expect(v.status).toBe(200);
    expect(JSON.stringify(v.body.view)).not.toContain('correct');
    const fail = await st
      .post(`/learn/steps/${stepIds[1]}/submit`)
      .send({ kind: 'quiz', answers: [[0], [0, 2]] });
    expect(fail.status).toBe(200);
    expect(fail.body.passed).toBe(false);
    expect(fail.body.score).toBe(50);
    expect(fail.body.perQuestion[0]).toMatchObject({
      correct: false,
      correctIndices: [1],
      explanation: 'izah',
    });
    const p = await prisma.stepProgress.findUnique({
      where: {
        userId_stepId: {
          userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'telebe@test.local' } }))
            .id,
          stepId: stepIds[1]!,
        },
      },
    });
    expect(p?.status).toBe('IN_PROGRESS');
    expect(p?.attempts).toBe(1);
  });

  it('quiz keçəndə XP bir dəfə, növbəti fəsil açılır', async () => {
    const ok = await st
      .post(`/learn/steps/${stepIds[1]}/submit`)
      .send({ kind: 'quiz', answers: [[1], [2, 0]] });
    expect(ok.body.passed).toBe(true);
    expect(ok.body.xpAwarded).toBe(30);
    expect(ok.body.attempts).toBe(2);
    const again = await st
      .post(`/learn/steps/${stepIds[1]}/submit`)
      .send({ kind: 'quiz', answers: [[1], [2, 0]] });
    expect(again.body.xpAwarded).toBe(0);
    const map = await st.get(`/learn/courses/${slug}`);
    expect(map.body.map.modules[1].steps[0].state).toBe('available');
    expect(map.body.map.percent).toBe(66);
  });

  it('kurs bitəndə completedAt yazılır; panel düzgün sayır', async () => {
    const c = await st.post(`/learn/steps/${stepIds[2]}/complete`);
    expect(c.body.courseCompleted).toBe(true);
    expect(c.body.coursePercent).toBe(100);
    const d = await st.get('/me/dashboard');
    expect(d.status).toBe(200);
    expect(d.body.xpTotal).toBe(50);
    expect(d.body.stepsCompleted).toBe(3);
    expect(d.body.streakDays).toBe(1);
    expect(d.body.courses[0]).toMatchObject({ slug, percent: 100 });
    expect(d.body.courses[0].completedAt).not.toBeNull();
    expect(d.body.week.filter(Boolean).length).toBe(1);
  });

  it('rəqəmli mövqe açara çevrilir', async () => {
    const r = await st.get(`/learn/courses/${slug}/position/2/1`);
    expect(r.body).toEqual({ moduleKey: 'iki', stepKey: 'c' });
    expect((await st.get(`/learn/courses/${slug}/position/9/1`)).status).toBe(404);
  });

  it('sərbəst rejimdə kilid yoxdur', async () => {
    await prisma.course.update({ where: { slug }, data: { sequential: false } });
    const s2 = await login(app, 'muellim@test.local', 'Muellim123!');
    await s2.post(`/courses/${slug}/enroll`);
    const map = await s2.get(`/learn/courses/${slug}`);
    expect(
      map.body.map.modules.flatMap((m: { steps: { state: string }[] }) =>
        m.steps.map((s) => s.state),
      ),
    ).toEqual(['available', 'available', 'available']);
  });

  it('müəllim ?preview=1 ilə yazılmadan və kilidsiz baxır, yazı etmir', async () => {
    await prisma.course.update({ where: { slug }, data: { sequential: true } });
    await prisma.enrollment.deleteMany({ where: { user: { email: 'muellim@test.local' } } });
    const ins = await login(app, 'muellim@test.local', 'Muellim123!');
    const v = await ins.get(`/learn/courses/${slug}/steps/iki/c?preview=1`);
    expect(v.status).toBe(200);
    expect(v.body.preview).toBe(true);
    const c = await ins.post(`/learn/steps/${stepIds[2]}/complete?preview=1`);
    expect(c.status).toBe(200);
    expect(
      await prisma.stepProgress.count({ where: { user: { email: 'muellim@test.local' } } }),
    ).toBe(0);
  });
});
