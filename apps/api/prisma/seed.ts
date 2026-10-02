/**
 * Seed — idempotent (slug/key/email üzrə upsert). Məzmun YALNIZ format nümunəsidir:
 * 3 istiqamət, admin + tələbə hesabı, "NÜMUNƏ — silinə bilər" kursu (1 fəsil, hər tipdən 1 addım).
 */
import { env } from '../src/config/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { DEFAULT_TRACKS, splitStep, type StepDefinition } from '@dacy/shared';
import { hashAnswer } from '../src/content/ctf-hash';
import {
  detectKind,
  removeFromStorage,
  saveToStorage,
  sha256,
  storageExists,
} from '../src/assets/storage';

const prisma = new PrismaClient();

const COURSE_SLUG = 'numune';

const steps: Array<{ key: string; def: StepDefinition }> = [
  {
    key: 'nezeri',
    def: {
      type: 'theory',
      title: 'Nümunə nəzəri addım',
      xp: 10,
      content: [
        '# Nümunə nəzəri mətn — silinə bilər',
        '',
        'Bu addım yalnız **formatı** göstərir. Real dərs məzmununu müəllim admin paneldən və ya ZIP paketlə yükləyir.',
        '',
        '## Markdown dəstəyi',
        '',
        '- Siyahılar, **qalın** və *kursiv* mətn',
        '- Kod: `SELECT 1`',
        '- Şəkillər: `![ad](images/fayl.png)` (kursun fayllarından)',
        '',
        '```sql',
        '-- kod bloku nümunəsi',
        'SELECT * FROM numune;',
        '```',
        '',
        'Tələbə aşağıdakı **"Oxudum, davam et"** düyməsi ilə addımı tamamlayır.',
      ].join('\n'),
    },
  },
  {
    key: 'test',
    def: {
      type: 'quiz',
      title: 'Nümunə test',
      xp: 30,
      pass_score: 70,
      shuffle_questions: false,
      questions: [
        {
          text: 'Nümunə sual: hansı variant düzgündür?',
          type: 'single',
          options: ['Variant A (düzgün)', 'Variant B', 'Variant C'],
          correct: [0],
          explanation: 'Nümunə izah — tələbə cavab verəndən sonra göstərilir.',
        },
        {
          text: 'Nümunə çoxcavablı sual: düzgün olanları seçin.',
          type: 'multiple',
          options: ['Düzgün 1', 'Səhv', 'Düzgün 2'],
          correct: [0, 2],
          explanation: 'Bir neçə variant seçilə bilər.',
        },
      ],
    },
  },
  {
    key: 'sql',
    def: {
      type: 'sql',
      title: 'Nümunə SQL tapşırığı',
      xp: 50,
      instructions: 'Nümunə təlimat — silinə bilər.\n\n`numune` cədvəlindən bütün sətirləri seçin.',
      dataset: 'datasets/numune.csv',
      starter_code: 'SELECT ',
      solution: 'SELECT * FROM numune',
      check: 'result_match',
      hints: ['Nümunə ipucu: `SELECT *` bütün sütunları qaytarır.'],
      tasks: ['Nümunə maddə 1', 'Nümunə maddə 2'],
      hint_penalty_xp: 10,
    },
  },
  {
    key: 'python',
    def: {
      type: 'python',
      title: 'Nümunə Python tapşırığı',
      xp: 50,
      instructions: 'Nümunə təlimat — silinə bilər.\n\n`x` dəyişəninə `1` mənimsədin.',
      starter_code: '# Kodunuzu bura yazın\n',
      solution: 'x = 1',
      tests: "assert 'x' in globals(), 'x təyin olunmayıb'\nassert x == 1",
      hints: ['Nümunə ipucu'],
      tasks: ['Nümunə maddə'],
      hint_penalty_xp: 10,
    },
  },
  {
    key: 'terminal',
    def: {
      type: 'terminal',
      title: 'Nümunə terminal lab',
      xp: 100,
      instructions: 'Nümunə təlimat — silinə bilər. Mərhələ 3-də real konteyner açılacaq.',
      docker_image: 'dacy/numune-lab:latest',
      time_limit_minutes: 30,
      check_script: 'checks/numune.sh',
      hints: [],
      tasks: ['Nümunə maddə'],
      hint_penalty_xp: 0,
    },
  },
  {
    key: 'ctf',
    def: {
      type: 'ctf',
      title: 'Nümunə CTF otağı',
      xp: 150,
      instructions: 'Nümunə təlimat — silinə bilər. Əlavə faylı yükləyib flag-i tapın.',
      attachments: ['files/numune.txt'],
      hint_penalty_xp: 10,
      tasks: [
        {
          key: 't1',
          question: 'Nümunə sual: faylda yazılan flag nədir?',
          answer: 'DACY{numune}',
          hint: 'Nümunə ipucu: faylı açın.',
          points: 150,
          case_sensitive: false,
        },
      ],
    },
  },
];

