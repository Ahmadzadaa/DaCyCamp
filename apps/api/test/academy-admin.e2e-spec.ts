import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

type Agent = ReturnType<typeof agent>;
const day = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
};
const at = (offsetDays: number, hour: number) => {
  const d = new Date(day(offsetDays));
  d.setUTCHours(hour);
  return d.toISOString();
};

/**
 * Akademiya admin: proqramın redaktəsi, qrup tarixlərinin dəyişdirilməsi (mövcud dərslər və tapşırıq son tarixləri
 * yeni aralıqdan kənarda qala bilməz) və yazılış tarixçəsi (yalnız oxumaq üçün).
 */
describe('Academy admin workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let lead: Agent;
  let ali: Agent;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    const leadUser = await makeUser(prisma, 'aparici@test.local');
    const aliUser = await makeUser(prisma, 'ali@test.local');
    ids.ali = aliUser.id;
    admin = await login(app, 'admin@test.local', 'Admin123!');
    const prog = await admin
      .post('/academy/programs')
      .send({ title: 'Data Engineering', slug: 'de', status: 'ACTIVE' });
    ids.program = prog.body.id;
    const g = await admin.post('/academy/groups').send({
      programId: ids.program,
      code: 'DE-010',
      name: 'DE-010',
      status: 'ACTIVE',
      leadInstructorId: leadUser.id,
      startAt: day(-10),
      endAt: day(30),
    });
    expect(g.status).toBe(201);
    ids.group = g.body.id;
    const e = await admin
      .post(`/academy/groups/${ids.group}/enrollments`)
      .send({ userId: aliUser.id });
    ids.enrollment = e.body.id;
    lead = await login(app, 'aparici@test.local', 'Parol123!');
    ali = await login(app, 'ali@test.local', 'Parol123!');
  });
  afterAll(() => app.close());

  it('proqram redaktəsi: ad, təsvir, vəziyyət; yalnız admin; auditdə qalır', async () => {
    expect((await lead.patch(`/academy/programs/${ids.program}`).send({ title: 'X' })).status).toBe(
      403,
    );
    const r = await admin
      .patch(`/academy/programs/${ids.program}`)
      .send({ title: 'Data Engineering 2026', description: 'Yeni təsvir', status: 'DRAFT' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      title: 'Data Engineering 2026',
      description: 'Yeni təsvir',
      status: 'DRAFT',
      slug: 'de',
    });
    expect(await prisma.auditLog.count({ where: { action: 'academy.program.update' } })).toBe(1);
  });

  it('qrup tarixləri: dərs / tapşırıq yeni aralıqdan kənarda qalırsa 409; bitmə günü aralığa daxildir', async () => {
    // bitmə günündə (gün 30, saat 10:00) dərs və gün 20-də son tarixli tapşırıq
    const s = await lead.post(`/academy/groups/${ids.group}/sessions`).send({
      title: 'Son dərs',
      startsAt: at(30, 10),
      endsAt: at(30, 12),
    });
    expect(s.status).toBe(201);
    const a = await lead.post(`/academy/groups/${ids.group}/assignments`).send({
      title: 'Tapşırıq',
      type: 'CUSTOM_TASK',
      gradingType: 'MANUAL',
      availableAt: at(-1, 9),
      dueAt: at(20, 18),
      items: [{ kind: 'TEXT', title: 'Mətn', maxScore: 10 }],
    });
    expect(a.status).toBe(201);
    await lead.post(`/academy/assignments/${a.body.id}/publish`).send({ mode: 'now' });

    // bitmə günü dəyişmir — gün 30-dakı dərs aralıqdadır (günün sonuna qədər)
    expect(
      (await admin.patch(`/academy/groups/${ids.group}`).send({ endAt: day(30) })).status,
    ).toBe(200);
    // bitmə gün 25-ə çəkilir → gün 30-dakı dərs kənarda qalır
    const narrow = await admin.patch(`/academy/groups/${ids.group}`).send({ endAt: day(25) });
    expect(narrow.status).toBe(409);
    expect(narrow.body.code).toBe('ACADEMY_GROUP_DATES_CONFLICT');
    // başlanğıc tapşırığın açılışından sonraya çəkilir → tapşırıq kənarda qalır
    const late = await admin.patch(`/academy/groups/${ids.group}`).send({ startAt: day(5) });
    expect(late.status).toBe(409);
    // bitmə başlanğıcdan əvvəl ola bilməz
    expect(
      (await admin.patch(`/academy/groups/${ids.group}`).send({ endAt: day(-20) })).status,
    ).toBe(400);
    // genişləndirmək həmişə olar
    const wide = await admin
      .patch(`/academy/groups/${ids.group}`)
      .send({ startAt: day(-30), endAt: day(60) });
    expect(wide.status).toBe(200);
    expect(wide.body.endAt.slice(0, 10)).toBe(day(60).slice(0, 10));
    // müəllim tarixləri dəyişə bilmir
    expect((await lead.patch(`/academy/groups/${ids.group}`).send({ endAt: day(70) })).status).toBe(
      403,
    );
  });

  it('yazılış tarixçəsi: status dəyişiklikləri sırası ilə; tələbə öz tarixçəsini görür, başqası yox', async () => {
    expect(
      (
        await admin
          .patch(`/academy/enrollments/${ids.enrollment}`)
          .send({ status: 'PAUSED', reason: 'Ödəniş gecikir' })
      ).status,
    ).toBe(200);
    const h = await admin.get(`/academy/enrollments/${ids.enrollment}/history`);
    expect(h.status).toBe(200);
    expect(h.body.map((x: { toStatus: string }) => x.toStatus)).toEqual(['ACTIVE', 'PAUSED']);
    expect(h.body[1]).toMatchObject({ fromStatus: 'ACTIVE', reason: 'Ödəniş gecikir' });
    expect((await ali.get(`/academy/enrollments/${ids.enrollment}/history`)).status).toBe(200);
    await makeUser(prisma, 'yad@test.local');
    const other = await login(app, 'yad@test.local', 'Parol123!');
    expect((await other.get(`/academy/enrollments/${ids.enrollment}/history`)).status).toBe(403);
  });
});
