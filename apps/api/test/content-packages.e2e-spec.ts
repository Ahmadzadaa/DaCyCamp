import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { DEFAULT_TRACKS } from '@dacy/shared';
import { createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentSyncService } from '../src/import-export/content-sync.service';

/** content/courses/* — repo-dakı kurs paketləri idxal validasiyasından səhvsiz keçməli və tətbiq olunmalıdır */
const ROOT = resolve(__dirname, '../../../content/courses');
const packages = existsSync(ROOT)
  ? readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'course.yaml')))
  : [];

describe('Repo kurs paketləri (content/courses)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof login>>;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    await seedBasics(prisma);
    // real seed bütün defolt istiqamətləri yaradır (paketlər data-engineering / cyber-security-yə də aiddir)
    for (const [i, t] of DEFAULT_TRACKS.entries())
      await prisma.track.upsert({
        where: { slug: t.slug },
        update: {},
        create: { slug: t.slug, title: t.title, color: t.color, order: i + 1, isPublished: true },
      });
    await prisma.topic.create({ data: { slug: 'python', title: 'Python', order: 1 } });
    admin = await login(app, 'admin@test.local', 'Admin123!');
  });
  afterAll(() => app.close());

  it('ən azı bir paket var', () => {
    expect(packages.length).toBeGreaterThan(0);
  });

  it.each(packages)('%s: validasiya səhvsiz, idxal olunur', async (name) => {
    const zip = new AdmZip();
    zip.addLocalFolder(join(ROOT, name), name);
    const v = await admin
      .post('/admin/import/validate')
      .attach('file', zip.toBuffer(), `${name}.zip`);
    expect(v.body.errors).toEqual([]);
    expect(v.body.warnings).toEqual([]);
    expect(v.body.ok).toBe(true);
    const a = await admin.post('/admin/import/apply').attach('file', zip.toBuffer(), `${name}.zip`);
    expect(a.body.ok).toBe(true);
    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: v.body.course.slug },
      include: { modules: { include: { steps: true } } },
    });
    const steps = course.modules.flatMap((m) => m.steps);
    expect(steps.length).toBe(v.body.summary.steps);
    expect(steps.every((s) => s.isPublished)).toBe(true);
  });

  it('API açılışında avtomatik idxal: qovluq tapılır, yalnız bazada olmayanlar, girişsiz', async () => {
    expect(ContentSyncService.findDir()).toBe(ROOT);
    const sync = app.get(ContentSyncService);
    // yuxarıdakı test hamısını idxal edib → heç nə əlavə olunmur, admin düzəlişləri qorunur
    expect(await sync.syncNew(ROOT)).toEqual([]);
    await prisma.course.deleteMany({ where: { importedAt: { not: null } } });
    expect((await sync.syncNew(ROOT)).sort()).toEqual([...packages].sort());
    const imp = await prisma.courseImport.findFirstOrThrow({
      where: { filename: `${packages[0]}.zip`, status: 'APPLIED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(imp.uploadedById).toBeNull();
    expect(await sync.syncNew(ROOT)).toEqual([]);
  });
});
