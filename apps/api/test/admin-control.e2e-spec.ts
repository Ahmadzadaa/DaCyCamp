import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { splitStep } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** Qeyd 3: admin kurs nəzarəti — arxiv, surət, soft/hard delete, tələbə müdaxiləsi, audit, rollar */
describe('admin course control', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ad: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let st: ReturnType<typeof agent>;
  let courseId: string;
  let studentId: string;
  const slug = 'idare-kurs';
  const title = 'İdarə kursu';
  const stepIds: string[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    studentId = b.student.id;
    const course = await prisma.course.create({
      data: { trackId: b.track.id, slug, title, order: 1, isPublished: true, sequential: true },
    });
    courseId = course.id;
    const m = await prisma.module.create({
      data: { courseId, key: 'giris', title: 'Giriş', order: 1, isPublished: true },
    });
    const defs = [
      { key: 'a', def: { type: 'theory' as const, title: 'A', xp: 10, content: 'bir' } },
      { key: 'b', def: { type: 'theory' as const, title: 'B', xp: 10, content: 'iki' } },
      {
        key: 'c',
        def: {
          type: 'ctf' as const,
          title: 'C',
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
    expect((await st.post(`/courses/${slug}/enroll`)).status).toBe(201);
    expect((await st.post(`/learn/steps/${stepIds[0]}/complete`)).status).toBe(200);
  });
  afterAll(() => app.close());

  it('tələbə və müəllim ADMIN əməliyyatlarını edə bilmir (backend 403)', async () => {
    for (const who of [st, ins]) {
      expect(
        (await who.patch(`/admin/courses/${courseId}/archive`).send({ archived: true })).status,
      ).toBe(403);
      expect((await who.post(`/admin/courses/${courseId}/copy`)).status).toBe(403);
      expect(
        (await who.delete(`/admin/courses/${courseId}?confirm=${encodeURIComponent(title)}`))
          .status,
      ).toBe(403);
      expect((await who.post(`/admin/courses/${courseId}/restore`)).status).toBe(403);
      expect((await who.delete(`/admin/courses/${courseId}/permanent`)).status).toBe(403);
      expect((await who.get(`/admin/courses/${courseId}/students`)).status).toBe(403);
      expect(
        (await who.post(`/admin/courses/${courseId}/students/${studentId}/reset`)).status,
      ).toBe(403);
      expect((await who.get('/admin/audit')).status).toBe(403);
    }
    // müəllim məzmunu redaktə etməyə davam edir
    expect(
      (await ins.patch(`/admin/courses/${courseId}`).send({ instructorName: 'Aysel' })).status,
    ).toBe(200);
  });

  it('kursun tələbələri: faiz və son aktivlik', async () => {
    const r = await ad.get(`/admin/courses/${courseId}/students`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({
      userId: studentId,
      email: 'telebe@test.local',
      percent: 33,
      done: 1,
      total: 3,
      lockedStepIds: [stepIds[2]],
    });
  });

  it('kilidli addımı əl ilə açmaq; açıq addımı yenidən açmaq 409', async () => {
    // a tamamlanıb → b açıq, c kilidli
    expect((await st.get(`/learn/courses/${slug}/steps/giris/c`)).body.code).toBe('STEP_LOCKED');
    const r = await ad
      .post(`/admin/courses/${courseId}/students/${studentId}/unlock`)
      .send({ stepId: stepIds[2] });
    expect(r.status).toBe(201);
    expect((await st.get(`/learn/courses/${slug}/steps/giris/c`)).status).toBe(200);
    const again = await ad
      .post(`/admin/courses/${courseId}/students/${studentId}/unlock`)
      .send({ stepId: stepIds[1] });
    expect(again.status).toBe(409);
  });

  it('irəliləyişi sıfırla: progress/göndəriş/kilid silinir, yazılma 0% qalır', async () => {
    await prisma.submission.create({
      data: { userId: studentId, stepId: stepIds[1]!, type: 'THEORY', payload: {}, passed: true },
    });
    const r = await ad.post(`/admin/courses/${courseId}/students/${studentId}/reset`);
    expect(r.status).toBe(201);
    expect(await prisma.stepProgress.count({ where: { userId: studentId } })).toBe(0);
    expect(await prisma.submission.count({ where: { userId: studentId } })).toBe(0);
    expect(await prisma.stepUnlock.count({ where: { userId: studentId } })).toBe(0);
    const e = await prisma.enrollment.findFirstOrThrow({ where: { userId: studentId } });
    expect(e.percent).toBe(0);
    expect((await st.get(`/learn/courses/${slug}/steps/giris/c`)).body.code).toBe('STEP_LOCKED');
  });

  it('tələbəni çıxar və geri qaytar', async () => {
    expect((await ad.delete(`/admin/courses/${courseId}/students/${studentId}`)).status).toBe(200);
    expect(await prisma.enrollment.count({ where: { courseId } })).toBe(0);
    expect((await ad.post(`/admin/courses/${courseId}/students/${studentId}`)).status).toBe(201);
    expect(await prisma.enrollment.count({ where: { courseId } })).toBe(1);
  });

  it('arxiv: kataloqda yoxdur, yazılmış tələbə davam edir, yeni yazılma 409', async () => {
    expect(
      (await ad.patch(`/admin/courses/${courseId}/archive`).send({ archived: true })).body.status,
    ).toBe('archived');
    const cat = await agent(app).get('/courses');
    expect(cat.body.map((c: { slug: string }) => c.slug)).not.toContain(slug);
    expect((await st.get(`/learn/courses/${slug}`)).status).toBe(200);
    expect((await st.get(`/courses/${slug}`)).status).toBe(200);
    const other = await agent(app)
      .post('/auth/register')
      .send({ email: 'yeni@test.local', name: 'Yeni', password: 'Yeni12345' });
    expect(other.status).toBe(201);
    const nw = await login(app, 'yeni@test.local', 'Yeni12345');
    expect((await nw.post(`/courses/${slug}/enroll`)).status).toBe(409);
    expect((await nw.get(`/courses/${slug}`)).status).toBe(404);
    const list = await ad.get('/admin/courses?status=archived');
    expect(list.body.counts.archived).toBe(1);
    expect(
      (await ad.patch(`/admin/courses/${courseId}/archive`).send({ archived: false })).body.status,
    ).toBe('published');
  });

  it('kopyala: bütün fəsil/addım/CTF ilə qaralama surət', async () => {
    const r = await ad.post(`/admin/courses/${courseId}/copy`);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      slug: `${slug}-kopya`,
      status: 'draft',
      moduleCount: 1,
      stepCount: 3,
    });
    expect(r.body.title).toContain('(surət)');
    expect(
      await prisma.ctfTask.count({ where: { step: { module: { courseId: r.body.id } } } }),
    ).toBe(1);
    expect(await prisma.enrollment.count({ where: { courseId: r.body.id } })).toBe(0);
    const second = await ad.post(`/admin/courses/${courseId}/copy`);
    expect(second.body.slug).toBe(`${slug}-kopya-2`);
  });

  it('silmə: tələbə varsa ad təsdiqi tələb olunur; soft delete → silinənlər; bərpa', async () => {
    const no = await ad.delete(`/admin/courses/${courseId}`);
    expect(no.status).toBe(400);
    expect(no.body.code).toBe('CONFIRM_REQUIRED');
    const yes = await ad.delete(`/admin/courses/${courseId}?confirm=${encodeURIComponent(title)}`);
    expect(yes.status).toBe(200);
    expect(yes.body.status).toBe('deleted');
    expect(yes.body.purgeAt).toBeTruthy();
    expect((await st.get(`/learn/courses/${slug}`)).status).toBe(404);
    expect((await st.get('/me/enrollments')).body).toHaveLength(0);
    const trash = await ad.get('/admin/courses?status=deleted');
    expect(trash.body.courses.map((c: { id: string }) => c.id)).toContain(courseId);
    expect(
      (await ad.get('/admin/courses')).body.courses.map((c: { id: string }) => c.id),
    ).not.toContain(courseId);
    expect((await ad.post(`/admin/courses/${courseId}/restore`)).body.status).toBe('published');
    expect((await st.get(`/learn/courses/${slug}`)).status).toBe(200);
  });

  it('həmişəlik silmə: yetim qeyd qalmır, sertifikat və XP qalır', async () => {
    await prisma.certificate.create({
      data: {
        serial: 'DACY-C-TEST-1',
        userId: studentId,
        courseId,
        snapshot: { courseTitle: title },
      },
    });
    await st.post(`/learn/steps/${stepIds[0]}/complete`);
    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).xpTotal;
    // əvvəlcə silinənlərdə olmalıdır
    expect(
      (await ad.delete(`/admin/courses/${courseId}/permanent?confirm=${encodeURIComponent(title)}`))
        .status,
    ).toBe(409);
    await ad.delete(`/admin/courses/${courseId}?confirm=${encodeURIComponent(title)}`);
    expect((await ad.delete(`/admin/courses/${courseId}/permanent`)).status).toBe(400);
    const r = await ad.delete(
      `/admin/courses/${courseId}/permanent?confirm=${encodeURIComponent(title)}`,
    );
    expect(r.status).toBe(200);
    expect(await prisma.course.count({ where: { id: courseId } })).toBe(0);
    expect(await prisma.module.count({ where: { courseId } })).toBe(0);
    expect(await prisma.step.count({ where: { id: { in: stepIds } } })).toBe(0);
    expect(await prisma.enrollment.count({ where: { courseId } })).toBe(0);
    expect(await prisma.stepProgress.count({ where: { stepId: { in: stepIds } } })).toBe(0);
    expect(await prisma.submission.count({ where: { stepId: { in: stepIds } } })).toBe(0);
    expect(await prisma.ctfTask.count({ where: { stepId: { in: stepIds } } })).toBe(0);
    expect(await prisma.stepUnlock.count({ where: { stepId: { in: stepIds } } })).toBe(0);
    const cert = await prisma.certificate.findUniqueOrThrow({ where: { serial: 'DACY-C-TEST-1' } });
    expect(cert.courseId).toBeNull();
    expect(cert.revokedAt).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).xpTotal).toBe(
      xpBefore,
    );
  });

  it('audit log: hər əməliyyat kim/nə/nə vaxt ilə yazılır', async () => {
    const r = await ad.get('/admin/audit?limit=100');
    expect(r.status).toBe(200);
    const actions = r.body.items.map((i: { action: string }) => i.action);
    for (const a of [
      'course.update',
      'enrollment.unlock',
      'enrollment.reset',
      'enrollment.remove',
      'enrollment.add',
      'course.archive',
      'course.copy',
      'course.delete',
      'course.restore',
      'course.purge',
    ])
      expect(actions).toContain(a);
    const purge = r.body.items.find((i: { action: string }) => i.action === 'course.purge');
    expect(purge).toMatchObject({
      entityTitle: title,
      entityType: 'COURSE',
      actor: { email: 'admin@test.local' },
    });
    const reset = r.body.items.find((i: { action: string }) => i.action === 'enrollment.reset');
    expect(reset.details).toMatchObject({ userId: studentId, email: 'telebe@test.local' });
    // uğursuz (403/400) cəhdlər jurnala düşmür
    const foreign = r.body.items.filter(
      (i: { action: string; actor: { email: string } }) =>
        i.actor.email !== 'admin@test.local' && i.action !== 'course.update',
    );
    expect(foreign).toHaveLength(0);
  });
});
