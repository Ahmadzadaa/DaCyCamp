import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { env } from '../src/config/env';
import { agent, createApp, login, makeUser, resetDb, seedBasics } from './helpers';

/**
 * Akademiya — Mərhələ 1: proqram, qrup, müəllim, yazılış, resurs səviyyəli icazələr, funksiya bayrağı.
 * Üfüqi (başqa qrup / başqa tələbə) və şaquli (rol yüksəltmə) icazə pozuntuları yoxlanılır.
 */
describe('Academy organization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: ReturnType<typeof agent>;
  let globalInstructor: ReturnType<typeof agent>;
  let ids: Record<string, string>;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const lead = await makeUser(prisma, 'ziyad@test.local');
    const lead2 = await makeUser(prisma, 'lead2@test.local');
    const assistant = await makeUser(prisma, 'komekci@test.local');
    const ali = await makeUser(prisma, 'ali@test.local');
    const aysel = await makeUser(prisma, 'aysel@test.local');
    const outsider = await makeUser(prisma, 'kenar@test.local');
    const spare = await makeUser(prisma, 'yedek@test.local');
    ids = {
      admin: b.admin.id,
      globalInstructor: b.instructor.id,
      student: b.student.id,
      lead: lead.id,
      lead2: lead2.id,
      assistant: assistant.id,
      ali: ali.id,
      aysel: aysel.id,
      outsider: outsider.id,
      spare: spare.id,
    };
    admin = await login(app, 'admin@test.local', 'Admin123!');
    globalInstructor = await login(app, 'muellim@test.local', 'Muellim123!');
  });
  afterAll(async () => {
    env.ACADEMY_MANAGEMENT_ENABLED = true;
    await app.close();
  });

  const as = (email: string) => login(app, email, 'Parol123!');

  it('funksiya bayrağı söndürüləndə endpoint-lər 404, /me/summary-də akademiya yoxdur', async () => {
    env.ACADEMY_MANAGEMENT_ENABLED = false;
    const r = await admin.get('/academy/programs');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('ACADEMY_DISABLED');
    const s = await admin.get('/me/summary');
    expect(s.status).toBe(200);
    expect(s.body.academy).toBeNull();
    // mövcud platforma işləməyə davam edir
    expect((await admin.get('/tracks')).status).toBe(200);
    env.ACADEMY_MANAGEMENT_ENABLED = true;
  });

  it('proqramı yalnız admin yaradır (qlobal INSTRUCTOR rolu və tələbə — 403)', async () => {
    const body = { title: 'Data Engineering', slug: 'data-engineering', status: 'ACTIVE' };
    expect((await globalInstructor.post('/academy/programs').send(body)).status).toBe(403);
    const stu = await login(app, 'telebe@test.local', 'Telebe123!');
    expect((await stu.post('/academy/programs').send(body)).status).toBe(403);
    // müştəri rolunu sorğu sahəsi ilə elan edə bilməz
    expect((await stu.post('/academy/programs').send({ ...body, role: 'ADMIN' })).status).toBe(403);

    const r = await admin.post('/academy/programs').send(body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ slug: 'data-engineering', status: 'ACTIVE', groupCount: 0 });
    ids.de = r.body.id;
    expect((await admin.post('/academy/programs').send(body)).status).toBe(409);
    const cs = await admin
      .post('/academy/programs')
      .send({ title: 'Cyber Security', slug: 'cyber-security', status: 'ACTIVE' });
    ids.cs = cs.body.id;
    const list = await admin.get('/academy/programs');
    expect(list.body.map((p: { slug: string }) => p.slug).sort()).toEqual([
      'cyber-security',
      'data-engineering',
    ]);
    expect((await globalInstructor.get('/academy/programs')).status).toBe(403);
  });

  it('admin qrup yaradır: aparıcı + köməkçi müəllim, kodun unikallığı, defolt vaxt zonası', async () => {
    const r = await admin.post('/academy/groups').send({
      programId: ids.de,
      code: 'de-001',
      name: 'Data Engineering — DE-001',
      status: 'ACTIVE',
      capacity: 3,
      leadInstructorId: ids.lead,
      assistantInstructorIds: [ids.assistant],
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      code: 'DE-001',
      timezone: 'Asia/Baku',
      format: 'ONLINE',
      myRole: 'ADMIN',
    });
    expect(r.body.instructors.map((i: { role: string }) => i.role)).toEqual(['LEAD', 'ASSISTANT']);
    ids.de1 = r.body.id;
    expect(
      (await admin.post('/academy/groups').send({ programId: ids.de, code: 'DE-001', name: 'x' }))
        .status,
    ).toBe(409);
    const cs = await admin.post('/academy/groups').send({
      programId: ids.cs,
      code: 'CS-001',
      name: 'Cyber Security — CS-001',
      status: 'ACTIVE',
      leadInstructorId: ids.lead2,
    });
    ids.cs1 = cs.body.id;
    expect(
      (
        await globalInstructor
          .post('/academy/groups')
          .send({ programId: ids.de, code: 'X-1', name: 'x' })
      ).status,
    ).toBe(403);
  });

  it('qrupda bir aktiv aparıcı müəllim (bazada unikal), müəllimin rolu dəyişir', async () => {
    const r = await admin
      .post(`/academy/groups/${ids.de1}/instructors`)
      .send({ userId: ids.lead2, role: 'LEAD' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('ACADEMY_LEAD_EXISTS');
    const ok = await admin
      .post(`/academy/groups/${ids.de1}/instructors`)
      .send({ userId: ids.lead2, role: 'ASSISTANT' });
    expect(ok.status).toBe(201);
    expect(ok.body.instructors).toHaveLength(3);
    // çıxarılır
    const rm = await admin.delete(`/academy/groups/${ids.de1}/instructors/${ids.lead2}`);
    expect(rm.status).toBe(200);
    expect(rm.body.instructors).toHaveLength(2);
  });

  it('yazılış: e-poçt ilə, təkrar yazılış 409, müəllim eyni qrupa tələbə ola bilməz', async () => {
    const r = await admin
      .post(`/academy/groups/${ids.de1}/enrollments`)
      .send({ email: 'ali@test.local' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'ACTIVE', student: { id: ids.ali } });
    ids.aliEnr = r.body.id;
    const dup = await admin
      .post(`/academy/groups/${ids.de1}/enrollments`)
      .send({ userId: ids.ali });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ACADEMY_ALREADY_ENROLLED');
    const asStudent = await admin
      .post(`/academy/groups/${ids.de1}/enrollments`)
      .send({ userId: ids.lead });
    expect(asStudent.body.code).toBe('ACADEMY_STUDENT_IS_INSTRUCTOR');
    await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids.student });
    const asInstr = await admin
      .post(`/academy/groups/${ids.de1}/instructors`)
      .send({ userId: ids.student, role: 'ASSISTANT' });
    expect(asInstr.body.code).toBe('ACADEMY_INSTRUCTOR_IS_STUDENT');
    // yazılış hadisəsi outbox-a düşüb (bildiriş üçün)
    const ev = await prisma.academyOutboxEvent.findMany({ where: { type: 'ENROLLMENT_CREATED' } });
    expect(ev.length).toBeGreaterThanOrEqual(2);
  });

  it('tutum paralel sorğularda da keçilmir (qrup sətri kilidlənir)', async () => {
    // tutum 3: ali + telebe artıq var → yalnız bir yer qalıb
    const [a, b] = await Promise.all([
      admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids.aysel }),
      admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids.spare }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.code).toBe('ACADEMY_CAPACITY_REACHED');
    expect(
      await prisma.academyEnrollment.count({
        where: { groupId: ids.de1, status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
      }),
    ).toBe(3);
    // admin tutumu açıq şəkildə keçə bilər (auditdə qeyd)
    const loserId = a.status === 409 ? ids.aysel : ids.spare;
    const ov = await admin
      .post(`/academy/groups/${ids.de1}/enrollments`)
      .send({ userId: loserId, overrideCapacity: true });
    expect(ov.status).toBe(201);
    // sonra hamını əvvəlki vəziyyətə: yedek tələbə çıxır
    const spareEnr = await prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: ids.de1, studentId: ids.spare } },
    });
    if (spareEnr)
      await admin
        .patch(`/academy/enrollments/${spareEnr.id}`)
        .send({ status: 'WITHDRAWN', reason: 'test' });
    const ayselEnr = await prisma.academyEnrollment.findUnique({
      where: { groupId_studentId: { groupId: ids.de1, studentId: ids.aysel } },
    });
    if (!ayselEnr || ayselEnr.status !== 'ACTIVE') {
      await admin.patch(`/academy/groups/${ids.de1}`).send({ capacity: 10 });
      await admin.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids.aysel });
    }
  });

  it('müəllim yalnız öz qrupunu görür; qlobal INSTRUCTOR rolu akademiya hüququ vermir', async () => {
    const lead = await as('ziyad@test.local');
    const list = await lead.get('/academy/groups');
    expect(list.status).toBe(200);
    expect(list.body.items.map((g: { code: string }) => g.code)).toEqual(['DE-001']);
    expect(list.body.items[0].myRole).toBe('LEAD');
    expect(list.body.items[0].permissions).toContain('assignment.publish');
    // başqa qrup — URL-də ID dəyişmək icazəni aşmır
    expect((await lead.get(`/academy/groups/${ids.cs1}`)).status).toBe(403);
    expect((await lead.get(`/academy/groups/${ids.cs1}/students`)).status).toBe(403);
    // müəllim təşkilati əməliyyat edə bilmir
    expect(
      (await lead.post(`/academy/groups/${ids.de1}/enrollments`).send({ userId: ids.outsider }))
        .status,
    ).toBe(403);
    expect((await lead.patch(`/academy/groups/${ids.de1}`).send({ capacity: 50 })).status).toBe(
      403,
    );
    // qlobal INSTRUCTOR (məzmun heyəti) — heç bir qrupa aid deyil
    const gi = await globalInstructor.get('/academy/groups');
    expect(gi.body.items).toEqual([]);
    expect((await globalInstructor.get(`/academy/groups/${ids.de1}`)).status).toBe(403);
    // roster: müəllim görür
    const roster = await lead.get(`/academy/groups/${ids.de1}/students`);
    expect(roster.status).toBe(200);
    expect(roster.body.total).toBeGreaterThanOrEqual(3);
  });

  it('tələbə: öz qrupunu görür, roster və başqa qrup 403; kənar istifadəçi heç nə görmür', async () => {
    const ali = await as('ali@test.local');
    const list = await ali.get('/academy/groups');
    expect(list.body.items.map((g: { code: string }) => g.code)).toEqual(['DE-001']);
    expect(list.body.items[0].myRole).toBe('STUDENT');
    expect(list.body.items[0].permissions).toEqual(
      expect.arrayContaining(['group.view', 'student.submit', 'student.viewContent']),
    );
    expect(list.body.items[0].instructors[0].user.email).toBeUndefined();
    expect((await ali.get(`/academy/groups/${ids.de1}/students`)).status).toBe(403);
    expect((await ali.get(`/academy/groups/${ids.cs1}`)).status).toBe(403);
    const sum = await ali.get('/me/summary');
    expect(sum.body.academy).toEqual({
      enabled: true,
      student: true,
      instructor: false,
      admin: false,
    });

    const out = await as('kenar@test.local');
    expect((await out.get(`/academy/groups/${ids.de1}`)).status).toBe(403);
    expect((await out.get('/academy/groups')).body.items).toEqual([]);
    expect((await out.get('/me/summary')).body.academy).toMatchObject({
      student: false,
      instructor: false,
    });
    expect((await out.get('/academy/groups/yoxdur')).status).toBe(404);
  });

  it('yazılış dayandırılanda məzmun hüququ dərhal itir, tarixçə qalır; yenidən aktivləşir', async () => {
    const ali = await as('ali@test.local');
    const p = await admin
      .patch(`/academy/enrollments/${ids.aliEnr}`)
      .send({ status: 'PAUSED', reason: 'ödəniş' });
    expect(p.status).toBe(200);
    expect((await ali.get(`/academy/groups/${ids.de1}`)).status).toBe(403);
    expect((await ali.get('/me/summary')).body.academy.student).toBe(true);
    const bad = await admin.patch(`/academy/enrollments/${ids.aliEnr}`).send({ status: 'PENDING' });
    expect(bad.status).toBe(409);
    expect(bad.body.code).toBe('ACADEMY_ENROLLMENT_TRANSITION');
    await admin.patch(`/academy/enrollments/${ids.aliEnr}`).send({ status: 'ACTIVE' });
    expect((await ali.get(`/academy/groups/${ids.de1}`)).status).toBe(200);
    const hist = await ali.get(`/academy/enrollments/${ids.aliEnr}/history`);
    expect(hist.status).toBe(200);
    expect(hist.body.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      'ACTIVE',
      'PAUSED',
      'ACTIVE',
    ]);
    expect(hist.body[1].reason).toBe('ödəniş');
    // başqa tələbə bu tarixçəni görə bilməz
    const aysel = await as('aysel@test.local');
    expect((await aysel.get(`/academy/enrollments/${ids.aliEnr}/history`)).status).toBe(403);
  });

  it('müəllim qrupdan çıxarılanda hüquqları dərhal itir; yenidən təyin edilə bilər', async () => {
    const asst = await as('komekci@test.local');
    expect((await asst.get(`/academy/groups/${ids.de1}`)).status).toBe(200);
    await admin.delete(`/academy/groups/${ids.de1}/instructors/${ids.assistant}`);
    expect((await asst.get(`/academy/groups/${ids.de1}`)).status).toBe(403);
    expect((await asst.get('/academy/groups')).body.items).toEqual([]);
    await admin
      .post(`/academy/groups/${ids.de1}/instructors`)
      .send({ userId: ids.assistant, role: 'ASSISTANT' });
    const g = await asst.get(`/academy/groups/${ids.de1}`);
    expect(g.status).toBe(200);
    expect(g.body.myRole).toBe('ASSISTANT');
    expect(g.body.permissions).not.toContain('assignment.publish');
  });

  it('qrupun həyat dövrü: icazəsiz keçid 409, arxiv dəyişdirilmir, akademik tarix qalır', async () => {
    const r = await admin.patch(`/academy/groups/${ids.cs1}`).send({ status: 'ARCHIVED' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('ACADEMY_GROUP_TRANSITION');
    const tmp = await admin
      .post('/academy/groups')
      .send({ programId: ids.cs, code: 'CS-002', name: 'CS-002' });
    expect(
      (await admin.patch(`/academy/groups/${tmp.body.id}`).send({ status: 'CANCELLED' })).status,
    ).toBe(200);
    expect(
      (await admin.patch(`/academy/groups/${tmp.body.id}`).send({ status: 'ARCHIVED' })).status,
    ).toBe(200);
    expect(
      (await admin.patch(`/academy/groups/${tmp.body.id}`).send({ name: 'yeni' })).status,
    ).toBe(409);
    expect(
      (
        await admin
          .post(`/academy/groups/${tmp.body.id}/enrollments`)
          .send({ userId: ids.outsider })
      ).body.code,
    ).toBe('ACADEMY_GROUP_CLOSED');
    // tutumu mövcud tələbə sayından aşağı salmaq olmur
    const cap = await admin.patch(`/academy/groups/${ids.de1}`).send({ capacity: 1 });
    expect(cap.status).toBe(409);
    expect(cap.body.code).toBe('ACADEMY_CAPACITY_BELOW_ACTIVE');
  });

  it('əlaqəli platforma kursları: yalnız admin təyin edir, qrup üzvləri görür', async () => {
    const course = await prisma.course.create({
      data: {
        trackId: (await prisma.track.findFirstOrThrow()).id,
        slug: 'sql-baslangic',
        title: 'SQL başlanğıc',
        order: 1,
        isPublished: true,
      },
    });
    const lead = await as('ziyad@test.local');
    expect(
      (await lead.put(`/academy/groups/${ids.de1}/courses`).send({ courseIds: [course.id] }))
        .status,
    ).toBe(403);
    const r = await admin
      .put(`/academy/groups/${ids.de1}/courses`)
      .send({ courseIds: [course.id] });
    expect(r.status).toBe(200);
    expect(r.body).toEqual([
      { courseId: course.id, slug: 'sql-baslangic', title: 'SQL başlanğıc' },
    ]);
    const ali = await as('ali@test.local');
    expect((await ali.get(`/academy/groups/${ids.de1}/courses`)).body).toHaveLength(1);
    const out = await as('kenar@test.local');
    expect((await out.get(`/academy/groups/${ids.de1}/courses`)).status).toBe(403);
  });

  it('akademiya əməliyyatları audit jurnalına yazılır (parolsuz)', async () => {
    const rows = await prisma.auditLog.findMany({ where: { action: { startsWith: 'academy.' } } });
    const actions = new Set(rows.map((r) => r.action));
    for (const a of [
      'academy.program.create',
      'academy.group.create',
      'academy.instructor.assign',
      'academy.instructor.remove',
      'academy.enrollment.create',
      'academy.enrollment.update',
    ])
      expect(actions).toContain(a);
    expect(JSON.stringify(rows)).not.toMatch(/password|passwordHash|Parol123/);
  });
});
