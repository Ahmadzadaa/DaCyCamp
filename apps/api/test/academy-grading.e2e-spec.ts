import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();
const key = (n: string) => `acar-${n}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Akademiya — Mərhələ 4: qiymətləndirmə. Element / rubrika balları, gecikmə cəriməsi, versiya toqquşması,
 * tarixçə, açıqlama (yalnız aparıcı), qaytarma, avtomatik qaralama, köhnəlmiş qiymət, jurnal. XP dəyişmir.
 */
describe('Academy grading (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let lead: Agent;
  let assistant: Agent;
  let otherLead: Agent;
  let ali: Agent;
  let aysel: Agent;
  let veli: Agent;
  const ids: Record<string, string> = {};
  const items: Record<string, string> = {};

  const submitProj = (who: Agent, text: string) =>
    who.post(`/academy/me/assignments/${ids.proj}/attempts`).send({
      idempotencyKey: key('p'),
      answers: [
        { itemId: items.text, text },
        { itemId: items.code, code: 'SELECT 1' },
      ],
    });
  const subId = async (assignmentId: string, studentId: string) =>
    (await prisma.academySubmission.findFirstOrThrow({ where: { assignmentId, studentId } })).id;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const users = {
      lead: await makeUser(prisma, 'ziyad@test.local'),
      assistant: await makeUser(prisma, 'komekci@test.local'),
      otherLead: await makeUser(prisma, 'diger@test.local'),
      ali: await makeUser(prisma, 'ali@test.local'),
      aysel: await makeUser(prisma, 'aysel@test.local'),
      veli: await makeUser(prisma, 'veli@test.local'),
    };
    for (const [k, u] of Object.entries(users)) ids[k] = u.id;
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'sql-esaslari',
        title: 'SQL əsasları',
        order: 1,
        isPublished: true,
      },
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, key: 'select', title: 'SELECT', order: 1, isPublished: true },
    });
    const mk = (k: string, order: number, type: 'SQL' | 'QUIZ') =>
      prisma.step.create({
        data: {
          moduleId: mod.id,
          key: k,
          type,
          title: `Addım ${k}`,
          order,
          isPublished: true,
          xp: 20,
        },
      });
    ids.stepSql = (await mk('where', 1, 'SQL')).id;
    ids.stepQuiz = (await mk('test', 2, 'QUIZ')).id;

    admin = await login(app, 'admin@test.local', 'Admin123!');
    const de = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
    const g1 = await admin.post('/academy/groups').send({
      programId: de.body.id,
      code: 'DE-001',
      name: 'DE-001',
      status: 'ACTIVE',
      leadInstructorId: ids.lead,
      assistantInstructorIds: [ids.assistant],
    });
    const g2 = await admin
      .post('/academy/groups')
      .send({
        programId: de.body.id,
        code: 'DE-002',
        name: 'DE-002',
        status: 'ACTIVE',
        leadInstructorId: ids.otherLead,
      });
    ids.de1 = g1.body.id;
    ids.de2 = g2.body.id;
    for (const s of ['ali', 'aysel'])
      await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids[s] });
    await admin.post(`/academy/groups/${ids.de2}/enrollments`).send({ userId: ids.veli });

    const p = (e: string) => login(app, e, 'Parol123!');
    lead = await p('ziyad@test.local');
    assistant = await p('komekci@test.local');
    otherLead = await p('diger@test.local');
    ali = await p('ali@test.local');
    aysel = await p('aysel@test.local');
    veli = await p('veli@test.local');

    const create = async (who: Agent, groupId: string, body: Record<string, unknown>) => {
      const r = await who
        .post(`/academy/groups/${groupId}/assignments`)
        .send({ availableAt: iso(-1), dueAt: iso(48), ...body });
      expect(r.status).toBe(201);
      return r.body as { id: string; items: Array<{ id: string }> };
    };
    const proj = await create(lead, ids.de1, {
      title: 'Hesabat',
      type: 'CUSTOM_TASK',
      gradingType: 'MANUAL',
      latePolicy: 'ACCEPT_WITH_PENALTY',
      latePenaltyPercent: 20,
      items: [
        { kind: 'TEXT', title: 'Mətn', maxScore: 30 },
        { kind: 'CODE', title: 'Kod', maxScore: 20 },
      ],
    });
    ids.proj = proj.id;
    [items.text, items.code] = proj.items.map((i) => i.id);
    const auto = await create(lead, ids.de1, {
      title: 'SQL avtomatik',
      type: 'EXISTING_CHALLENGE',
      gradingType: 'AUTOMATIC',
      items: [
        { kind: 'LEARNING_STEP', stepId: ids.stepSql, maxScore: 60 },
        { kind: 'LEARNING_STEP', stepId: ids.stepQuiz, maxScore: 40 },
      ],
    });
    ids.auto = auto.id;
    [items.sql, items.quiz] = auto.items.map((i) => i.id);
    const rub = await create(lead, ids.de1, {
      title: 'Esse (rubrika)',
      type: 'CUSTOM_TASK',
      gradingType: 'MANUAL',
      items: [{ kind: 'TEXT', title: 'Esse', maxScore: 100 }],
    });
    ids.rub = rub.id;
    items.essay = rub.items[0]!.id;
    const rr = await lead.put(`/academy/assignments/${ids.rub}/rubric`).send({
      title: 'Esse rubrikası',
      criteria: [
        { title: 'Məzmun', maxScore: 40 },
        { title: 'Struktur', maxScore: 60 },
      ],
    });
    expect(rr.status).toBe(200);
    [ids.critA, ids.critB] = rr.body.rubric.criteria.map((c: { id: string }) => c.id);
    const other = await create(otherLead, ids.de2, {
      title: 'DE-002 tapşırığı',
      type: 'CUSTOM_TASK',
      items: [{ kind: 'TEXT', title: 'Mətn', maxScore: 10 }],
    });
    ids.other = other.id;
    items.otherText = other.items[0]!.id;
    for (const [who, id] of [
      [lead, ids.proj],
      [lead, ids.auto],
      [lead, ids.rub],
      [otherLead, ids.other],
    ] as const)
      expect(
        (await who.post(`/academy/assignments/${id}/publish`).send({ mode: 'now' })).status,
      ).toBe(200);
  });
  afterAll(async () => app.close());

  it('göndəriş siyahısı: qrupun bütün tələbələri (göndərməyənlər də); yalnız bu qrupun heyəti', async () => {
    const r = await lead.get(`/academy/assignments/${ids.proj}/submissions`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
    expect(
      r.body.every(
        (s: { id: string | null; status: string }) => s.id === null && s.status === 'NOT_STARTED',
      ),
    ).toBe(true);
    expect((await assistant.get(`/academy/assignments/${ids.proj}/submissions`)).status).toBe(200);
    expect((await otherLead.get(`/academy/assignments/${ids.proj}/submissions`)).status).toBe(403);
    expect((await ali.get(`/academy/assignments/${ids.proj}/submissions`)).status).toBe(403);

    expect((await submitProj(ali, 'Alinin hesabatı')).status).toBe(201);
    const after = (await lead.get(`/academy/assignments/${ids.proj}/submissions`)).body;
    const aliRow = after.find((s: { student: { id: string } }) => s.student.id === ids.ali);
    expect(aliRow).toMatchObject({
      status: 'SUBMITTED',
      attemptCount: 1,
      needsReview: true,
      grade: null,
    });
    ids.aliProj = aliRow.id;
    const det = await lead.get(`/academy/submissions/${ids.aliProj}`);
    expect(det.status).toBe(200);
    expect(det.body.attempts).toHaveLength(1);
    expect(det.body.permissions).toEqual(expect.arrayContaining(['grade.write', 'grade.release']));
    expect(
      (await assistant.get(`/academy/submissions/${ids.aliProj}`)).body.permissions,
    ).not.toContain('grade.release');
    expect((await otherLead.get(`/academy/submissions/${ids.aliProj}`)).status).toBe(403);
    expect((await aysel.get(`/academy/submissions/${ids.aliProj}`)).status).toBe(403);
  });

  it('qiymət yoxlamaları: maksimumdan böyük, çatışmayan / yad element, rubrikasız rubrika balı, icazəsiz', async () => {
    const put = (who: Agent, body: object) =>
      who.put(`/academy/submissions/${ids.aliProj}/grade`).send(body);
    const big = await put(assistant, {
      itemScores: [
        { itemId: items.text, score: 31 },
        { itemId: items.code, score: 10 },
      ],
    });
    expect([big.status, big.body.code]).toEqual([422, 'ACADEMY_SCORE_OUT_OF_RANGE']);
    const missing = await put(assistant, { itemScores: [{ itemId: items.text, score: 10 }] });
    expect([missing.status, missing.body.code]).toEqual([422, 'ACADEMY_SCORE_REQUIRED']);
    expect(missing.body.details.itemIds).toEqual([items.code]);
    const foreign = await put(assistant, { itemScores: [{ itemId: items.otherText, score: 1 }] });
    expect([foreign.status, foreign.body.code]).toEqual([422, 'ACADEMY_ITEM_MISMATCH']);
    const rubric = await put(assistant, {
      itemScores: [
        { itemId: items.text, score: 1 },
        { itemId: items.code, score: 1 },
      ],
      rubricScores: [{ criterionId: ids.critA, score: 1 }],
    });
    expect([rubric.status, rubric.body.code]).toEqual([422, 'ACADEMY_RUBRIC_NOT_SET']);
    const negative = await put(assistant, {
      itemScores: [
        { itemId: items.text, score: -1 },
        { itemId: items.code, score: 1 },
      ],
    });
    expect(negative.status).toBe(400);
    const sel = await put(assistant, {
      itemScores: [
        { itemId: items.text, score: 1 },
        { itemId: items.code, score: 1 },
      ],
      selectedAttemptId: 'basqa-cehd',
    });
    expect([sel.status, sel.body.code]).toEqual([422, 'ACADEMY_SELECTION_NOT_ALLOWED']);
    expect((await put(ali, { itemScores: [] })).status).toBe(403);
    expect((await put(otherLead, { itemScores: [] })).status).toBe(403);
    expect(await prisma.academyGrade.count()).toBe(0);
  });

  it('köməkçi qaralama qiymət yazır (tələbə görmür); açıqlamaq yalnız aparıcıya; açıqlanandan sonra tələbə görür, XP dəyişmir', async () => {
    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: ids.ali } })).xpTotal;
    const xpEvents = await prisma.xpEvent.count({ where: { userId: ids.ali } });
    const g = await assistant.put(`/academy/submissions/${ids.aliProj}/grade`).send({
      itemScores: [
        { itemId: items.text, score: 25.5, comment: 'Yaxşı' },
        { itemId: items.code, score: 18 },
      ],
      feedback: 'Əla iş, kodu sadələşdirin',
      expectedVersion: 0,
    });
    expect(g.status).toBe(200);
    expect(g.body).toMatchObject({
      status: 'DRAFT',
      rawScore: 43.5,
      latePenalty: 0,
      finalScore: 43.5,
      maxScore: 50,
      version: 1,
      stale: false,
    });
    expect(g.body.gradedBy.id).toBe(ids.assistant);
    // tələbə qaralamanı görmür
    expect((await ali.get(`/academy/me/assignments/${ids.proj}`)).body).toMatchObject({
      grade: null,
      status: 'UNDER_REVIEW',
      finalScore: null,
    });
    expect((await ali.get('/academy/me/grades')).body).toEqual([]);

    expect(
      (await assistant.post(`/academy/submissions/${ids.aliProj}/grade/release`).send({})).status,
    ).toBe(403);
    const stale = await lead
      .post(`/academy/submissions/${ids.aliProj}/grade/release`)
      .send({ expectedVersion: 0 });
    expect([stale.status, stale.body.code]).toEqual([409, 'ACADEMY_VERSION_CONFLICT']);
    const rel = await lead
      .post(`/academy/submissions/${ids.aliProj}/grade/release`)
      .send({ expectedVersion: 1 });
    expect(rel.status).toBe(200);
    expect(rel.body).toMatchObject({ status: 'RELEASED', version: 2, finalScore: 43.5 });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'GRADE_RELEASED' } })).toBe(1);

    const mine = await ali.get(`/academy/me/assignments/${ids.proj}`);
    expect(mine.body).toMatchObject({ status: 'GRADED', finalScore: 43.5, canSubmit: false });
    expect(mine.body.grade).toMatchObject({
      status: 'RELEASED',
      finalScore: 43.5,
      feedback: 'Əla iş, kodu sadələşdirin',
    });
    expect(mine.body.grade.itemScores).toEqual([
      { itemId: items.text, score: 25.5, comment: 'Yaxşı' },
      { itemId: items.code, score: 18, comment: null },
    ]);
    expect((await ali.get('/academy/me/grades')).body).toEqual([
      expect.objectContaining({
        assignmentId: ids.proj,
        finalScore: 43.5,
        maxScore: 50,
        groupCode: 'DE-001',
      }),
    ]);
    // akademik bal XP-dən ayrıdır
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.ali } })).xpTotal).toBe(
      xpBefore,
    );
    expect(await prisma.xpEvent.count({ where: { userId: ids.ali } })).toBe(xpEvents);
    expect(await prisma.auditLog.count({ where: { action: 'academy.grade.release' } })).toBe(1);
  });

  it('açıqlanmış qiyməti dəyişmək: köməkçi yox, aparıcı yalnız səbəblə; tarixçə və audit əvvəl / sonra saxlayır', async () => {
    const body = {
      itemScores: [
        { itemId: items.text, score: 28 },
        { itemId: items.code, score: 18 },
      ],
      expectedVersion: 2,
    };
    expect(
      (
        await assistant
          .put(`/academy/submissions/${ids.aliProj}/grade`)
          .send({ ...body, reason: 'x' })
      ).status,
    ).toBe(403);
    const noReason = await lead.put(`/academy/submissions/${ids.aliProj}/grade`).send(body);
    expect([noReason.status, noReason.body.code]).toEqual([422, 'ACADEMY_REASON_REQUIRED']);
    const ok = await lead
      .put(`/academy/submissions/${ids.aliProj}/grade`)
      .send({ ...body, reason: 'Apellyasiya: mətn yenidən yoxlanıldı' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: 'RELEASED', finalScore: 46, version: 3 });
    // eyni versiya ilə ikinci müəllim — toqquşma
    const conflictRes = await lead
      .put(`/academy/submissions/${ids.aliProj}/grade`)
      .send({ ...body, reason: 'təkrar' });
    expect([conflictRes.status, conflictRes.body.code]).toEqual([409, 'ACADEMY_VERSION_CONFLICT']);
    expect((await ali.get(`/academy/me/assignments/${ids.proj}`)).body.finalScore).toBe(46);

    const det = await lead.get(`/academy/submissions/${ids.aliProj}`);
    expect(
      det.body.history.map((h: { newStatus: string; newScore: number }) => [
        h.newStatus,
        h.newScore,
      ]),
    ).toEqual([
      ['RELEASED', 46],
      ['RELEASED', 43.5],
      ['DRAFT', 43.5],
    ]);
    expect(det.body.history[0]).toMatchObject({
      previousScore: 43.5,
      reason: 'Apellyasiya: mətn yenidən yoxlanıldı',
    });
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'academy.grade.change' },
    });
    expect(log.details).toMatchObject({
      before: { finalScore: 43.5, status: 'RELEASED' },
      after: { finalScore: 46, status: 'RELEASED' },
    });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'GRADE_RELEASED' } })).toBe(2);
  });

  it('gecikmə cəriməsi: xam bal × faiz, yarım yuxarı yuvarlaq sentlərlə; yekun = xam − cərimə', async () => {
    await prisma.academyAssignment.update({
      where: { id: ids.proj },
      data: { dueAt: new Date(Date.now() - 3_600_000) },
    });
    const late = await submitProj(aysel, 'Gecikmiş hesabat');
    expect(late.body).toMatchObject({ isLate: true, status: 'SUBMITTED_LATE' });
    await prisma.academyAssignment.update({
      where: { id: ids.proj },
      data: { dueAt: new Date(Date.now() + 48 * 3_600_000) },
    });
    ids.ayselProj = await subId(ids.proj, ids.aysel);
    const g = await lead.put(`/academy/submissions/${ids.ayselProj}/grade`).send({
      itemScores: [
        { itemId: items.text, score: 20.33 },
        { itemId: items.code, score: 13 },
      ],
    });
    expect(g.status).toBe(200);
    // 33.33 × 20 % = 6.666 → 6.67; 33.33 − 6.67 = 26.66
    expect(g.body).toMatchObject({ rawScore: 33.33, latePenalty: 6.67, finalScore: 26.66 });
  });

  it('qaytarma: tələbə rəyi görür (bal yox), düzəliş cəhdi edir; yenidən qiymətləndirmə ən son cəhdi seçir', async () => {
    expect(
      (
        await assistant
          .post(`/academy/submissions/${ids.ayselProj}/grade/return`)
          .send({ feedback: 'Düzəlt' })
      ).status,
    ).toBe(403);
    const ret = await lead
      .post(`/academy/submissions/${ids.ayselProj}/grade/return`)
      .send({ feedback: 'Kod hissəsini tamamlayın', expectedVersion: 1 });
    expect(ret.status).toBe(200);
    expect(ret.body).toMatchObject({ status: 'RETURNED', version: 2 });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'SUBMISSION_RETURNED' } })).toBe(
      1,
    );
    const mine = await aysel.get(`/academy/me/assignments/${ids.proj}`);
    expect(mine.body).toMatchObject({ status: 'RETURNED', canSubmit: true, finalScore: null });
    expect(mine.body.grade).toMatchObject({
      status: 'RETURNED',
      feedback: 'Kod hissəsini tamamlayın',
      finalScore: 0,
      itemScores: [],
    });
    expect((await aysel.get('/academy/me/grades')).body).toEqual([]);

    const again = await submitProj(aysel, 'Düzəldilmiş hesabat');
    expect(again.status).toBe(201);
    expect(again.body).toMatchObject({ attemptNumber: 2, status: 'SUBMITTED', isLate: false });
    const row = (await lead.get(`/academy/assignments/${ids.proj}/submissions`)).body.find(
      (s: { student: { id: string } }) => s.student.id === ids.aysel,
    );
    expect(row).toMatchObject({ needsReview: true, attemptCount: 2 });
    const re = await lead.put(`/academy/submissions/${ids.ayselProj}/grade`).send({
      itemScores: [
        { itemId: items.text, score: 30 },
        { itemId: items.code, score: 20 },
      ],
      expectedVersion: 2,
    });
    expect(re.body).toMatchObject({
      status: 'DRAFT',
      rawScore: 50,
      latePenalty: 0,
      finalScore: 50,
      stale: false,
    });
    const attempt2 = await prisma.academySubmissionAttempt.findFirstOrThrow({
      where: { submissionId: ids.ayselProj, attemptNumber: 2 },
    });
    expect(re.body.selectedAttemptId).toBe(attempt2.id);
  });

  it('avtomatik qiymətləndirmə: hər cəhddən sonra qaralama (tələbə görmür), açıqlama müəllimdə', async () => {
    expect(
      (
        await ali
          .post(`/academy/me/assignments/${ids.auto}/attempts`)
          .send({ idempotencyKey: key('a1') })
      ).status,
    ).toBe(201);
    ids.aliAuto = await subId(ids.auto, ids.ali);
    let g = await prisma.academyGrade.findUniqueOrThrow({ where: { submissionId: ids.aliAuto } });
    expect(g).toMatchObject({ status: 'DRAFT', finalScoreCenti: 0, gradedById: null, version: 1 });
    await prisma.submission.create({
      data: { userId: ids.ali, stepId: ids.stepSql, type: 'SQL', payload: {}, passed: true },
    });
    await prisma.submission.create({
      data: {
        userId: ids.ali,
        stepId: ids.stepQuiz,
        type: 'QUIZ',
        payload: {},
        passed: true,
        score: 75,
      },
    });
    expect(
      (
        await ali
          .post(`/academy/me/assignments/${ids.auto}/attempts`)
          .send({ idempotencyKey: key('a2') })
      ).status,
    ).toBe(201);
    g = await prisma.academyGrade.findUniqueOrThrow({ where: { submissionId: ids.aliAuto } });
    expect(g).toMatchObject({ status: 'DRAFT', finalScoreCenti: 9000, version: 2 });
    expect((await ali.get(`/academy/me/assignments/${ids.auto}`)).body.grade).toBeNull();
    const list = (await lead.get(`/academy/assignments/${ids.auto}/submissions`)).body;
    expect(list.find((s: { student: { id: string } }) => s.student.id === ids.ali)).toMatchObject({
      needsReview: true,
      grade: { status: 'DRAFT', finalScore: 90 },
    });
    const det = (await lead.get(`/academy/submissions/${ids.aliAuto}`)).body;
    expect(det.history.map((h: { reason: string }) => h.reason)).toEqual([
      'Avtomatik qiymətləndirmə',
      'Avtomatik qiymətləndirmə',
    ]);
    expect(det.grade.itemScores).toEqual([
      { itemId: items.sql, score: 60, comment: null },
      { itemId: items.quiz, score: 30, comment: null },
    ]);
    // Ayselin heç bir həlli yoxdur → 0, qaralama
    expect(
      (
        await aysel
          .post(`/academy/me/assignments/${ids.auto}/attempts`)
          .send({ idempotencyKey: key('a3') })
      ).status,
    ).toBe(201);
  });

  it('rubrika: bütün meyarlar tələb olunur, xam bal = rubrika cəmi; qiymətdən sonra rubrika kilidlənir; yeni cəhd → köhnəlmiş', async () => {
    const send = (text: string) =>
      ali
        .post(`/academy/me/assignments/${ids.rub}/attempts`)
        .send({ idempotencyKey: key('r'), answers: [{ itemId: items.essay, text }] });
    expect((await send('Esse v1')).status).toBe(201);
    ids.aliRub = await subId(ids.rub, ids.ali);
    const put = (body: object) => lead.put(`/academy/submissions/${ids.aliRub}/grade`).send(body);
    const none = await put({ itemScores: [] });
    expect([none.status, none.body.code]).toEqual([422, 'ACADEMY_RUBRIC_REQUIRED']);
    const partial = await put({ rubricScores: [{ criterionId: ids.critA, score: 30 }] });
    expect([partial.status, partial.body.code]).toEqual([422, 'ACADEMY_SCORE_REQUIRED']);
    const over = await put({
      rubricScores: [
        { criterionId: ids.critA, score: 41 },
        { criterionId: ids.critB, score: 1 },
      ],
    });
    expect([over.status, over.body.code]).toEqual([422, 'ACADEMY_SCORE_OUT_OF_RANGE']);
    const ok = await put({
      rubricScores: [
        { criterionId: ids.critA, score: 35 },
        { criterionId: ids.critB, score: 50.5 },
      ],
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ rawScore: 85.5, finalScore: 85.5, status: 'DRAFT' });
    expect(ok.body.rubricScores).toHaveLength(2);
    const lock = await lead
      .put(`/academy/assignments/${ids.rub}/rubric`)
      .send({ title: 'Yeni', criteria: [{ title: 'Hamısı', maxScore: 100 }] });
    expect([lock.status, lock.body.code]).toEqual([409, 'ACADEMY_RUBRIC_LOCKED']);

    expect((await send('Esse v2')).status).toBe(201);
    const det = (await lead.get(`/academy/submissions/${ids.aliRub}`)).body;
    expect(det.grade.stale).toBe(true);
    const row = (await lead.get(`/academy/assignments/${ids.rub}/submissions`)).body.find(
      (s: { student: { id: string } }) => s.student.id === ids.ali,
    );
    expect(row.needsReview).toBe(true);
    const blocked = await lead.post(`/academy/submissions/${ids.aliRub}/grade/release`).send({});
    expect([blocked.status, blocked.body.code]).toEqual([409, 'ACADEMY_GRADE_STALE']);
    const regrade = await put({
      rubricScores: [
        { criterionId: ids.critA, score: 38 },
        { criterionId: ids.critB, score: 52 },
      ],
    });
    expect(regrade.body).toMatchObject({ rawScore: 90, stale: false });
    expect(
      (await lead.post(`/academy/submissions/${ids.aliRub}/grade/release`).send({})).status,
    ).toBe(200);
  });

  it('toplu açıqlama: hazır qaralamalar açıqlanır, qalanlar səbəblə keçilir; köməkçi edə bilmir', async () => {
    expect(
      (await assistant.post(`/academy/assignments/${ids.auto}/grades/release`).send({})).status,
    ).toBe(403);
    const r = await lead.post(`/academy/assignments/${ids.auto}/grades/release`).send({});
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ released: 2, skipped: [] });
    expect((await ali.get(`/academy/me/assignments/${ids.auto}`)).body).toMatchObject({
      status: 'GRADED',
      finalScore: 90,
    });
    const pr = await lead.post(`/academy/assignments/${ids.proj}/grades/release`).send({});
    expect(pr.body.released).toBe(1); // Ayselin yenidən yazılmış qaralaması
  });

  it('jurnal: yalnız açıqlanmış qiymətlər ortalamaya daxildir; CSV ixracı düstur inyeksiyasından qorunur', async () => {
    await prisma.user.update({ where: { id: ids.aysel }, data: { name: '=2+3' } });
    const gb = await lead.get(`/academy/groups/${ids.de1}/gradebook`);
    expect(gb.status).toBe(200);
    expect(gb.body.assignments.map((a: { id: string }) => a.id)).toEqual(
      expect.arrayContaining([ids.proj, ids.auto, ids.rub]),
    );
    const aliRow = gb.body.rows.find((r: { student: { id: string } }) => r.student.id === ids.ali);
    // (46 + 90 + 90) / (50 + 100 + 100) = 90.4 %
    expect(aliRow.average).toBe(90.4);
    const ayselRow = gb.body.rows.find(
      (r: { student: { id: string } }) => r.student.id === ids.aysel,
    );
    const rubCell = ayselRow.cells.find(
      (c: { assignmentId: string }) => c.assignmentId === ids.rub,
    );
    expect(rubCell).toMatchObject({ gradeStatus: null, finalScore: null });
    // Aysel: proj 50/50 + auto 0/100 → 33.3 %
    expect(ayselRow.average).toBe(33.3);
    expect((await assistant.get(`/academy/groups/${ids.de1}/gradebook`)).status).toBe(200);
    expect((await otherLead.get(`/academy/groups/${ids.de1}/gradebook`)).status).toBe(403);
    expect((await ali.get(`/academy/groups/${ids.de1}/gradebook`)).status).toBe(403);

    const csv = await lead.get(`/academy/groups/${ids.de1}/gradebook/export`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/^text\/csv/);
    expect(csv.headers['content-disposition']).toContain('DE-001-jurnal.csv');
    expect(csv.text.charCodeAt(0)).toBe(0xfeff);
    expect(csv.text).toContain("'=2+3");
    expect(csv.text).not.toMatch(/(^|,)=2\+3/m);
  });

  it('bazada qorunma: bal elementin / tapşırığın maksimumundan böyük ola bilməz', async () => {
    const g = await prisma.academyGrade.findUniqueOrThrow({ where: { submissionId: ids.aliProj } });
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "AcademyGradeItem" SET "scoreCenti" = 999999 WHERE "gradeId" = '${g.id}'`,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "AcademyGrade" SET "rawScoreCenti" = 999999, "finalScoreCenti" = 999999 WHERE id = '${g.id}'`,
      ),
    ).rejects.toThrow();
  });

  it('ləğv olunmuş tapşırıq qiymətləndirilmir', async () => {
    expect(
      (
        await veli
          .post(`/academy/me/assignments/${ids.other}/attempts`)
          .send({ idempotencyKey: key('v'), answers: [{ itemId: items.otherText, text: 'x' }] })
      ).status,
    ).toBe(201);
    expect(
      (await otherLead.post(`/academy/assignments/${ids.other}/cancel`).send({ reason: 'test' }))
        .status,
    ).toBe(200);
    const s = await subId(ids.other, ids.veli);
    const r = await otherLead
      .put(`/academy/submissions/${s}/grade`)
      .send({ itemScores: [{ itemId: items.otherText, score: 5 }] });
    expect([r.status, r.body.code]).toEqual([409, 'ACADEMY_ASSIGNMENT_READ_ONLY']);
  });
});
