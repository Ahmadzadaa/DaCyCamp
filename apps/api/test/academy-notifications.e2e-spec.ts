import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { env } from '../src/config/env';
import { AcademyWorkerService } from '../src/academy/notifications/academy-worker.service';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const HOUR = 3_600_000;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * HOUR).toISOString();
const key = (n: string) => `acar-${n}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Akademiya — Mərhələ 7–8 və laboratoriya: tranzaksion outbox → bildiriş (təkrarsız), yenidən cəhd,
 * son tarix xatırlatmaları (uzadılma ilə), planlaşdırılmış dərc, zəng menyusu inteqrasiyası, analitika,
 * müəllim / admin ümumi baxışı, LAB tapşırığı.
 */
describe('Academy notifications, analytics & labs (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let worker: AcademyWorkerService;
  let admin: Agent;
  let lead: Agent;
  let assistant: Agent;
  let otherLead: Agent;
  let ali: Agent;
  let aysel: Agent;
  const ids: Record<string, string> = {};
  const notes = (userId: string, type?: string) =>
    prisma.academyNotification.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    worker = app.get(AcademyWorkerService);
    await resetDb(prisma);
    await seedBasics(prisma);
    const users = {
      lead: await makeUser(prisma, 'ziyad@test.local'),
      assistant: await makeUser(prisma, 'komekci@test.local'),
      otherLead: await makeUser(prisma, 'diger@test.local'),
      ali: await makeUser(prisma, 'ali@test.local'),
      aysel: await makeUser(prisma, 'aysel@test.local'),
    };
    for (const [k, u] of Object.entries(users)) ids[k] = u.id;
    admin = await login(app, 'admin@test.local', 'Admin123!');
    const de = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
    const g1 = await admin.post('/academy/groups').send({
      programId: de.body.id,
      code: 'DE-001',
      name: 'Data Engineering 001',
      status: 'ACTIVE',
      leadInstructorId: ids.lead,
      assistantInstructorIds: [ids.assistant],
    });
    ids.de1 = g1.body.id;
    const g2 = await admin
      .post('/academy/groups')
      .send({
        programId: de.body.id,
        code: 'DE-002',
        name: 'DE-002',
        status: 'ACTIVE',
        leadInstructorId: ids.otherLead,
      });
    ids.de2 = g2.body.id;
    for (const s of ['ali', 'aysel'])
      await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids[s] });
    const p = (e: string) => login(app, e, 'Parol123!');
    lead = await p('ziyad@test.local');
    assistant = await p('komekci@test.local');
    otherLead = await p('diger@test.local');
    ali = await p('ali@test.local');
    aysel = await p('aysel@test.local');
  });
  afterAll(async () => {
    env.ACADEMY_MANAGEMENT_ENABLED = true;
    await app.close();
  });

  const createAndPublish = async (
    body: Record<string, unknown>,
    mode: 'now' | 'scheduled' = 'now',
  ) => {
    const c = await lead.post(`/academy/groups/${ids.de1}/assignments`).send({
      type: 'CUSTOM_TASK',
      availableAt: iso(-1),
      dueAt: iso(48),
      items: [{ kind: 'TEXT', title: 'Cavab', maxScore: 10 }],
      ...body,
    });
    expect(c.status).toBe(201);
    const pub = await lead.post(`/academy/assignments/${c.body.id}/publish`).send({ mode });
    expect(pub.status).toBe(200);
    return c.body as { id: string; items: Array<{ id: string }> };
  };

  it('outbox → bildiriş: qeydiyyat və yeni tapşırıq; təkrar işləmə və təkrar hadisə dublikat yaratmır', async () => {
    const r1 = await worker.runOnce();
    expect(r1).toMatchObject({ processed: 2, failed: 0 });
    expect((await notes(ids.ali, 'ENROLLED')).map((n) => n.title)).toEqual([
      'Data Engineering 001',
    ]);

    const a = await createAndPublish({ title: 'ETL esse' });
    ids.essay = a.id;
    ids.essayItem = a.items[0]!.id;
    await worker.runOnce();
    for (const u of [ids.ali, ids.aysel]) {
      const n = await notes(u, 'ASSIGNMENT_PUBLISHED');
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({
        title: 'ETL esse',
        body: 'DE-001',
        url: `/akademiya/tapsiriqlar/${a.id}`,
        readAt: null,
      });
    }
    // müəllimə və başqa qrupa yox
    expect(await notes(ids.lead)).toHaveLength(0);
    expect(await prisma.academyOutboxEvent.count({ where: { status: { not: 'DONE' } } })).toBe(0);

    // eyni hadisə ikinci dəfə (məs. işçi yarımçıq qalıb) — unikal açar dublikatın qarşısını alır
    await prisma.academyOutboxEvent.create({
      data: {
        type: 'ASSIGNMENT_PUBLISHED',
        payload: { type: 'ASSIGNMENT_PUBLISHED', assignmentId: a.id },
      },
    });
    expect((await worker.runOnce()).processed).toBe(1);
    expect(await notes(ids.ali, 'ASSIGNMENT_PUBLISHED')).toHaveLength(1);
  });

  it('uğursuz hadisə eksponensial gecikmə ilə yenidən cəhd olunur, 5 cəhddən sonra FAILED; digərləri işləyir', async () => {
    const bad = await prisma.academyOutboxEvent.create({
      data: { type: 'ASSIGNMENT_PUBLISHED', payload: { type: 'ASSIGNMENT_PUBLISHED' } },
    });
    let now = new Date();
    const first = await worker.processOutbox(now);
    expect(first).toEqual({ processed: 0, failed: 1 });
    let row = await prisma.academyOutboxEvent.findUniqueOrThrow({ where: { id: bad.id } });
    expect(row).toMatchObject({ status: 'PENDING', attempts: 1 });
    expect(row.lastError).toBeTruthy();
    expect(row.availableAt.getTime() - now.getTime()).toBe(30_000);
    // gecikmə bitməyib — götürülmür
    expect(await worker.processOutbox(new Date(now.getTime() + 10_000))).toEqual({
      processed: 0,
      failed: 0,
    });
    for (let i = 0; i < 4; i++) {
      now = new Date(now.getTime() + 2 * HOUR);
      await worker.processOutbox(now);
    }
    row = await prisma.academyOutboxEvent.findUniqueOrThrow({ where: { id: bad.id } });
    expect(row).toMatchObject({ status: 'FAILED', attempts: 5 });
    const ov = await admin.get('/academy/admin/overview');
    expect(ov.body.outbox).toEqual({ pending: 0, failed: 1 });
  });

  it('zəng menyusu: akademiya bildirişləri oxuyanın dilində, «oxundu» ilə; modul söndürülsə görünmür', async () => {
    const list = await ali.get('/me/notifications');
    expect(list.status).toBe(200);
    const pub = list.body.find((n: { kind: string }) => n.kind === 'academy_assignment');
    expect(pub).toMatchObject({
      title: 'Yeni tapşırıq',
      body: 'ETL esse · DE-001',
      unread: true,
      url: `/akademiya/tapsiriqlar/${ids.essay}`,
    });
    expect(list.body.some((n: { kind: string }) => n.kind === 'academy_enrolled')).toBe(true);
    const setLang = (lang: 'az' | 'en') =>
      (ali as unknown as { jar: { setCookie(c: string): void } }).jar.setCookie(
        `dacy_locale=${lang}; Path=/`,
      );
    setLang('en');
    const en = await ali.get('/me/notifications');
    expect(en.body.find((n: { kind: string }) => n.kind === 'academy_assignment').title).toBe(
      'New assignment',
    );
    setLang('az');
    expect((await ali.get('/me/summary')).body.unreadNotifications).toBeGreaterThanOrEqual(2);

    env.ACADEMY_MANAGEMENT_ENABLED = false;
    expect(
      (await ali.get('/me/notifications')).body.some((n: { kind: string }) =>
        n.kind.startsWith('academy_'),
      ),
    ).toBe(false);
    env.ACADEMY_MANAGEMENT_ENABLED = true;

    expect((await ali.post('/me/notifications/seen')).status).toBe(200);
    expect((await notes(ids.ali)).every((n) => n.readAt !== null)).toBe(true);
    expect(
      (await ali.get('/me/notifications')).body.filter((n: { unread: boolean }) => n.unread),
    ).toHaveLength(0);
    // Ayselin bildirişlərinə toxunulmayıb
    expect((await notes(ids.aysel)).every((n) => n.readAt === null)).toBe(true);
    const page = await aysel.get('/academy/me/notifications');
    expect(page.body[0]).toMatchObject({ title: expect.any(String), readAt: null });
    expect((await aysel.post(`/academy/me/notifications/${page.body[0].id}/read`)).status).toBe(
      200,
    );
    expect((await ali.post(`/academy/me/notifications/${page.body[0].id}/read`)).status).toBe(404);
  });

  it('son tarix xatırlatması: yalnız göndərməyənə, ən yaxın hədd, uzadılma nəzərə alınır, təkrar yoxdur', async () => {
    const a = await createAndPublish({ title: 'Təcili tapşırıq', dueAt: iso(2) });
    ids.urgent = a.id;
    // Ali göndərib — ona xatırlatma yox
    const s = await ali
      .post(`/academy/me/assignments/${a.id}/attempts`)
      .send({ idempotencyKey: key('u'), answers: [{ itemId: a.items[0]!.id, text: 'hazır' }] });
    expect(s.status).toBe(201);
    await worker.runOnce();
    const ay = await notes(ids.aysel, 'DEADLINE_SOON');
    expect(ay).toHaveLength(1);
    expect(ay[0]!.dedupeKey).toMatch(new RegExp(`^deadline:${a.id}:3:`));
    expect(await notes(ids.ali, 'DEADLINE_SOON')).toHaveLength(0);
    await worker.runOnce();
    expect(await notes(ids.aysel, 'DEADLINE_SOON')).toHaveLength(1);

    // uzadılma: yeni effektiv son tarix (20 saat) üçün 24 saatlıq xatırlatma, sonra 3 saatlıq
    const ext = await lead
      .post(`/academy/assignments/${a.id}/extensions`)
      .send({ studentId: ids.aysel, extendedDueAt: iso(20), reason: 'Ailə vəziyyəti' });
    expect(ext.status).toBe(200);
    await worker.runOnce();
    const after = await notes(ids.aysel, 'DEADLINE_SOON');
    expect(after).toHaveLength(2);
    expect(after[1]!.dedupeKey).toMatch(new RegExp(`^deadline:${a.id}:24:`));
    expect(await notes(ids.aysel, 'DEADLINE_EXTENDED')).toHaveLength(1);
    await worker.runOnce(new Date(Date.now() + 18 * HOUR));
    expect((await notes(ids.aysel, 'DEADLINE_SOON')).map((n) => n.dedupeKey.split(':')[2])).toEqual(
      ['3', '24', '3'],
    );
  });

  it('planlaşdırılmış tapşırıq vaxtı çatanda işçi tərəfindən dərc olunur və bildiriş göndərilir', async () => {
    const c = await lead.post(`/academy/groups/${ids.de1}/assignments`).send({
      title: 'Gələcək tapşırıq',
      type: 'CUSTOM_TASK',
      availableAt: iso(1),
      dueAt: iso(72),
      items: [{ kind: 'TEXT', title: 'Cavab', maxScore: 10 }],
    });
    expect(
      (await lead.post(`/academy/assignments/${c.body.id}/publish`).send({ mode: 'scheduled' }))
        .body.status,
    ).toBe('SCHEDULED');
    await worker.runOnce();
    expect(
      (await prisma.academyAssignment.findUniqueOrThrow({ where: { id: c.body.id } })).status,
    ).toBe('SCHEDULED');
    const r = await worker.runOnce(new Date(Date.now() + 2 * HOUR));
    expect(r.published).toBe(1);
    expect(
      (await prisma.academyAssignment.findUniqueOrThrow({ where: { id: c.body.id } })).status,
    ).toBe('PUBLISHED');
    expect((await notes(ids.ali, 'ASSIGNMENT_PUBLISHED')).map((n) => n.title)).toContain(
      'Gələcək tapşırıq',
    );
  });

  it('qiymət açıqlanması, qaytarma və dərs ləğvi bildirişləri; qəbz bildirişi', async () => {
    const sub = await prisma.academySubmission.findFirstOrThrow({
      where: { assignmentId: ids.urgent, studentId: ids.ali },
    });
    expect(
      (await lead.put(`/academy/submissions/${sub.id}/grade`).send({ itemScores: [] })).status,
    ).toBe(422);
    const items = await prisma.academyAssignmentItem.findMany({
      where: { assignmentId: ids.urgent },
    });
    await lead
      .put(`/academy/submissions/${sub.id}/grade`)
      .send({ itemScores: [{ itemId: items[0]!.id, score: 8 }] });
    expect((await lead.post(`/academy/submissions/${sub.id}/grade/release`).send({})).status).toBe(
      200,
    );
    const sess = await lead
      .post(`/academy/groups/${ids.de1}/sessions`)
      .send({ title: 'Cümə dərsi', startsAt: iso(30), endsAt: iso(31) });
    await lead.patch(`/academy/sessions/${sess.body.id}`).send({ status: 'CANCELLED' });
    await worker.runOnce();
    expect(await notes(ids.ali, 'SUBMISSION_RECEIVED')).toHaveLength(1);
    expect((await notes(ids.ali, 'GRADE_RELEASED'))[0]).toMatchObject({
      title: 'Təcili tapşırıq',
      url: `/akademiya/tapsiriqlar/${ids.urgent}`,
    });
    expect(await notes(ids.aysel, 'GRADE_RELEASED')).toHaveLength(0);
    for (const u of [ids.ali, ids.aysel]) expect(await notes(u, 'CLASS_CANCELLED')).toHaveLength(1);
  });

  it('müəllim zəngində yoxlama gözləyən göndərişlərin sayı; köməkçi də görür', async () => {
    const r = await aysel
      .post(`/academy/me/assignments/${ids.essay}/attempts`)
      .send({ idempotencyKey: key('e'), answers: [{ itemId: ids.essayItem, text: 'esse' }] });
    expect(r.status).toBe(201);
    const bell = await lead.get('/me/notifications');
    const pending = bell.body.find((n: { kind: string }) => n.kind === 'academy_reviews');
    expect(pending).toMatchObject({ title: '1 göndəriş yoxlama gözləyir', url: '/muellim' });
    expect(
      (await assistant.get('/me/notifications')).body.some(
        (n: { kind: string }) => n.kind === 'academy_reviews',
      ),
    ).toBe(true);
    expect(
      (await otherLead.get('/me/notifications')).body.some(
        (n: { kind: string }) => n.kind === 'academy_reviews',
      ),
    ).toBe(false);
  });

  it('analitika: sənədləşdirilmiş düsturlar; yalnız qrupun heyəti', async () => {
    // keçmiş son tarixli, göndərilməmiş tapşırıq (REJECT) — hər iki tələbə üçün «buraxılmış»
    const missed = await createAndPublish({ title: 'Keçmiş tapşırıq' });
    await prisma.academyAssignment.update({
      where: { id: missed.id },
      data: { dueAt: new Date(Date.now() - HOUR) },
    });
    // davamiyyət: Ali iştirak, Aysel qayıb
    const sess = await lead
      .post(`/academy/groups/${ids.de1}/sessions`)
      .send({ title: 'Keçmiş dərs', startsAt: iso(-3), endsAt: iso(-2) });
    await lead.put(`/academy/sessions/${sess.body.id}/attendance`).send({
      records: [
        { studentId: ids.ali, status: 'PRESENT' },
        { studentId: ids.aysel, status: 'ABSENT' },
      ],
    });
    const r = await assistant.get(`/academy/groups/${ids.de1}/analytics`);
    expect(r.status).toBe(200);
    // açılmış görünən tapşırıqlar: esse, təcili, gələcək (indi açıq deyil → yox), keçmiş → 3
    const row = (id: string) =>
      r.body.students.find((s: { student: { id: string } }) => s.student.id === id);
    expect(row(ids.ali)).toMatchObject({
      completed: 1,
      expected: 3,
      averageGrade: 80,
      attendanceRate: 100,
      missed: 1,
    });
    expect(row(ids.aysel)).toMatchObject({
      completed: 1,
      expected: 3,
      averageGrade: null,
      attendanceRate: 0,
      missed: 1,
    });
    expect(row(ids.aysel).flags).toEqual({ attention: false, attendanceWarning: true });
    expect(r.body).toMatchObject({
      activeStudents: 2,
      completionRate: 33.3,
      averageGrade: 80,
      attendanceRate: 50,
      pendingReviews: 1,
    });
    // gecikmiş: hər iki tələbə «keçmiş tapşırığı» buraxıb + Ali essenı hələ göndərməyib (son tarix gələcəkdə → sayılmır)
    expect(r.body.overdue).toBe(2);
    expect((await ali.get(`/academy/groups/${ids.de1}/analytics`)).status).toBe(403);
    expect((await otherLead.get(`/academy/groups/${ids.de1}/analytics`)).status).toBe(403);
    expect((await admin.get(`/academy/groups/${ids.de1}/analytics`)).status).toBe(200);
  });

  it('müəllim və admin ümumi baxışı; admin baxışı yalnız adminə', async () => {
    const o = await lead.get('/academy/instructor/overview');
    expect(o.status).toBe(200);
    expect(o.body.groups).toEqual([
      expect.objectContaining({
        code: 'DE-001',
        role: 'LEAD',
        activeStudents: 2,
        pendingReviews: 1,
      }),
    ]);
    expect(o.body.totals).toMatchObject({ groups: 1, students: 2, pendingReviews: 1 });
    expect((await assistant.get('/academy/instructor/overview')).body.groups[0].role).toBe(
      'ASSISTANT',
    );
    // tələbə müəllim panelini görmür (403)
    expect((await ali.get('/academy/instructor/overview')).status).toBe(403);
    const adm = await admin.get('/academy/admin/overview');
    expect(adm.status).toBe(200);
    expect(adm.body).toMatchObject({
      programs: 1,
      activeEnrollments: 2,
      instructors: 3,
      pendingReviews: 1,
    });
    expect(adm.body.groups).toMatchObject({ ACTIVE: 2, PLANNED: 0 });
    const denied = await lead.get('/academy/admin/overview');
    expect([denied.status, denied.body.code]).toEqual([403, 'ACADEMY_ADMIN_ONLY']);
  });

  it('laboratoriya: LAB növü tapşırıq mühərriki ilə — resurs, nəticələr siyahısı, fayl göndərişi, növ filtri', async () => {
    const c = await lead.post(`/academy/groups/${ids.de1}/assignments`).send({
      title: 'Lab 3: Docker şəbəkəsi',
      type: 'LAB',
      description: 'Konteynerləri bir şəbəkədə işə salın',
      availableAt: iso(-1),
      dueAt: iso(72),
      deliverables: ['docker-compose.yml', 'ekran görüntüsü'],
      items: [
        { kind: 'FILE', title: 'Nəticə faylları', maxScore: 70 },
        { kind: 'TEXT', title: 'Hesabat', maxScore: 30 },
      ],
    });
    expect(c.status).toBe(201);
    expect(c.body).toMatchObject({
      type: 'LAB',
      maxScore: 100,
      deliverables: ['docker-compose.yml', 'ekran görüntüsü'],
    });
    const res = await lead
      .post(`/academy/assignments/${c.body.id}/resources`)
      .attach('file', Buffer.from('# Lab təlimatı\n'), 'telimat.md');
    expect(res.status).toBe(201);
    expect((await lead.post(`/academy/assignments/${c.body.id}/publish`).send({})).status).toBe(
      200,
    );
    const labs = await ali.get('/academy/me/assignments?type=LAB');
    expect(labs.body.map((x: { id: string }) => x.id)).toEqual([c.body.id]);
    const det = await ali.get(`/academy/me/assignments/${c.body.id}`);
    expect(det.body.resources).toHaveLength(1);
    expect(det.body.deliverables).toEqual(['docker-compose.yml', 'ekran görüntüsü']);
    const f = await ali
      .post(`/academy/me/assignments/${c.body.id}/files`)
      .attach('file', Buffer.from('PK\x03\x04lab'), 'netice.zip');
    expect(f.status).toBe(201);
    const s = await ali.post(`/academy/me/assignments/${c.body.id}/attempts`).send({
      idempotencyKey: key('lab'),
      answers: [
        { itemId: c.body.items[0].id, fileIds: [f.body.id] },
        { itemId: c.body.items[1].id, text: 'Şəbəkə bridge rejimində qurulub' },
      ],
    });
    expect(s.status).toBe(201);
    expect(s.body.status).toBe('SUBMITTED');
  });
});
