import type { INestApplication } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { splitStep } from '@dacy/shared';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';
import type { PrismaService } from '../src/prisma/prisma.service';
import { saveToStorage } from '../src/assets/storage';
import { SqlCheckService } from '../src/sql-check/sql-check.service';
import { PythonCheckService } from '../src/python-check/python-check.service';
import { MailService } from '../src/mail/mail.service';
import { AcademyWorkerService } from '../src/academy/notifications/academy-worker.service';

type Agent = ReturnType<typeof agent>;
const cookie = (r: { headers: Record<string, unknown> }, key: string) =>
  (r.headers['set-cookie'] as string[]).find((c) => c.startsWith(key + '='))!.split(';')[0]!;

describe('Pilot remediation — integrity, sessions, recovery and preservation', () => {
  let app: INestApplication, prisma: PrismaService;
  let admin: Agent, teacher: Agent, student: Agent;
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const base = await seedBasics(prisma);
    ids.student = base.student.id;
    const lead = await makeUser(prisma, 'reliable-teacher@test.local', 'TEACHER');
    admin = await login(app, base.admin.email, 'Admin123!');
    teacher = await login(app, lead.email, 'Parol123!');
    student = await login(app, base.student.email, 'Telebe123!');
    const course = await prisma.course.create({
      data: {
        trackId: base.track.id,
        slug: 'reliable',
        title: 'Reliability',
        order: 1,
        sequential: false,
        isPublished: true,
      },
    });
    const module = await prisma.module.create({
      data: { courseId: course.id, key: 'm', title: 'M', order: 1, isPublished: true },
    });
    const buffer = Buffer.from('id,value\n1,10\n2,20\n');
    await prisma.asset.create({
      data: {
        courseId: course.id,
        path: 'datasets/data.csv',
        filename: 'data.csv',
        kind: 'DATASET',
        mime: 'text/csv',
        sizeBytes: buffer.length,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        storageKey: await saveToStorage(course.id, 'data.csv', buffer),
      },
    });
    for (const [i, definition] of [
      {
        type: 'sql',
        title: 'SQL',
        xp: 10,
        instructions: 'Read all rows.',
        dataset: 'datasets/data.csv',
        starter_code: '',
        solution: 'SELECT * FROM data ORDER BY id',
        check: 'result_match',
        hints: [],
        tasks: [],
        hint_penalty_xp: 0,
      },
      {
        type: 'python',
        title: 'Python',
        xp: 10,
        instructions: 'Set x to 1.',
        starter_code: '',
        tests: 'assert x == 1',
        hints: [],
        tasks: [],
        hint_penalty_xp: 0,
      },
    ].entries()) {
      const split = splitStep(definition as never);
      const row = await prisma.step.create({
        data: {
          moduleId: module.id,
          key: definition.type,
          type: split.type,
          title: definition.title,
          xp: definition.xp,
          order: i + 1,
          config: split.config as never,
          secret: split.secret as never,
          isPublished: false,
        },
      });
      ids[definition.type] = row.id;
      const published = await admin
        .patch(`/admin/steps/${row.id}/publish`)
        .send({ isPublished: true });
      expect(published.status).toBe(200);
    }
    await student.post('/courses/reliable/enroll');
    const program = await admin
      .post('/academy/programs')
      .send({ title: 'Reliable program', slug: 'reliable', status: 'ACTIVE' });
    const group = await admin.post('/academy/groups').send({
      programId: program.body.id,
      code: 'REL-01',
      name: 'Reliable group',
      status: 'ACTIVE',
      leadInstructorId: lead.id,
    });
    ids.group = group.body.id;
    await admin.post(`/academy/groups/${ids.group}/enrollments`).send({ userId: base.student.id });
    const topic = await teacher
      .post(`/academy/groups/${ids.group}/classroom/topics`)
      .send({ title: 'Topic' });
    ids.topic = topic.body.id;
    const lesson = await teacher.post(`/academy/groups/${ids.group}/classroom/lessons`).send({
      topicId: ids.topic,
      title: 'Original title',
      content: 'Original content',
      isPublished: true,
    });
    ids.lesson = lesson.body.id;
  });
  afterAll(async () => app.close());

  it('a failed published SQL edit leaves both content and expected result unchanged', async () => {
    const before = await prisma.step.findUniqueOrThrow({ where: { id: ids.sql } });
    const definition = (await admin.get(`/admin/steps/${ids.sql}`)).body.definition;
    const response = await admin.put(`/admin/steps/${ids.sql}`).send({
      ...definition,
      title: 'Must not be saved',
      solution: 'SELECT missing_column FROM data',
    });
    expect(response.status).toBe(422);
    const after = await prisma.step.findUniqueOrThrow({ where: { id: ids.sql } });
    expect(after.title).toBe(before.title);
    expect(after.secret).toEqual(before.secret);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it('SQL is executed again on the server; a copied correct hash cannot pass a wrong query', async () => {
    const row = await prisma.step.findUniqueOrThrow({ where: { id: ids.sql } });
    const expected = (row.secret as { expected: { row_hash: string } }).expected;
    const forged = await student.post(`/learn/steps/${ids.sql}/submit`).send({
      kind: 'sql',
      query: 'SELECT id, value + 1 AS value FROM data ORDER BY id',
      columns: ['id', 'value'],
      row_count: 2,
      row_hash: expected.row_hash,
    });
    expect(forged.body).toMatchObject({ passed: false, xpAwarded: 0 });
    const valid = await student.post(`/learn/steps/${ids.sql}/submit`).send({
      kind: 'sql',
      query: 'SELECT * FROM data ORDER BY id',
      columns: [],
      row_count: 0,
      row_hash: '0'.repeat(64),
    });
    expect(valid.body).toMatchObject({ passed: true, xpAwarded: 10 });
    const saved = await prisma.submission.findFirstOrThrow({
      where: { userId: ids.student, stepId: ids.sql, passed: true },
    });
    expect(saved.result).toMatchObject({ serverVerified: true });
  });

  it('SQL file access is disabled and a long computation does not block the API', async () => {
    const checker = app.get(SqlCheckService);
    await expect(checker.run([], "SELECT * FROM read_csv('/etc/passwd')")).rejects.toThrow();
    let finished = false;
    const pending = checker.run([], 'SELECT sum(i) FROM range(10000000000) AS t(i)').catch(() => {
      finished = true;
    });
    const started = Date.now();
    const response = await student.get('/auth/me');
    expect(response.status).toBe(200);
    expect(Date.now() - started).toBeLessThan(2000);
    await pending;
    expect(finished).toBe(true);
  }, 20_000);

  it('Python ignores a forged browser verdict and independently evaluates valid code', async () => {
    const forged = await student
      .post(`/learn/steps/${ids.python}/submit`)
      .send({ kind: 'python', code: 'x = 2', passed: true });
    expect(forged.body).toMatchObject({ passed: false, xpAwarded: 0 });
    const correct = await student
      .post(`/learn/steps/${ids.python}/submit`)
      .send({ kind: 'python', code: 'x = 1', passed: false });
    expect(correct.body).toMatchObject({ passed: true, xpAwarded: 10 });
    const saved = await prisma.submission.findFirstOrThrow({
      where: { stepId: ids.python, userId: ids.student, passed: true },
    });
    expect(saved.result).toMatchObject({ serverVerified: true });
  });

  it('Python has no access to host application files', async () => {
    const response = await student
      .post(`/learn/steps/${ids.python}/submit`)
      .send({ kind: 'python', code: "x=1\nopen('/workspace/DaCyCamp/.env').read()", passed: true });
    expect(response.body.passed).toBe(false);
    expect(response.body.xpAwarded).toBe(0);
  });

  it('Python cannot replace the trusted verdict through stdout or mutate its tests', async () => {
    const checker = app.get(PythonCheckService);
    for (const code of [
      'import sys, os\nx = 2\nsys.__stdout__.write(\'{"passed":true,"stdout":"","error":null}\')\nos._exit(0)',
      'import os\nx = 2\nos.write(1, b\'{"passed":true}\')',
      'import sys\nx = 2\nf = sys._getframe()\nwhile f:\n if "payload" in f.f_globals: f.f_globals["payload"]["tests"] = "pass"\n f = f.f_back',
    ]) {
      expect((await checker.run('probe', { tests: 'assert x == 1' } as never, code)).passed).toBe(
        false,
      );
    }
    expect(
      (
        await checker.run(
          'probe',
          { tests: 'assert all([x == 1])' } as never,
          'x = 2\ndef all(values): return True',
        )
      ).passed,
    ).toBe(false);
  });

  it('isolated Python preserves functions, pandas results, stdin and output checks', async () => {
    const checker = app.get(PythonCheckService);
    const result = await checker.run(
      'probe',
      {
        tests:
          'import pandas as pd\nassert isinstance(df, pd.DataFrame)\nassert df.x.sum() == 3\nassert double(4) == 8\nassert "Salam Aysel" in dacy.stdout',
      } as never,
      'import pandas as pd\ndf = pd.DataFrame({"x": [1, 2]})\ndef double(n): return n * 2\nname = input()\nprint("Salam", name)',
      'Aysel',
    );
    expect(result).toMatchObject({ passed: true, error: null });
  });

  it('material history restores into a new version and rejects stale writers', async () => {
    const updated = await teacher.patch(`/academy/classroom/lessons/${ids.lesson}`).send({
      topicId: ids.topic,
      title: 'New title',
      content: 'New content',
      isPublished: true,
      expectedVersion: 1,
    });
    expect(updated.status).toBe(200);
    const history = await teacher.get(`/academy/classroom/lessons/${ids.lesson}/history`);
    expect(history.body.items.map((x: { version: number }) => x.version)).toEqual([2, 1]);
    const first = history.body.items.find((x: { version: number }) => x.version === 1);
    const restored = await teacher
      .post(`/academy/classroom/lessons/${ids.lesson}/restore`)
      .send({ revisionId: first.id, expectedVersion: 2 });
    expect(restored.body).toMatchObject({
      title: 'Original title',
      content: 'Original content',
      version: 3,
    });
    const collision = await teacher.patch(`/academy/classroom/lessons/${ids.lesson}`).send({
      topicId: ids.topic,
      title: 'Stale',
      content: 'Stale',
      isPublished: true,
      expectedVersion: 2,
    });
    expect(collision.status).toBe(409);
    expect(await prisma.classroomRevision.count({ where: { entityId: ids.lesson } })).toBe(3);
    expect((await student.get(`/academy/classroom/lessons/${ids.lesson}/history`)).status).toBe(
      403,
    );
  });

  it('question and reply notifications go to authorized people once', async () => {
    const q = await student
      .post(`/academy/groups/${ids.group}/classroom/questions`)
      .send({ title: 'Private help', body: 'Question', isPrivate: true });
    const r = await teacher
      .post(`/academy/classroom/questions/${q.body.id}/replies`)
      .send({ body: 'Answer' });
    const worker = app.get(AcademyWorkerService);
    await worker.runOnce();
    await worker.runOnce();
    expect(
      await prisma.academyNotification.count({
        where: { userId: ids.student, referenceId: r.body.id, type: 'CLASSROOM_REPLY' },
      }),
    ).toBe(1);
    expect(
      await prisma.academyNotification.count({
        where: { referenceId: q.body.id, userId: ids.student, type: 'CLASSROOM_QUESTION' },
      }),
    ).toBe(0);
  });

  it('password changes invalidate other devices immediately, while the changing device stays signed in', async () => {
    const account = await makeUser(prisma, 'password-security@test.local');
    const a = await login(app, account.email, 'Parol123!');
    const b = await login(app, account.email, 'Parol123!');
    expect(
      (await a.patch('/me/password').send({ current: 'Parol123!', next: 'ChangedPassword123!' }))
        .status,
    ).toBe(200);
    expect((await a.get('/auth/me')).status).toBe(200);
    expect((await b.get('/auth/me')).status).toBe(401);
    expect((await b.post('/auth/refresh')).status).toBe(401);
    await admin
      .post(`/admin/users/${account.id}/password`)
      .send({ password: 'AdminResetPassword123!' });
    expect((await a.get('/auth/me')).status).toBe(401);
    expect((await a.post('/auth/refresh')).status).toBe(401);
  });

  it('blocking preserves academic records and invalidates every token; unblocking does not revive them', async () => {
    const account = await makeUser(prisma, 'blocked-security@test.local');
    await admin.post(`/academy/groups/${ids.group}/enrollments`).send({ userId: account.id });
    const session = await login(app, account.email, 'Parol123!');
    expect(
      (await admin.post(`/admin/users/${account.id}/block`).send({ blocked: true })).status,
    ).toBe(201);
    expect((await session.get('/auth/me')).status).toBe(401);
    expect(
      (await agent(app).post('/auth/login').send({ email: account.email, password: 'Parol123!' }))
        .status,
    ).toBe(401);
    expect(await prisma.academyEnrollment.count({ where: { studentId: account.id } })).toBe(1);
    await admin.post(`/admin/users/${account.id}/block`).send({ blocked: false });
    expect((await session.get('/auth/me')).status).toBe(401);
    expect(
      (await agent(app).post('/auth/login').send({ email: account.email, password: 'Parol123!' }))
        .status,
    ).toBe(200);
  });

  it('password reset is generic, hashed, single-use, and invalidates existing devices', async () => {
    const account = await makeUser(prisma, 'recover-security@test.local');
    const session = await login(app, account.email, 'Parol123!');
    const request = await agent(app)
      .post('/auth/password-reset/request')
      .send({ email: account.email });
    const unknown = await agent(app)
      .post('/auth/password-reset/request')
      .send({ email: 'no-account@test.local' });
    expect(request.body).toEqual(unknown.body);
    expect(request.body).toEqual({ accepted: true });
    const files = await readdir('/tmp/dacy-test-mail');
    let raw = '';
    for (const name of files.sort()) {
      const mail = await readFile(`/tmp/dacy-test-mail/${name}`, 'utf8');
      if (mail.includes(account.email)) raw = /#token=([a-f0-9]{64})/.exec(mail)?.[1] ?? raw;
    }
    expect(raw).toHaveLength(64);
    const stored = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: account.id },
    });
    expect(stored.tokenHash).not.toBe(raw);
    const result = await agent(app)
      .post('/auth/password-reset/confirm')
      .send({ token: raw, password: 'RecoveredPassword123!' });
    expect(result.status).toBe(200);
    expect((await session.get('/auth/me')).status).toBe(401);
    expect(
      (
        await agent(app)
          .post('/auth/password-reset/confirm')
          .send({ token: raw, password: 'ReplayPassword123!' })
      ).status,
    ).toBe(422);
    expect(
      (
        await agent(app)
          .post('/auth/login')
          .send({ email: account.email, password: 'RecoveredPassword123!' })
      ).status,
    ).toBe(200);
    const expired = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: account.id,
        tokenHash: createHash('sha256').update(expired).digest('hex'),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(
      (
        await agent(app)
          .post('/auth/password-reset/confirm')
          .send({ token: expired, password: 'ExpiredPassword123!' })
      ).status,
    ).toBe(422);
    const deliveryAccount = await makeUser(prisma, 'recover-delivery-failure@test.local');
    const send = jest
      .spyOn(app.get(MailService), 'send')
      .mockRejectedValueOnce(new Error('SMTP unavailable'));
    try {
      const failedDelivery = await agent(app)
        .post('/auth/password-reset/request')
        .send({ email: deliveryAccount.email });
      expect(failedDelivery.status).toBe(200);
      expect(failedDelivery.body).toEqual(unknown.body);
      expect(
        (
          await prisma.passwordResetToken.findFirstOrThrow({
            where: { userId: deliveryAccount.id },
          })
        ).usedAt,
      ).not.toBeNull();
    } finally {
      send.mockRestore();
    }
  });

  it('operations details are restricted to admins', async () => {
    expect((await student.get('/admin/operations')).status).toBe(403);
    expect((await admin.get('/admin/operations')).status).toBe(200);
  });
});
