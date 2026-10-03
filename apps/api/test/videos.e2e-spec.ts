import { existsSync } from 'node:fs';
import { INestApplication } from '@nestjs/common';
import { createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { storagePath } from '../src/assets/storage';

/** Fəsil sonu video dərs: böyük fayl diskə axınla yüklənir, nəzəri addım yalnız video ilə dərc olunur */
describe('Video dərslər', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof login>>;
  let student: Awaited<ReturnType<typeof login>>;
  let courseId = '';
  let moduleId = '';

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const c = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug: 'video-kurs',
        title: 'Video',
        order: 1,
        isPublished: true,
      },
    });
    courseId = c.id;
    moduleId = (
      await prisma.module.create({
        data: { courseId, key: 'f1', title: 'Fəsil 1', order: 1, isPublished: true },
      })
    ).id;
    admin = await login(app, 'admin@test.local', 'Admin123!');
    student = await login(app, 'telebe@test.local', 'Telebe123!');
  });
  afterAll(() => app.close());

  const clip = Buffer.alloc(256 * 1024, 7); // məzmun yoxlanılmır — növ uzantı/mime ilə

  it('video yüklənir (diskə axınla), anbarda saxlanılır; video olmayan fayl rədd edilir', async () => {
    const r = await admin
      .post(`/admin/courses/${courseId}/videos`)
      .field('path', 'videos/f1-dərs.mp4')
      .attach('file', clip, { filename: 'dərs.mp4', contentType: 'video/mp4' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      path: 'videos/f1-dərs.mp4',
      kind: 'VIDEO',
      sizeBytes: clip.length,
    });
    const a = await prisma.asset.findUniqueOrThrow({ where: { id: r.body.id } });
    expect(existsSync(storagePath(a.storageKey))).toBe(true);

    const bad = await admin
      .post(`/admin/courses/${courseId}/videos`)
      .attach('file', Buffer.from('salam'), { filename: 'qeyd.txt', contentType: 'text/plain' });
    expect(bad.status).toBe(400);
    const st = await student
      .post(`/admin/courses/${courseId}/videos`)
      .attach('file', clip, { filename: 'x.mp4', contentType: 'video/mp4' });
    expect(st.status).toBe(403);
  });

  it('yalnız videolu nəzəri addım dərc olunur; mətn də video da yoxdursa — yox', async () => {
    const s = await admin
      .post(`/admin/modules/${moduleId}/steps`)
      .send({ type: 'THEORY', title: 'Video dərs: Fəsil 1' });
    const put = await admin.put(`/admin/steps/${s.body.id}`).send({
      type: 'theory',
      title: 'Video dərs: Fəsil 1',
      content: '',
      video_url: 'videos/f1-dərs.mp4',
    });
    expect(put.status).toBe(200);
    const pub = await admin.patch(`/admin/steps/${s.body.id}/publish`).send({ isPublished: true });
    expect(pub.status).toBe(200);
    expect(pub.body.isPublished).toBe(true);

    const empty = await admin
      .post(`/admin/modules/${moduleId}/steps`)
      .send({ type: 'THEORY', title: 'Boş' });
    const bad = await admin
      .patch(`/admin/steps/${empty.body.id}/publish`)
      .send({ isPublished: true });
    expect(bad.status).toBe(422);
    expect(JSON.stringify(bad.body)).toContain('video əlavə edin');
  });
});
