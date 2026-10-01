import { INestApplication } from '@nestjs/common';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('admin content', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trackId: string;
  let courseId = '';
  let moduleId = '';
  let stepId = '';
  let ins: ReturnType<typeof agent>;
  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    trackId = b.track.id;
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
  });
  afterAll(() => app.close());

  it('STUDENT admin marşrutlarına girə bilmir', async () => {
    const s = await login(app, 'telebe@test.local', 'Telebe123!');
    expect((await s.get('/admin/courses')).status).toBe(403);
    expect((await s.post('/admin/courses').send({})).status).toBe(403);
  });

  it('kurs yarat → qaralama kataloqda görünmür', async () => {
    const r = await ins
      .post('/admin/courses')
      .send({
        trackId,
        slug: 'test-kurs',
        title: 'Test kursu',
        level: 'BEGINNER',
        description: 'x',
      });
    expect(r.status).toBe(201);
    courseId = r.body.id;
    const pub = await agent(app).get('/courses');
    expect(pub.body.find((c: { slug: string }) => c.slug === 'test-kurs')).toBeUndefined();
    expect(
      (await ins.post('/admin/courses').send({ trackId, slug: 'test-kurs', title: 'Dublikat' }))
        .status,
    ).toBe(409);
  });

  it('fəsil + addımlar, açar avtomatik slug olur', async () => {
    const m = await ins
      .post(`/admin/courses/${courseId}/modules`)
      .send({ title: 'Qruplaşdırma və aqreqasiya' });
    expect(m.status).toBe(201);
    expect(m.body.key).toBe('qruplasdirma-ve-aqreqasiya');
    moduleId = m.body.id;
    const s1 = await ins
      .post(`/admin/modules/${moduleId}/steps`)
      .send({ type: 'THEORY', title: 'GROUP BY nədir?' });
    expect(s1.status).toBe(201);
    expect(s1.body.key).toBe('group-by-nedir');
    expect(s1.body.isPublished).toBe(false);
    stepId = s1.body.id;
    const s2 = await ins
      .post(`/admin/modules/${moduleId}/steps`)
      .send({ type: 'QUIZ', title: 'Yoxlama testi' });
    const s3 = await ins
      .post(`/admin/modules/${moduleId}/steps`)
      .send({ type: 'CTF', title: 'Otaq' });
    expect([s2.status, s3.status]).toEqual([201, 201]);
    const tree = await ins.get(`/admin/courses/${courseId}`);
    expect(tree.body.modules[0].steps.map((s: { order: number }) => s.order)).toEqual([1, 2, 3]);
  });

  it('boş nəzəri addım dərc oluna bilmir (422), məzmunla olur', async () => {
    const p = await ins.patch(`/admin/steps/${stepId}/publish`).send({ isPublished: true });
    expect(p.status).toBe(422);
    expect(p.body.code).toBe('PUBLISH_ISSUES');
    const put = await ins
      .put(`/admin/steps/${stepId}`)
      .send({ type: 'theory', title: 'GROUP BY nədir?', xp: 10, content: '# Salam' });
    expect(put.status).toBe(200);
    expect(put.body.issues).toEqual([]);
    expect(
      (await ins.patch(`/admin/steps/${stepId}/publish`).send({ isPublished: true })).status,
    ).toBe(200);
  });

  it('səhv quiz tərifi 400 və zod path qaytarır', async () => {
    const tree = await ins.get(`/admin/courses/${courseId}`);
    const quiz = tree.body.modules[0].steps[1];
    const r = await ins
      .put(`/admin/steps/${quiz.id}`)
      .send({ type: 'quiz', title: 'T', pass_score: 170, questions: [] });
    expect(r.status).toBe(400);
    expect(r.body.details[0].path).toBe('pass_score');
  });

  it('CTF: açıq cavab hash-lənir, GET answer_hash qaytarır, answer heç vaxt', async () => {
    const tree = await ins.get(`/admin/courses/${courseId}`);
    const ctf = tree.body.modules[0].steps[2];
    const put = await ins.put(`/admin/steps/${ctf.id}`).send({
      type: 'ctf',
      title: 'Otaq',
      instructions: 'tap',
      attachments: [],
      hint_penalty_xp: 10,
      tasks: [{ key: 't1', question: 'Flag?', answer: 'DACY{abc}', points: 100 }],
    });
    expect(put.status).toBe(200);
    expect(put.body.definition.tasks[0].answer_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(put.body)).not.toContain('DACY{abc}');
    const row = await prisma.ctfTask.findFirst({ where: { stepId: ctf.id } });
    expect(row?.answerHash).toBe(put.body.definition.tasks[0].answer_hash);
    // hash ilə yenidən göndərəndə eyni qalır
    const again = await ins.put(`/admin/steps/${ctf.id}`).send({ ...put.body.definition });
    expect(again.body.definition.tasks[0].answer_hash).toBe(row?.answerHash);
  });

  it('sıralama unique(order) pozmur və sırası dəyişir', async () => {
    const tree = await ins.get(`/admin/courses/${courseId}`);
    const ids = tree.body.modules[0].steps.map((s: { id: string }) => s.id);
    const r = await ins
      .patch(`/admin/modules/${moduleId}/steps/reorder`)
      .send({ ids: [ids[2], ids[0], ids[1]] });
    expect(r.status).toBe(200);
    const after = await ins.get(`/admin/courses/${courseId}`);
    expect(after.body.modules[0].steps.map((s: { id: string }) => s.id)).toEqual([
      ids[2],
      ids[0],
      ids[1],
    ]);
    expect(
      (await ins.patch(`/admin/modules/${moduleId}/steps/reorder`).send({ ids: [ids[0]] })).status,
    ).toBe(400);
  });

  it('fayl yükləmə: CHECK_SCRIPT tələbəyə 403, üz şəkli hamıya', async () => {
    const up = await ins
      .post(`/admin/courses/${courseId}/assets`)
      .field('path', 'checks/c.sh')
      .attach('file', Buffer.from('#!/bin/sh\nexit 0'), 'c.sh');
    expect(up.status).toBe(201);
    expect(up.body.kind).toBe('CHECK_SCRIPT');
    const s = await login(app, 'telebe@test.local', 'Telebe123!');
    expect((await s.get(`/assets/${up.body.id}/c.sh`)).status).toBe(403);
    expect((await ins.get(`/assets/${up.body.id}/c.sh`)).status).toBe(200);
    const img = await ins
      .post(`/admin/courses/${courseId}/assets`)
      .attach('file', Buffer.from('png'), 'cover.png');
    expect(img.body.kind).toBe('IMAGE');
    expect(img.body.path).toBe('images/cover.png');
    await ins.patch(`/admin/courses/${courseId}`).send({ coverAssetId: img.body.id });
    expect((await agent(app).get(`/assets/${img.body.id}/cover.png`)).status).toBe(200);
    expect(
      (
        await ins
          .post(`/admin/courses/${courseId}/assets`)
          .attach('file', Buffer.from('x'), 'cover.png')
      ).status,
    ).toBe(409);
  });

  it('dərc olunan kurs kataloqda görünür, dərc olunmamış addımlar sayılmır', async () => {
    await ins.patch(`/admin/courses/${courseId}/publish`).send({ isPublished: true });
    await ins.patch(`/admin/modules/${moduleId}`).send({ isPublished: true });
    const list = await agent(app).get('/courses');
    const c = list.body.find((x: { slug: string }) => x.slug === 'test-kurs');
    expect(c).toBeDefined();
    expect(c.stepCount).toBe(1); // yalnız nəzəri addım dərc olunub
  });

  it('TRACK silmək: kursu olan istiqamət 409', async () => {
    const ad = await login(app, 'admin@test.local', 'Admin123!');
    expect((await ad.delete(`/admin/tracks/${trackId}`)).status).toBe(409);
  });
});
