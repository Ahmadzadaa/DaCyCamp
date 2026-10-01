import { INestApplication } from '@nestjs/common';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { COOKIE_ACCESS, COOKIE_REFRESH } from '@dacy/shared';

describe('auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
  });
  afterAll(() => app.close());

  it('qeydiyyat → cookie-lər + /auth/me', async () => {
    const a = agent(app);
    const r = await a
      .post('/auth/register')
      .send({ name: 'Yeni İstifadəçi', email: 'Yeni@Test.local', password: 'Sifre1234' });
    expect(r.status).toBe(201);
    expect(r.body.role).toBe('STUDENT');
    expect(r.body.email).toBe('yeni@test.local');
    const cookies = r.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith(`${COOKIE_ACCESS}=`) && c.includes('HttpOnly'))).toBe(
      true,
    );
    expect(cookies.some((c) => c.startsWith(`${COOKIE_REFRESH}=`) && c.includes('Path=/'))).toBe(
      true,
    );
    const me = await a.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.name).toBe('Yeni İstifadəçi');
  });

  it('eyni e-poçt ilə təkrar qeydiyyat 409', async () => {
    const r = await agent(app)
      .post('/auth/register')
      .send({ name: 'X Y', email: 'yeni@test.local', password: 'Sifre1234' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('AUTH_EMAIL_TAKEN');
  });

  it('yanlış şifrə 401 AUTH_INVALID_CREDENTIALS', async () => {
    const r = await agent(app)
      .post('/auth/login')
      .send({ email: 'telebe@test.local', password: 'yanlis' });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('validasiya xətası 400 VALIDATION_FAILED', async () => {
    const r = await agent(app)
      .post('/auth/register')
      .send({ name: 'A', email: 'pis', password: '1' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(r.body.details)).toBe(true);
  });

  it('refresh rotasiya edir, köhnə token rədd olunur, logout sonrası me 401', async () => {
    const a = await login(app, 'telebe@test.local', 'Telebe123!');
    const first = await a
      .post('/auth/login')
      .send({ email: 'telebe@test.local', password: 'Telebe123!' });
    const oldRt = (first.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith(`${COOKIE_REFRESH}=`))!
      .split(';')[0]!
      .split('=')[1]!;
    const r1 = await a.post('/auth/refresh');
    expect(r1.status).toBe(200);
    const r2 = await agent(app).post('/auth/refresh').set('Cookie', `${COOKIE_REFRESH}=${oldRt}`);
    expect(r2.status).toBe(401);
    const out = await a.post('/auth/logout');
    expect(out.status).toBe(200);
    const me = await a.get('/auth/me');
    expect(me.status).toBe(401);
  });

  it('rol yoxlaması: STUDENT /admin/users → 403, ADMIN → 200', async () => {
    const s = await login(app, 'telebe@test.local', 'Telebe123!');
    expect((await s.get('/admin/users')).status).toBe(403);
    const ad = await login(app, 'admin@test.local', 'Admin123!');
    const r = await ad.get('/admin/users');
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThanOrEqual(4);
  });

  it('şifrə dəyişmə', async () => {
    const s = await login(app, 'telebe@test.local', 'Telebe123!');
    expect(
      (await s.patch('/me/password').send({ current: 'yanlis', next: 'Yeni12345' })).status,
    ).toBe(400);
    expect(
      (await s.patch('/me/password').send({ current: 'Telebe123!', next: 'Yeni12345' })).status,
    ).toBe(200);
    expect(
      (
        await agent(app)
          .post('/auth/login')
          .send({ email: 'telebe@test.local', password: 'Yeni12345' })
      ).status,
    ).toBe(200);
    await s.patch('/me/password').send({ current: 'Yeni12345', next: 'Telebe123!' });
  });
});
