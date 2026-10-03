import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { splitStep } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

/** «Qruplara ayır» sualı: tələbə görünüşü (qruplar var, cavab yox) və serverdə qiymətləndirmə */
describe('quiz: classify sualı', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let st: ReturnType<typeof agent>;
  let stepId = '';
  const slug = 'classify-kurs';

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const course = await prisma.course.create({
      data: { trackId: b.track.id, slug, title: 'Classify', order: 1, isPublished: true },
    });
    const m = await prisma.module.create({
      data: { courseId: course.id, key: 'giris', title: 'Giriş', order: 1, isPublished: true },
    });
    const s = splitStep({
      type: 'quiz',
      title: 'Kimin işidir?',
      xp: 20,
      pass_score: 100,
      shuffle_questions: false,
      questions: [
        {
          text: 'Ayırın',
          type: 'classify',
          options: ['Pipeline', 'Hesabat', 'Bazanı qurmaq', 'Dashboard'],
          buckets: ['Data engineer', 'Data analitik'],
          correct: [0, 1, 0, 1],
          explanation: 'izah',
        },
        { text: 'Tək', type: 'single', options: ['a', 'b'], correct: [0] },
      ],
    });
    stepId = (
      await prisma.step.create({
        data: {
          moduleId: m.id,
          key: 'q',
          type: s.type,
          title: s.title,
          xp: s.xp,
          order: 1,
          isPublished: true,
          config: s.config as unknown as Prisma.InputJsonValue,
          secret: s.secret as unknown as Prisma.InputJsonValue,
        },
      })
    ).id;
    st = await login(app, 'telebe@test.local', 'Telebe123!');
    await st.post(`/courses/${slug}/enroll`);
  });
  afterAll(() => app.close());

  it('görünüşdə qruplar və elementlər var, düzgün qruplar yoxdur', async () => {
    const v = await st.get(`/learn/courses/${slug}/steps/giris/q`);
    expect(v.status).toBe(200);
    expect(v.body.view.questions[0]).toEqual({
      text: 'Ayırın',
      type: 'classify',
      options: ['Pipeline', 'Hesabat', 'Bazanı qurmaq', 'Dashboard'],
      buckets: ['Data engineer', 'Data analitik'],
    });
    expect(JSON.stringify(v.body.view)).not.toContain('correct');
  });

  it('səhv yerləşdirmə: sual səhvdir, hər elementin düzgün qrupu qaytarılır', async () => {
    const r = await st
      .post(`/learn/steps/${stepId}/submit`)
      .send({ kind: 'quiz', answers: [[0, 1, 1, 1], [0]] });
    expect(r.status).toBe(200);
    expect(r.body.score).toBe(50);
    expect(r.body.passed).toBe(false);
    expect(r.body.perQuestion[0]).toEqual({
      correct: false,
      correctIndices: [0, 1, 0, 1],
      explanation: 'izah',
    });
    // natamam cavab da səhvdir
    const partial = await st
      .post(`/learn/steps/${stepId}/submit`)
      .send({ kind: 'quiz', answers: [[0, 1], [0]] });
    expect(partial.body.perQuestion[0].correct).toBe(false);
  });

  it('hamısı düzgün qrupda → keçdi, XP verilir', async () => {
    const r = await st
      .post(`/learn/steps/${stepId}/submit`)
      .send({ kind: 'quiz', answers: [[0, 1, 0, 1], [0]] });
    expect(r.body.score).toBe(100);
    expect(r.body.passed).toBe(true);
    expect(r.body.xpAwarded).toBe(20);
  });
});
