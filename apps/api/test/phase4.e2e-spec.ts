import { INestApplication } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

async function makeCourse(
  prisma: PrismaService,
  trackId: string,
  slug: string,
  title: string,
  published = true,
) {
  const course = await prisma.course.create({
    data: {
      trackId,
      slug,
      title,
      order: Math.floor(Math.random() * 100000),
      isPublished: published,
      sequential: true,
      estimatedHours: 3,
    },
  });
  const m = await prisma.module.create({
    data: { courseId: course.id, key: 'f', title: 'F', order: 1, isPublished: true },
  });
  const step = await prisma.step.create({
    data: {
      moduleId: m.id,
      key: 'n',
      type: 'THEORY',
      title: 'N',
      order: 1,
      xp: 10,
      isPublished: true,
      config: { content: 'salam' },
    },
  });
  return { course, step };
}

describe('Mərhələ 4: Learning Path', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let st: ReturnType<typeof agent>;
  let st2: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let adm: ReturnType<typeof agent>;
  let trackId = '';
  let courseA!: Awaited<ReturnType<typeof makeCourse>>;
  let courseB!: Awaited<ReturnType<typeof makeCourse>>;
  let pathId = '';
  const slug = 'm4-yol';
  const items: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    trackId = b.track.id;
    await prisma.user.create({
      data: {
        email: 'telebe2@test.local',
        name: 'İkinci',
        role: 'STUDENT',
        passwordHash: (
          await prisma.user.findFirstOrThrow({ where: { email: 'telebe@test.local' } })
        ).passwordHash,
      },
    });
    courseA = await makeCourse(prisma, trackId, 'kurs-a', 'Kurs A');
    courseB = await makeCourse(prisma, trackId, 'kurs-b', 'Kurs B');
    st = await login(app, 'telebe@test.local', 'Telebe123!');
    st2 = await login(app, 'telebe2@test.local', 'Telebe123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    adm = await login(app, 'admin@test.local', 'Admin123!');
  });
  afterAll(async () => app.close());

  it('admin: yol yaradır, addımlar əlavə edir, dərc edir (boş imtahan → dərc xətası)', async () => {
    expect((await st.post('/admin/paths').send({})).status).toBe(403);
    const r = await ins
      .post('/admin/paths')
      .send({
        track: 'data-analytics',
        title: 'M4 yolu',
        slug,
        level: 'BEGINNER',
        description: 'd',
        skills: ['SQL'],
        sequential: true,
      })
      .expect(201);
    pathId = r.body.id;
    expect(r.body.isPublished).toBe(false);
    expect(
      (await ins.post('/admin/paths').send({ track: 'data-analytics', title: 'M4 yolu', slug }))
        .status,
    ).toBe(409);

    const a1 = await ins
      .post(`/admin/paths/${pathId}/items`)
      .send({ type: 'course', course_slug: 'kurs-a' })
      .expect(201);
    expect(a1.body.items).toHaveLength(1);
    expect(a1.body.items[0].key).toBe('kurs-a');
    expect(
      (
        await ins
          .post(`/admin/paths/${pathId}/items`)
          .send({ type: 'course', course_slug: 'kurs-a' })
      ).status,
    ).toBe(409);
    expect(
      (
        await ins
          .post(`/admin/paths/${pathId}/items`)
          .send({ type: 'course', course_slug: 'yoxdur' })
      ).status,
    ).toBe(400);
    const a2 = await ins
      .post(`/admin/paths/${pathId}/items`)
      .send({
        type: 'assessment',
        title: 'İmtahan',
        xp: 50,
        config: { pass_score: 50, questions: [] },
      })
      .expect(201);
    expect(a2.body.issues.some((i: { path: string }) => i.path.includes('questions'))).toBe(true);
    const pub = await ins.post(`/admin/paths/${pathId}/publish`).send({ published: true });
    expect(pub.status).toBe(422);
    expect(pub.body.code).toBe('PUBLISH_ISSUES');

    const assessmentId = a2.body.items[1].id as string;
    const upd = await ins
      .put(`/admin/path-items/${assessmentId}`)
      .send({
        type: 'assessment',
        title: 'İmtahan',
        xp: 50,
        config: {
          pass_score: 50,
          questions: [
            { text: 'q1', type: 'single', options: ['a', 'b'], correct: [1], explanation: 'izah' },
            { text: 'q2', type: 'multiple', options: ['a', 'b', 'c'], correct: [0, 2] },
          ],
        },
      })
      .expect(200);
    expect(upd.body.issues).toHaveLength(0);
    await ins
      .post(`/admin/paths/${pathId}/items`)
      .send({
        type: 'project',
        title: 'Layihə',
        xp: 100,
        config: {
          instructions: 'Edin',
          deliverables: ['CSV'],
          review_mode: 'manual',
          allow_link: true,
          max_files: 2,
        },
      })
      .expect(201);
    await ins
      .post(`/admin/paths/${pathId}/items`)
      .send({ type: 'course', course_slug: 'kurs-b', optional: true })
      .expect(201);
    const last = await ins
      .post(`/admin/paths/${pathId}/items`)
      .send({
        type: 'milestone',
        title: 'Final',
        config: { certificate_title: 'M4 Analyst', description: 'son' },
      })
      .expect(201);
    for (const it of last.body.items) items[it.key] = it.id;
    expect(Object.keys(items)).toEqual(['kurs-a', 'imtahan', 'layihe', 'kurs-b', 'final']);

    // dərc olunmamış yol tələbəyə görünmür, müəllim önizləyir
    expect((await st.get(`/paths/${slug}`)).status).toBe(404);
    expect((await ins.get(`/paths/${slug}?preview=1`)).status).toBe(200);
    const ok = await ins
      .post(`/admin/paths/${pathId}/publish`)
      .send({ published: true })
      .expect(200);
    expect(ok.body.isPublished).toBe(true);
  });

  it('sıralama: iki fazalı, səhv siyahı rədd', async () => {
    const ids = Object.values(items);
    const bad = await ins.put(`/admin/paths/${pathId}/items/order`).send({ ids: ids.slice(1) });
    expect(bad.status).toBe(400);
    const swapped = [ids[0], ids[2], ids[1], ids[3], ids[4]];
    const r = await ins
      .put(`/admin/paths/${pathId}/items/order`)
      .send({ ids: swapped })
      .expect(200);
    expect(r.body.items.map((i: { id: string }) => i.id)).toEqual(swapped);
    await ins.put(`/admin/paths/${pathId}/items/order`).send({ ids }).expect(200);
  });

  it('kataloq (girişsiz) + yazılma + xəritə vəziyyətləri', async () => {
    const anon = await agent(app).get('/paths').expect(200);
    expect(anon.body).toHaveLength(1);
    expect(anon.body[0]).toMatchObject({
      slug,
      courseCount: 2,
      projectCount: 1,
      assessmentCount: 1,
      enrolled: false,
    });
    const d0 = await st.get(`/paths/${slug}`).expect(200);
    expect(d0.body.enrolled).toBe(false);
    expect(d0.body.continueUrl).toBeNull();
    const e = await st.post(`/paths/${slug}/enroll`).expect(200);
    expect(e.body).toMatchObject({ enrolled: true, isActive: true, percent: 0 });
    const d = await st.get(`/paths/${slug}`).expect(200);
    expect(d.body.items.map((i: { state: string }) => i.state)).toEqual([
      'current',
      'locked',
      'locked',
      'available',
      'locked',
    ]);
    expect(d.body.items.map((i: { number: number | null }) => i.number)).toEqual([
      1,
      2,
      3,
      null,
      4,
    ]);
    expect(d.body.map).toMatchObject({ done: 0, total: 4, percent: 0 });
    expect(d.body.continueUrl).toBe('/kurs/kurs-a');
    expect(d.body.items[0].url).toBe('/kurs/kurs-a');
    expect(d.body.items[1].url).toBe(`/yol/${slug}/imtahan`);
    // kilidli addım
    expect((await st.get(`/learn/paths/${slug}/items/imtahan`)).body.code).toBe('PATH_ITEM_LOCKED');
    // yazılmamış tələbə
    expect((await st2.get(`/learn/paths/${slug}/items/imtahan`)).body.code).toBe(
      'PATH_NOT_ENROLLED',
    );
    // kurs səhifəsi üçün
    const refs = await agent(app).get('/paths/by-course/kurs-a').expect(200);
    expect(refs.body).toEqual([expect.objectContaining({ slug, number: 1 })]);
    const refsB = await agent(app).get('/paths/by-course/kurs-b').expect(200);
    expect(refsB.body[0].number).toBe(0); // seçmə — nömrəsiz
  });

  it('kurs bitəndə yol avtomatik irəliləyir; panel aktiv yolu göstərir', async () => {
    await st.post('/courses/kurs-a/enroll').expect(201);
    await st.post(`/learn/steps/${courseA.step.id}/start`).expect(200);
    const c = await st.post(`/learn/steps/${courseA.step.id}/complete`).expect(200);
    expect(c.body.courseCompleted).toBe(true);
    const d = await st.get(`/paths/${slug}`).expect(200);
    expect(d.body.items.map((i: { state: string }) => i.state)).toEqual([
      'completed',
      'current',
      'locked',
      'available',
      'locked',
    ]);
    expect(d.body.map.percent).toBe(25);
    expect(d.body.items[0].course.completedAt).toBeTruthy();
    const dash = await st.get('/me/dashboard').expect(200);
    expect(dash.body.activePath).toMatchObject({
      slug,
      percent: 25,
      next: { title: 'İmtahan', type: 'ASSESSMENT', url: `/yol/${slug}/imtahan` },
    });
    const en = await prisma.pathEnrollment.findUniqueOrThrow({
      where: {
        userId_pathId: {
          userId: (await prisma.user.findFirstOrThrow({ where: { email: 'telebe@test.local' } }))
            .id,
          pathId,
        },
      },
    });
    expect(en.percent).toBe(25);
  });

  it('imtahan: cavablar gizlidir; səhv → FAILED; düzgün → PASSED + XP', async () => {
    const v = await st.get(`/learn/paths/${slug}/items/imtahan`).expect(200);
    expect(v.body.assessment.questions).toHaveLength(2);
    expect(JSON.stringify(v.body)).not.toContain('correct');
    expect(JSON.stringify(v.body)).not.toContain('izah');
    const bad = await st
      .post(`/learn/path-items/${items.imtahan}/assessment`)
      .send({ answers: [[0], [1]] })
      .expect(200);
    expect(bad.body).toMatchObject({ score: 0, passed: false, xpAwarded: 0 });
    expect(bad.body.perQuestion[0]).toMatchObject({
      correct: false,
      correctIndices: [1],
      explanation: 'izah',
    });
    const half = await st
      .post(`/learn/path-items/${items.imtahan}/assessment`)
      .send({ answers: [[1], [0]] })
      .expect(200);
    expect(half.body).toMatchObject({ score: 50, passed: true, xpAwarded: 50, pathPercent: 50 });
    const again = await st
      .post(`/learn/path-items/${items.imtahan}/assessment`)
      .send({ answers: [[1], [2, 0]] })
      .expect(200);
    expect(again.body).toMatchObject({ score: 100, passed: true, xpAwarded: 0 });
    const v2 = await st.get(`/learn/paths/${slug}/items/imtahan`).expect(200);
    expect(v2.body.assessment).toMatchObject({ attempts: 3, bestScore: 100, status: 'PASSED' });
    const me = await st.get('/auth/me').expect(200);
    expect(me.body.xpTotal).toBe(60);
    // final hələ hazır deyil
    const ms = await st.post(`/learn/path-items/${items.final}/milestone`);
    expect(ms.status).toBe(403); // kilidli (layihə bitməyib)
  });

  it('layihə: boş → 400; fayl + qeyd → SUBMITTED; müəllim qaytarır → FAILED; yenidən → qəbul → PASSED + XP', async () => {
    const empty = await st.post(`/learn/path-items/${items.layihe}/project`).field('note', 'x');
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('PROJECT_EMPTY');
    const sub = await st
      .post(`/learn/path-items/${items.layihe}/project`)
      .attach('files', Buffer.from('id,x\n1,2\n'), 'netice.csv')
      .field('note', 'ilk cəhd')
      .expect(200);
    expect(sub.body.status).toBe('SUBMITTED');
    const d = await st.get(`/paths/${slug}`).expect(200);
    expect(d.body.items[2].state).toBe('submitted');
    expect(d.body.items[4].state).toBe('locked');
    const v = await st.get(`/learn/paths/${slug}/items/layihe`).expect(200);
    expect(v.body.project.submission).toMatchObject({ status: 'SUBMITTED', note: 'ilk cəhd' });
    expect(v.body.project.submission.files[0].filename).toBe('netice.csv');
    const file = await st
      .get(v.body.project.submission.files[0].url.replace(/^\/api/, ''))
      .expect(200);
    expect(file.text ?? file.body.toString()).toContain('id,x');
    expect(
      (await st2.get(v.body.project.submission.files[0].url.replace(/^\/api/, ''))).status,
    ).toBe(404);

    expect((await st.get('/admin/path-reviews')).status).toBe(403);
    const list = await ins.get('/admin/path-reviews').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      status: 'SUBMITTED',
      note: 'ilk cəhd',
      item: { key: 'layihe' },
    });
    const reviewId = list.body[0].id as string;
    await ins.get(`/admin/path-reviews/${reviewId}/files/0`).expect(200);
    const rej = await ins
      .post(`/admin/path-reviews/${reviewId}`)
      .send({ passed: false, feedback: 'Başlıq sətri yoxdur' })
      .expect(200);
    expect(rej.body.status).toBe('FAILED');
    const v2 = await st.get(`/learn/paths/${slug}/items/layihe`).expect(200);
    expect(v2.body.project.submission).toMatchObject({
      status: 'FAILED',
      feedback: 'Başlıq sətri yoxdur',
    });
    expect(v2.body.item.state).toBe('current');

    const re = await st
      .post(`/learn/path-items/${items.layihe}/project`)
      .field('link', 'https://github.com/x/y')
      .field('note', 'düzəltdim')
      .expect(200);
    expect(re.body.status).toBe('SUBMITTED');
    const list2 = await ins.get('/admin/path-reviews?status=SUBMITTED').expect(200);
    expect(list2.body).toHaveLength(1);
    const ok = await ins
      .post(`/admin/path-reviews/${reviewId}`)
      .send({ passed: true, feedback: 'Əla' })
      .expect(200);
    expect(ok.body.status).toBe('PASSED');
    const d2 = await st.get(`/paths/${slug}`).expect(200);
    expect(d2.body.items.map((i: { state: string }) => i.state)).toEqual([
      'completed',
      'completed',
      'completed',
      'available',
      'current',
    ]);
    expect(d2.body.map.percent).toBe(75);
    const me = await st.get('/auth/me').expect(200);
    expect(me.body.xpTotal).toBe(160);
    // maks fayl sayı
    const tooMany = await st2
      .post(`/learn/path-items/${items.layihe}/project`)
      .attach('files', Buffer.from('a'), 'a')
      .attach('files', Buffer.from('b'), 'b')
      .attach('files', Buffer.from('c'), 'c');
    expect([400, 403]).toContain(tooMany.status);
  });

  let certId = '';
  it('final: sertifikat alınır (DACY-P), yol tamamlanır, ictimai səhifə + PDF, panel', async () => {
    const v = await st.get(`/learn/paths/${slug}/items/final`).expect(200);
    expect(v.body.milestone).toMatchObject({
      claimable: true,
      missing: [],
      certificateTitle: 'M4 Analyst',
    });
    const r = await st.post(`/learn/path-items/${items.final}/milestone`).expect(200);
    expect(r.body).toMatchObject({ pathPercent: 100, pathCompleted: true });
    expect(r.body.certificateId).toBeTruthy();
    certId = r.body.certificateId;
    const again = await st.post(`/learn/path-items/${items.final}/milestone`).expect(200);
    expect(again.body.certificateId).toBe(certId);
    const d = await st.get(`/paths/${slug}`).expect(200);
    expect(d.body).toMatchObject({ completedAt: expect.any(String), certificateId: certId });
    expect(d.body.map.isComplete).toBe(true);
    const pub = await agent(app).get(`/certificates/${certId}`).expect(200);
    expect(pub.body).toMatchObject({
      kind: 'path',
      courseTitle: 'M4 Analyst',
      courseSlug: slug,
      trackTitle: 'Data Analytics',
      studentName: 'Tələbə',
    });
    expect(pub.body.serial).toMatch(/^DACY-P-\d{4}-000001$/);
    const pdf = await agent(app)
      .get(`/certificates/${certId}.pdf`)
      .buffer(true)
      .parse((res, cb) => {
        const ch: Buffer[] = [];
        res.on('data', (c: Buffer) => ch.push(c));
        res.on('end', () => cb(null, Buffer.concat(ch)));
      });
    expect(pdf.status).toBe(200);
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    const mine = await st.get('/me/certificates').expect(200);
    expect(
      mine.body.some((c: { id: string; kind: string }) => c.id === certId && c.kind === 'path'),
    ).toBe(true);
    const dash = await st.get('/me/dashboard').expect(200);
    expect(dash.body.activePath).toMatchObject({ slug, percent: 100, next: null });
    expect(dash.body.certificates).toBe(2); // kurs A + yol
  });

  it('onboarding hədəfi: yazılır, aktiv olur, user.targetPathId', async () => {
    const r = await st2.put('/me/target-path').send({ pathSlug: slug }).expect(200);
    expect(r.body).toMatchObject({ slug, enrolled: true, isActive: true });
    const u = await prisma.user.findFirstOrThrow({ where: { email: 'telebe2@test.local' } });
    expect(u.targetPathId).toBe(pathId);
    expect((await st2.get('/me/paths')).body).toHaveLength(1);
    await st2.put('/me/target-path').send({ pathSlug: null }).expect(200);
    expect(
      (await prisma.user.findFirstOrThrow({ where: { email: 'telebe2@test.local' } })).targetPathId,
    ).toBeNull();
  });

  it('path.yaml idxalı: yoxla (kurs yoxdursa səhv) → tətbiq et → yenidən tətbiq yeniləyir', async () => {
    const yamlOf = (course: string, extra = '') =>
      `type: path\ntrack: data-analytics\ntitle: İdxal yolu\nslug: idxal-yolu\nlevel: intermediate\nskills: [SQL]\nsequential: false\npublished: true\nitems:\n  - course: ${course}\n  - assessment: yoxlama\n    title: Yoxlama\n    pass_score: 60\n    questions:\n      - text: s\n        type: single\n        options: [a, b]\n        correct: [2]\n${extra}`;
    const zipOf = (y: string) => {
      const z = new AdmZip();
      z.addFile('path.yaml', Buffer.from(y));
      return z.toBuffer();
    };
    const bad = await ins
      .post('/admin/import/validate')
      .attach('file', zipOf(yamlOf('yoxdur-kurs')), 'p.zip')
      .expect(201);
    expect(bad.body.ok).toBe(false);
    expect(
      bad.body.errors.some((e: { message: string }) => e.message.includes('Kurs tapılmadı')),
    ).toBe(true);
    const ok = await ins
      .post('/admin/import/validate')
      .attach('file', zipOf(yamlOf('kurs-a')), 'p.zip')
      .expect(201);
    expect(ok.body.ok).toBe(true);
    expect(ok.body.path).toMatchObject({ slug: 'idxal-yolu', exists: false, items: 2 });
    const applied = await ins
      .post('/admin/import/apply')
      .attach('file', zipOf(yamlOf('kurs-a')), 'p.zip')
      .expect(201);
    expect(applied.body.ok).toBe(true);
    expect(applied.body.applied.pathSlug).toBe('idxal-yolu');
    const p = await ins.get('/admin/paths/idxal-yolu').expect(200);
    expect(p.body).toMatchObject({ isPublished: true, sequential: false, level: 'INTERMEDIATE' });
    expect(p.body.items.map((i: { key: string }) => i.key)).toEqual(['kurs-a', 'yoxlama']);
    expect(p.body.items[1].input.config.questions[0].correct).toEqual([1]);
    // yenidən: bir addım əlavə, imtahan silinir
    const re = await ins
      .post('/admin/import/apply')
      .attach(
        'file',
        zipOf(
          `type: path\ntrack: data-analytics\ntitle: İdxal yolu 2\nslug: idxal-yolu\nitems:\n  - course: kurs-a\n  - milestone: son\n    title: Son\n`,
        ),
        'p.zip',
      )
      .expect(201);
    expect(re.body.ok).toBe(true);
    const p2 = await ins.get('/admin/paths/idxal-yolu').expect(200);
    expect(p2.body.title).toBe('İdxal yolu 2');
    expect(p2.body.items.map((i: { key: string }) => i.key)).toEqual(['kurs-a', 'son']);
    // ixrac
    const y = await ins.get(`/admin/paths/${p2.body.id}/export.yaml`).expect(200);
    expect(y.text).toContain('slug: idxal-yolu');
    expect(y.text).toContain('milestone: son');
    // kurs + path.yaml eyni paketdə
    const z = new AdmZip();
    z.addFile(
      'course.yaml',
      Buffer.from(
        'track: data-analytics\ntitle: Paket kursu\nslug: paket-kursu\nlevel: beginner\npublished: true\n',
      ),
    );
    z.addFile('modules/01-f/01-n.md', Buffer.from('---\ntitle: N\n---\nsalam\n'));
    z.addFile(
      'path.yaml',
      Buffer.from(
        'type: path\ntrack: data-analytics\ntitle: Paket yolu\nslug: paket-yolu\nitems:\n  - course: paket-kursu\n',
      ),
    );
    const both = await ins
      .post('/admin/import/apply')
      .attach('file', z.toBuffer(), 'k.zip')
      .expect(201);
    expect(both.body.ok).toBe(true);
    expect(both.body.applied).toMatchObject({ courseSlug: 'paket-kursu', pathSlug: 'paket-yolu' });
  });

  it('admin: yazılması olan yol silinmir (409), force ilə silinir; addım silmə', async () => {
    const del = await ins.delete(`/admin/paths/${pathId}`);
    expect(del.status).toBe(409);
    expect(del.body.code).toBe('PATH_HAS_ENROLLMENTS');
    const rm = await ins.delete(`/admin/path-items/${items['kurs-b']}`).expect(200);
    expect(rm.body.items.map((i: { key: string }) => i.key)).toEqual([
      'kurs-a',
      'imtahan',
      'layihe',
      'final',
    ]);
    await ins.delete(`/admin/paths/${pathId}?force=1`).expect(200);
    expect((await st.get(`/paths/${slug}`)).status).toBe(404);
    // sertifikat snapshot qalır
    const pub = await agent(app).get(`/certificates/${certId}`).expect(200);
    expect(pub.body.courseTitle).toBe('M4 Analyst');
  });
});
