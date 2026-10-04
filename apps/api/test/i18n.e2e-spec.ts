import { INestApplication } from '@nestjs/common';
import { createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

type Agent = Awaited<ReturnType<typeof login>>;

/** Dil seçimi: `dacy_locale` cookie-si (web ilə eyni) → API mətnləri o dildə; defolt — az */
describe('Sorğunun dili (dacy_locale)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let student: Agent;
  let admin: Agent;

  /** agent-in cookie qabına dil cookie-si əlavə edir (sessiya cookie-ləri qalır) */
  const setLang = (a: Agent, lang: 'az' | 'en') =>
    (a as unknown as { jar: { setCookie(c: string): void } }).jar.setCookie(
      `dacy_locale=${lang}; Path=/`,
    );
  const supportTitle = async (a: Agent) =>
    ((await a.get('/me/notifications')).body as Array<{ kind: string; title: string }>).find(
      (x) => x.kind === 'support_open',
    )?.title;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    student = await login(app, 'telebe@test.local', 'Telebe123!');
    admin = await login(app, 'admin@test.local', 'Admin123!');
    await student.post('/support/tickets').send({ subject: 'Birinci sual', body: 'Mətn 1' });
  });
  afterAll(() => app.close());

  it('cookie yoxdursa — azərbaycan dili', async () => {
    expect(await supportTitle(admin)).toBe('1 dəstək müraciəti cavab gözləyir');
  });

  it('dacy_locale=en — ingilis dili, tək/cəm forması saya görə', async () => {
    setLang(admin, 'en');
    expect(await supportTitle(admin)).toBe('1 support request awaiting a reply');
    await student.post('/support/tickets').send({ subject: 'İkinci sual', body: 'Mətn 2' });
    expect(await supportTitle(admin)).toBe('2 support requests awaiting a reply');
  });

  it('dacy_locale=az — yenidən azərbaycan dili; naməlum dəyər defolta düşür', async () => {
    setLang(admin, 'az');
    expect(await supportTitle(admin)).toBe('2 dəstək müraciəti cavab gözləyir');
    (admin as unknown as { jar: { setCookie(c: string): void } }).jar.setCookie(
      'dacy_locale=fr; Path=/',
    );
    expect(await supportTitle(admin)).toBe('2 dəstək müraciəti cavab gözləyir');
  });

  it('profildə dil yadda saxlanılır (girişdən sonra web cookie-ni buna görə qurur)', async () => {
    const r = await student.patch('/me').send({ locale: 'en' });
    expect(r.status).toBe(200);
    expect(r.body.locale).toBe('en');
    expect((await student.get('/auth/me')).body.locale).toBe('en');
  });
});