const assets: Array<{ path: string; filename: string; mime: string; content: string }> = [
  {
    path: 'datasets/numune.csv',
    filename: 'numune.csv',
    mime: 'text/csv',
    content: 'id,ad,deyer\n1,nümunə A,10\n2,nümunə B,20\n3,nümunə C,30\n',
  },
  {
    path: 'checks/numune.sh',
    filename: 'numune.sh',
    mime: 'text/x-shellscript',
    content: '#!/bin/sh\n# Nümunə yoxlama skripti — exit 0 = keçdi\nexit 0\n',
  },
  {
    path: 'files/numune.txt',
    filename: 'numune.txt',
    mime: 'text/plain',
    content: 'Nümunə əlavə fayl.\nflag: DACY{numune}\n',
  },
];

async function main() {
  // istiqamətlər
  for (const [i, t] of DEFAULT_TRACKS.entries()) {
    await prisma.track.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        title: t.title,
        color: t.color,
        icon: t.icon,
        order: i + 1,
        isPublished: true,
      },
      update: {},
    });
  }
  // hesablar
  const admin = await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: await hash(env.SEED_ADMIN_PASSWORD),
    },
    update: { role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: env.SEED_STUDENT_EMAIL.toLowerCase() },
    create: {
      email: env.SEED_STUDENT_EMAIL.toLowerCase(),
      name: 'Nümunə Tələbə',
      role: 'STUDENT',
      passwordHash: await hash(env.SEED_STUDENT_PASSWORD),
    },
    update: {},
  });
  // nümunə kurs
  const track = await prisma.track.findUniqueOrThrow({ where: { slug: 'data-analytics' } });
  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    create: {
      slug: COURSE_SLUG,
      trackId: track.id,
      title: 'NÜMUNƏ — silinə bilər',
      level: 'BEGINNER',
      description:
        'Bu kurs yalnız platformanın formatını göstərmək üçündür: hər addım tipindən bir nümunə. Real kurslar admin paneldən və ya ZIP ilə yüklənir.',
      sequential: true,
      estimatedHours: 1,
      order: 1,
      isPublished: true,
      publishedAt: new Date(),
      createdById: admin.id,
    },
    update: {},
  });
  // fayllar
  for (const a of assets) {
    const buf = Buffer.from(a.content, 'utf8');
    const existing = await prisma.asset.findUnique({
      where: { courseId_path: { courseId: course.id, path: a.path } },
    });
    if (existing && (await storageExists(existing.storageKey))) continue;
    if (existing) await removeFromStorage(existing.storageKey);
    const storageKey = await saveToStorage(course.id, a.filename, buf);
    const data = {
      courseId: course.id,
      path: a.path,
      kind: detectKind(a.path, a.mime),
      filename: a.filename,
      mime: a.mime,
      sizeBytes: buf.length,
      sha256: sha256(buf),
      storageKey,
      uploadedById: admin.id,
    };
    if (existing) await prisma.asset.update({ where: { id: existing.id }, data });
    else await prisma.asset.create({ data });
  }
  // fəsil
  const mod = await prisma.module.upsert({
    where: { courseId_key: { courseId: course.id, key: 'numune-fesil' } },
    create: {
      courseId: course.id,
      key: 'numune-fesil',
      title: 'Nümunə fəsil',
      description: 'Hər addım tipindən bir nümunə',
      order: 1,
      isPublished: true,
    },
    update: {},
  });
  // addımlar
  for (const [i, s] of steps.entries()) {
    const split = splitStep(s.def);
    const step = await prisma.step.upsert({
      where: { moduleId_key: { moduleId: mod.id, key: s.key } },
      create: {
        moduleId: mod.id,
        key: s.key,
        type: split.type,
        title: split.title,
        xp: split.xp,
        order: i + 1,
        isPublished: true,
        config: split.config as unknown as Prisma.InputJsonValue,
        secret: split.secret ? (split.secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {},
    });
    for (const t of split.ctfTasks) {
      await prisma.ctfTask.upsert({
        where: { stepId_key: { stepId: step.id, key: t.key } },
        create: {
          stepId: step.id,
          key: t.key,
          order: t.order,
          question: t.question,
          hint: t.hint,
          points: t.points,
          caseSensitive: t.caseSensitive,
          answerHash: hashAnswer(t.answer!, t.caseSensitive),
        },
        update: {},
      });
    }
  }
  const counts = {
    tracks: await prisma.track.count(),
    courses: await prisma.course.count(),
    modules: await prisma.module.count(),
    steps: await prisma.step.count(),
    ctfTasks: await prisma.ctfTask.count(),
    assets: await prisma.asset.count(),
    users: await prisma.user.count(),
  };
  console.log('✓ Seed tamamlandı:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
