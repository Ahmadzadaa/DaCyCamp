import { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { splitStep } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { LabsService } from '../src/labs/labs.service';
import { saveToStorage, sha256 } from '../src/assets/storage';

const CHECK = '#!/bin/sh\ntest -f "$HOME/done.txt"\n';

async function waitFor<T>(fn: () => Promise<T | null | undefined>, ms = 5000): Promise<T> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('waitFor: vaxt bitdi');
}

/** WebSocket ilə terminala qoşul, əmr yaz, çıxışı topla */
function wsSession(url: string) {
  const ws = new WebSocket(url);
  const out: string[] = [];
  const events: string[] = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString()) as { t: string; d?: string; message?: string };
    events.push(m.t);
    if (m.t === 'out' && m.d) out.push(m.d);
    if (m.t === 'error') out.push(`[error] ${m.message ?? ''}`);
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  const closed = new Promise<number>((resolve) => ws.once('close', (code) => resolve(code)));
  return {
    ws,
    out,
    events,
    opened,
    closed,
    send: (d: string) => ws.send(JSON.stringify({ t: 'in', d })),
    text: () => out.join(''),
  };
}

describe('Mərhələ 3: terminal lab (mock sürücü) + sertifikat', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let labs: LabsService;
  let port = 0;
  let st: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let adm: ReturnType<typeof agent>;
  let studentId = '';
  let courseId = '';
  const slug = 'm3-kurs';
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await app.listen(0);
    port = (app.getHttpServer().address() as AddressInfo).port;
    labs = app.get(LabsService);
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    studentId = b.student.id;
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug,
        title: 'M3 kursu',
        order: 1,
        isPublished: true,
        sequential: true,
        estimatedHours: 2,
      },
    });
    courseId = course.id;
    const buf = Buffer.from(CHECK);
    const key = await saveToStorage(course.id, 'numune.sh', buf);
    await prisma.asset.create({
      data: {
        courseId: course.id,
        path: 'checks/numune.sh',
        kind: 'CHECK_SCRIPT',
        filename: 'numune.sh',
        mime: 'text/x-shellscript',
        sizeBytes: buf.length,
        sha256: sha256(buf),
        storageKey: key,
      },
    });
    const m = await prisma.module.create({
      data: { courseId: course.id, key: 'f', title: 'F', order: 1, isPublished: true },
    });
    const defs = [
      { key: 'nezeri', def: { type: 'theory' as const, title: 'N', xp: 10, content: 'salam' } },
      {
        key: 'lab',
        def: {
          type: 'terminal' as const,
          title: 'Lab',
          xp: 100,
          instructions: 'touch ~/done.txt',
          docker_image: 'dacy/numune-lab:latest',
          time_limit_minutes: 30,
          check_script: 'checks/numune.sh',
          hints: [],
          tasks: ['x'],
          hint_penalty_xp: 0,
          network: false,
        },
      },
    ];
    for (const [i, d] of defs.entries()) {
      const split = splitStep(d.def);
      const step = await prisma.step.create({
        data: {
          moduleId: m.id,
          key: d.key,
          type: split.type,
          title: d.def.title,
          order: i + 1,
          xp: d.def.xp,
          isPublished: true,
          config: split.config as object,
          secret: (split.secret ?? undefined) as object | undefined,
        },
      });
      ids[d.key] = step.id;
    }
    st = await login(app, 'telebe@test.local', 'Telebe123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    adm = await login(app, 'admin@test.local', 'Admin123!');
    await st.post(`/courses/${slug}/enroll`).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  let sessionId = '';

  it('kilidli addımda lab başlamır', async () => {
    const r = await st.post(`/learn/labs/steps/${ids.lab}/start`).send({});
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('STEP_LOCKED');
  });

  it('nəzəri addım → lab başlayır (STARTING → RUNNING), eyni addım üçün təkrar start eyni sessiyanı qaytarır', async () => {
    await st.post(`/learn/steps/${ids.nezeri}/start`).expect(200);
    await st.post(`/learn/steps/${ids.nezeri}/complete`).expect(200);
    const r = await st.post(`/learn/labs/steps/${ids.lab}/start`).send({}).expect(200);
    expect(['STARTING', 'RUNNING']).toContain(r.body.status);
    expect(r.body.driver).toBe('mock');
    expect(r.body.remainingSec).toBeGreaterThan(1700);
    sessionId = r.body.id;
    const running = await waitFor(async () => {
      const g = await st.get(`/learn/labs/steps/${ids.lab}`);
      return g.body?.status === 'RUNNING' ? g.body : null;
    });
    expect(running.id).toBe(sessionId);
    const again = await st.post(`/learn/labs/steps/${ids.lab}/start`).send({}).expect(200);
    expect(again.body.id).toBe(sessionId);
  });

  it('yoxlama: fayl yoxdur → keçmir; cəhd sayılır', async () => {
    const r = await st.post(`/learn/labs/${sessionId}/check`).expect(200);
    expect(r.body.passed).toBe(false);
    expect(r.body.exitCode).toBe(1);
    expect(r.body.output).toContain('✗');
    const p = await prisma.stepProgress.findUnique({
      where: { userId_stepId: { userId: studentId, stepId: ids.lab } },
    });
    expect(p?.status).toBe('IN_PROGRESS');
    expect(p?.attempts).toBe(1);
  });

  it('WebSocket: bilet → terminal → əmr yazılır; səhv bilet rədd edilir', async () => {
    const bad = wsSession(`ws://127.0.0.1:${port}/labs/ws?ticket=yanlis.bilet`);
    await bad.opened;
    expect(await bad.closed).toBe(4001);
    expect(bad.events).toContain('error');

    const t = await st.post(`/learn/labs/${sessionId}/ticket`).expect(200);
    expect(t.body.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(t.body.path).toBe('/labs/ws');
    const s = wsSession(
      `ws://127.0.0.1:${port}${t.body.path}?ticket=${t.body.token}&cols=80&rows=24`,
    );
    await s.opened;
    await waitFor(async () => (s.events.includes('ready') && s.text().includes('$') ? true : null));
    s.send('touch ~/done.txt\r');
    s.send('ls\r');
    await waitFor(async () => (s.text().includes('done.txt') ? true : null));
    expect(s.text()).toContain('student@dacy-lab');
    s.ws.close();
    await s.closed;

    // bilet bir dəfəlik deyil amma qısa ömürlüdür — eyni token yenidən işləyir (60 s)
    const s2 = wsSession(`ws://127.0.0.1:${port}${t.body.path}?ticket=${t.body.token}`);
    await s2.opened;
    await waitFor(async () => (s2.events.includes('ready') ? true : null));
    s2.ws.close();
    await s2.closed;
  });

  it('yoxlama keçir → addım tamamlanır, XP, sessiya PASSED; PASSED-də təkrar yoxlama 400', async () => {
    const r = await st.post(`/learn/labs/${sessionId}/check`).expect(200);
    expect(r.body.passed).toBe(true);
    expect(r.body.output).toContain('✓');
    expect(r.body.complete.xpAwarded).toBe(100);
    expect(r.body.complete.courseCompleted).toBe(true);
    expect(r.body.complete.certificateId).toBeTruthy();
    const g = await st.get(`/learn/labs/steps/${ids.lab}`).expect(200);
    expect(g.body.status).toBe('PASSED');
    const again = await st.post(`/learn/labs/${sessionId}/check`);
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('LAB_NOT_RUNNING');
    const me = await st.get('/auth/me').expect(200);
    expect(me.body.xpTotal).toBe(110);
  });

  it('PASSED sessiyaya terminal hələ qoşula bilir; dayandır → STOPPED; sıfırla → yeni sessiya', async () => {
    await st.post(`/learn/labs/${sessionId}/ticket`).expect(200);
    const stop = await st.post(`/learn/labs/${sessionId}/stop`).expect(200);
    expect(stop.body.status).toBe('PASSED');
    expect(stop.body.endedAt).toBeTruthy();
    expect(await labs.driver!.listManaged()).toHaveLength(0);
    const tk = await st.post(`/learn/labs/${sessionId}/ticket`);
    expect(tk.status).toBe(400);
    const r = await st.post(`/learn/labs/steps/${ids.lab}/start`).send({ reset: true }).expect(200);
    expect(r.body.id).not.toBe(sessionId);
    sessionId = r.body.id;
    await waitFor(async () => {
      const g = await st.get(`/learn/labs/steps/${ids.lab}`);
      return g.body?.status === 'RUNNING' ? g.body : null;
    });
  });

  it('başqa tələbənin sessiyasına giriş yoxdur; admin siyahı + dayandırma', async () => {
    const other = await ins.post(`/learn/labs/${sessionId}/ticket`);
    expect(other.status).toBe(404);
    const forb = await st.get('/admin/labs');
    expect(forb.status).toBe(403);
    const list = await ins.get('/admin/labs').expect(200);
    expect(list.body.some((x: { id: string }) => x.id === sessionId)).toBe(true);
    expect(list.body[0].user.email).toBe('telebe@test.local');
    await ins.post(`/admin/labs/${sessionId}/stop`).expect(200);
    const g = await st.get(`/learn/labs/steps/${ids.lab}`).expect(200);
    expect(g.body.status).toBe('STOPPED');
  });

  it('vaxtı bitən sessiya reap ilə EXPIRED olur, konteyner silinir', async () => {
    const r = await st.post(`/learn/labs/steps/${ids.lab}/start`).send({}).expect(200);
    await waitFor(async () => {
      const g = await st.get(`/learn/labs/steps/${ids.lab}`);
      return g.body?.status === 'RUNNING' ? g.body : null;
    });
    expect(await labs.driver!.listManaged()).toHaveLength(1);
    await prisma.labSession.update({
      where: { id: r.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await labs.reap();
    const g = await st.get(`/learn/labs/steps/${ids.lab}`).expect(200);
    expect(g.body.status).toBe('EXPIRED');
    expect(g.body.remainingSec).toBe(0);
    expect(await labs.driver!.listManaged()).toHaveLength(0);
  });

  it('CTF addımında docker_image yoxdursa lab başlamır; varsa başlayır (yoxlama yoxdur)', async () => {
    const ctf = await prisma.step.create({
      data: {
        moduleId: (await prisma.module.findFirstOrThrow({ where: { courseId } })).id,
        key: 'ctf',
        type: 'CTF',
        title: 'C',
        order: 3,
        xp: 10,
        isPublished: true,
        config: { instructions: 'x', attachments: [], hint_penalty_xp: 0 },
      },
    });
    const r1 = await st.post(`/learn/labs/steps/${ctf.id}/start`).send({});
    expect(r1.status).toBe(400);
    await prisma.step.update({
      where: { id: ctf.id },
      data: {
        config: { instructions: 'x', attachments: [], hint_penalty_xp: 0, docker_image: 'alpine' },
      },
    });
    const r2 = await st.post(`/learn/labs/steps/${ctf.id}/start`).send({}).expect(200);
    const id = r2.body.id as string;
    await waitFor(async () => {
      const g = await st.get(`/learn/labs/steps/${ctf.id}`);
      return g.body?.status === 'RUNNING' ? g.body : null;
    });
    const chk = await st.post(`/learn/labs/${id}/check`);
    expect(chk.status).toBe(400);
    expect(chk.body.code).toBe('LAB_NOT_APPLICABLE');
    await st.post(`/learn/labs/${id}/stop`).expect(200);
    await prisma.step.delete({ where: { id: ctf.id } });
  });

  // ───────────── sertifikat
  let certId = '';

  it('kurs bitəndə sertifikat verilib: seriya, ictimai səhifə (girişsiz), QR', async () => {
    const map = await st.get(`/learn/courses/${slug}`).expect(200);
    expect(map.body.completedAt).toBeTruthy();
    expect(map.body.certificateId).toBeTruthy();
    certId = map.body.certificateId;
    const mine = await st.get('/me/certificates').expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(certId);
    expect(mine.body[0].serial).toMatch(/^DACY-C-\d{4}-000001$/);

    const anon = agent(app);
    const pub = await anon.get(`/certificates/${certId}`).expect(200);
    expect(pub.body.studentName).toBe('Tələbə');
    expect(pub.body.courseTitle).toBe('M3 kursu');
    expect(pub.body.trackTitle).toBe('Data Analytics');
    expect(pub.body.hours).toBe(2);
    expect(pub.body.xp).toBe(110);
    expect(pub.body.revokedAt).toBeNull();
    expect(pub.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(pub.body.verifyUrl).toContain(`/sertifikat/${certId}`);
    expect(JSON.stringify(pub.body)).not.toContain('@test.local');
    await anon.get('/certificates/00000000-0000-0000-0000-000000000000').expect(404);
  });

  it('PDF yüklənir (girişsiz), kursu təkrar tamamlamaq ikinci sertifikat vermir', async () => {
    const anon = agent(app);
    const pdf = await anon
      .get(`/certificates/${certId}.pdf`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    expect((pdf.body as Buffer).length).toBeGreaterThan(5000);

    await st.post(`/learn/steps/${ids.nezeri}/complete`).expect(200);
    expect(await prisma.certificate.count({ where: { userId: studentId } })).toBe(1);
  });

  it('panel sertifikatı göstərir; admin ləğv edir → ictimai səhifədə revokedAt; tələbə ləğv edə bilməz', async () => {
    const dash = await st.get('/me/dashboard').expect(200);
    expect(dash.body.certificates).toBe(1);
    expect(dash.body.certificateItems[0].id).toBe(certId);

    expect((await st.post(`/admin/certificates/${certId}/revoke`)).status).toBe(403);
    expect((await ins.post(`/admin/certificates/${certId}/revoke`)).status).toBe(403);
    const rev = await adm.post(`/admin/certificates/${certId}/revoke`).expect(200);
    expect(rev.body.revokedAt).toBeTruthy();
    const pub = await agent(app).get(`/certificates/${certId}`).expect(200);
    expect(pub.body.revokedAt).toBeTruthy();
    const dash2 = await st.get('/me/dashboard').expect(200);
    expect(dash2.body.certificates).toBe(0);
  });
});
