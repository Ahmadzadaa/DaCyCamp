import type { INestApplication } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import type { PrismaService } from '../src/prisma/prisma.service';
import { AcademyFilesService } from '../src/academy/files/files.service';
import { storagePath } from '../src/assets/storage';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();
const key = (n: string) => `acar-${n}-${Math.random().toString(36).slice(2, 10)}`;
const pdf = () => Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
const exists = (k: string) =>
  stat(storagePath(k)).then(
    () => true,
    () => false,
  );

/**
 * Akademiya — Mərhələ 3: göndərişlər. Dəyişməz cəhdlər, idempotency, son tarix və cəhd limiti (server vaxtı),
 * platforma nəticəsinin server tərəfindən seçilməsi, fayl yükləmə (yoxlama, icazəli endirmə, təmizləmə).
 */
describe('Academy submissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let lead: Agent;
  let assistant: Agent;
  let otherLead: Agent;
  let ali: Agent;
  let aysel: Agent;
  let veli: Agent;
  let paused: Agent;
  let outsider: Agent;
  const ids: Record<string, string> = {};
  const items: Record<string, string> = {};

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
      paused: await makeUser(prisma, 'pauza@test.local'),
      outsider: await makeUser(prisma, 'kenar@test.local'),
    };
    for (const [k, u] of Object.entries(users)) ids[k] = u.id;
    const course = await prisma.course.create({
      data: { trackId: b.track.id, slug: 'sql-esaslari', title: 'SQL əsasları', order: 1, isPublished: true },
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, key: 'select', title: 'SELECT', order: 1, isPublished: true },
    });
    const mk = (k: string, order: number, type: 'SQL' | 'QUIZ') =>
      prisma.step.create({ data: { moduleId: mod.id, key: k, type, title: `Addım ${k}`, order, isPublished: true, xp: 20 } });
    ids.stepSql = (await mk('where', 1, 'SQL')).id;
    ids.stepQuiz = (await mk('test', 2, 'QUIZ')).id;

    admin = await login(app, 'admin@test.local', 'Admin123!');
    const de = await admin.post('/academy/programs').send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
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
      .send({ programId: de.body.id, code: 'DE-002', name: 'DE-002', status: 'ACTIVE', leadInstructorId: ids.otherLead });
    ids.de1 = g1.body.id;
    ids.de2 = g2.body.id;
    for (const s of ['ali', 'aysel', 'paused']) await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids[s] });
    await admin.post(`/academy/groups/${ids.de2}/enrollments`).send({ userId: ids.veli });

    const p = (e: string) => login(app, e, 'Parol123!');
    lead = await p('ziyad@test.local');
    assistant = await p('komekci@test.local');
    otherLead = await p('diger@test.local');
    ali = await p('ali@test.local');
    aysel = await p('aysel@test.local');
    veli = await p('veli@test.local');
    paused = await p('pauza@test.local');
    outsider = await p('kenar@test.local');

    // layihə: mətn + fayl + link + kod (əl ilə qiymətləndirmə, 2 cəhd, gecikmə qəbul edilmir)
    const proj = await lead.post(`/academy/groups/${ids.de1}/assignments`).send({
      title: 'ETL layihəsi',
      type: 'PROJECT',
      availableAt: iso(-1),
      dueAt: iso(48),
      gradingType: 'MANUAL',
      maxAttempts: 2,
      items: [
        { kind: 'TEXT', title: 'Hesabat', maxScore: 10 },
        { kind: 'FILE', title: 'Notebook', maxScore: 20 },
        { kind: 'LINK', title: 'Repo', maxScore: 10 },
        { kind: 'CODE', title: 'SQL', maxScore: 10 },
      ],
    });
    expect(proj.status).toBe(201);
    ids.proj = proj.body.id;
    [items.text, items.file, items.link, items.code] = proj.body.items.map((i: { id: string }) => i.id);
    // platforma tapşırığı: SQL + test (avtomatik, gecikmə 10 % cərimə ilə)
    const hw = await lead.post(`/academy/groups/${ids.de1}/assignments`).send({
      title: 'SQL ev tapşırığı',
      type: 'EXISTING_CHALLENGE',
      availableAt: iso(-1),
      dueAt: iso(48),
      gradingType: 'AUTOMATIC',
      latePolicy: 'ACCEPT_WITH_PENALTY',
      latePenaltyPercent: 10,
      items: [
        { kind: 'LEARNING_STEP', stepId: ids.stepSql, maxScore: 60 },
        { kind: 'LEARNING_STEP', stepId: ids.stepQuiz, maxScore: 40 },
      ],
    });
    expect(hw.status).toBe(201);
    ids.hw = hw.body.id;
    [items.sql, items.quiz] = hw.body.items.map((i: { id: string }) => i.id);
    // başqa qrupun fayl tapşırığı
    const other = await otherLead.post(`/academy/groups/${ids.de2}/assignments`).send({
      title: 'DE-002 faylı',
      type: 'FILE_BASED',
      availableAt: iso(-1),
      dueAt: iso(48),
      items: [{ kind: 'FILE', title: 'Fayl', maxScore: 10 }],
    });
    ids.other = other.body.id;
    items.otherFile = other.body.items[0].id;
    for (const [who, id] of [
      [lead, ids.proj],
      [lead, ids.hw],
      [otherLead, ids.other],
    ] as const)
      expect((await who.post(`/academy/assignments/${id}/publish`).send({ mode: 'now' })).status).toBe(200);
    await admin.patch(`/academy/enrollments/${(await prisma.academyEnrollment.findFirstOrThrow({ where: { studentId: ids.paused } })).id}`).send({ status: 'PAUSED' });
  });
  afterAll(async () => app.close());

  it('fayl yükləmə: icazəli növ və məzmun yoxlanılır, açar generasiya olunur, endirmə yalnız sahibinə', async () => {
    const up = await ali.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'hesabat ../../etc.pdf');
    expect(up.status).toBe(201);
    expect(up.body).toMatchObject({ mimeType: 'application/pdf', sizeBytes: pdf().length });
    ids.aliPdf = up.body.id;
    const row = await prisma.academyFile.findUniqueOrThrow({ where: { id: ids.aliPdf } });
    expect(row).toMatchObject({ status: 'STAGED', purpose: 'SUBMISSION', ownerId: ids.ali });
    expect(row.storageKey).toMatch(/^academy\/submissions\/[^/]+\/[0-9a-f-]{36}\.pdf$/);
    expect(row.storageKey).not.toContain('hesabat');
    expect(row.originalFilename).not.toContain('/');
    expect(await exists(row.storageKey)).toBe(true);

    const bad = async (buf: Buffer, name: string, code: string) => {
      const r = await ali.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', buf, name);
      expect([r.status, r.body.code]).toEqual([422, code]);
    };
    await bad(Buffer.from('MZ\x90\x00'), 'virus.exe', 'ACADEMY_FILE_TYPE');
    await bad(Buffer.from('<svg onload="alert(1)"/>'), 'sekil.svg', 'ACADEMY_FILE_TYPE');
    await bad(Buffer.from('<html><script>alert(1)</script>'), 'hesabat.pdf', 'ACADEMY_FILE_CONTENT');
    await bad(Buffer.from('{"cells": ['), 'defter.ipynb', 'ACADEMY_FILE_CONTENT');
    await bad(Buffer.from([0x41, 0x00, 0x42]), 'sorgu.sql', 'ACADEMY_FILE_CONTENT');
    await bad(Buffer.alloc(0), 'bos.txt', 'ACADEMY_FILE_EMPTY');
    const nb = await ali
      .post(`/academy/me/assignments/${ids.proj}/files`)
      .attach('file', Buffer.from(JSON.stringify({ cells: [], nbformat: 4 })), 'defter.ipynb');
    expect(nb.status).toBe(201);
    ids.aliNb = nb.body.id;

    // FILE elementi olmayan tapşırıq, yazılmamış / dayandırılmış istifadəçi
    const noFiles = await ali.post(`/academy/me/assignments/${ids.hw}/files`).attach('file', pdf(), 'a.pdf');
    expect([noFiles.status, noFiles.body.code]).toEqual([422, 'ACADEMY_FILES_NOT_ACCEPTED']);
    expect((await outsider.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'a.pdf')).status).toBe(403);
    expect((await paused.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'a.pdf')).status).toBe(403);
    expect((await veli.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'a.pdf')).status).toBe(403);

    // endirmə: sahibi — attachment + nosniff; başqa tələbə və heyət (müvəqqəti fayl) — 403
    const dl = await ali.get(`/academy/files/${ids.aliPdf}`);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/^attachment;/);
    expect(dl.headers['x-content-type-options']).toBe('nosniff');
    expect(dl.headers['content-type']).toMatch(/^application\/pdf/);
    expect((await aysel.get(`/academy/files/${ids.aliPdf}`)).status).toBe(403);
    expect((await lead.get(`/academy/files/${ids.aliPdf}`)).status).toBe(403);
    expect((await ali.get('/academy/files/yoxdur')).status).toBe(404);
  });

  it('qaralama: cavablar və fayl bölgüsü saxlanılır, cəhd sayılmır; başqasının faylı / başqa tapşırığın elementi — 422', async () => {
    const r = await ali.put(`/academy/me/assignments/${ids.proj}/draft`).send({
      answers: [
        { itemId: items.text, text: 'Yarımçıq hesabat' },
        { itemId: items.file, fileIds: [ids.aliPdf] },
      ],
    });
    expect(r.status).toBe(200);
    const det = await ali.get(`/academy/me/assignments/${ids.proj}`);
    expect(det.body.status).toBe('IN_PROGRESS');
    expect(det.body.attemptsUsed).toBe(0);
    expect(det.body.draft.answers).toEqual([
      { itemId: items.text, text: 'Yarımçıq hesabat' },
      { itemId: items.file, fileIds: [ids.aliPdf] },
    ]);
    expect(det.body.stagedFiles.map((f: { id: string }) => f.id).sort()).toEqual([ids.aliPdf, ids.aliNb].sort());

    const aysFile = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'aysel.pdf');
    ids.ayselPdf = aysFile.body.id;
    const foreign = await ali
      .put(`/academy/me/assignments/${ids.proj}/draft`)
      .send({ answers: [{ itemId: items.file, fileIds: [ids.ayselPdf] }] });
    expect([foreign.status, foreign.body.code]).toEqual([422, 'ACADEMY_FILE_INVALID']);
    const mismatch = await ali
      .put(`/academy/me/assignments/${ids.proj}/draft`)
      .send({ answers: [{ itemId: items.otherFile, fileIds: [] }] });
    expect([mismatch.status, mismatch.body.code]).toEqual([422, 'ACADEMY_ITEM_MISMATCH']);
  });

  it('göndəriş yoxlamaları: cavabsız element, növ uyğunsuzluğu, başqa tapşırığın elementi, başqasının faylı — cəhd yaranmır', async () => {
    const send = (answers: unknown[], k = key('x')) =>
      ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: k, answers });
    const missing = await send([{ itemId: items.text, text: 'Hesabat' }]);
    expect([missing.status, missing.body.code]).toEqual([422, 'ACADEMY_ANSWER_REQUIRED']);
    expect(missing.body.details.itemIds.sort()).toEqual([items.file, items.link, items.code].sort());
    const kind = await send([
      { itemId: items.text, text: 'a' },
      { itemId: items.file, text: 'fayl əvəzinə mətn' },
      { itemId: items.link, link: 'https://github.com/x/y' },
      { itemId: items.code, code: 'SELECT 1' },
    ]);
    expect([kind.status, kind.body.code]).toEqual([422, 'ACADEMY_ANSWER_KIND_MISMATCH']);
    const cross = await send([{ itemId: items.otherFile, fileIds: [ids.aliPdf] }]);
    expect([cross.status, cross.body.code]).toEqual([422, 'ACADEMY_ITEM_MISMATCH']);
    const foreign = await send([
      { itemId: items.text, text: 'a' },
      { itemId: items.file, fileIds: [ids.ayselPdf] },
      { itemId: items.link, link: 'https://github.com/x/y' },
      { itemId: items.code, code: 'SELECT 1' },
    ]);
    expect([foreign.status, foreign.body.code]).toEqual([422, 'ACADEMY_FILE_INVALID']);
    const unsafe = await send([{ itemId: items.link, link: 'javascript:alert(1)' }]);
    expect(unsafe.status).toBe(400);
    expect(await prisma.academySubmissionAttempt.count()).toBe(0);
  });

  it('uğurlu göndəriş: 201 + qəbz, fayllar bağlanır, qaralama silinir, outbox; eyni açarla təkrar — 200 və eyni cəhd', async () => {
    const k = key('ali1');
    const body = {
      idempotencyKey: k,
      answers: [
        { itemId: items.text, text: 'Hesabat: ETL axını' },
        { itemId: items.file, fileIds: [ids.aliPdf, ids.aliNb] },
        { itemId: items.link, link: 'https://github.com/ali/etl' },
        { itemId: items.code, code: 'SELECT * FROM sifarisler;' },
      ],
    };
    const r = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send(body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ attemptNumber: 1, maxAttempts: 2, isLate: false, status: 'SUBMITTED', replayed: false });
    ids.aliAttempt1 = r.body.attemptId;
    const files = await prisma.academyFile.findMany({ where: { id: { in: [ids.aliPdf, ids.aliNb] } } });
    expect(files.every((f) => f.status === 'ATTACHED' && f.submissionItemId && f.attachedAt)).toBe(true);
    expect(await prisma.academySubmissionDraft.count({ where: { studentId: ids.ali } })).toBe(0);
    expect(
      await prisma.academyOutboxEvent.count({ where: { type: 'SUBMISSION_RECEIVED', payload: { path: ['attemptId'], equals: ids.aliAttempt1 } } }),
    ).toBe(1);
    // bağlanmış fayl artıq silinmir
    expect((await ali.delete(`/academy/me/files/${ids.aliPdf}`)).status).toBe(404);

    const again = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send(body);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ attemptId: ids.aliAttempt1, attemptNumber: 1, replayed: true });
    expect(await prisma.academySubmissionAttempt.count({ where: { submission: { studentId: ids.ali } } })).toBe(1);

    const det = await ali.get(`/academy/me/assignments/${ids.proj}`);
    expect(det.body).toMatchObject({ status: 'SUBMITTED', attemptsUsed: 1, canSubmit: true, draft: null, stagedFiles: [] });
    expect(det.body.attempts[0].answers.find((a: { itemId: string }) => a.itemId === items.file).files).toHaveLength(2);

    // heyət bağlanmış faylı endirə bilir (aparıcı və köməkçi), başqa qrupun müəllimi — yox
    expect((await lead.get(`/academy/files/${ids.aliPdf}`)).status).toBe(200);
    expect((await assistant.get(`/academy/files/${ids.aliPdf}`)).status).toBe(200);
    expect((await otherLead.get(`/academy/files/${ids.aliPdf}`)).status).toBe(403);
    expect((await aysel.get(`/academy/files/${ids.aliPdf}`)).status).toBe(403);
  });

  it('paralel: eyni açarla iki sorğu bir cəhd yaradır; fərqli açarla limitin son yerinə iki sorğu — biri 409', async () => {
    const answers = [
      { itemId: items.text, text: 'v2' },
      { itemId: items.file, fileIds: [] as string[] },
      { itemId: items.link, link: 'https://github.com/ali/etl' },
      { itemId: items.code, code: 'SELECT 2' },
    ];
    const f = await ali.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', Buffer.from('a,b\n1,2\n'), 'data.csv');
    answers[1]!.fileIds = [f.body.id];
    const k = key('dbl');
    const [r1, r2] = await Promise.all([
      ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: k, answers }),
      ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: k, answers }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 201]);
    expect(r1.body.attemptId).toBe(r2.body.attemptId);
    expect(r1.body.attemptNumber).toBe(2);
    expect(await prisma.academySubmissionAttempt.count({ where: { submission: { studentId: ids.ali } } })).toBe(2);

    // limit (2) doldu
    const over = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('3'), answers });
    expect([over.status, over.body.code]).toEqual([409, 'ACADEMY_ATTEMPT_LIMIT']);
    const list = (await ali.get('/academy/me/assignments')).body.find((x: { id: string }) => x.id === ids.proj);
    expect(list).toMatchObject({ attemptsUsed: 2, canSubmit: false });

    // Aysel: 1 cəhd edib, sonra iki fərqli açarla paralel — yalnız biri keçir
    const ans = (t: string) => [
      { itemId: items.text, text: t },
      { itemId: items.file, fileIds: [ids.ayselPdf] },
      { itemId: items.link, link: 'https://github.com/aysel/etl' },
      { itemId: items.code, code: 'SELECT 1' },
    ];
    expect((await aysel.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('a1'), answers: ans('1') })).status).toBe(201);
    const extra = async () => {
      const ff = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'x.pdf');
      return [
        { itemId: items.text, text: 'p' },
        { itemId: items.file, fileIds: [ff.body.id] },
        { itemId: items.link, link: 'https://github.com/aysel/etl' },
        { itemId: items.code, code: 'SELECT 1' },
      ];
    };
    const [a1, a2] = [await extra(), await extra()];
    const res = await Promise.all([
      aysel.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('p1'), answers: a1 }),
      aysel.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('p2'), answers: a2 }),
    ]);
    expect(res.map((x) => x.status).sort()).toEqual([201, 409]);
    const nums = (
      await prisma.academySubmissionAttempt.findMany({ where: { submission: { studentId: ids.aysel } }, orderBy: { attemptNumber: 'asc' } })
    ).map((x) => x.attemptNumber);
    expect(nums).toEqual([1, 2]);
  });

  it('dəyişməzlik bazada: cəhd və cavab yenilənmir; cavab başqa tapşırığın elementinə bağlana bilmir', async () => {
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "AcademySubmissionAttempt" SET "submittedAt" = now() - interval '1 day' WHERE id = '${ids.aliAttempt1}'`),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "AcademySubmissionItem" SET "textAnswer" = 'dəyişdirildi' WHERE "attemptId" = '${ids.aliAttempt1}'`),
    ).rejects.toThrow();
    await expect(
      prisma.academySubmissionItem.create({
        data: { attemptId: ids.aliAttempt1, assignmentId: ids.proj, itemId: items.otherFile, kind: 'FILE' },
      }),
    ).rejects.toThrow();
    const ans = await prisma.academySubmissionItem.findFirstOrThrow({ where: { attemptId: ids.aliAttempt1, itemId: items.text } });
    expect(ans.textAnswer).toBe('Hesabat: ETL axını');
  });

  it('platforma nəticəsi: server seçir (açılışdan sonra, yalnız öz qeydi), müştəri bal göndərə bilməz, avtomatik bal', async () => {
    const asg = await prisma.academyAssignment.findUniqueOrThrow({ where: { id: ids.hw } });
    // açılışdan əvvəlki 100 % test nəticəsi sayılmır; Ayselin SQL həlli Aliyə aid deyil
    await prisma.submission.create({
      data: { userId: ids.ali, stepId: ids.stepQuiz, type: 'QUIZ', payload: {}, passed: true, score: 100, createdAt: new Date(asg.availableAt.getTime() - 60_000) },
    });
    await prisma.submission.create({ data: { userId: ids.aysel, stepId: ids.stepSql, type: 'SQL', payload: {}, passed: true } });

    const inject = await ali
      .post(`/academy/me/assignments/${ids.hw}/attempts`)
      .send({ idempotencyKey: key('inj'), answers: [{ itemId: items.sql, text: '100' }] });
    expect([inject.status, inject.body.code]).toEqual([422, 'ACADEMY_ANSWER_KIND_MISMATCH']);

    const first = await ali.post(`/academy/me/assignments/${ids.hw}/attempts`).send({ idempotencyKey: key('hw1') });
    expect(first.status).toBe(201);
    const a1 = await prisma.academySubmissionAttempt.findUniqueOrThrow({ where: { id: first.body.attemptId }, include: { answers: true } });
    expect(a1).toMatchObject({ evaluationStatus: 'COMPLETED', autoScoreCenti: 0 });
    expect(a1.answers.map((x) => x.evaluationPassed)).toEqual([false, false]);

    const sql = await prisma.submission.create({ data: { userId: ids.ali, stepId: ids.stepSql, type: 'SQL', payload: {}, passed: true } });
    const quiz = await prisma.submission.create({
      data: { userId: ids.ali, stepId: ids.stepQuiz, type: 'QUIZ', payload: {}, passed: false, score: 50 },
    });
    const second = await ali.post(`/academy/me/assignments/${ids.hw}/attempts`).send({ idempotencyKey: key('hw2') });
    expect(second.status).toBe(201);
    expect(second.body.attemptNumber).toBe(2);
    const a2 = await prisma.academySubmissionAttempt.findUniqueOrThrow({
      where: { id: second.body.attemptId },
      include: { answers: { orderBy: { createdAt: 'asc' } } },
    });
    expect(a2.autoScoreCenti).toBe(6000 + 2000);
    const bySql = a2.answers.find((x) => x.itemId === items.sql)!;
    const byQuiz = a2.answers.find((x) => x.itemId === items.quiz)!;
    expect(bySql).toMatchObject({ learningSubmissionId: sql.id, evaluationPassed: true, evaluationScoreCenti: 6000, evaluationTrust: 'SERVER_CHECKED' });
    expect(byQuiz).toMatchObject({ learningSubmissionId: quiz.id, evaluationPassed: false, evaluationScoreCenti: 2000, evaluationTrust: 'SERVER_VERIFIED' });
    // tələbə detalında qiymət yoxdur (avtomatik bal qaralama sayılır), cəhd nəticəsi görünür
    const det = await ali.get(`/academy/me/assignments/${ids.hw}`);
    expect(det.body.grade).toBeNull();
    expect(det.body.attempts[1].autoScore).toBe(80);
  });

  it('son tarix: gecikmə siyasəti, fərdi uzadılma, son hədd — server vaxtı ilə', async () => {
    // test üçün son tarixi keçmişə çəkirik (API keçmiş tarixlə dərc etməyə icazə vermir)
    await prisma.academyAssignment.update({ where: { id: ids.hw }, data: { dueAt: new Date(Date.now() - 3_600_000) } });
    const late = await aysel.post(`/academy/me/assignments/${ids.hw}/attempts`).send({ idempotencyKey: key('late') });
    expect(late.status).toBe(201);
    // AUTOMATIC tapşırıq: avtomatik qaralama qiymət yaranır → tələbə üçün «yoxlanılır» (qiymət açıqlanana qədər)
    expect(late.body).toMatchObject({ isLate: true, status: 'UNDER_REVIEW' });

    await prisma.academyAssignment.update({ where: { id: ids.hw }, data: { lateCutoffAt: new Date(Date.now() - 60_000) } });
    const cut = await aysel.post(`/academy/me/assignments/${ids.hw}/attempts`).send({ idempotencyKey: key('cut') });
    expect([cut.status, cut.body.code]).toEqual([409, 'ACADEMY_CUTOFF_PASSED']);

    await prisma.academyAssignment.update({
      where: { id: ids.proj },
      data: { dueAt: new Date(Date.now() - 3_600_000), maxAttempts: 5 },
    });
    const rejected = await aysel.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('rej') });
    expect([rejected.status, rejected.body.code]).toEqual([409, 'ACADEMY_DEADLINE_PASSED']);
    expect(rejected.body.details.effectiveDueAt).toBeTruthy();
    const staged = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'gec.pdf');
    expect([staged.status, staged.body.code]).toEqual([409, 'ACADEMY_DEADLINE_PASSED']);

    // fərdi uzadılma yalnız Ayselə: o vaxtında göndərir, Ali yox
    const ext = await lead.post(`/academy/assignments/${ids.proj}/extensions`).send({ studentId: ids.aysel, extendedDueAt: iso(24), reason: 'xəstəlik' });
    expect(ext.status).toBe(200);
    const f = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'vaxtinda.pdf');
    const ok = await aysel.post(`/academy/me/assignments/${ids.proj}/attempts`).send({
      idempotencyKey: key('ext'),
      answers: [
        { itemId: items.text, text: 'uzadılma ilə' },
        { itemId: items.file, fileIds: [f.body.id] },
        { itemId: items.link, link: 'https://github.com/aysel/etl' },
        { itemId: items.code, code: 'SELECT 3' },
      ],
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ isLate: false, attemptNumber: 3 });
    const aliTry = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('ali-late') });
    expect([aliTry.status, aliTry.body.code]).toEqual([409, 'ACADEMY_DEADLINE_PASSED']);
    await prisma.academyAssignment.update({ where: { id: ids.proj }, data: { dueAt: new Date(Date.now() + 48 * 3_600_000), maxAttempts: 2 } });
  });

  it('açıqlanmış qiymət yeni cəhdi bağlayır; qaytarılmış göndərişə limitdən asılı olmayaraq bir düzəliş cəhdi', async () => {
    const sub = await prisma.academySubmission.findFirstOrThrow({ where: { assignmentId: ids.proj, studentId: ids.ali } });
    const grade = await prisma.academyGrade.create({
      data: { submissionId: sub.id, assignmentId: ids.proj, status: 'RETURNED', feedback: 'Hesabatı genişləndirin', version: 1 },
    });
    const f = await ali.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'duzelis.pdf');
    const answers = [
      { itemId: items.text, text: 'Genişləndirilmiş hesabat' },
      { itemId: items.file, fileIds: [f.body.id] },
      { itemId: items.link, link: 'https://github.com/ali/etl' },
      { itemId: items.code, code: 'SELECT 4' },
    ];
    const fix = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('fix'), answers });
    expect(fix.status).toBe(201);
    expect(fix.body).toMatchObject({ attemptNumber: 3, status: 'SUBMITTED' });
    const more = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('more'), answers: [] });
    expect([more.status, more.body.code]).toEqual([409, 'ACADEMY_ATTEMPT_LIMIT']);

    await prisma.academyGrade.update({ where: { id: grade.id }, data: { status: 'RELEASED', releasedAt: new Date(), version: 2 } });
    await prisma.academyAssignment.update({ where: { id: ids.proj }, data: { maxAttempts: 10 } });
    const blocked = await ali.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('rel'), answers });
    expect([blocked.status, blocked.body.code]).toEqual([409, 'ACADEMY_ALREADY_GRADED']);
    await prisma.academyAssignment.update({ where: { id: ids.proj }, data: { maxAttempts: 2 } });
  });

  it('tapşırıq resursları: aparıcı yükləyir, köməkçi dərc olunmuşda yox; tələbə endirir, başqa qrup yox', async () => {
    const up = await lead.post(`/academy/assignments/${ids.proj}/resources`).attach('file', Buffer.from('id,ad\n1,Ali\n'), 'melumat.csv');
    expect(up.status).toBe(201);
    ids.resource = up.body.id;
    expect((await assistant.post(`/academy/assignments/${ids.proj}/resources`).attach('file', pdf(), 'k.pdf')).status).toBe(403);
    expect((await ali.post(`/academy/assignments/${ids.proj}/resources`).attach('file', pdf(), 'k.pdf')).status).toBe(403);
    expect((await ali.get(`/academy/me/assignments/${ids.proj}`)).body.resources.map((r: { id: string }) => r.id)).toEqual([ids.resource]);
    const dl = await ali.get(`/academy/files/${ids.resource}`);
    expect(dl.status).toBe(200);
    expect(dl.text).toContain('id,ad');
    expect((await veli.get(`/academy/files/${ids.resource}`)).status).toBe(403);
    expect((await otherLead.get(`/academy/files/${ids.resource}`)).status).toBe(403);
    expect((await paused.get(`/academy/files/${ids.resource}`)).status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: 'academy.assignment.resource.add' } })).toBe(1);

    const row = await prisma.academyFile.findUniqueOrThrow({ where: { id: ids.resource } });
    expect((await lead.delete(`/academy/assignments/${ids.proj}/resources/${ids.resource}`)).status).toBe(200);
    expect(await exists(row.storageKey)).toBe(false);
    expect((await ali.get(`/academy/files/${ids.resource}`)).status).toBe(404);
  });

  it('dayandırılmış yazılış və bağlı qrup: göndəriş qəbul edilmir', async () => {
    const p = await paused.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('p') });
    expect(p.status).toBe(403);
    expect((await paused.put(`/academy/me/assignments/${ids.proj}/draft`).send({ answers: [] })).status).toBe(403);
    expect((await outsider.post(`/academy/me/assignments/${ids.proj}/attempts`).send({ idempotencyKey: key('o') })).status).toBe(403);

    expect((await admin.patch(`/academy/groups/${ids.de2}`).send({ status: 'COMPLETED' })).status).toBe(200);
    const closed = await veli.post(`/academy/me/assignments/${ids.other}/attempts`).send({ idempotencyKey: key('c') });
    expect([closed.status, closed.body.code]).toEqual([409, 'ACADEMY_GROUP_CLOSED']);
  });

  it('təmizləmə: köhnə müvəqqəti fayl silinir, açıq tapşırığın qaralamasındakı fayl saxlanılır', async () => {
    await prisma.academyAssignment.update({ where: { id: ids.proj }, data: { maxAttempts: 10 } });
    const a = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'kohne.pdf');
    const b2 = await aysel.post(`/academy/me/assignments/${ids.proj}/files`).attach('file', pdf(), 'qaralamada.pdf');
    expect([a.status, b2.status]).toEqual([201, 201]);
    await aysel
      .put(`/academy/me/assignments/${ids.proj}/draft`)
      .send({ answers: [{ itemId: items.file, fileIds: [b2.body.id] }] });
    const old = new Date(Date.now() - 48 * 3_600_000);
    await prisma.academyFile.updateMany({ where: { id: { in: [a.body.id, b2.body.id] } }, data: { createdAt: old } });
    const keyA = (await prisma.academyFile.findUniqueOrThrow({ where: { id: a.body.id } })).storageKey;

    const removed = await app.get(AcademyFilesService).cleanupStaged();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await prisma.academyFile.findUnique({ where: { id: a.body.id } })).toBeNull();
    expect(await exists(keyA)).toBe(false);
    expect(await prisma.academyFile.findUnique({ where: { id: b2.body.id } })).not.toBeNull();
    // bağlanmış fayllar heç vaxt silinmir
    expect(await prisma.academyFile.findUnique({ where: { id: ids.aliPdf } })).not.toBeNull();
  });
});
