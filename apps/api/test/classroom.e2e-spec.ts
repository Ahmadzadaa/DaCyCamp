import type { INestApplication } from '@nestjs/common';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';
import type { PrismaService } from '../src/prisma/prisma.service';
import { env } from '../src/config/env';
import { AcademyWorkerService } from '../src/academy/notifications/academy-worker.service';

type Agent = ReturnType<typeof agent>;
describe('Classroom — publication, isolation, discussion and preservation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent, lead: Agent, student: Agent, other: Agent, assistant: Agent;
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const basic = await seedBasics(prisma);
    const teacher = await makeUser(prisma, 'classroom-teacher@test.local', 'TEACHER');
    const helper = await makeUser(prisma, 'classroom-assistant@test.local', 'TEACHER');
    await makeUser(prisma, 'classroom-other@test.local');
    admin = await login(app, basic.admin.email, 'Admin123!');
    lead = await login(app, teacher.email, 'Parol123!');
    assistant = await login(app, helper.email, 'Parol123!');
    student = await login(app, basic.student.email, 'Telebe123!');
    other = await login(app, 'classroom-other@test.local', 'Parol123!');
    ids.student = basic.student.id;
    const program = await admin
      .post('/academy/programs')
      .send({ title: 'Test proqramı', slug: 'classroom-test', status: 'ACTIVE' });
    const group = await admin.post('/academy/groups').send({
      programId: program.body.id,
      code: 'TEST-CLASS',
      name: 'Test sinfi',
      status: 'ACTIVE',
      leadInstructorId: teacher.id,
    });
    expect(group.status).toBe(201);
    ids.group = group.body.id;
    await admin.post(`/academy/groups/${ids.group}/enrollments`).send({ userId: basic.student.id });
    await admin
      .post(`/academy/groups/${ids.group}/instructors`)
      .send({ userId: helper.id, role: 'ASSISTANT' });
    const second = await admin.post('/academy/groups').send({
      programId: program.body.id,
      code: 'TEST-OTHER',
      name: 'Başqa sinif',
      status: 'ACTIVE',
    });
    ids.otherGroup = second.body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('only assigned staff or enrolled students see the classroom; only lead/admin manage it', async () => {
    expect((await other.get(`/academy/groups/${ids.group}/classroom`)).status).toBe(403);
    expect((await student.get(`/academy/groups/${ids.group}/classroom`)).status).toBe(200);
    expect(
      (await student.post(`/academy/groups/${ids.group}/classroom/topics`).send({ title: 'Səhv' }))
        .status,
    ).toBe(403);
    expect(
      (
        await assistant
          .post(`/academy/groups/${ids.group}/classroom/topics`)
          .send({ title: 'Səhv' })
      ).status,
    ).toBe(403);
    const topic = await lead
      .post(`/academy/groups/${ids.group}/classroom/topics`)
      .send({ title: 'Həftə 1', description: 'Sınaq', order: 0 });
    expect(topic.status).toBe(201);
    ids.topic = topic.body.id;
  });

  it('draft and scheduled material is private; versions reject lost edits and cross-group topics', async () => {
    const r = await lead
      .post(`/academy/groups/${ids.group}/classroom/lessons`)
      .send({ topicId: ids.topic, title: 'Sınaq dərsi', content: 'Yalnız sınaq üçün.' });
    expect(r.status).toBe(201);
    ids.lesson = r.body.id;
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}`)).status).toBe(404);
    const wrong = await admin
      .post(`/academy/groups/${ids.otherGroup}/classroom/lessons`)
      .send({ topicId: ids.topic, title: 'Yanlış', content: 'X' });
    expect(wrong.status).toBe(422);
    const input = {
      topicId: ids.topic,
      title: 'Sınaq dərsi',
      content: 'Sınaq dərs qeydi',
      isPublished: true,
      publishAt: new Date(Date.now() + 3600_000).toISOString(),
      expectedVersion: 1,
    };
    expect((await lead.patch(`/academy/classroom/lessons/${ids.lesson}`).send(input)).status).toBe(
      200,
    );
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}`)).status).toBe(404);
    expect((await lead.patch(`/academy/classroom/lessons/${ids.lesson}`).send(input)).status).toBe(
      409,
    );
    expect(
      (
        await lead.patch(`/academy/classroom/lessons/${ids.lesson}`).send({
          ...input,
          publishAt: new Date(Date.now() - 1000).toISOString(),
          expectedVersion: 2,
        })
      ).status,
    ).toBe(200);
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}`)).status).toBe(200);
  });

  it('file content is validated; downloads check enrollment and material visibility; hiding keeps bytes and records', async () => {
    const fake = await lead
      .post(`/academy/classroom/lessons/${ids.lesson}/files`)
      .attach('file', Buffer.from('<script>bad</script>'), 'fake.pdf');
    expect(fake.status).toBe(422);
    const f = await lead
      .post(`/academy/classroom/lessons/${ids.lesson}/files`)
      .attach('file', Buffer.from('id,value\n1,10'), 'test.csv');
    expect(f.status).toBe(201);
    ids.file = f.body.id;
    expect((await student.get(`/academy/classroom/files/${ids.file}`)).status).toBe(200);
    expect((await other.get(`/academy/classroom/files/${ids.file}`)).status).toBe(403);
    const archived = await lead
      .post(`/academy/classroom/lessons/${ids.lesson}/archive`)
      .send({ archived: true, expectedVersion: 3 });
    expect(archived.status).toBe(201);
    expect((await student.get(`/academy/classroom/files/${ids.file}`)).status).toBe(404);
    expect(await prisma.classroomFile.count({ where: { id: ids.file } })).toBe(1);
    await lead
      .post(`/academy/classroom/lessons/${ids.lesson}/archive`)
      .send({ archived: false, expectedVersion: 4 });
    expect((await student.get(`/academy/classroom/files/${ids.file}`)).status).toBe(200);
    await lead.post(`/academy/classroom/files/${ids.file}/hide`).send({});
    expect((await student.get(`/academy/classroom/files/${ids.file}`)).status).toBe(404);
    expect(
      (await prisma.classroomFile.findUniqueOrThrow({ where: { id: ids.file } })).removedAt,
    ).not.toBeNull();
  });

  it('announcements support drafts, pinning, unread state, comments and moderation', async () => {
    const draft = await lead
      .post(`/academy/groups/${ids.group}/classroom/announcements`)
      .send({ title: 'Gizli elan', body: 'Qaralama' });
    expect(draft.status).toBe(201);
    ids.draftPost = draft.body.id;
    const post = await lead
      .post(`/academy/groups/${ids.group}/classroom/announcements`)
      .send({ title: 'Sınaq elanı', body: '**Salam**', isPublished: true, pinned: true });
    expect(post.status).toBe(201);
    ids.post = post.body.id;
    const board = await student.get(`/academy/groups/${ids.group}/classroom`);
    expect(board.body.announcements.items).toHaveLength(1);
    expect(board.body.announcements.items[0]).toMatchObject({
      id: ids.post,
      pinned: true,
      read: false,
    });
    expect(
      (await student.post(`/academy/classroom/announcements/${ids.draftPost}/read`)).status,
    ).toBe(404);
    await student.post(`/academy/classroom/announcements/${ids.post}/read`).send({});
    expect(
      (await student.get(`/academy/groups/${ids.group}/classroom`)).body.announcements.items[0]
        .read,
    ).toBe(true);
    const reply = await student
      .post(`/academy/classroom/announcements/${ids.post}/replies`)
      .send({ body: 'Sualım var' });
    expect(reply.status).toBe(201);
    expect((await other.get(`/academy/classroom/announcements/${ids.post}/replies`)).status).toBe(
      403,
    );
    expect((await lead.post(`/academy/classroom/replies/${reply.body.id}/hide`)).status).toBe(201);
    expect(
      (await student.get(`/academy/classroom/announcements/${ids.post}/replies`)).body,
    ).toEqual([]);
    expect(await prisma.classroomReply.count({ where: { id: reply.body.id } })).toBe(1);
    await lead.patch(`/academy/classroom/announcements/${ids.post}`).send({
      title: 'Sınaq elanı',
      body: 'Yeni mətn',
      isPublished: true,
      commentsEnabled: false,
      expectedVersion: 1,
    });
    expect(
      (
        await student
          .post(`/academy/classroom/announcements/${ids.post}/replies`)
          .send({ body: 'Bağlı' })
      ).status,
    ).toBe(409);
    expect(
      (await student.get(`/academy/groups/${ids.group}/classroom`)).body.announcements.items[0]
        .read,
    ).toBe(false);
  });

  it('private questions are visible only to the author and assigned staff; resolve/reopen keeps replies', async () => {
    const otherUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'classroom-other@test.local' },
    });
    await admin.post(`/academy/groups/${ids.group}/enrollments`).send({ userId: otherUser.id });
    const q = await student
      .post(`/academy/groups/${ids.group}/classroom/questions`)
      .send({ title: 'Şəxsi sual', body: 'Şəxsi kod', isPrivate: true });
    expect(q.status).toBe(201);
    ids.question = q.body.id;
    expect((await other.get(`/academy/classroom/questions/${ids.question}`)).status).toBe(404);
    expect(
      (await other.get(`/academy/groups/${ids.group}/classroom/questions`)).body.items,
    ).toEqual([]);
    expect((await lead.get(`/academy/classroom/questions/${ids.question}`)).status).toBe(200);
    const answer = await lead
      .post(`/academy/classroom/questions/${ids.question}/replies`)
      .send({ body: 'İzah' });
    expect(answer.status).toBe(201);
    expect(
      (
        await other
          .post(`/academy/classroom/questions/${ids.question}/replies`)
          .send({ body: 'Yanlış' })
      ).status,
    ).toBe(404);
    await student
      .post(`/academy/classroom/questions/${ids.question}/resolve`)
      .send({ resolved: true });
    expect(
      (await lead.post(`/academy/classroom/questions/${ids.question}/replies`).send({ body: 'X' }))
        .status,
    ).toBe(409);
    await lead
      .post(`/academy/classroom/questions/${ids.question}/resolve`)
      .send({ resolved: false });
    expect(
      (await student.get(`/academy/classroom/questions/${ids.question}`)).body.replies,
    ).toHaveLength(1);
  });

  it('topic archive hides material and files and restore is lossless', async () => {
    await lead.post(`/academy/classroom/topics/${ids.topic}/archive`).send({ archived: true });
    expect((await student.get(`/academy/groups/${ids.group}/classroom`)).body.topics).toEqual([]);
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}`)).status).toBe(404);
    await lead.post(`/academy/classroom/topics/${ids.topic}/archive`).send({ archived: false });
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}`)).status).toBe(200);
  });

  it('scheduled publication emits one notification per student, even with repeated workers', async () => {
    const worker = app.get(AcademyWorkerService);
    const future = await lead.post(`/academy/groups/${ids.group}/classroom/announcements`).send({
      title: 'Gələcək elan',
      body: 'Sonra',
      isPublished: true,
      publishAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    await worker.runOnce();
    await worker.runOnce();
    const notices = await prisma.academyNotification.findMany({
      where: { userId: ids.student, referenceId: ids.post },
    });
    expect(notices).toHaveLength(1);
    expect(await prisma.academyNotification.count({ where: { referenceId: future.body.id } })).toBe(
      0,
    );
    expect(await prisma.classroomLesson.count()).toBe(1);
  });

  it('teacher desk is scoped to assigned groups; student and unrelated staff cannot see private work', async () => {
    expect((await student.get('/academy/instructor/desk')).status).toBe(403);
    const q = await student
      .post(`/academy/groups/${ids.group}/classroom/questions`)
      .send({ title: 'Cavabsız', body: 'Kömək', isPrivate: true });
    const desk = await lead.get('/academy/instructor/desk');
    expect(desk.status).toBe(200);
    expect(desk.body.questions.some((x: { id: string }) => x.id === q.body.id)).toBe(true);
    const stranger = await makeUser(prisma, 'unassigned-teacher@test.local', 'TEACHER');
    const unassigned = await login(app, stranger.email, 'Parol123!');
    expect((await unassigned.get('/academy/instructor/desk')).body.questions).toEqual([]);
  });

  it('parallel refresh-token rotation returns the same successor to both tabs', async () => {
    const auth = await agent(app)
      .post('/auth/login')
      .send({ email: 'telebe@test.local', password: 'Telebe123!' });
    const cookie = (auth.headers['set-cookie'] as unknown as string[])
      .map((c) => c.split(';')[0])
      .find((c) => c.startsWith('dacy_rt='))!;
    const results = await Promise.all([
      agent(app).post('/auth/refresh').set('Cookie', cookie),
      agent(app).post('/auth/refresh').set('Cookie', cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 200]);
    expect(results[0]!.headers['set-cookie']).toEqual(results[1]!.headers['set-cookie']);
  });
  it('announcement attachments enforce the same publication and group permissions as the announcement', async () => {
    const post = await lead
      .post(`/academy/groups/${ids.group}/classroom/announcements`)
      .send({ title: 'Fayllı elan', body: 'Resurs', isPublished: false });
    const file = await lead
      .post(`/academy/classroom/announcements/${post.body.id}/files`)
      .attach('file', Buffer.from('a,b\n1,2'), 'announcement.csv');
    expect(file.status).toBe(201);
    expect((await student.get(`/academy/classroom/files/${file.body.id}`)).status).toBe(404);
    await lead
      .patch(`/academy/classroom/announcements/${post.body.id}`)
      .send({ title: 'Fayllı elan', body: 'Resurs', isPublished: true, expectedVersion: 2 });
    expect((await student.get(`/academy/classroom/files/${file.body.id}`)).status).toBe(200);
    const board = await student.get(`/academy/groups/${ids.group}/classroom`);
    expect(
      board.body.announcements.items.find((x: { id: string }) => x.id === post.body.id).files[0]
        .filename,
    ).toBe('announcement.csv');
    await lead
      .post(`/academy/classroom/announcements/${post.body.id}/archive`)
      .send({ archived: true, expectedVersion: 3 });
    expect((await student.get(`/academy/classroom/files/${file.body.id}`)).status).toBe(404);
    expect(await prisma.classroomFile.count({ where: { id: file.body.id } })).toBe(1);
  });

  it('SQL/Python mode keeps legacy records but excludes them from progression and rejects new lab steps', async () => {
    const previous = env.LEGACY_LABS_ENABLED;
    env.LEGACY_LABS_ENABLED = false;
    try {
      const track = await prisma.track.findFirstOrThrow();
      const course = await prisma.course.create({
        data: {
          trackId: track.id,
          slug: 'data-only',
          title: 'Data-only test',
          order: 99,
          isPublished: true,
        },
      });
      const module = await prisma.module.create({
        data: { courseId: course.id, key: 'm', title: 'M', order: 1, isPublished: true },
      });
      await prisma.step.createMany({
        data: [
          {
            moduleId: module.id,
            key: 'theory',
            title: 'Theory',
            type: 'THEORY',
            order: 1,
            isPublished: true,
          },
          {
            moduleId: module.id,
            key: 'terminal',
            title: 'Terminal',
            type: 'TERMINAL',
            order: 2,
            isPublished: true,
          },
          {
            moduleId: module.id,
            key: 'ctf',
            title: 'CTF',
            type: 'CTF',
            order: 3,
            isPublished: true,
          },
        ],
      });
      const outline = await student.get('/courses/data-only');
      expect(outline.body.modules[0].steps.map((s: { type: string }) => s.type)).toEqual([
        'THEORY',
      ]);
      await student.post('/courses/data-only/enroll').send({});
      const map = await student.get('/learn/courses/data-only');
      expect(map.body.map.modules[0].steps.map((s: { type: string }) => s.type)).toEqual([
        'THEORY',
      ]);
      expect(await prisma.step.count({ where: { moduleId: module.id } })).toBe(3);
      expect(
        (
          await admin
            .post(`/admin/modules/${module.id}/steps`)
            .send({ type: 'TERMINAL', title: 'Disabled' })
        ).status,
      ).toBe(422);
    } finally {
      env.LEGACY_LABS_ENABLED = previous;
    }
  });

  it('accounts with academic records cannot be permanently deleted', async () => {
    const r = await admin.delete(`/admin/users/${ids.student}`);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('ACADEMY_RECORDS_PROTECTED');
    expect(
      await prisma.academyEnrollment.count({ where: { studentId: ids.student } }),
    ).toBeGreaterThan(0);
    expect(await prisma.user.count({ where: { id: ids.student } })).toBe(1);
  });
});
