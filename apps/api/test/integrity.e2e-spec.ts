import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { canonicalizeResult, sha256Hex, splitStep } from '@dacy/shared';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';
import type { PrismaService } from '../src/prisma/prisma.service';
import { saveToStorage, sha256 } from '../src/assets/storage';

type Agent = ReturnType<typeof agent>;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();

/**
 * SEC-04 — qiymətləndirmənin etibarlılığı. Python nəticəsini brauzer (Pyodide) bildirir, server yoxlaya bilmir:
 * saxta «passed» sorğusu addımı tamamlayır (bu, sənədləşdirilmiş məhdudiyyətdir), amma rəsmi nəticələr —
 * sertifikat və akademiya qiyməti — ona avtomatik əsaslanmır. SQL: server nəticənin hash-ini müqayisə edir;
 * sorğunun özünü yoxlamır (cavab paylaşımı mümkündür) — bu da testlə sənədləşdirilir.
 */
describe('Assessment integrity (SEC-04)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let ins: Agent;
  let st: Agent;
  let st2: Agent;
  const ids: Record<string, string> = {};
  let courseOrder = 0;

  const makeCourse = async (
    trackId: string,
    slug: string,
    defs: Array<{ key: string; def: Parameters<typeof splitStep>[0] }>,
  ) => {
    const course = await prisma.course.create({
      data: {
        trackId,
        slug,
        title: slug,
        order: ++courseOrder,
        isPublished: true,
        sequential: false,
      },
    });
    const m = await prisma.module.create({
      data: { courseId: course.id, key: 'f', title: 'F', order: 1, isPublished: true },
    });
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
      ids[`${slug}:${d.key}`] = row.id;
    }
    return course;
  };

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    await makeUser(prisma, 'ikinci@test.local');
    await makeCourse(b.track.id, 'py-kurs', [
      {
        key: 'py',
        def: {
          type: 'python',
          title: 'Python tapşırığı',
          xp: 40,
          instructions: 'x',
          starter_code: '',
          tests: 'assert x == 1',
          hints: [],
          tasks: [],
          hint_penalty_xp: 10,
        },
      },
    ]);
    await makeCourse(b.track.id, 'nezeri-kurs', [
      { key: 'th', def: { type: 'theory', title: 'Nəzəri', xp: 10, content: '# Salam' } },
    ]);
    const sqlCourse = await makeCourse(b.track.id, 'sql-kurs', [
      {
        key: 'sql',
        def: {
          type: 'sql',
          title: 'S',
          xp: 50,
          instructions: 'x',
          dataset: 'datasets/n.csv',
          starter_code: '',
          solution: 'SELECT ad FROM n ORDER BY ad',
          check: 'result_match',
          hints: [],
          tasks: [],
          hint_penalty_xp: 10,
        },
      },
    ]);
    const buf = Buffer.from('ad\nB\nA\n');
    await prisma.asset.create({
      data: {
        courseId: sqlCourse.id,
        path: 'datasets/n.csv',
        kind: 'DATASET',
        filename: 'n.csv',
        mime: 'text/csv',
        sizeBytes: buf.length,
        sha256: sha256(buf),
        storageKey: await saveToStorage(sqlCourse.id, 'n.csv', buf),
      },
    });
    admin = await login(app, 'admin@test.local', 'Admin123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    st = await login(app, 'telebe@test.local', 'Telebe123!');
    st2 = await login(app, 'ikinci@test.local', 'Parol123!');
    for (const s of ['py-kurs', 'nezeri-kurs', 'sql-kurs']) {
      await st.post(`/courses/${s}/enroll`);
      await st2.post(`/courses/${s}/enroll`);
    }
  });
  afterAll(() => app.close());

  it('Python: saxta «passed» XP vermir; həll serverdə keçəndən sonra sertifikat müəllim təsdiqi gözləyir', async () => {
    // brauzerdə heç nə işləmədən göndərilmiş «keçdi» — server bunu ayırd edə bilmir (sənədləşdirilmiş hədd)
    const forged = await st
      .post(`/learn/steps/${ids['py-kurs:py']}/submit`)
      .send({ kind: 'python', code: 'print("heç nə")', passed: true });
    expect(forged.status).toBe(200);
    expect(forged.body).toMatchObject({
      passed: false,
      xpAwarded: 0,
    });
    expect(
      await prisma.certificate.count({ where: { userId: (await st.get('/auth/me')).body.id } }),
    ).toBe(0);
    const verified = await st
      .post(`/learn/steps/${ids['py-kurs:py']}/submit`)
      .send({ kind: 'python', code: 'x = 1', passed: false });
    expect(verified.body).toMatchObject({ passed: true, xpAwarded: 40, certificatePending: true });
    ids.pyCert = verified.body.certificateId;
    // təkrar saxta sorğular XP-ni artırmır (dedupe: addım üzrə bir dəfə)
    for (let i = 0; i < 3; i++) {
      const again = await st
        .post(`/learn/steps/${ids['py-kurs:py']}/submit`)
        .send({ kind: 'python', code: 'x = 1', passed: true });
      expect(again.body.xpAwarded).toBe(0);
    }
    expect((await st.get('/auth/me')).body.xpTotal).toBe(40);
    expect(await prisma.xpEvent.count({ where: { stepId: ids['py-kurs:py'] } })).toBe(1);
  });

  it('təsdiq gözləyən sertifikat: ictimai səhifə statusu göstərir, PDF yoxdur, sayğaclara düşmür', async () => {
    const pub = await agent(app).get(`/certificates/${ids.pyCert}`);
    expect(pub.status).toBe(200);
    expect(pub.body).toMatchObject({ reviewStatus: 'PENDING', revokedAt: null });
    const pdf = await agent(app).get(`/certificates/${ids.pyCert}.pdf`);
    expect(pdf.status).toBe(409);
    expect(pdf.body.code).toBe('CERT_PENDING_REVIEW');
    const mine = await st.get('/me/certificates');
    expect(mine.body).toEqual([
      expect.objectContaining({ id: ids.pyCert, reviewStatus: 'PENDING' }),
    ]);
    expect((await st.get('/me/dashboard')).body.certificates).toBe(0);
    const notif = (await st.get('/me/notifications')).body as Array<{ id: string; title: string }>;
    expect(notif.find((n) => n.id.startsWith(`cert:${ids.pyCert}`))?.title).toBe(
      'Sertifikat təsdiq gözləyir',
    );
  });

  it('təsdiq: yalnız admin; sübut — tələbənin keçən kodu; təsdiqdən sonra etibarlı və PDF var', async () => {
    for (const who of [st, ins]) {
      expect((await who.get('/admin/certificates/pending')).status).toBe(403);
      expect((await who.get(`/admin/certificates/${ids.pyCert}/evidence`)).status).toBe(403);
      expect((await who.post(`/admin/certificates/${ids.pyCert}/approve`)).status).toBe(403);
    }
    const list = await admin.get('/admin/certificates/pending');
    expect(list.body).toEqual([
      expect.objectContaining({
        id: ids.pyCert,
        kind: 'course',
        pythonSteps: 1,
        student: expect.objectContaining({ email: 'telebe@test.local' }),
      }),
    ]);
    const ev = await admin.get(`/admin/certificates/${ids.pyCert}/evidence`);
    expect(ev.body.items).toEqual([
      expect.objectContaining({ stepTitle: 'Python tapşırığı', code: 'x = 1' }),
    ]);
    expect((await admin.get('/me/summary')).body.pendingCertificates).toBe(1);

    const ok = await admin.post(`/admin/certificates/${ids.pyCert}/approve`);
    expect(ok.status).toBe(200);
    expect(ok.body.reviewStatus).toBe('APPROVED');
    const row = await prisma.certificate.findUniqueOrThrow({ where: { id: ids.pyCert } });
    expect(row.reviewedAt).toBeTruthy();
    expect(row.reviewedById).toBeTruthy();
    expect((await admin.post(`/admin/certificates/${ids.pyCert}/approve`)).body.code).toBe(
      'CERT_NOT_PENDING',
    );
    expect((await agent(app).get(`/certificates/${ids.pyCert}.pdf`)).status).toBe(200);
    expect((await st.get('/me/dashboard')).body.certificates).toBe(1);
    expect((await admin.get('/admin/certificates/pending')).body).toEqual([]);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'certificate.approve' } });
    expect(audit?.entityId).toBe(ids.pyCert);
  });

  it('Python addımı olmayan kursun sertifikatı dərhal etibarlıdır', async () => {
    const r = await st.post(`/learn/steps/${ids['nezeri-kurs:th']}/complete`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ courseCompleted: true, certificatePending: false });
    const pub = await agent(app).get(`/certificates/${r.body.certificateId}`);
    expect(pub.body.reviewStatus).toBe('APPROVED');
    expect((await agent(app).get(`/certificates/${r.body.certificateId}.pdf`)).status).toBe(200);
  });

  it('SQL: gözlənilən hash tələbəyə göstərilmir; server sorğunu yox, nəticəni yoxlayır (cavab paylaşımı mümkündür)', async () => {
    await ins.patch(`/admin/steps/${ids['sql-kurs:sql']}/publish`).send({ isPublished: true });
    const step = await prisma.step.findUniqueOrThrow({ where: { id: ids['sql-kurs:sql'] } });
    const expected = (step.secret as { expected: { row_hash: string } }).expected;
    // tələbənin aldığı addım görünüşündə gözlənilən hash və həll yoxdur
    const view = await st.get('/learn/courses/sql-kurs/steps/f/sql');
    expect(view.status).toBe(200);
    expect(JSON.stringify(view.body)).not.toContain(expected.row_hash);
    expect(JSON.stringify(view.body)).not.toContain('SELECT ad FROM n ORDER BY ad');

    // birinci tələbə həll edir
    const row_hash = await sha256Hex(
      canonicalizeResult({ columns: ['ad'], rows: [['A'], ['B']] }, 'result_match'),
    );
    expect(row_hash).toBe(expected.row_hash);
    const solved = await st.post(`/learn/steps/${ids['sql-kurs:sql']}/submit`).send({
      kind: 'sql',
      query: 'SELECT ad FROM n ORDER BY ad',
      row_hash,
      row_count: 2,
      columns: ['ad'],
    });
    expect(solved.body.passed).toBe(true);
    // ikinci tələbə eyni nəticəni sorğusuz göndərir — keçir: server sorğunun müəllifliyini yoxlamır
    const replay = await st2
      .post(`/learn/steps/${ids['sql-kurs:sql']}/submit`)
      .send({ kind: 'sql', query: '-- kopyalanıb', row_hash, row_count: 2, columns: ['ad'] });
    expect(replay.body.passed).toBe(false);
    // amma düzgün nəticəni bilmədən təxmin işləmir
    const guess = await st2
      .post(`/learn/steps/${ids['sql-kurs:sql']}/submit`)
      .send({ kind: 'sql', query: 'x', row_hash: 'f'.repeat(64), row_count: 2, columns: ['ad'] });
    expect(guess.status).toBe(422);
    expect(guess.body.code).toBe('SQL_EXECUTION_FAILED');
  });

  describe('akademiya: Python ballı avtomatik qaralama toplu açıqlanmır', () => {
    let lead: Agent;
    let ali: Agent;

    beforeAll(async () => {
      const leadUser = await makeUser(prisma, 'aparici@test.local');
      const aliUser = await makeUser(prisma, 'ali@test.local');
      ids.ali = aliUser.id;
      const prog = await admin
        .post('/academy/programs')
        .send({ title: 'Python', slug: 'py-prog', status: 'ACTIVE' });
      const g = await admin.post('/academy/groups').send({
        programId: prog.body.id,
        code: 'PY-001',
        name: 'PY-001',
        status: 'ACTIVE',
        leadInstructorId: leadUser.id,
      });
      ids.group = g.body.id;
      await admin.post(`/academy/groups/${ids.group}/enrollments`).send({ userId: aliUser.id });
      lead = await login(app, 'aparici@test.local', 'Parol123!');
      ali = await login(app, 'ali@test.local', 'Parol123!');
      const a = await lead.post(`/academy/groups/${ids.group}/assignments`).send({
        title: 'Python avtomatik',
        type: 'EXISTING_CHALLENGE',
        gradingType: 'AUTOMATIC',
        availableAt: iso(-1),
        dueAt: iso(48),
        items: [{ kind: 'LEARNING_STEP', stepId: ids['py-kurs:py'], maxScore: 100 }],
      });
      expect(a.status).toBe(201);
      ids.assignment = a.body.id;
      expect(
        (await lead.post(`/academy/assignments/${ids.assignment}/publish`).send({ mode: 'now' }))
          .status,
      ).toBe(200);
    });

    it('saxta Python nəticəsi qaralamaya düşür, toplu açıqlama onu keçir; müəllim ayrıca açıqlaya bilər', async () => {
      // tələbə brauzerdə heç nə işlətmədən «keçdi» bildirir (birbaşa yazılmış öyrənmə göndərişi)
      await prisma.submission.create({
        data: {
          userId: ids.ali,
          stepId: ids['py-kurs:py'],
          type: 'PYTHON',
          payload: { code: 'pass' },
          passed: true,
        },
      });
      const att = await ali
        .post(`/academy/me/assignments/${ids.assignment}/attempts`)
        .send({ idempotencyKey: `acar-${Date.now()}` });
      expect(att.status).toBe(201);
      const sub = await prisma.academySubmission.findFirstOrThrow({
        where: { assignmentId: ids.assignment, studentId: ids.ali },
      });
      const g = await prisma.academyGrade.findUniqueOrThrow({ where: { submissionId: sub.id } });
      expect(g).toMatchObject({ status: 'DRAFT', finalScoreCenti: 10000, gradedById: null });

      const bulk = await lead
        .post(`/academy/assignments/${ids.assignment}/grades/release`)
        .send({});
      expect(bulk.status).toBe(200);
      expect(bulk.body).toEqual({
        released: 0,
        skipped: [{ submissionId: sub.id, reason: 'ACADEMY_GRADE_NEEDS_REVIEW' }],
      });
      expect((await ali.get(`/academy/me/assignments/${ids.assignment}`)).body.grade).toBeNull();
      // müəllim tələbənin işini açıb qəsdən açıqlayır — bu, insan təsdiqidir
      const one = await lead.post(`/academy/submissions/${sub.id}/grade/release`).send({});
      expect(one.status).toBe(200);
      expect((await ali.get(`/academy/me/assignments/${ids.assignment}`)).body).toMatchObject({
        status: 'GRADED',
        finalScore: 100,
      });
    });
  });
});
