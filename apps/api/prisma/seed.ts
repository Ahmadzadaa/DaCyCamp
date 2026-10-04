/**
 * Seed — idempotent (slug/key/email üzrə upsert). Məzmun YALNIZ format nümunəsidir:
 * 3 istiqamət, admin + tələbə hesabı, "NÜMUNƏ — silinə bilər" kursu (1 fəsil, hər tipdən 1 addım).
 */
import { env } from '../src/config/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import {
  buildRoadmapI18n,
  canonicalJson,
  DEFAULT_ROADMAPS,
  DEFAULT_TRACKS,
  roadmapContentSchema,
  splitAssessment,
  splitStep,
  type AssessmentDraft,
  type RoadmapContent,
  type StepDefinition,
} from '@dacy/shared';
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

/** Nümunə addımların İngiliscə variantı — eyni quruluş (variantların sayı, düzgün cavablar eyni) */
const stepsEn: Record<string, StepDefinition> = {
  nezeri: {
    type: 'theory',
    title: 'Sample theory step',
    xp: 10,
    content: [
      '# Sample theory text — can be deleted',
      '',
      'This step only demonstrates the **format**. The instructor uploads real lesson content from the admin panel or as a ZIP package.',
      '',
      '## Markdown support',
      '',
      '- Lists, **bold** and *italic* text',
      '- Code: `SELECT 1`',
      '- Images: `![name](images/file.png)` (from the course files)',
      '',
      '```sql',
      '-- a code block example',
      'SELECT * FROM numune;',
      '```',
      '',
      'The student completes the step with the **"Got it, continue"** button below.',
    ].join('\n'),
  },
  test: {
    type: 'quiz',
    title: 'Sample quiz',
    xp: 30,
    pass_score: 70,
    shuffle_questions: false,
    questions: [
      {
        text: 'Sample question: which option is correct?',
        type: 'single',
        options: ['Option A (correct)', 'Option B', 'Option C'],
        correct: [0],
        explanation: 'A sample explanation — shown after the student answers.',
      },
      {
        text: 'Sample multiple-answer question: select the correct ones.',
        type: 'multiple',
        options: ['Correct 1', 'Wrong', 'Correct 2'],
        correct: [0, 2],
        explanation: 'More than one option can be selected.',
      },
    ],
  },
  sql: {
    type: 'sql',
    title: 'Sample SQL exercise',
    xp: 50,
    instructions:
      'Sample instructions — can be deleted.\n\nSelect all rows from the `numune` table.',
    dataset: 'datasets/numune.csv',
    starter_code: 'SELECT ',
    solution: 'SELECT * FROM numune',
    check: 'result_match',
    hints: ['Sample hint: `SELECT *` returns all columns.'],
    tasks: ['Sample item 1', 'Sample item 2'],
    hint_penalty_xp: 10,
  },
  python: {
    type: 'python',
    title: 'Sample Python exercise',
    xp: 50,
    instructions: 'Sample instructions — can be deleted.\n\nAssign `1` to the variable `x`.',
    starter_code: '# Write your code here\n',
    solution: 'x = 1',
    tests: "assert 'x' in globals(), 'x is not defined'\nassert x == 1",
    hints: ['Sample hint'],
    tasks: ['Sample item'],
    hint_penalty_xp: 10,
  },
  terminal: {
    type: 'terminal',
    title: 'Sample terminal lab',
    xp: 100,
    instructions:
      'Sample instructions — can be deleted.\n\nYou are working in the container as the `student` user. Create a `done.txt` file in your home directory:\n\n```sh\ntouch ~/done.txt\n```\n\nThen press the "Check" button (or type `check` in the terminal).',
    docker_image: 'dacy/numune-lab:latest',
    time_limit_minutes: 30,
    check_script: 'checks/numune.sh',
    hints: ['Sample hint: the `touch` command creates an empty file.'],
    tasks: ['Create the ~/done.txt file', 'Confirm with "Check"'],
    hint_penalty_xp: 0,
    network: false,
  },
  ctf: {
    type: 'ctf',
    title: 'Sample CTF room',
    xp: 150,
    instructions:
      'Sample instructions — can be deleted. Download the attachment and find the flag.',
    attachments: ['files/numune.txt'],
    hint_penalty_xp: 10,
    tasks: [
      {
        key: 't1',
        question: 'Sample question: what is the flag written in the file?',
        answer: 'DACY{numune}',
        hint: 'Sample hint: open the file.',
        points: 150,
        case_sensitive: false,
      },
    ],
  },
};

