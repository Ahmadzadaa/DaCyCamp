import { INestApplication } from '@nestjs/common';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** Dəstək: tələbə yazır → heyət görür və cavablayır → tələbə cavabı görür (bildiriş) → bağlama/yenidən açılma */
describe('Dəstək müraciətləri', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let student: Awaited<ReturnType<typeof login>>;
  let other: ReturnType<typeof agent>;
  let admin: Awaited<ReturnType<typeof login>>;
  let ticketId = '';

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    student = await login(app, 'telebe@test.local', 'Telebe123!');
    admin = await login(app, 'admin@test.local', 'Admin123!');
    other = agent(app);
    await other
      .post('/auth/register')
      .send({ name: 'Başqa', email: 'basqa@test.local', password: 'Basqa12345!' });
  });
  afterAll(() => app.close());

  it('tələbə müraciət yaradır; validasiya; yalnız öz müraciətlərini görür', async () => {
    const bad = await student.post('/support/tickets').send({ subject: 'a', body: '' });
    expect(bad.status).toBe(400);
    const r = await student.post('/support/tickets').send({
      subject: 'Python tapşırığında xəta',
      body: 'print(cem) xəta verir, niyə?',
      pageUrl: '/kurs/python4business/g1-giris/isinma',
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'OPEN', messageCount: 1, unread: false });
    ticketId = r.body.id;
    expect((await student.get('/support/tickets')).body).toHaveLength(1);
    expect((await other.get('/support/tickets')).body).toHaveLength(0);
    expect((await other.get(`/support/tickets/${ticketId}`)).status).toBe(404);
    expect((await student.get('/admin/support')).status).toBe(403);
  });

  it('heyət siyahıda görür (status sayları, axtarış), cavab verir → ANSWERED', async () => {
    const list = await admin.get('/admin/support?status=OPEN');
    expect(list.body.counts).toMatchObject({ OPEN: 1, ALL: 1 });
    expect(list.body.tickets[0]).toMatchObject({
      subject: 'Python tapşırığında xəta',
      user: { email: 'telebe@test.local' },
    });
    expect((await admin.get('/admin/support?q=yoxdur')).body.tickets).toHaveLength(0);
    expect((await admin.get('/admin/support/open-count')).body).toEqual({ open: 1 });
    const n = await admin.get('/me/notifications');
    expect(n.body.some((x: { kind: string }) => x.kind === 'support_open')).toBe(true);

    const rep = await admin
      .post(`/admin/support/${ticketId}/messages`)
      .send({ body: '«cem = ...» sətrini silmisiniz — əvvəlcə dəyər verin.' });
    expect(rep.status).toBe(201);
    expect(rep.body.status).toBe('ANSWERED');
    expect(rep.body.messages[1]).toMatchObject({ fromStaff: true, authorName: 'Admin' });
  });

  it('tələbə cavabı görür (oxunmamış + bildiriş), baxanda oxunmuş olur; yazanda yenidən OPEN', async () => {
    const mine = (await student.get('/support/tickets')).body;
    expect(mine[0]).toMatchObject({ status: 'ANSWERED', unread: true });
    const notif = (await student.get('/me/notifications')).body;
    expect(notif.find((x: { kind: string }) => x.kind === 'support_reply')).toMatchObject({
      url: `/destek/${ticketId}`,
    });
    const d = await student.get(`/support/tickets/${ticketId}`);
    expect(d.body.messages).toHaveLength(2);
    expect((await student.get('/support/tickets')).body[0].unread).toBe(false);

    const again = await student
      .post(`/support/tickets/${ticketId}/messages`)
      .send({ body: 'Təşəkkürlər, düzəldi!' });
    expect(again.body.status).toBe('OPEN');
  });

  it('heyət bağlayır; tələbə yazsa yenidən açılır', async () => {
    const c = await admin.patch(`/admin/support/${ticketId}`).send({ status: 'CLOSED' });
    expect(c.body.status).toBe('CLOSED');
    expect((await admin.get('/admin/support?status=CLOSED')).body.counts.CLOSED).toBe(1);
    const re = await student
      .post(`/support/tickets/${ticketId}/messages`)
      .send({ body: 'Bir sual da' });
    expect(re.body.status).toBe('OPEN');
    expect(await prisma.supportMessage.count({ where: { ticketId } })).toBe(4);
  });
});
