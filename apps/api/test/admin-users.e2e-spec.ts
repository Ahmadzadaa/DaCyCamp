import { INestApplication } from '@nestjs/common';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** Admin hər şeyə çatır: istifadəçi idarəsi, rolun dərhal qüvvəyə minməsi, sertifikat ləğvi, audit */
describe('admin: users + access', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ad: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let st: ReturnType<typeof agent>;
  let adminId: string;
  let studentId: string;
  let courseId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    adminId = b.admin.id;
    studentId = b.student.id;
    const course = await prisma.course.create({
      data: { trackId: b.track.id, slug: 'k1', title: 'Kurs 1', order: 1, isPublished: true },
    });
    courseId = course.id;
    ad = await login(app, 'admin@test.local', 'Admin123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    st = await login(app, 'telebe@test.local', 'Telebe123!');
  });
  afterAll(() => app.close());

  it('rol dəyişikliyi köhnə sessiyada dərhal qüvvəyə minir (token-dəki rol yox, baza)', async () => {
    expect((await st.get('/admin/courses')).status).toBe(403);
    await prisma.user.update({ where: { id: studentId }, data: { role: 'ADMIN' } });
    expect((await st.get('/admin/courses')).status).toBe(200);
    await prisma.user.update({ where: { id: studentId }, data: { role: 'STUDENT' } });
    expect((await st.get('/admin/courses')).status).toBe(403);
  });

  it('admin istifadəçi yaradır; e-poçt təkrarı 409; tələbə/müəllim yarada bilmir', async () => {
    const body = { name: 'Yeni Tələbə', email: 'Yeni@Test.local', password: 'Sifre1234' };
    expect((await st.post('/admin/users').send(body)).status).toBe(403);
    expect((await ins.post('/admin/users').send(body)).status).toBe(403);
    const r = await ad.post('/admin/users').send(body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ email: 'yeni@test.local', role: 'STUDENT' });
    expect((await ad.post('/admin/users').send(body)).status).toBe(409);
    // yeni hesabla giriş işləyir
    await login(app, 'yeni@test.local', 'Sifre1234');
  });

  it('kart: kurslar, sertifikatlar; müəllim baxa bilir, redaktə edə bilmir', async () => {
    await prisma.enrollment.create({ data: { userId: studentId, courseId, percent: 40 } });
    await prisma.certificate.create({
      data: {
        serial: 'DACY-C-2026-000001',
        userId: studentId,
        courseId,
        snapshot: { courseTitle: 'Kurs 1' },
      },
    });
    const r = await ins.get(`/admin/users/${studentId}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      email: 'telebe@test.local',
      enrollmentCount: 1,
      certificateCount: 1,
      enrollments: [expect.objectContaining({ slug: 'k1', percent: 40, deleted: false })],
      certificates: [expect.objectContaining({ title: 'Kurs 1', revokedAt: null })],
    });
    expect((await ins.patch(`/admin/users/${studentId}`).send({ name: 'X Y' })).status).toBe(403);
    expect((await st.get(`/admin/users/${studentId}`)).status).toBe(403);
  });

  it('admin profili redaktə edir; başqasının e-poçtu 409', async () => {
    const r = await ad
      .patch(`/admin/users/${studentId}`)
      .send({ name: 'Tələbə Yeni', email: 'telebe2@test.local' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ name: 'Tələbə Yeni', email: 'telebe2@test.local' });
    expect(
      (await ad.patch(`/admin/users/${studentId}`).send({ email: 'admin@test.local' })).status,
    ).toBe(409);
    expect((await ad.patch(`/admin/users/${studentId}`).send({})).status).toBe(400);
  });

  it('yeni şifrə: köhnə şifrə və sessiyalar etibarsız olur', async () => {
    const before = await login(app, 'telebe2@test.local', 'Telebe123!');
    const r = await ad.post(`/admin/users/${studentId}/password`).send({ password: 'YeniSifre1' });
    expect(r.status).toBe(200);
    expect(
      (
        await agent(app)
          .post('/auth/login')
          .send({ email: 'telebe2@test.local', password: 'Telebe123!' })
      ).status,
    ).toBe(401);
    await login(app, 'telebe2@test.local', 'YeniSifre1');
    // refresh token ləğv olunub
    expect((await before.post('/auth/refresh')).status).toBe(401);
    expect(
      (await ad.post(`/admin/users/${studentId}/password`).send({ password: 'qisa' })).status,
    ).toBe(400);
  });

  it('sertifikat ləğvi və bərpası (yoxlama səhifəsində görünür)', async () => {
    const cert = await prisma.certificate.findFirstOrThrow({ where: { userId: studentId } });
    expect((await st.post(`/admin/certificates/${cert.id}/revoke`)).status).toBe(403);
    const r = await ad.post(`/admin/certificates/${cert.id}/revoke`);
    expect(r.status).toBe(200);
    expect((await agent(app).get(`/certificates/${cert.id}`)).body.revokedAt).toBeTruthy();
    expect((await ad.post(`/admin/certificates/${cert.id}/restore`)).status).toBe(200);
    expect((await agent(app).get(`/certificates/${cert.id}`)).body.revokedAt).toBeNull();
  });

  it('özünü admin-likdən çıxarmaq və silmək olmur; sonuncu admin qorunur', async () => {
    expect((await ad.patch(`/admin/users/${adminId}`).send({ role: 'STUDENT' })).body.code).toBe(
      'SELF_ACTION',
    );
    expect((await ad.patch(`/admin/users/${adminId}/role`).send({ role: 'STUDENT' })).status).toBe(
      400,
    );
    expect((await ad.delete(`/admin/users/${adminId}`)).body.code).toBe('SELF_ACTION');
    // ikinci admin yarat → birinci admin onu sila bilər; sonuncu admin silinə / endirilə bilməz
    const second = await ad.post('/admin/users').send({
      name: 'İkinci Admin',
      email: 'admin2@test.local',
      password: 'Sifre1234',
      role: 'ADMIN',
    });
    expect(second.status).toBe(201);
    const ad2 = await login(app, 'admin2@test.local', 'Sifre1234');
    expect((await ad2.patch(`/admin/users/${adminId}`).send({ role: 'INSTRUCTOR' })).status).toBe(
      200,
    );
    // indi yeganə admin ad2-dir: ad (artıq müəllim) heç nə edə bilməz, ad2 özünü endirə bilməz
    expect((await ad.get('/admin/audit')).status).toBe(403);
    expect(
      (await ad2.patch(`/admin/users/${second.body.id}`).send({ role: 'STUDENT' })).body.code,
    ).toBe('SELF_ACTION');
    expect((await ad2.patch(`/admin/users/${adminId}`).send({ role: 'ADMIN' })).status).toBe(200);
  });

  it('hesabı silmək: məlumat cascade ilə gedir, köhnə sessiya dərhal 401', async () => {
    const victim = await login(app, 'telebe2@test.local', 'YeniSifre1');
    expect((await victim.get('/auth/me')).status).toBe(200);
    expect((await ins.delete(`/admin/users/${studentId}`)).status).toBe(403);
    const r = await ad.delete(`/admin/users/${studentId}`);
    expect(r.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: studentId } })).toBeNull();
    expect(await prisma.enrollment.count({ where: { userId: studentId } })).toBe(0);
    expect(await prisma.certificate.count({ where: { userId: studentId } })).toBe(0);
    expect((await victim.get('/auth/me')).status).toBe(401);
    expect((await ad.delete(`/admin/users/${studentId}`)).status).toBe(404);
  });

  it('bütün admin əməliyyatları tarixçəyə düşür', async () => {
    const r = await ad.get('/admin/audit?limit=100');
    const actions = r.body.items.map((i: { action: string }) => i.action);
    for (const a of [
      'user.create',
      'user.update',
      'user.password',
      'user.delete',
      'certificate.revoke',
      'certificate.restore',
    ])
      expect(actions).toContain(a);
    const del = r.body.items.find((i: { action: string }) => i.action === 'user.delete');
    expect(del.entityTitle).toBe('telebe2@test.local');
  });
});
