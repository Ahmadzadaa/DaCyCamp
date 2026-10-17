import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { isJoinCodeShape } from '@dacy/shared';
import type { PrismaService } from '../src/prisma/prisma.service';
import { env } from '../src/config/env';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

/**
 * Akademiya — qoşulma kodu ilə qeydiyyat və ayrıca müəllim hesabı (TEACHER).
 * Kod yalnız admin üçün görünür; kod keçməsə hesab da yaranmır; tutum paralel sorğularda da qorunur;
 * müəllim hesabı tələbə kimi yazılmır və Camp admin hüquqları almır.
 */
describe('Academy join codes and teacher accounts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: ReturnType<typeof agent>;
  const ids: Record<string, string> = {};
  const codes: Record<string, string> = {};

  const register = (body: Record<string, unknown>) =>
    agent(app).post('/academy/join/register').send(body);
  const userCount = (email: string) => prisma.user.count({ where: { email } });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    const lead = await makeUser(prisma, 'lead@test.local');
    ids.lead = lead.id;
    admin = await login(app, 'admin@test.local', 'Admin123!');
    const p = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'data-engineering', status: 'ACTIVE' });
    ids.program = p.body.id;
    for (const [key, code, capacity] of [
      ['de1', 'DE-001', null],
      ['de2', 'DE-002', null],
      ['small', 'DE-003', 1],
    ] as const) {
      const g = await admin.post('/academy/groups').send({
        programId: ids.program,
        code,
        name: `Data Engineering — ${code}`,
        status: 'ACTIVE',
        capacity,
        leadInstructorId: key === 'de1' ? ids.lead : undefined,
      });
      expect(g.status).toBe(201);
      ids[key] = g.body.id;
      codes[key] = g.body.joinCode;
    }
  });
  afterAll(async () => {
    env.ACADEMY_MANAGEMENT_ENABLED = true;
    await app.close();
  });

  it('hər qrupun öz təsadüfi kodu var, onu yalnız admin görür', async () => {
    expect(isJoinCodeShape(codes.de1!)).toBe(true);
    expect(new Set(Object.values(codes)).size).toBe(3);
    expect(codes.de1).not.toContain('DE');
    const leadAgent = await login(app, 'lead@test.local', 'Parol123!');
    const asLead = await leadAgent.get(`/academy/groups/${ids.de1}`);
    expect(asLead.status).toBe(200);
    expect(asLead.body.joinCode).toBeUndefined();
    const list = await admin.get('/academy/groups');
    expect(list.body.items.every((g: { joinCode?: string }) => !!g.joinCode)).toBe(true);
  });

  it('kodu yoxlamaq: düzgün kod qrupu göstərir, kiçik hərf və tire də qəbul olunur', async () => {
    const pretty = `${codes.de2!.slice(0, 4)}-${codes.de2!.slice(4)}`.toLowerCase();
    const r = await agent(app).post('/academy/join/check').send({ code: pretty });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      group: { code: 'DE-002', name: 'Data Engineering — DE-002' },
      program: { title: 'Data Engineering' },
    });
    // qrupun daxili kodu (DE-002) qoşulma kodu deyil
    const wrong = await agent(app).post('/academy/join/check').send({ code: 'ABCDEFGH' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.code).toBe('ACADEMY_JOIN_CODE_INVALID');
    expect((await agent(app).post('/academy/join/check').send({ code: 'DE-002' })).status).toBe(
      400,
    );
  });

  it('akademiyaya qeydiyyat: hesab + qrupa ACTIVE yazılış bir addımda, Camp da açıq qalır', async () => {
    const a = agent(app);
    const r = await a.post('/academy/join/register').send({
      name: 'Leyla Məmmədova',
      email: 'leyla@test.local',
      password: 'Parol123!',
      code: codes.de2,
    });
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: 'leyla@test.local', role: 'STUDENT' });
    expect(r.body.joined).toMatchObject({ groupId: ids.de2, groupCode: 'DE-002' });
    expect(String(r.headers['set-cookie'])).toContain('dacy_');
    // cookie ilə dərhal daxil olub
    const sum = await a.get('/me/summary');
    expect(sum.body.academy).toMatchObject({ student: true, instructor: false });
    expect((await a.get('/academy/me/overview')).status).toBe(200);
    expect((await a.get('/tracks')).status).toBe(200);
    const enr = await prisma.academyEnrollment.findFirstOrThrow({
      where: { groupId: ids.de2, student: { email: 'leyla@test.local' } },
      include: { events: true },
    });
    expect(enr.status).toBe('ACTIVE');
    expect(enr.events[0]).toMatchObject({ toStatus: 'ACTIVE', reason: 'join code' });
    expect(
      await prisma.academyOutboxEvent.count({
        where: { type: 'ENROLLMENT_CREATED', payload: { path: ['enrollmentId'], equals: enr.id } },
      }),
    ).toBe(1);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'academy.enrollment.join' },
    });
    expect(JSON.stringify(audit)).not.toContain(codes.de2!);
  });

  it('yanlış kod: xəta və hesab yaranmır (e-poçt boş qalır)', async () => {
    const r = await register({
      name: 'Səhv Kod',
      email: 'sehv@test.local',
      password: 'Parol123!',
      code: 'ZZZZZZZZ',
    });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('ACADEMY_JOIN_CODE_INVALID');
    expect(await userCount('sehv@test.local')).toBe(0);
    expect(r.headers['set-cookie']).toBeUndefined();
  });

  it('yalnız Camp üçün qeydiyyat: akademiyaya giriş yoxdur', async () => {
    const a = agent(app);
    const r = await a
      .post('/auth/register')
      .send({ name: 'Camp Tələbəsi', email: 'camp@test.local', password: 'Parol123!' });
    expect(r.status).toBe(201);
    const sum = await a.get('/me/summary');
    expect(sum.body.academy).toMatchObject({ student: false, instructor: false, admin: false });
    expect((await a.get(`/academy/groups/${ids.de2}`)).status).toBe(403);
  });

  it('daxil olmuş Camp istifadəçisi sonra kodla qoşulur; ikinci dəfə — artıq qrupdasınız', async () => {
    const a = await login(app, 'camp@test.local', 'Parol123!');
    const r = await a.post('/academy/join').send({ code: codes.de1 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ groupId: ids.de1, groupCode: 'DE-001' });
    expect((await a.get('/me/summary')).body.academy.student).toBe(true);
    const again = await a.post('/academy/join').send({ code: codes.de1 });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ACADEMY_ALREADY_MEMBER');
    // eyni tələbə ikinci qrupa da öz kodu ilə qoşula bilər
    expect((await a.post('/academy/join').send({ code: codes.de2 })).status).toBe(200);
    // anonim qoşulma — giriş tələb olunur
    expect((await agent(app).post('/academy/join').send({ code: codes.de1 })).status).toBe(401);
  });

  it('tutum: dolu qrupa kodla yazılmaq olmur, hesab da yaranmır', async () => {
    const ok = await register({
      name: 'Birinci',
      email: 'birinci@test.local',
      password: 'Parol123!',
      code: codes.small,
    });
    expect(ok.status).toBe(201);
    const full = await register({
      name: 'İkinci',
      email: 'ikinci@test.local',
      password: 'Parol123!',
      code: codes.small,
    });
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('ACADEMY_CAPACITY_REACHED');
    expect(await userCount('ikinci@test.local')).toBe(0);
  });

  it('paralel qeydiyyatlar tutumu keçə bilmir (qrup sətri kilidlənir)', async () => {
    const g = await admin.post('/academy/groups').send({
      programId: ids.program,
      code: 'DE-004',
      name: 'Data Engineering — DE-004',
      status: 'ACTIVE',
      capacity: 1,
    });
    const rs = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        register({
          name: `Paralel ${n}`,
          email: `paralel${n}@test.local`,
          password: 'Parol123!',
          code: g.body.joinCode,
        }),
      ),
    );
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await prisma.user.count({ where: { email: { startsWith: 'paralel' } } })).toBe(1);
    expect(await prisma.academyEnrollment.count({ where: { groupId: g.body.id } })).toBe(1);
  });

  it('admin kodu yeniləyir: köhnə kod dərhal etibarsız, qoşulmuşlar qalır; başqası yeniləyə bilmir', async () => {
    const leadAgent = await login(app, 'lead@test.local', 'Parol123!');
    expect((await leadAgent.post(`/academy/groups/${ids.de2}/join-code/rotate`)).status).toBe(403);
    const old = codes.de2!;
    const r = await admin.post(`/academy/groups/${ids.de2}/join-code/rotate`);
    expect(r.status).toBe(200);
    expect(r.body.joinCode).not.toBe(old);
    expect(isJoinCodeShape(r.body.joinCode)).toBe(true);
    codes.de2 = r.body.joinCode;
    expect((await agent(app).post('/academy/join/check').send({ code: old })).status).toBe(422);
    expect((await agent(app).post('/academy/join/check').send({ code: codes.de2 })).status).toBe(
      200,
    );
    // artıq qoşulan Leyla qrupda qalır
    expect(
      await prisma.academyEnrollment.count({
        where: { groupId: ids.de2, status: 'ACTIVE', student: { email: 'leyla@test.local' } },
      }),
    ).toBe(1);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'academy.group.joinCode.rotate' },
    });
    expect(JSON.stringify(audit)).not.toContain(codes.de2);
  });

  it('kod söndürüləndə və qrup bitəndə qoşulmaq olmur; admin çıxardığı tələbə kodla geri qayıtmır', async () => {
    expect(
      (await admin.patch(`/academy/groups/${ids.de1}`).send({ joinEnabled: false })).status,
    ).toBe(200);
    const off = await agent(app).post('/academy/join/check').send({ code: codes.de1 });
    expect(off.status).toBe(422);
    expect(off.body.code).toBe('ACADEMY_JOIN_CODE_INVALID');
    await admin.patch(`/academy/groups/${ids.de1}`).send({ joinEnabled: true });

    // çıxarılan tələbə
    const enr = await prisma.academyEnrollment.findFirstOrThrow({
      where: { groupId: ids.de1, student: { email: 'camp@test.local' } },
    });
    expect(
      (await admin.patch(`/academy/enrollments/${enr.id}`).send({ status: 'WITHDRAWN' })).status,
    ).toBe(200);
    const camp = await login(app, 'camp@test.local', 'Parol123!');
    const back = await camp.post('/academy/join').send({ code: codes.de1 });
    expect(back.status).toBe(409);
    expect(back.body.code).toBe('ACADEMY_JOIN_NOT_ALLOWED');

    // bitmiş qrup
    expect(
      (await admin.patch(`/academy/groups/${ids.small}`).send({ status: 'COMPLETED' })).status,
    ).toBe(200);
    const closed = await agent(app).post('/academy/join/check').send({ code: codes.small });
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe('ACADEMY_JOIN_CLOSED');
  });

  it('müəllim hesabı: admin yaradır, Camp admin hüququ yoxdur, tələbə kimi yazılmır, təyin olunanda qrupu görür', async () => {
    const created = await admin.post('/admin/users').send({
      name: 'Nigar Müəllim',
      email: 'nigar@test.local',
      password: 'Muellim123!',
      role: 'TEACHER',
    });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe('TEACHER');
    ids.teacher = created.body.id;

    const teacher = await login(app, 'nigar@test.local', 'Muellim123!');
    expect((await teacher.get('/me/summary')).body.academy).toMatchObject({
      teacherAccount: true,
      instructor: false,
      student: false,
    });
    // Camp məzmun heyətinin hüquqları yoxdur
    expect((await teacher.get('/admin/users')).status).toBe(403);
    expect((await teacher.get('/admin/overview')).status).toBe(403);
    // hələ qrupa təyin olunmayıb — boş panel
    const empty = await teacher.get('/academy/instructor/overview');
    expect(empty.status).toBe(200);
    expect(empty.body.groups).toEqual([]);
    expect((await teacher.get(`/academy/groups/${ids.de2}`)).status).toBe(403);

    // müəllim hesabı tələbə ola bilməz
    const j = await teacher.post('/academy/join').send({ code: codes.de2 });
    expect(j.status).toBe(409);
    expect(j.body.code).toBe('ACADEMY_TEACHER_ACCOUNT');
    const e = await admin
      .post(`/academy/groups/${ids.de2}/enrollments`)
      .send({ email: 'nigar@test.local' });
    expect(e.status).toBe(409);
    expect(e.body.code).toBe('ACADEMY_TEACHER_ACCOUNT');

    // admin aparıcı müəllim təyin edir → qrup panelində görünür
    expect(
      (
        await admin
          .post(`/academy/groups/${ids.de2}/instructors`)
          .send({ userId: ids.teacher, role: 'LEAD' })
      ).status,
    ).toBe(201);
    const o = await teacher.get('/academy/instructor/overview');
    expect(o.body.groups.map((g: { code: string }) => g.code)).toEqual(['DE-002']);
    expect((await teacher.get(`/academy/groups/${ids.de2}`)).body.myRole).toBe('LEAD');
  });

  it('qeydiyyat sorğusu rol göndərə bilməz; modul söndürüləndə qoşulma 404', async () => {
    const r = await register({
      name: 'Rol Oyunu',
      email: 'rol@test.local',
      password: 'Parol123!',
      code: codes.de2,
      role: 'ADMIN',
    });
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe('STUDENT');

    env.ACADEMY_MANAGEMENT_ENABLED = false;
    const off = await request(app.getHttpServer())
      .post('/academy/join/check')
      .send({ code: codes.de2 });
    expect(off.status).toBe(404);
    env.ACADEMY_MANAGEMENT_ENABLED = true;
  });
});
