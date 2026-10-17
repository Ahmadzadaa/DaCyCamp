import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();
const URL_ = 'https://meet.example.com/de-001';

/**
 * Akademiya — Mərhələ 6: dərs cədvəli və davamiyyət. Görüş linki yalnız səlahiyyətli istifadəçiyə, həftəlik
 * cədvəl qrupun vaxt zonasında, tək dərsin köçürülməsi / ləğvi (bildiriş hadisəsi ilə), davamiyyət qaydaları.
 */
describe('Academy classes & attendance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let lead: Agent;
  let assistant: Agent;
  let otherLead: Agent;
  let ali: Agent;
  let aysel: Agent;
  let paused: Agent;
  let alumni: Agent;
  let veli: Agent;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    const users = {
      lead: await makeUser(prisma, 'ziyad@test.local'),
      assistant: await makeUser(prisma, 'komekci@test.local'),
      otherLead: await makeUser(prisma, 'diger@test.local'),
      ali: await makeUser(prisma, 'ali@test.local'),
      aysel: await makeUser(prisma, 'aysel@test.local'),
      paused: await makeUser(prisma, 'pauza@test.local'),
      alumni: await makeUser(prisma, 'mezun@test.local'),
      veli: await makeUser(prisma, 'veli@test.local'),
    };
    for (const [k, u] of Object.entries(users)) ids[k] = u.id;
    admin = await login(app, 'admin@test.local', 'Admin123!');
    const de = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
    const g1 = await admin.post('/academy/groups').send({
      programId: de.body.id,
      code: 'DE-001',
      name: 'DE-001',
      status: 'ACTIVE',
      timezone: 'Asia/Baku',
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
    for (const s of ['ali', 'aysel', 'paused', 'alumni'])
      await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids[s] });
    await admin.post(`/academy/groups/${ids.de2}/enrollments`).send({ userId: ids.veli });
    const enr = async (studentId: string) =>
      (await prisma.academyEnrollment.findFirstOrThrow({ where: { studentId, groupId: ids.de1 } }))
        .id;
    await admin.patch(`/academy/enrollments/${await enr(ids.paused)}`).send({ status: 'PAUSED' });
    await admin
      .patch(`/academy/enrollments/${await enr(ids.alumni)}`)
      .send({ status: 'COMPLETED' });

    const p = (e: string) => login(app, e, 'Parol123!');
    lead = await p('ziyad@test.local');
    assistant = await p('komekci@test.local');
    otherLead = await p('diger@test.local');
    ali = await p('ali@test.local');
    aysel = await p('aysel@test.local');
    paused = await p('pauza@test.local');
    alumni = await p('mezun@test.local');
    veli = await p('veli@test.local');
  });
  afterAll(async () => app.close());

  it('dərs yaratmaq: yalnız aparıcı / admin; müəllim qrupun müəllimi olmalıdır; vaxt sırası', async () => {
    const body = {
      title: 'Giriş dərsi',
      startsAt: iso(-2),
      endsAt: iso(-0.5),
      meetingUrl: URL_,
      instructorId: ids.lead,
    };
    const r = await lead.post(`/academy/groups/${ids.de1}/sessions`).send(body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      status: 'SCHEDULED',
      meetingUrl: URL_,
      instructor: { id: ids.lead },
      groupCode: 'DE-001',
    });
    ids.past = r.body.id;
    expect((await assistant.post(`/academy/groups/${ids.de1}/sessions`).send(body)).status).toBe(
      403,
    );
    expect((await ali.post(`/academy/groups/${ids.de1}/sessions`).send(body)).status).toBe(403);
    expect((await otherLead.post(`/academy/groups/${ids.de1}/sessions`).send(body)).status).toBe(
      403,
    );
    const foreign = await lead
      .post(`/academy/groups/${ids.de1}/sessions`)
      .send({ ...body, instructorId: ids.otherLead });
    expect([foreign.status, foreign.body.code]).toEqual([422, 'ACADEMY_NOT_GROUP_INSTRUCTOR']);
    expect(
      (await lead.post(`/academy/groups/${ids.de1}/sessions`).send({ ...body, endsAt: iso(-3) }))
        .status,
    ).toBe(400);
    expect(
      (
        await lead
          .post(`/academy/groups/${ids.de1}/sessions`)
          .send({ ...body, meetingUrl: 'javascript:alert(1)' })
      ).status,
    ).toBe(400);
    const adm = await admin
      .post(`/academy/groups/${ids.de1}/sessions`)
      .send({ title: 'Admin dərsi', startsAt: iso(170), endsAt: iso(171) });
    expect(adm.status).toBe(201);
    ids.future = adm.body.id;
  });

  it('həftəlik cədvəl: qrupun vaxt zonasında yerli saat; çox uzun / boş cədvəl rədd edilir', async () => {
    // 2026-11-02 bazar ertəsi; B.e. + Ç. 19:00 (Bakı, UTC+4) → 15:00 UTC
    const r = await lead.post(`/academy/groups/${ids.de1}/sessions/series`).send({
      title: 'SQL dərsi',
      startDate: '2026-11-02',
      endDate: '2026-11-15',
      weekdays: [1, 3],
      startTime: '19:00',
      durationMinutes: 90,
      meetingUrl: URL_,
    });
    expect(r.status).toBe(201);
    expect(r.body.map((s: { startsAt: string }) => s.startsAt)).toEqual([
      '2026-11-02T15:00:00.000Z',
      '2026-11-04T15:00:00.000Z',
      '2026-11-09T15:00:00.000Z',
      '2026-11-11T15:00:00.000Z',
    ]);
    expect(r.body[0].endsAt).toBe('2026-11-02T16:30:00.000Z');
    expect(new Set(r.body.map((s: { seriesId: string }) => s.seriesId)).size).toBe(1);
    ids.s1 = r.body[0].id;
    ids.s2 = r.body[1].id;
    ids.s3 = r.body[2].id;
    const long = await lead.post(`/academy/groups/${ids.de1}/sessions/series`).send({
      title: 'Çox',
      startDate: '2026-11-02',
      endDate: '2028-11-02',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      startTime: '10:00',
      durationMinutes: 60,
    });
    expect([long.status, long.body.code]).toEqual([422, 'ACADEMY_SCHEDULE_TOO_LONG']);
    const empty = await lead.post(`/academy/groups/${ids.de1}/sessions/series`).send({
      title: 'Boş',
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      weekdays: [7],
      startTime: '10:00',
      durationMinutes: 60,
    });
    expect([empty.status, empty.body.code]).toEqual([422, 'ACADEMY_SCHEDULE_EMPTY']);
    expect(
      (await assistant.post(`/academy/groups/${ids.de1}/sessions/series`).send({})).status,
    ).toBe(400);
  });

  it('tək dərsi köçürmək digərlərinə təsir etmir; ləğv → link gizlənir; hər ikisi outbox-a düşür; audit', async () => {
    const moved = await lead.patch(`/academy/sessions/${ids.s1}`).send({
      startsAt: '2026-11-03T15:00:00.000Z',
      endsAt: '2026-11-03T16:30:00.000Z',
      reason: 'Bayram',
    });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({
      status: 'RESCHEDULED',
      startsAt: '2026-11-03T15:00:00.000Z',
    });
    const other = await prisma.academyClassSession.findUniqueOrThrow({ where: { id: ids.s2 } });
    expect(other).toMatchObject({ status: 'SCHEDULED' });
    expect(other.startsAt.toISOString()).toBe('2026-11-04T15:00:00.000Z');

    const cancelled = await lead
      .patch(`/academy/sessions/${ids.s3}`)
      .send({ status: 'CANCELLED', reason: 'Müəllim xəstədir' });
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', meetingUrl: null });
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'CLASS_RESCHEDULED' } })).toBe(1);
    expect(await prisma.academyOutboxEvent.count({ where: { type: 'CLASS_CANCELLED' } })).toBe(1);
    expect((await assistant.patch(`/academy/sessions/${ids.s2}`).send({ title: 'x' })).status).toBe(
      403,
    );
    const bad = await lead
      .patch(`/academy/sessions/${ids.s2}`)
      .send({ endsAt: '2026-11-04T14:00:00.000Z' });
    expect([bad.status, bad.body.code]).toEqual([422, 'ACADEMY_SESSION_TIME']);
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'academy.session.update', entityId: ids.s1 },
    });
    expect(log.details).toMatchObject({
      before: { startsAt: '2026-11-02T15:00:00.000Z' },
      reason: 'Bayram',
    });
  });

  it('görüş linki: aktiv tələbə və heyət görür; bitirmiş tələbə görmür; dayandırılmış və başqa qrup — 403', async () => {
    const pick = (rows: Array<{ id: string; meetingUrl: string | null }>) =>
      rows.find((s) => s.id === ids.s2)?.meetingUrl;
    expect(pick((await ali.get(`/academy/groups/${ids.de1}/sessions`)).body)).toBe(URL_);
    expect(pick((await assistant.get(`/academy/groups/${ids.de1}/sessions`)).body)).toBe(URL_);
    const alum = await alumni.get(`/academy/groups/${ids.de1}/sessions`);
    expect(alum.status).toBe(200);
    expect(pick(alum.body)).toBeNull();
    expect((await paused.get(`/academy/groups/${ids.de1}/sessions`)).status).toBe(403);
    expect((await veli.get(`/academy/groups/${ids.de1}/sessions`)).status).toBe(403);
    expect((await otherLead.get(`/academy/groups/${ids.de1}/sessions`)).status).toBe(403);
    // aralıq filtri
    const nov = await ali.get(
      `/academy/groups/${ids.de1}/sessions?from=2026-11-04T00:00:00Z&to=2026-11-10T00:00:00Z`,
    );
    expect(nov.body.map((s: { id: string }) => s.id)).toEqual([ids.s2, ids.s3]);

    const mine = await ali.get(
      '/academy/me/schedule?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z',
    );
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(4);
    expect(mine.body.find((s: { id: string }) => s.id === ids.s2).meetingUrl).toBe(URL_);
    expect(mine.body.find((s: { id: string }) => s.id === ids.s3).meetingUrl).toBeNull();
    const alumMine = await alumni.get(
      '/academy/me/schedule?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z',
    );
    expect(alumMine.body.every((s: { meetingUrl: string | null }) => s.meetingUrl === null)).toBe(
      true,
    );
    expect((await paused.get('/academy/me/schedule')).body).toEqual([]);
    expect(
      (await veli.get('/academy/me/schedule?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z'))
        .body,
    ).toEqual([]);
  });

  it('davamiyyət: köməkçi qeyd edir (upsert), yalnız bu qrupun tələbələri; gələcək / ləğv olunmuş dərs — 409', async () => {
    const r = await assistant.put(`/academy/sessions/${ids.past}/attendance`).send({
      records: [
        { studentId: ids.ali, status: 'PRESENT' },
        { studentId: ids.aysel, status: 'LATE', note: '10 dəq' },
        { studentId: ids.paused, status: 'ABSENT' },
      ],
    });
    expect(r.status).toBe(200);
    const row = (id: string) =>
      r.body.find((x: { student: { id: string } }) => x.student.id === id);
    expect(row(ids.ali)).toMatchObject({ status: 'PRESENT', enrollmentStatus: 'ACTIVE' });
    expect(row(ids.aysel)).toMatchObject({ status: 'LATE', note: '10 dəq' });
    expect(row(ids.alumni)).toBeUndefined();

    const again = await lead
      .put(`/academy/sessions/${ids.past}/attendance`)
      .send({ records: [{ studentId: ids.ali, status: 'EXCUSED' }] });
    expect(again.status).toBe(200);
    expect(await prisma.academyAttendance.count({ where: { sessionId: ids.past } })).toBe(3);
    expect(
      (
        await prisma.academyAttendance.findFirstOrThrow({
          where: { sessionId: ids.past, studentId: ids.ali },
        })
      ).status,
    ).toBe('EXCUSED');

    const foreign = await lead
      .put(`/academy/sessions/${ids.past}/attendance`)
      .send({ records: [{ studentId: ids.veli, status: 'PRESENT' }] });
    expect([foreign.status, foreign.body.code]).toEqual([422, 'ACADEMY_NOT_ENROLLED']);
    const alum = await lead
      .put(`/academy/sessions/${ids.past}/attendance`)
      .send({ records: [{ studentId: ids.alumni, status: 'PRESENT' }] });
    expect([alum.status, alum.body.code]).toEqual([422, 'ACADEMY_NOT_ENROLLED']);
    const dup = await lead.put(`/academy/sessions/${ids.past}/attendance`).send({
      records: [
        { studentId: ids.ali, status: 'PRESENT' },
        { studentId: ids.ali, status: 'ABSENT' },
      ],
    });
    expect([dup.status, dup.body.code]).toEqual([422, 'ACADEMY_DUPLICATE_STUDENT']);
    const future = await lead
      .put(`/academy/sessions/${ids.future}/attendance`)
      .send({ records: [{ studentId: ids.ali, status: 'PRESENT' }] });
    expect([future.status, future.body.code]).toEqual([409, 'ACADEMY_SESSION_NOT_STARTED']);
    const canc = await lead
      .put(`/academy/sessions/${ids.s3}/attendance`)
      .send({ records: [{ studentId: ids.ali, status: 'PRESENT' }] });
    expect([canc.status, canc.body.code]).toEqual([409, 'ACADEMY_SESSION_CANCELLED']);
    expect(
      (
        await ali
          .put(`/academy/sessions/${ids.past}/attendance`)
          .send({ records: [{ studentId: ids.ali, status: 'PRESENT' }] })
      ).status,
    ).toBe(403);
    expect((await ali.get(`/academy/sessions/${ids.past}/attendance`)).status).toBe(403);
    expect((await otherLead.get(`/academy/sessions/${ids.past}/attendance`)).status).toBe(403);

    // bazada: başqa qrupun tələbəsi bu dərsə yazıla bilməz (kompozit açar)
    await expect(
      prisma.academyAttendance.create({
        data: { sessionId: ids.past, groupId: ids.de1, studentId: ids.veli, status: 'PRESENT' },
      }),
    ).rejects.toThrow();
  });

  it('tələbənin öz davamiyyəti və faizi; üzrlü məxrəcə daxil deyil; davamiyyətli dərs silinmir', async () => {
    const a = await ali.get('/academy/me/attendance');
    expect(a.status).toBe(200);
    expect(a.body.records).toEqual([
      expect.objectContaining({ sessionId: ids.past, status: 'EXCUSED', groupCode: 'DE-001' }),
    ]);
    expect(a.body.groups[0]).toMatchObject({ groupCode: 'DE-001', rate: null, excused: 1 });
    const y = await aysel.get('/academy/me/attendance');
    expect(y.body.groups[0]).toMatchObject({ rate: 100, late: 1 });
    // dayandırılmış tələbə öz qeydini görür (öz qeydləri — PENDING-dən başqa)
    expect((await paused.get('/academy/me/attendance')).body.groups[0]).toMatchObject({
      rate: 0,
      absent: 1,
    });

    const del = await lead.delete(`/academy/sessions/${ids.past}`);
    expect([del.status, del.body.code]).toEqual([409, 'ACADEMY_SESSION_HAS_ATTENDANCE']);
    expect((await lead.delete(`/academy/sessions/${ids.future}`)).status).toBe(200);
  });

  it('tək dərs: qrup və icazələr; başqa qrup — 403', async () => {
    const r = await assistant.get(`/academy/sessions/${ids.s2}`);
    expect(r.status).toBe(200);
    expect(r.body.session).toMatchObject({ id: ids.s2, meetingUrl: URL_ });
    expect(r.body.group).toMatchObject({ code: 'DE-001', timezone: 'Asia/Baku' });
    expect(r.body.permissions).toContain('attendance.manage');
    expect(r.body.permissions).not.toContain('session.manage');
    expect((await alumni.get(`/academy/sessions/${ids.s2}`)).body.session.meetingUrl).toBeNull();
    expect((await veli.get(`/academy/sessions/${ids.s2}`)).status).toBe(403);
    expect((await paused.get(`/academy/sessions/${ids.s2}`)).status).toBe(403);
  });

  it('tələbə ümumi baxışında növbəti dərs (ləğv olunmuşlar keçilir, link ilə)', async () => {
    const o = await ali.get('/academy/me/overview');
    expect(o.status).toBe(200);
    expect(o.body.nextSession).toMatchObject({
      id: ids.s1,
      meetingUrl: URL_,
      status: 'RESCHEDULED',
    });
    expect((await veli.get('/academy/me/overview')).body.nextSession).toBeNull();
  });
});