const json = (v: unknown) => v as Prisma.InputJsonValue;

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
  // nümunə kurs (İngiliscə tərcümə hər dəfə yenilənir — nümunə məzmun platformaya aiddir)
  const courseI18n = {
    en: {
      title: 'SAMPLE — can be deleted',
      description:
        "This course only demonstrates the platform's format: one example of each step type. Real courses are uploaded from the admin panel or as a ZIP.",
    },
  };
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
      i18n: json(courseI18n),
    },
    update: { i18n: json(courseI18n) },
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
  const moduleI18n = {
    en: { title: 'Sample chapter', description: 'One example of each step type' },
  };
  const mod = await prisma.module.upsert({
    where: { courseId_key: { courseId: course.id, key: 'numune-fesil' } },
    create: {
      courseId: course.id,
      key: 'numune-fesil',
      title: 'Nümunə fəsil',
      description: 'Hər addım tipindən bir nümunə',
      order: 1,
      isPublished: true,
      i18n: json(moduleI18n),
    },
    update: { i18n: json(moduleI18n) },
  });
  // addımlar
  for (const [i, s] of steps.entries()) {
    const split = splitStep(s.def);
    const en = splitStep(stepsEn[s.key]!);
    const tr = {
      i18n: json({ en: { title: en.title, config: en.config } }),
      secretI18n: en.secret ? json({ en: en.secret }) : Prisma.JsonNull,
    };
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
        ...tr,
      },
      update: {
        title: split.title,
        xp: split.xp,
        isPublished: true,
        config: split.config as unknown as Prisma.InputJsonValue,
        secret: secret ? (secret as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        ...tr,
      },
    });
    for (const t of split.ctfTasks) {
      const te = en.ctfTasks.find((x) => x.key === t.key);
      const taskI18n = json({ en: { question: te?.question, hint: te?.hint } });
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
          i18n: taskI18n,
        },
        update: { i18n: taskI18n },
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
  const pathI18n = json({
    en: {
      title: 'SAMPLE PATH — can be deleted',
      description:
        'This path only demonstrates the format: course → stage exam → project → final. Upload real paths from the admin panel or with path.yaml.',
      targetAudience: 'Sample: people trying out the platform',
      skills: ['Sample skill 1', 'Sample skill 2'],
    },
  });
  const samplePath = await prisma.learningPath.upsert({
    where: { slug: 'numune-yol' },
    create: { ...pathMeta, slug: 'numune-yol', trackId: pathTrack.id, order: 1, i18n: pathI18n },
    update: { ...pathMeta, i18n: pathI18n },
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
  const assessmentEnDef: AssessmentDraft = {
    pass_score: 50,
    questions: [
      {
        text: 'Sample exam question: which option is correct?',
        type: 'single',
        options: ['The correct option', 'A wrong option'],
        correct: [0],
        explanation: 'A sample explanation.',
      },
    ],
  };
  const assessmentEn = splitAssessment(assessmentEnDef);
  const pathItems: Array<{
    key: string;
    type: 'COURSE' | 'ASSESSMENT' | 'PROJECT' | 'MILESTONE';
    courseId?: string;
    title?: string;
    config?: object;
    secret?: object;
    xp: number;
    hours?: number;
    en?: { title?: string; config?: object; secret?: object };
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
      en: {
        title: 'Sample stage exam',
        config: assessmentEn.config,
        secret: assessmentEn.secret,
      },
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
      en: {
        title: 'Sample project',
        config: {
          instructions:
            'Sample project instructions — can be deleted.\n\nSubmit a file (or a link); the instructor reviews and accepts it from the admin panel.',
          deliverables: ['A sample file (any format)', 'A short note'],
        },
      },
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
      en: {
        title: 'Final and certificate',
        config: {
          certificate_title: 'Sample path certificate',
          description: 'The path certificate is issued when all steps are complete.',
        },
      },
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
      i18n: it.en ? json({ en: { title: it.en.title, config: it.en.config } }) : Prisma.JsonNull,
      secretI18n: it.en?.secret ? json({ en: it.en.secret }) : Prisma.JsonNull,
    };
    await prisma.pathItem.upsert({
      where: { pathId_key: { pathId: samplePath.id, key: it.key } },
      create: { pathId: samplePath.id, key: it.key, ...data },
      update: data,
    });
  }

  // karyera xəritələri — yalnız yoxdursa yaradılır (admin redaktələri heç vaxt üzərinə yazılmır).
  // İngiliscə tərcümə isə hər dəfə CARİ məzmuna görə yenilənir: admin dəyişdirdiyi mətn AZ qalır.
  for (const [i, r] of DEFAULT_ROADMAPS.entries()) {
    const existing = await prisma.roadmap.findUnique({ where: { slug: r.slug } });
    if (existing) {
      const content = roadmapContentSchema.safeParse(existing.content);
      if (!content.success) continue;
      const i18n = buildRoadmapI18n({ ...existing, content: content.data });
      if (canonicalJson(i18n) !== canonicalJson(existing.i18n ?? null))
        await prisma.roadmap.update({
          where: { id: existing.id },
          data: { i18n: i18n ? json(i18n) : Prisma.JsonNull },
        });
      continue;
    }
    const track = r.track
      ? await prisma.track.findUnique({ where: { slug: r.track }, select: { id: true } })
      : null;
    await prisma.roadmap.create({
      data: {
        slug: r.slug,
        title: r.title,
        tagline: r.tagline ?? null,
        description: r.description ?? null,
        trackId: track?.id ?? null,
        order: i + 1,
        isPublished: true,
        content: r.content as unknown as Prisma.InputJsonValue,
        i18n: json(buildRoadmapI18n({ ...r, content: r.content as RoadmapContent })),
      },
    });
  }

  const counts = {
    tracks: await prisma.track.count(),
    roadmaps: await prisma.roadmap.count(),
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
