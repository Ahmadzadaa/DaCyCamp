import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { AcademyAssignmentsService } from '../src/academy/assignments/assignments.service';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();

/**
 * Akademiya — Mərhələ 2: tapşırıq mühərriki. Mövcud platforma tapşırığına istinad (kopya yox), versiyalı redaktə,
 * dərc / planlaşdırma, son tarix və fərdi uzadılma, tələbə görünüşü, mövcud redaktorda açmaq.
 */
describe('Academy assignments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let lead: Agent;
  let assistant: Agent;
  let csLead: Agent;
  let ali: Agent;
  let aysel: Agent;
  let csStudent: Agent;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const users = {
      lead: await makeUser(prisma, 'ziyad@test.local'),
      assistant: await makeUser(prisma, 'komekci@test.local'),
      csLead: await makeUser(prisma, 'cslead@test.local'),
      ali: await makeUser(prisma, 'ali@test.local'),
      aysel: await makeUser(prisma, 'aysel@test.local'),
      csStudent: await makeUser(prisma, 'cs@test.local'),
      outsider: await makeUser(prisma, 'kenar@test.local'),
    };
    for (const [k, u] of Object.entries(users)) ids[k] = u.id;
    // ardıcıl (sequential) kurs: 2-ci və 3-cü addım kilidlidir
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'sql-esaslari',
        title: 'SQL əsasları',
        order: 1,
        isPublished: true,
        sequential: true,
      },
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, key: 'select', title: 'SELECT', order: 1, isPublished: true },
    });
    const mk = (key: string, order: number, type: 'THEORY' | 'SQL' | 'QUIZ', isPublished = true) =>
      prisma.step.create({
        data: { moduleId: mod.id, key, type, title: `Addım ${key}`, order, isPublished, xp: 20 },
      });
    ids.course = course.id;
    ids.stepTheory = (await mk('giris', 1, 'THEORY')).id;
    ids.stepSql = (await mk('where', 2, 'SQL')).id;
    ids.stepQuiz = (await mk('test', 3, 'QUIZ')).id;
    ids.stepHidden = (await mk('gizli', 4, 'SQL', false)).id;

    admin = await login(app, 'admin@test.local', 'Admin123!');
    const de = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
    const cs = await admin
      .post('/academy/programs')
      .send({ title: 'Cyber Security', slug: 'cs', status: 'ACTIVE' });
    const g1 = await admin.post('/academy/groups').send({
      programId: de.body.id,
      code: 'DE-001',
      name: 'DE-001',
      status: 'ACTIVE',
      leadInstructorId: ids.lead,
      assistantInstructorIds: [ids.assistant],
    });
    const g2 = await admin.post('/academy/groups').send({
      programId: de.body.id,
      code: 'DE-002',
      name: 'DE-002',
      status: 'ACTIVE',
      leadInstructorId: ids.lead,
    });
    const g3 = await admin.post('/academy/groups').send({
      programId: cs.body.id,
      code: 'CS-001',
      name: 'CS-001',
      status: 'ACTIVE',
      leadInstructorId: ids.csLead,
    });
    ids.de1 = g1.body.id;
    ids.de2 = g2.body.id;
    ids.cs1 = g3.body.id;
    for (const s of ['ali', 'aysel'])
      await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids[s] });
    await admin.post(`/academy/groups/${ids.de2}/enrollments`).send({ userId: ids.aysel });
    await admin.post(`/academy/groups/${ids.cs1}/enrollments`).send({ userId: ids.csStudent });

    const p = (e: string) => login(app, e, 'Parol123!');
    lead = await p('ziyad@test.local');
    assistant = await p('komekci@test.local');
    csLead = await p('cslead@test.local');
    ali = await p('ali@test.local');
    aysel = await p('aysel@test.local');
    csStudent = await p('cs@test.local');
  });
  afterAll(async () => app.close());

  const homework = (over: Record<string, unknown> = {}) => ({
    title: 'SQL ev tapşırığı #1',
    description: 'SELECT və WHERE',
    type: 'EXISTING_CHALLENGE',
    availableAt: iso(-1),
    dueAt: iso(72),
    gradingType: 'HYBRID',
    items: [
      { kind: 'LEARNING_STEP', stepId: ids.stepSql, maxScore: 60 },
      { kind: 'LEARNING_STEP', stepId: ids.stepQuiz, maxScore: 25.5 },
      { kind: 'TEXT', title: 'Qısa izah', maxScore: 14.5 },
    ],
    ...over,
  });

  it('mövcud tapşırıqların axtarışı: müəllim görür, tələbə yox; dərc olunmamış addım siyahıda deyil', async () => {
    const r = await lead.get('/academy/steps/search?q=Addım');
    expect(r.status).toBe(200);
    const found = r.body.map((s: { stepId: string }) => s.stepId);
    expect(found).toEqual(expect.arrayContaining([ids.stepTheory, ids.stepSql, ids.stepQuiz]));
    expect(found).not.toContain(ids.stepHidden);
    expect(r.body.find((s: { stepId: string }) => s.stepId === ids.stepSql)).toMatchObject({
      type: 'SQL',
      courseSlug: 'sql-esaslari',
      trust: 'SERVER_VERIFIED',
      available: true,
    });
    expect((await ali.get('/academy/steps/search?q=SQL')).status).toBe(403);
    expect(
      (await lead.get('/academy/steps/search?type=QUIZ')).body.map((s: { type: string }) => s.type),
    ).toEqual(['QUIZ']);
  });

  it('müəllim çox elementli tapşırıq yaradır: maksimum bal = elementlərin cəmi, qaralama tələbəyə görünmür', async () => {
    const r = await lead.post(`/academy/groups/${ids.de1}/assignments`).send(homework());
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      status: 'DRAFT',
      maxScore: 100,
      maxAttempts: 3,
      latePolicy: 'REJECT',
      version: 1,
    });
    expect(r.body.items.map((i: { maxScore: number }) => i.maxScore)).toEqual([60, 25.5, 14.5]);
    expect(r.body.items[0].step).toMatchObject({ stepId: ids.stepSql, title: 'Addım where' });
    ids.hw = r.body.id;
    // istinad, kopya deyil: platformada yeni addım yaranmayıb
    expect(await prisma.step.count()).toBe(4);
    expect((await ali.get('/academy/me/assignments')).body).toEqual([]);
    expect((await ali.get(`/academy/me/assignments/${ids.hw}`)).status).toBe(403);
  });

  it('yoxlamalar: avtomatik qiymətləndirmə yalnız platforma tapşırıqları ilə, gizli / mövcud olmayan addım, tarix sırası', async () => {
    const auto = await lead
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ gradingType: 'AUTOMATIC' }));
    expect(auto.status).toBe(422);
    expect(auto.body.code).toBe('ACADEMY_AUTO_GRADING_UNSUPPORTED');
    const hidden = await lead
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ items: [{ kind: 'LEARNING_STEP', stepId: ids.stepHidden, maxScore: 10 }] }));
    expect(hidden.status).toBe(422);
    expect(hidden.body.code).toBe('ACADEMY_STEP_UNAVAILABLE');
    const missing = await lead
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ items: [{ kind: 'LEARNING_STEP', stepId: 'yoxdur', maxScore: 10 }] }));
    expect(missing.status).toBe(404);
    const dates = await lead
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ availableAt: iso(10), dueAt: iso(5) }));
    expect(dates.status).toBe(400);
    // başqa qrupun müəllimi bu qrupda yarada bilməz; tələbə heç yerdə
    expect(
      (await csLead.post(`/academy/groups/${ids.de1}/assignments`).send(homework())).status,
    ).toBe(403);
    expect((await ali.post(`/academy/groups/${ids.de1}/assignments`).send(homework())).status).toBe(
      403,
    );
  });

  it('köməkçi qaralama yaradır, amma dərc edə bilmir; aparıcı dərc edir (outbox + versiya 1)', async () => {
    const d = await assistant
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ title: 'Köməkçinin qaralaması' }));
    expect(d.status).toBe(201);
    ids.draft2 = d.body.id;
    expect(
      (await assistant.post(`/academy/assignments/${ids.draft2}/publish`).send({})).status,
    ).toBe(403);

    const p = await lead.post(`/academy/assignments/${ids.hw}/publish`).send({ mode: 'now' });
    expect(p.status).toBe(200);
    expect(p.body).toMatchObject({ status: 'PUBLISHED', version: 1 });
    expect(p.body.publishedAt).toBeTruthy();
    expect(
      await prisma.academyOutboxEvent.count({
        where: {
          type: 'ASSIGNMENT_PUBLISHED',
          payload: { path: ['assignmentId'], equals: ids.hw },
        },
      }),
    ).toBe(1);
    expect(
      (await lead.get(`/academy/assignments/${ids.hw}/revisions`)).body.map(
        (r: { version: number }) => r.version,
      ),
    ).toEqual([1]);
    expect((await lead.post(`/academy/assignments/${ids.hw}/publish`).send({})).status).toBe(409);
  });

  it('tələbə dərc olunmuş tapşırığı və son tarixi görür; başqa qrupun tələbəsi və müəllimi görmür', async () => {
    const list = await ali.get('/academy/me/assignments');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      id: ids.hw,
      groupCode: 'DE-001',
      status: 'NOT_STARTED',
      canSubmit: true,
      attemptsUsed: 0,
      maxAttempts: 3,
      extended: false,
      finalScore: null,
    });
    const det = await ali.get(`/academy/me/assignments/${ids.hw}`);
    expect(det.status).toBe(200);
    expect(det.body.items).toHaveLength(3);
    expect(det.body.itemProgress[0]).toMatchObject({
      evidence: { passed: false, trust: 'SERVER_CHECKED' },
    });
    expect(det.body.itemProgress[0].openUrl).toBe('/kurs/sql-esaslari/select/where');
    expect(det.body.grade).toBeNull();
    expect(new Date(det.body.serverTime).getTime()).toBeGreaterThan(0);
    // üfüqi: başqa qrup
    expect((await csStudent.get(`/academy/me/assignments/${ids.hw}`)).status).toBe(403);
    expect((await csLead.get(`/academy/assignments/${ids.hw}`)).status).toBe(403);
    expect((await csLead.get(`/academy/groups/${ids.de1}/assignments`)).status).toBe(403);
    // tələbə heyət detalına baxa bilməz (rubrika, qaralama və s.)
    expect((await ali.get(`/academy/assignments/${ids.hw}`)).status).toBe(403);
  });

  it('dərc olunmuş tapşırığın redaktəsi: versiya +1, dəyişikliklər və səbəb tarixçədə, köməkçi son tarixi dəyişə bilməz', async () => {
    const before = await prisma.academyAssignment.findUniqueOrThrow({ where: { id: ids.hw } });
    expect(
      (await assistant.patch(`/academy/assignments/${ids.hw}`).send({ dueAt: iso(96) })).status,
    ).toBe(403);
    const conflictV = await lead
      .patch(`/academy/assignments/${ids.hw}`)
      .send({ dueAt: iso(96), expectedVersion: 7 });
    expect(conflictV.status).toBe(409);
    expect(conflictV.body.code).toBe('ACADEMY_VERSION_CONFLICT');
    const r = await lead
      .patch(`/academy/assignments/${ids.hw}`)
      .send({ dueAt: iso(96), reason: 'Bayram', expectedVersion: before.version });
    expect(r.status).toBe(200);
    expect(r.body.version).toBe(2);
    const revs = (await lead.get(`/academy/assignments/${ids.hw}/revisions`)).body;
    expect(revs[1]).toMatchObject({ version: 2, changes: ['dueAt'], reason: 'Bayram' });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'ASSIGNMENT_UPDATED' } })).toBe(
      1,
    );
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'academy.assignment.deadline' },
    });
    expect(audit?.details).toMatchObject({ changes: ['dueAt'] });
    // eyni dəyər — versiya artmır
    const same = await lead.patch(`/academy/assignments/${ids.hw}`).send({ title: r.body.title });
    expect(same.body.version).toBe(2);
  });

  it('fərdi uzadılma yalnız seçilmiş tələbənin son tarixini dəyişir', async () => {
    const hw = await prisma.academyAssignment.findUniqueOrThrow({ where: { id: ids.hw } });
    const ext = new Date(hw.dueAt.getTime() + 48 * 3_600_000).toISOString();
    expect(
      (
        await assistant
          .post(`/academy/assignments/${ids.hw}/extensions`)
          .send({ studentId: ids.ali, extendedDueAt: ext, reason: 'xəstəlik' })
      ).status,
    ).toBe(403);
    const bad = await lead
      .post(`/academy/assignments/${ids.hw}/extensions`)
      .send({ studentId: ids.ali, extendedDueAt: hw.dueAt.toISOString(), reason: 'x' });
    expect(bad.status).toBe(400);
    const notEnrolled = await lead
      .post(`/academy/assignments/${ids.hw}/extensions`)
      .send({ studentId: ids.csStudent, extendedDueAt: ext, reason: 'x' });
    expect(notEnrolled.status).toBe(409);
    const r = await lead
      .post(`/academy/assignments/${ids.hw}/extensions`)
      .send({ studentId: ids.ali, extendedDueAt: ext, reason: 'xəstəlik' });
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({
      reason: 'xəstəlik',
      student: { id: ids.ali },
      approvedBy: { id: ids.lead },
    });
    const a = (await ali.get('/academy/me/assignments')).body[0];
    const y = (await aysel.get('/academy/me/assignments')).body.find(
      (x: { id: string }) => x.id === ids.hw,
    );
    expect(a).toMatchObject({ extended: true, effectiveDueAt: ext });
    expect(y).toMatchObject({ extended: false, effectiveDueAt: hw.dueAt.toISOString() });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'DEADLINE_EXTENDED' } })).toBe(1);
  });

  it('tələbə platforma tapşırığını mövcud redaktorda açır: kursa yazılır və kilidli addım açılır', async () => {
    const det = await ali.get(`/academy/me/assignments/${ids.hw}`);
    const sqlItem = det.body.items.find(
      (i: { step: { stepId: string } | null }) => i.step?.stepId === ids.stepSql,
    );
    // əvvəlcə: kursa yazılmayıb → mövcud öyrənmə endpoint-i bağlıdır
    expect((await ali.get('/learn/courses/sql-esaslari/steps/select/where')).status).toBe(403);
    const r = await ali.post(`/academy/me/assignments/${ids.hw}/items/${sqlItem.id}/open`);
    expect(r.status).toBe(200);
    expect(r.body.url).toBe('/kurs/sql-esaslari/select/where');
    expect(
      await prisma.enrollment.count({ where: { userId: ids.ali, courseId: ids.course } }),
    ).toBe(1);
    expect(await prisma.stepUnlock.count({ where: { userId: ids.ali, stepId: ids.stepSql } })).toBe(
      1,
    );
    // indi mövcud mühərrik addımı göstərir (kilid yoxdur)
    const view = await ali.get('/learn/courses/sql-esaslari/steps/select/where');
    expect(view.status).toBe(200);
    // mətn elementi açılmır; başqa tapşırığın elementi — 404
    const textItem = det.body.items.find((i: { kind: string }) => i.kind === 'TEXT');
    expect(
      (await ali.post(`/academy/me/assignments/${ids.hw}/items/${textItem.id}/open`)).status,
    ).toBe(404);
    // kənar tələbə bu tapşırığın elementini aça bilməz
    expect(
      (await csStudent.post(`/academy/me/assignments/${ids.hw}/items/${sqlItem.id}/open`)).status,
    ).toBe(403);
  });

  it('paylaşılan tapşırıq: eyni platforma addımı iki qrupda — bir kanonik addım, müstəqil son tarixlər', async () => {
    const r = await lead.post(`/academy/groups/${ids.de2}/assignments`).send(
      homework({
        title: 'DE-002 SQL',
        dueAt: iso(200),
        items: [{ kind: 'LEARNING_STEP', stepId: ids.stepSql, maxScore: 100 }],
      }),
    );
    expect(r.status).toBe(201);
    await lead.post(`/academy/assignments/${r.body.id}/publish`).send({});
    ids.hw2 = r.body.id;
    expect(
      await prisma.academyAssignmentItem.count({ where: { stepId: ids.stepSql } }),
    ).toBeGreaterThanOrEqual(2);
    expect(await prisma.step.count({ where: { id: ids.stepSql } })).toBe(1);
    const list = (await aysel.get('/academy/me/assignments')).body;
    const byGroup = Object.fromEntries(
      list.map((x: { groupCode: string; dueAt: string }) => [x.groupCode, x.dueAt]),
    );
    expect(Object.keys(byGroup).sort()).toEqual(['DE-001', 'DE-002']);
    expect(byGroup['DE-001']).not.toBe(byGroup['DE-002']);
  });

  it('planlaşdırılmış dərc: açılışa qədər tələbəyə görünmür, açılış anında avtomatik dərc olunur', async () => {
    const r = await lead
      .post(`/academy/groups/${ids.de1}/assignments`)
      .send(homework({ title: 'Planlı', availableAt: iso(5), dueAt: iso(50) }));
    const p = await lead
      .post(`/academy/assignments/${r.body.id}/publish`)
      .send({ mode: 'scheduled' });
    expect(p.body.status).toBe('SCHEDULED');
    expect(
      (await ali.get('/academy/me/assignments')).body.map((x: { id: string }) => x.id),
    ).not.toContain(r.body.id);
    const svc = app.get(AcademyAssignmentsService);
    expect(await svc.publishScheduled(new Date())).toBe(0);
    expect(await svc.publishScheduled(new Date(Date.now() + 6 * 3_600_000))).toBe(1);
    const after = await prisma.academyAssignment.findUniqueOrThrow({ where: { id: r.body.id } });
    expect(after.status).toBe('PUBLISHED');
    const mine = (await ali.get('/academy/me/assignments')).body.find(
      (x: { id: string }) => x.id === r.body.id,
    );
    expect(mine.status).toBe('NOT_OPEN');
    ids.scheduled = r.body.id;
  });

  it('qaralama silinir, dərc olunmuş silinmir (ləğv olunur, qeydlər qalır)', async () => {
    expect((await lead.delete(`/academy/assignments/${ids.hw}`)).status).toBe(409);
    expect((await lead.delete(`/academy/assignments/${ids.draft2}`)).status).toBe(200);
    expect(await prisma.academyAssignment.count({ where: { id: ids.draft2 } })).toBe(0);
    const c = await lead
      .post(`/academy/assignments/${ids.scheduled}/cancel`)
      .send({ reason: 'Səhv' });
    expect(c.body.status).toBe('CANCELLED');
    expect(
      (await lead.patch(`/academy/assignments/${ids.scheduled}`).send({ title: 'x' })).status,
    ).toBe(409);
    expect(
      (await ali.get('/academy/me/assignments')).body.map((x: { id: string }) => x.id),
    ).not.toContain(ids.scheduled);
  });

  it('rubrika: meyarların cəmi tapşırığın maksimumuna bərabər olmalıdır', async () => {
    const bad = await lead.put(`/academy/assignments/${ids.hw}/rubric`).send({
      title: 'Meyarlar',
      criteria: [
        { title: 'Doğruluq', maxScore: 50 },
        { title: 'Səliqə', maxScore: 20 },
      ],
    });
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe('ACADEMY_RUBRIC_MISMATCH');
    const ok = await lead.put(`/academy/assignments/${ids.hw}/rubric`).send({
      title: 'Meyarlar',
      criteria: [
        { title: 'Doğruluq', maxScore: 70 },
        { title: 'Səliqə', maxScore: 30 },
      ],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.rubric.criteria.map((c: { maxScore: number }) => c.maxScore)).toEqual([70, 30]);
  });

  it('mənbə addım gizlədiləndə element «əlçatan deyil» göstərilir, belə qaralama dərc olunmur', async () => {
    const d = await lead.post(`/academy/groups/${ids.de1}/assignments`).send(
      homework({
        title: 'Nəzəri',
        items: [{ kind: 'LEARNING_STEP', stepId: ids.stepTheory, maxScore: 10 }],
      }),
    );
    await prisma.step.update({ where: { id: ids.stepTheory }, data: { isPublished: false } });
    const g = await lead.get(`/academy/assignments/${d.body.id}`);
    expect(g.body.items[0].step).toMatchObject({ available: false, title: 'Addım giris' });
    const p = await lead.post(`/academy/assignments/${d.body.id}/publish`).send({});
    expect(p.status).toBe(422);
    expect(p.body.code).toBe('ACADEMY_STEP_UNAVAILABLE');
    await prisma.step.update({ where: { id: ids.stepTheory }, data: { isPublished: true } });
  });

  it('admin istənilən qrupda tapşırığı görür və idarə edir', async () => {
    expect((await admin.get(`/academy/groups/${ids.cs1}/assignments`)).status).toBe(200);
    expect((await admin.get(`/academy/assignments/${ids.hw}`)).status).toBe(200);
    const list = (await lead.get(`/academy/groups/${ids.de1}/assignments`)).body;
    const hw = list.find((x: { id: string }) => x.id === ids.hw);
    expect(hw).toMatchObject({
      itemCount: 3,
      submittedCount: 0,
      expectedCount: 2,
      pendingReview: 0,
    });
  });
});
