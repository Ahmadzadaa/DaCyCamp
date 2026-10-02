/**
 * Seed — idempotent (slug/key/email üzrə upsert). Məzmun YALNIZ format nümunəsidir:
 * 3 istiqamət, admin + tələbə hesabı, "NÜMUNƏ — silinə bilər" kursu (1 fəsil, hər tipdən 1 addım).
 */
import { env } from '../src/config/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { DEFAULT_TRACKS, splitAssessment, splitStep, type StepDefinition } from '@dacy/shared';
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
      instructions:
        'Nümunə təlimat — silinə bilər.\n\nKonteynerdə `student` istifadəçisi ilə işləyirsiniz. Ev qovluğunda `done.txt` faylı yaradın:\n\n```sh\ntouch ~/done.txt\n```\n\nSonra «Yoxla» düyməsinə basın (və ya terminalda `check` yazın).',
      docker_image: 'dacy/numune-lab:latest',
      time_limit_minutes: 30,
      check_script: 'checks/numune.sh',
      hints: ['Nümunə ipucu: `touch` əmri boş fayl yaradır.'],
      tasks: ['~/done.txt faylını yaradın', '«Yoxla» ilə təsdiqləyin'],
      hint_penalty_xp: 0,
      network: false,
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
    content:
      '#!/bin/sh\n# Nümunə yoxlama skripti — exit 0 = keçdi. Konteynerdə /dacy/check.sh kimi işləyir.\nif test -f "$HOME/done.txt"; then\n  echo "✓ done.txt tapıldı"\n  exit 0\nfi\necho "✗ ~/done.txt yoxdur — touch ~/done.txt"\nexit 1\n',
  },
  {
    path: 'files/numune.txt',
    filename: 'numune.txt',
    mime: 'text/plain',
    content: 'Nümunə əlavə fayl.\nflag: DACY{numune}\n',
  },
];

