import { INestApplication } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { Prisma } from '@prisma/client';
import { canonicalizeResult, sha256Hex, splitStep } from '@dacy/shared';
import { agent, createApp, login, resetDb, seedBasics } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashAnswer } from '../src/content/ctf-hash';
import { saveToStorage, sha256 } from '../src/assets/storage';

describe('Mərhələ 2: sql / python / ctf / ipucu / idxal-ixrac', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let st: ReturnType<typeof agent>;
  let ins: ReturnType<typeof agent>;
  let courseId = '';
  const slug = 'm2-kurs';
  const ids: Record<string, string> = {};
  const CSV = 'id,ad,deyer\n1,A,10\n2,B,20\n3,C,30\n';

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await resetDb(prisma);
    const b = await seedBasics(prisma);
    const course = await prisma.course.create({
      data: {
        trackId: b.track.id,
        slug,
        title: 'M2',
        order: 1,
        isPublished: true,
        sequential: false,
      },
    });
    courseId = course.id;
    const buf = Buffer.from(CSV);
    const key = await saveToStorage(course.id, 'numune.csv', buf);
    await prisma.asset.create({
      data: {
        courseId: course.id,
        path: 'datasets/numune.csv',
        kind: 'DATASET',
        filename: 'numune.csv',
        mime: 'text/csv',
        sizeBytes: buf.length,
        sha256: sha256(buf),
        storageKey: key,
      },
    });
    const m = await prisma.module.create({
      data: { courseId: course.id, key: 'f', title: 'F', order: 1, isPublished: true },
    });
    const defs = [
      {
        key: 'sql',
        def: {
          type: 'sql' as const,
          title: 'S',
          xp: 50,
          instructions: 'x',
          dataset: 'datasets/numune.csv',
          starter_code: '',
          solution: 'SELECT ad, deyer FROM numune ORDER BY deyer DESC',
          check: 'result_match' as const,
          hints: ['birinci ipucu', 'ikinci ipucu'],
          tasks: [],
          hint_penalty_xp: 10,
        },
      },
      {
        key: 'py',
        def: {
          type: 'python' as const,
          title: 'P',
          xp: 40,
          instructions: 'x',
          starter_code: '',
          tests: 'assert x == 1',
          hints: [],
          tasks: [],
          hint_penalty_xp: 10,
        },
      },
      {
        key: 'ctf',
        def: {
          type: 'ctf' as const,
          title: 'C',
          xp: 100,
          instructions: 'x',
          attachments: [],
          hint_penalty_xp: 5,
          tasks: [
            {
              key: 't1',
              question: 'q1',
              answer: '147',
              hint: 'bax',
              points: 40,
              case_sensitive: false,
            },
            { key: 't2', question: 'q2', answer: 'DACY{x}', points: 60, case_sensitive: true },
          ],
        },
      },
    ];
    for (const [i, d] of defs.entries()) {
      const s = splitStep(d.def);
      const row = await prisma.step.create({
        data: {
          moduleId: m.id,
          key: d.key,
          type: s.type,
          title: s.title,
          xp: s.xp,
          order: i + 1,
          isPublished: true,
          config: s.config as unknown as Prisma.InputJsonValue,
          secret: s.secret ? (s.secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      ids[d.key] = row.id;
      for (const t of s.ctfTasks) {
        const task = await prisma.ctfTask.create({
          data: {
            stepId: row.id,
            key: t.key,
            order: t.order,
            question: t.question,
            hint: t.hint,
            points: t.points,
            caseSensitive: t.caseSensitive,
            answerHash: hashAnswer(t.answer!, t.caseSensitive),
          },
        });
        ids[`task:${t.key}`] = task.id;
      }
    }
    st = await login(app, 'telebe@test.local', 'Telebe123!');
    ins = await login(app, 'muellim@test.local', 'Muellim123!');
    await st.post(`/courses/${slug}/enroll`);
  });
  afterAll(() => app.close());

  it('SQL: dərc zamanı gözlənilən nəticə serverdə hesablanır', async () => {
    const r = await ins.patch(`/admin/steps/${ids.sql}/publish`).send({ isPublished: true });
    expect(r.status).toBe(200);
    const step = await prisma.step.findUniqueOrThrow({ where: { id: ids.sql! } });
    const exp = (
      step.secret as { expected?: { columns: string[]; row_count: number; row_hash: string } }
    ).expected!;
    expect(exp.columns).toEqual(['ad', 'deyer']);
    expect(exp.row_count).toBe(3);
    expect(exp.row_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('SQL: düzgün hash → keçir və XP; səhv sətir sayı / dəyər → səbəb', async () => {
    const good = {
      columns: ['ad', 'deyer'],
      rows: [
        ['C', 30n],
        ['B', 20n],
        ['A', 10n],
      ],
    };
    const row_hash = await sha256Hex(canonicalizeResult(good, 'result_match'));
    const bad = await st
      .post(`/learn/steps/${ids.sql}/submit`)
      .send({
        kind: 'sql',
        query: 'SELECT 1',
        row_hash: row_hash.replace(/^./, 'f'),
        row_count: 2,
        columns: ['ad', 'deyer'],
      });
    expect(bad.body.passed).toBe(false);
    expect(bad.body.reason).toBe('row_count');
    const badVals = await st
      .post(`/learn/steps/${ids.sql}/submit`)
      .send({
        kind: 'sql',
        query: 'SELECT 1',
        row_hash: 'a'.repeat(64),
        row_count: 3,
        columns: ['ad', 'deyer'],
      });
    expect(badVals.body.reason).toBe('values');
    const badCols = await st
      .post(`/learn/steps/${ids.sql}/submit`)
      .send({ kind: 'sql', query: 'SELECT 1', row_hash, row_count: 3, columns: ['ad'] });
    expect(badCols.body.reason).toBe('columns');
    const ok = await st
      .post(`/learn/steps/${ids.sql}/submit`)
      .send({
        kind: 'sql',
        query: 'SELECT ad, deyer FROM numune ORDER BY deyer DESC',
        row_hash,
        row_count: 3,
        columns: ['AD', 'deyer'],
      });
    expect(ok.status).toBe(200);
    expect(ok.body.passed).toBe(true);
    expect(ok.body.xpAwarded).toBe(50);
    expect(ok.body.attempts).toBe(4);
    expect((await prisma.submission.count({ where: { stepId: ids.sql } })).valueOf()).toBe(4);
  });

  it('ipucu: mətn qayıdır, XP bir dəfə çıxılır', async () => {
    const h1 = await st.post(`/learn/steps/${ids.sql}/hints/0`);
    expect(h1.status).toBe(200);
    expect(h1.body.hint).toBe('birinci ipucu');
    expect(h1.body.xpPenalty).toBe(10);
    await st.post(`/learn/steps/${ids.sql}/hints/0`);
    const h2 = await st.post(`/learn/steps/${ids.sql}/hints/1`);
    expect(h2.body.unlocked).toEqual(['birinci ipucu', 'ikinci ipucu']);
    expect((await st.get('/auth/me')).body.xpTotal).toBe(50 - 10 - 10);
    expect((await st.post(`/learn/steps/${ids.sql}/hints/5`)).status).toBe(404);
    // görünüşdə açılmış ipucular var, bağlı olanlar yoxdur
    const v = await st.get(`/learn/courses/${slug}/steps/f/sql`);
    expect(v.body.view.hints_unlocked).toEqual(['birinci ipucu', 'ikinci ipucu']);
  });

  it('python: client testləri keçəndə tamamlanır', async () => {
    const fail = await st
      .post(`/learn/steps/${ids.py}/submit`)
      .send({ kind: 'python', code: 'x = 2', passed: false, error: 'AssertionError' });
    expect(fail.body.passed).toBe(false);
    expect(fail.body.attempts).toBe(1);
    const ok = await st
      .post(`/learn/steps/${ids.py}/submit`)
      .send({ kind: 'python', code: 'x = 1', passed: true, stdout: '' });
    expect(ok.body.passed).toBe(true);
    expect(ok.body.xpAwarded).toBe(40);
  });

  it('ctf: səhv cavab, düzgün cavab (normalizə), hər sual üçün XP, hamısı → addım tamam', async () => {
    const wrong = await st
      .post(`/learn/ctf-tasks/${ids['task:t1']}/answer`)
      .send({ answer: '148' });
    expect(wrong.body.correct).toBe(false);
    const ok1 = await st
      .post(`/learn/ctf-tasks/${ids['task:t1']}/answer`)
      .send({ answer: '  147 ' });
    expect(ok1.body.correct).toBe(true);
    expect(ok1.body.xpAwarded).toBe(40);
    expect(ok1.body.solvedAll).toBe(false);
    const again = await st
      .post(`/learn/ctf-tasks/${ids['task:t1']}/answer`)
      .send({ answer: '147' });
    expect(again.body.xpAwarded).toBe(0);
    const caseWrong = await st
      .post(`/learn/ctf-tasks/${ids['task:t2']}/answer`)
      .send({ answer: 'dacy{x}' });
    expect(caseWrong.body.correct).toBe(false);
    const ok2 = await st
      .post(`/learn/ctf-tasks/${ids['task:t2']}/answer`)
      .send({ answer: 'DACY{x}' });
    expect(ok2.body.solvedAll).toBe(true);
    expect(ok2.body.xpAwarded).toBe(60);
    const p = await prisma.stepProgress.findFirst({ where: { stepId: ids.ctf } });
    expect(p?.status).toBe('COMPLETED');
    const v = await st.get(`/learn/courses/${slug}/steps/f/ctf`);
    expect(v.body.view.tasks.map((t: { solved: boolean }) => t.solved)).toEqual([true, true]);
    expect(JSON.stringify(v.body)).not.toContain('answerHash');
    const hint = await st.post(`/learn/ctf-tasks/${ids['task:t1']}/hint`);
    expect(hint.body.hint).toBe('bax');
    expect(hint.body.xpPenalty).toBe(5);
  });

  it('ctf: dəqiqədə 10 cəhddən sonra 429', async () => {
    let last = 200;
    for (let i = 0; i < 12; i++) {
      const r = await st
        .post(`/learn/ctf-tasks/${ids['task:t2']}/answer`)
        .send({ answer: `yanlis-${i}` });
      last = r.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });

  function buildZip(
    opts: { title?: string; withSql?: boolean; badTrack?: boolean; extraStep?: boolean } = {},
  ) {
    const zip = new AdmZip();
    const add = (p: string, s: string) => zip.addFile(`paket/${p}`, Buffer.from(s, 'utf8'));
    add(
      'course.yaml',
      `track: ${opts.badTrack ? 'yoxdur' : 'data-analytics'}\ntitle: ${opts.title ?? 'İdxal kursu'}\nslug: idxal-kursu\nlevel: beginner\ndescription: test\npublished: true\n`,
    );
    add('datasets/x.csv', 'a,b\n1,2\n');
    add('modules/01-giris/module.yaml', 'title: Giriş\n');
    add(
      'modules/01-giris/01-nezeri.md',
      '---\ntitle: Salam\nxp: 10\n---\n# Salam\nmətn ![s](images/yoxdur.png)',
    );
    add(
      'modules/01-giris/02-test.yaml',
      'type: quiz\ntitle: Test\npass_score: 50\nquestions:\n  - text: s?\n    options: [A, B, C]\n    correct: [2]\n',
    );
    if (opts.withSql !== false)
      add(
        'modules/01-giris/03-sorgu.yaml',
        'type: sql\ntitle: Sorğu\ninstructions: yaz\ndataset: datasets/x.csv\nsolution: SELECT a FROM x\nhints: [h]\n',
      );
    if (opts.extraStep)
      add(
        'modules/01-giris/04-elave.yaml',
        'type: ctf\ntitle: Otaq\ninstructions: tap\ntasks:\n  - question: q\n    answer: cavab\n',
      );
    return zip.toBuffer();
  }

  it('idxal: validasiya səhvi heç nə yazmır', async () => {
    const r = await ins
      .post('/admin/import/validate')
      .attach('file', buildZip({ badTrack: true }), 'paket.zip');
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(false);
    expect(r.body.errors[0].message).toContain('İstiqamət tapılmadı');
    expect(await prisma.course.findUnique({ where: { slug: 'idxal-kursu' } })).toBeNull();
    const a = await ins
      .post('/admin/import/apply')
      .attach('file', buildZip({ badTrack: true }), 'paket.zip');
    expect(a.body.ok).toBe(false);
    expect((await prisma.courseImport.findFirst({ orderBy: { createdAt: 'desc' } }))?.status).toBe(
      'FAILED',
    );
  });

  it('idxal: tətbiq → kurs, fəsil, addımlar, fayl; quiz correct 1-dən çevrilir; SQL expected hesablanır', async () => {
    const r = await ins.post('/admin/import/apply').attach('file', buildZip(), 'paket.zip');
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(true);
    expect(r.body.summary).toMatchObject({ modules: 1, steps: 3, assets: 1 });
    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: 'idxal-kursu' },
      include: { modules: { include: { steps: { orderBy: { order: 'asc' } } } }, assets: true },
    });
    expect(course.isPublished).toBe(true);
    expect(course.modules[0]!.steps.map((s) => [s.key, s.type, s.order])).toEqual([
      ['nezeri', 'THEORY', 1],
      ['test', 'QUIZ', 2],
      ['sorgu', 'SQL', 3],
    ]);
    const quiz = course.modules[0]!.steps[1]!;
    expect((quiz.secret as { questions: { correct: number[] }[] }).questions[0]!.correct).toEqual([
      1,
    ]);
    const sql = course.modules[0]!.steps[2]!;
    expect((sql.secret as { expected?: { row_count: number } }).expected?.row_count).toBe(1);
    expect(course.assets[0]!.path).toBe('datasets/x.csv');
    const theory = course.modules[0]!.steps[0]!;
    expect((theory.config as { content: string }).content).toContain('# Salam');
  });

  it('yenidən idxal: başlıq yenilənir, irəliləyiş qalır, paketdə olmayan addım qaralamaya düşür', async () => {
    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: 'idxal-kursu' },
      include: { modules: { include: { steps: true } } },
    });
    const step = course.modules[0]!.steps.find((s) => s.key === 'nezeri')!;
    const student = await prisma.user.findUniqueOrThrow({ where: { email: 'telebe@test.local' } });
    await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } });
    await prisma.stepProgress.create({
      data: { userId: student.id, stepId: step.id, status: 'COMPLETED', completedAt: new Date() },
    });
    const r1 = await ins
      .post('/admin/import/apply')
      .attach('file', buildZip({ extraStep: true }), 'paket.zip');
    expect(r1.body.ok).toBe(true);
    const r2 = await ins
      .post('/admin/import/validate')
      .attach('file', buildZip({ title: 'Yeni başlıq', withSql: false }), 'paket.zip');
    expect(r2.body.summary.willUnpublish).toEqual(['giris/sorgu', 'giris/elave']);
    const r3 = await ins
      .post('/admin/import/apply')
      .attach('file', buildZip({ title: 'Yeni başlıq', withSql: false }), 'paket.zip');
    expect(r3.body.ok).toBe(true);
    const after = await prisma.course.findUniqueOrThrow({
      where: { slug: 'idxal-kursu' },
      include: { modules: { include: { steps: { orderBy: { order: 'asc' } } } } },
    });
    expect(after.title).toBe('Yeni başlıq');
    expect(after.modules[0]!.steps.map((s) => [s.key, s.isPublished])).toEqual([
      ['nezeri', true],
      ['test', true],
      ['elave', false],
      ['sorgu', false],
    ]);
    expect(
      await prisma.stepProgress.findUnique({
        where: { userId_stepId: { userId: student.id, stepId: step.id } },
      }),
    ).not.toBeNull();
    expect(
      (
        await prisma.enrollment.findUniqueOrThrow({
          where: { userId_courseId: { userId: student.id, courseId: course.id } },
        })
      ).percent,
    ).toBe(50);
  });

  it('ixrac: eyni format, quiz correct 1-dən, ctf yalnız hash', async () => {
    const course = await prisma.course.findUniqueOrThrow({ where: { slug: 'idxal-kursu' } });
    const r = await ins
      .get(`/admin/courses/${course.id}/export.zip`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    const zip = new AdmZip(r.body as Buffer);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toContain('course.yaml');
    expect(names).toContain('modules/01-giris/module.yaml');
    expect(names).toContain('modules/01-giris/01-nezeri.md');
    expect(names).toContain('modules/01-giris/02-test.yaml');
    expect(names).toContain('datasets/x.csv');
    const quiz = zip.readAsText('modules/01-giris/02-test.yaml');
    expect(quiz).toContain('correct:');
    expect(quiz).toMatch(/correct:\s*\n\s*- 2/);
    const ctf = zip.readAsText(names.find((n) => n.endsWith('-elave.yaml'))!);
    expect(ctf).toContain('answer_hash');
    expect(ctf).not.toContain('cavab');
    expect(ctf).toContain('published: false');
    // yenidən idxal keçir
    const re = await ins
      .post('/admin/import/validate')
      .attach('file', r.body as Buffer, 'export.zip');
    expect(re.body.ok).toBe(true);
  });
});