/** E-poçt + şifrə verilibsə hesabı upsert edir (şifrə argon2id ilə heşlənir); yoxdursa xəbərdarlıq verib keçir */
async function seedUser(
  email: string | undefined,
  password: string | undefined,
  name: string,
  role: 'ADMIN' | 'STUDENT',
) {
  if (!email || !password) {
    console.warn(
      `⚠ SEED_${role}_EMAIL / SEED_${role}_PASSWORD boşdur — ${role} hesabı yaradılmadı`,
    );
    return null;
  }
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, role, passwordHash: await hash(password) },
    update: role === 'ADMIN' ? { role: 'ADMIN' } : {},
  });
}

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
  // hesablar — e-poçt/şifrə yalnız .env-dən (SEED_ADMIN_*, SEED_STUDENT_*); boşdursa yaradılmır.
  // Upsert: hesab artıq varsa təkrar yaranmır, şifrəsi dəyişmir (yalnız admin rolu təmin edilir).
  const admin = await seedUser(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD, 'Admin', 'ADMIN');
  const student = await seedUser(
    env.SEED_STUDENT_EMAIL,
    env.SEED_STUDENT_PASSWORD,
    'Nümunə Tələbə',
    'STUDENT',
  );
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
      createdById: admin?.id ?? null,
    },
    update: {},
  });
  // test tələbəsi nümunə kursa yazılır (tələbə tərəfini dərhal yoxlamaq üçün)
  if (student)
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      create: { userId: student.id, courseId: course.id },
      update: {},
    });
  // fayllar
  for (const a of assets) {
    const buf = Buffer.from(a.content, 'utf8');
    const existing = await prisma.asset.findUnique({
      where: { courseId_path: { courseId: course.id, path: a.path } },
    });
    // məzmun dəyişməyibsə və fayl yerindədirsə toxunma; dəyişibsə (nümunə yenilənib) əvəz et
    if (existing && existing.sha256 === sha256(buf) && (await storageExists(existing.storageKey)))
      continue;
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
      uploadedById: admin?.id ?? null,
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
    // nümunə kurs platformaya aiddir: məzmun yenilənibsə addımı da yenilə (SQL-in hesablanmış `expected` heşi qorunur)
    const prev = await prisma.step.findUnique({
      where: { moduleId_key: { moduleId: mod.id, key: s.key } },
      select: { secret: true },
    });
    const prevExpected = (prev?.secret as { expected?: unknown } | null)?.expected;
    const secret =
      split.secret && prevExpected && split.type === 'SQL'
        ? { ...(split.secret as object), expected: prevExpected }
        : split.secret;
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
        secret: secret ? (secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {
        title: split.title,
        xp: split.xp,
        isPublished: true,
        config: split.config as unknown as Prisma.InputJsonValue,
        secret: secret ? (secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
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
  // nümunə karyera yolu — formatı göstərmək üçün (silinə bilər)
  const pathTrack = await prisma.track.findUniqueOrThrow({ where: { slug: 'data-analytics' } });
  const pathMeta = {
    title: 'NÜMUNƏ YOL — silinə bilər',
    description:
      'Bu yol yalnız formatı göstərir: kurs → mərhələ imtahanı → layihə → final. Real yolları admin paneldən və ya path.yaml ilə yükləyin.',
    level: 'BEGINNER' as const,
    targetAudience: 'Nümunə: platformanı yoxlayanlar',
    skills: ['Nümunə bacarıq 1', 'Nümunə bacarıq 2'],
    estimatedHours: 2,
    sequential: true,
    isPublished: true,
  };
  const samplePath = await prisma.learningPath.upsert({
    where: { slug: 'numune-yol' },
    create: { ...pathMeta, slug: 'numune-yol', trackId: pathTrack.id, order: 1 },
    update: { ...pathMeta },
  });
  const assessment = splitAssessment({
    pass_score: 50,
    questions: [
      {
        text: 'Nümunə imtahan sualı: hansı variant düzgündür?',
        type: 'single',
        options: ['Düzgün variant', 'Səhv variant'],
        correct: [0],
        explanation: 'Nümunə izah.',
      },
    ],
  });
  const pathItems: Array<{
    key: string;
    type: 'COURSE' | 'ASSESSMENT' | 'PROJECT' | 'MILESTONE';
    courseId?: string;
    title?: string;
    config?: object;
    secret?: object;
    xp: number;
    hours?: number;
  }> = [
    { key: COURSE_SLUG, type: 'COURSE', courseId: course.id, xp: 0 },
    {
      key: 'numune-imtahan',
      type: 'ASSESSMENT',
      title: 'Nümunə mərhələ imtahanı',
      config: assessment.config,
      secret: assessment.secret,
      xp: 50,
      hours: 0.5,
    },
    {
      key: 'numune-layihe',
      type: 'PROJECT',
      title: 'Nümunə layihə',
      config: {
        instructions:
          'Nümunə layihə təlimatı — silinə bilər.\n\nBir fayl (və ya link) təhvil verin; müəllim admin paneldən yoxlayıb qəbul edir.',
        deliverables: ['Nümunə fayl (istənilən format)', 'Qısa qeyd'],
        review_mode: 'manual',
        allow_link: true,
        max_files: 3,
      },
      xp: 100,
      hours: 1,
    },
    {
      key: 'final',
      type: 'MILESTONE',
      title: 'Final və sertifikat',
      config: {
        certificate_title: 'Nümunə yol sertifikatı',
        description: 'Bütün addımlar bitəndə yol sertifikatı verilir.',
      },
      xp: 0,
    },
  ];
  for (const [i, it] of pathItems.entries()) {
    await prisma.pathItem
      .update({
        where: { pathId_key: { pathId: samplePath.id, key: it.key } },
        data: { order: -(i + 1) },
      })
      .catch(() => undefined);
  }
  for (const [i, it] of pathItems.entries()) {
    const data = {
      type: it.type,
      courseId: it.courseId ?? null,
      title: it.title ?? null,
      config: (it.config ?? {}) as Prisma.InputJsonValue,
      secret: it.secret ? (it.secret as Prisma.InputJsonValue) : Prisma.JsonNull,
      xp: it.xp,
      estimatedHours: it.hours ?? null,
      order: i + 1,
    };
    await prisma.pathItem.upsert({
      where: { pathId_key: { pathId: samplePath.id, key: it.key } },
      create: { pathId: samplePath.id, key: it.key, ...data },
      update: data,
    });
  }

  const counts = {
    tracks: await prisma.track.count(),
    paths: await prisma.learningPath.count(),
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
