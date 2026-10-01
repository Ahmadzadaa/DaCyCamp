# DaCy Academy — Quruluş planı (təsdiq üçün)

> Status: **QARALAMA — təsdiq gözləyir.** Təsdiqdən sonra Mərhələ 1 başlayır.
> Tam Prisma sxemi: `docs/schema.prisma` (Prisma 6 ilə `prisma validate` keçib).

---

## 1. Texnologiya və versiyalar

| Hissə | Seçim | Qeyd |
|---|---|---|
| Monorepo | pnpm 10 workspaces + Turborepo | `apps/web`, `apps/api`, `packages/shared` |
| Web | Next.js **15.5** (App Router), React 19, TypeScript | spesifikasiyadakı kimi (Next 16 mövcuddur, istəsəniz keçərik) |
| API | NestJS **10.4** | spesifikasiyadakı kimi (11/12 mövcuddur) |
| DB | PostgreSQL 16 + Prisma **6.19** | Prisma 7 konfiqurasiya formatını dəyişib, 6.x stabil xəttdir |
| UI | Tailwind **4** + shadcn/ui, lucide-react, next-themes | rəng tokenləri `globals.css`-də dizayn faylındakı kimi |
| Validasiya | zod 4 (`packages/shared`) | eyni sxem admin formasında, API-də və ZIP idxalında işləyir |
| Dərs ekranı | react-resizable-panels 4, Monaco (M2), xterm.js (M3) | |
| Brauzer icra | DuckDB-WASM, Pyodide | Mərhələ 2 |
| Test | Vitest (shared, web), Jest + supertest (api), Playwright (e2e + skrinşot) | |
| Şriftlər | IBM Plex Sans, JetBrains Mono — `@fontsource` ilə lokal | Google Fonts-a asılılıq yoxdur, skrinşotlar stabil olur |
| Portlar | web 3000, api 4000, db 5432 | 3100 və 5433 heç yerdə istifadə olunmur |

---

## 2. Qovluq strukturu

```
DaCyCamp/
├── package.json                 # pnpm workspace kökü; skriptlər: dev, build, test, e2e, lint, typecheck, db:*, screenshots
├── pnpm-workspace.yaml          # apps/*, packages/*
├── turbo.json
├── tsconfig.base.json
├── .env.example                 # DATABASE_URL, WEB_PORT=3000, API_PORT=4000, JWT_*, CTF_PEPPER, STORAGE_DIR, SEED_ADMIN_*, APP_TIMEZONE=Asia/Baku
├── docker-compose.yml           # db (postgres:16, 5432) həmişə; api + web `--profile full` ilə
├── README.md                    # quraşdırma: A) docker compose, B) mövcud Postgres (DATABASE_URL)
├── PROGRESS.md                  # hər mərhələnin jurnalı
├── scripts/
│   ├── dev.mjs                  # BİR ƏMR: .env yoxla → DB-yə qoşulmağa çalış → (yoxdursa və docker daemon varsa) `docker compose up -d db`
│   │                            #   → prisma migrate deploy → seed (boşdursa) → turbo dev (api 4000 + web 3000)
│   ├── wait-for-db.mjs
│   └── screenshots.mjs          # dizayn faylının bölmələri + tətbiq səhifələri → docs/screenshots/*.ref.png / *.app.png
├── infra/
│   ├── postgres/init.sql        # dacy_test bazası (api e2e üçün)
│   ├── docker/api.Dockerfile, web.Dockerfile
│   └── lab-images/              # Mərhələ 3: terminal lab imicləri
├── docs/
│   ├── DACY_PLATFORM_SPEC.md, DACY_DESIGN_REFERENCE.html
│   ├── PLAN.md, schema.prisma (bu fayllar)
│   ├── content-package.md       # ZIP/YAML formatı (Mərhələ 2), path.yaml (Mərhələ 4)
│   └── screenshots/
├── packages/shared/             # @dacy/shared
│   └── src/
│       ├── enums.ts, constants.ts
│       ├── keys.ts              # Azərbaycan hərflərini nəzərə alan slugify; "03-select.yaml" → key "select", order 3
│       ├── i18n/az.ts, en.ts, t.ts
│       ├── content/
│       │   ├── step-definition.ts   # 6 tip üçün zod sxemləri (qaralama + dərc üçün sərt)
│       │   ├── step-config.ts       # splitStep / mergeStep / toStudentView / validateForPublish
│       │   └── course-package.ts    # course.yaml, module.yaml, path.yaml sxemləri
│       ├── progress/unlock.ts, percent.ts   # kilid və faiz hesablanması (təmiz funksiyalar, test olunur)
│       └── api/dto.ts, types.ts
├── apps/api/                    # NestJS, :4000
│   ├── prisma/schema.prisma, migrations/, seed.ts
│   ├── storage/                 # yüklənən fayllar (gitignore)
│   ├── test/                    # e2e
│   └── src/
│       ├── main.ts, app.module.ts, config/env.ts
│       ├── prisma/, common/ (guards, decorators, zod pipe, exception filter, reorder util)
│       ├── auth/ users/ tracks/ catalog/ content/ assets/ enrollments/ learn/ progress/ xp/ dashboard/ health/
│       ├── import-export/       # Mərhələ 2
│       ├── certificates/ labs/  # Mərhələ 3
│       └── paths/               # Mərhələ 4 (indi yalnız onCourseCompleted no-op hook)
└── apps/web/                    # Next.js, :3000
    ├── next.config.ts           # /api/* → API_INTERNAL_URL (brauzer heç vaxt :4000-ə birbaşa getmir)
    ├── middleware.ts            # cookie yoxdursa → /giris; access bitib, refresh varsa → səssiz yeniləmə
    ├── playwright.config.ts, vitest.config.ts, e2e/
    └── src/
        ├── app/
        │   ├── layout.tsx, globals.css (dizayn tokenləri: açıq + tünd)
        │   ├── (auth)/giris, qeydiyyat
        │   ├── (app)/kurslar, kurs/[slug], panel, profil, sertifikatlar, yollar, yol/[slug]
        │   ├── (workspace)/kurs/[slug]/[moduleKey]/[stepKey]     # tam ekran tünd dərs ekranı
        │   ├── sertifikat/[id]                                   # ictimai yoxlama (M3)
        │   └── admin/ (kurslar, kurslar/[slug], istiqametler, telebeler, fayllar, idxal, yollar)
        ├── components/ui (shadcn), app, workspace, admin
        ├── lib/api (server.ts cookie ötürür, client.ts 401→refresh), lib/auth.ts
        └── i18n → @dacy/shared
```

---

## 3. Verilənlər bazası sxemi

Tam fayl: `docs/schema.prisma` (23 model). Əsas prinsiplər:

- **Kontent ağacı:** `Track → Course → Module → Step`. Hər səviyyədə `order` + `isPublished`. `@@unique([parent, order])` ilə iki element eyni yerdə ola bilməz.
- **Stabil açarlar (ZIP yenidən yükləmə üçün):** `Course.slug` (qlobal unikal), `Module.key` (kurs daxilində), `Step.key` (fəsil daxilində). Fayl adından rəqəm atılır: `03-select.yaml` → key `select`, order `3`. Yenidən idxal açara görə *upsert* edir, `Step.id` dəyişmir, ona görə `StepProgress` qorunur. ZIP-də olmayan addımlar silinmir, `isPublished=false` olur.
- **Step.config (ictimai) / Step.secret (yalnız server):** `config` spesifikasiyanın 4-cü bölməsindəki YAML açarlarını eynilə saxlayır (instructions, starter_code, dataset, pass_score, questions[].text/options…). `secret`-də həllər, düzgün cavablar, izahlar, gözlənilən nəticə, hints, check_script. Tələbə endpoint-ləri `secret`-i heç vaxt seçmir.
- **CTF:** hər sual `CtfTask` sətri; `answerHash = HMAC-SHA256(CTF_PEPPER, normalizə(cavab))`, açıq mətn yazılan anda atılır. Yoxlama yalnız backend-də, dəqiqədə 10 cəhd.
- **İrəliləyiş:** `StepProgress(userId, stepId)` yeganə həqiqət mənbəyidir. `Enrollment.percent / completedAt`, `User.xpTotal`, `ActivityDay` eyni tranzaksiyada yenilənən keşlərdir; `recompute-progress` əmri hamısını yenidən hesablayır.
- **XP:** `XpEvent` yalnız əlavə olunan jurnaldır; `@@unique([userId, dedupeKey])` eyni addıma iki dəfə XP verilməsini qeyri-mümkün edir.
- **Learning Path hazırlığı (indidən):** `LearningPath`, `PathItem`, `PathEnrollment`, `PathItemProgress`, `PathCertificate`. `PathItem.courseId` kursa istinad edir, `Course`-da yol FK-sı **yoxdur** → bir kurs istənilən sayda yolda ola bilər. Kurs tipli addımların vəziyyəti `StepProgress`-dən birbaşa hesablanır (əlavə yazı yoxdur), yalnız layihə / imtahan / final üçün `PathItemProgress` var.
- **Silmə qaydaları:** kontent aşağıya doğru cascade; `Track.courses` və `PathItem.course` Restrict (yolda olan kurs səssizcə silinə bilməz); sertifikat və XP istinadları SetNull + JSON snapshot (qazanılanlar qalır). İrəliləyişi olan fəsil/addım silinəndə 409, yalnız ADMIN `?force=1` ilə.

### Modellər (qısa)

```
User            id email passwordHash? name role(STUDENT|INSTRUCTOR|ADMIN) locale xpTotal targetPathId? lastActiveAt
RefreshToken    userId tokenHash expiresAt revokedAt          (rotasiya, yalnız hash)
Track           slug title color icon order isPublished       (3 istiqamət seed ilə, redaktə olunur)
Course          trackId slug title level description coverAssetId? sequential estimatedHours order isPublished publishedAt importedAt
Module          courseId key title order isPublished          @@unique(courseId,key) (courseId,order)
Step            moduleId key type config(Json) secret(Json?) xp estimatedMinutes order isPublished
CtfTask         stepId key order question hint? points caseSensitive answerHash
Asset           courseId path kind(IMAGE|VIDEO|PDF|DATASET|ATTACHMENT|CHECK_SCRIPT|OTHER) filename mime sizeBytes sha256 storageKey
CourseImport    courseId? slug filename status report(Json)   (M2 idxal jurnalı)
Enrollment      userId courseId enrolledAt lastStepId? lastActivityAt percent completedAt?
StepProgress    userId stepId status(IN_PROGRESS|COMPLETED) attempts score? startedAt lastAttemptAt completedAt
Submission      userId stepId type payload(Json) result(Json?) passed score durationMs
HintUsage       userId stepId hintKey xpPenalty               (ipucu bir dəfə ödənilir)
CtfSolve        userId ctfTaskId attempts solvedAt
XpEvent         userId amount reason stepId? ctfTaskId? courseId? pathItemId? pathId? dedupeKey
ActivityDay     userId date xp stepsCompleted                 (Asia/Baku günü; seriya + həftəlik zolaq)
Certificate     id(uuid) serial userId courseId? snapshot issuedAt revokedAt     (M3)
LabSession      userId stepId status image containerId expiresAt passedAt checkOutput   (M3)
LearningPath    trackId slug title description level targetAudience skills[] estimatedHours sequential order isPublished
PathItem        pathId key order type(COURSE|PROJECT|ASSESSMENT|MILESTONE) courseId? title? config secret? isOptional estimatedHours xp
PathEnrollment  userId pathId isActive lastItemId? percent completedAt?
PathItemProgress userId pathItemId status(IN_PROGRESS|SUBMITTED|PASSED|FAILED) score payload feedback reviewedById submittedAt completedAt
PathCertificate id(uuid) serial userId pathId? snapshot issuedAt revokedAt
```

### İrəliləyiş və kilid qaydası

- Kursun **dərc olunmuş** addımları `(module.order, step.order)` üzrə düzülür; bu, müəllimin qoyduğu ardıcıllıqdır (fəsil yalnız qruplaşdırmadır, kilid fəsil sərhədini keçir).
- `state = completed | in_progress | available | locked`; `available` ⇔ `!course.sequential` və ya ilk addım və ya əvvəlki `completed`.
- `percent = floor(100 × tamamlanmış / dərc olunmuş addım sayı)`; kurs bitməsi = hamısı tamamlanıb. Bir sorğu ilə istifadəçinin bütün kursları hesablanır (dashboard, kataloq, sonra yollar).
- Tamamlama tranzaksiyası: `StepProgress → COMPLETED`, `XpEvent` (dedupe), `User.xpTotal`, `ActivityDay`, `Enrollment.percent/lastStepId`, kurs bitibsə `completedAt` + `COURSE_COMPLETED` + (M3) sertifikat + `PathsService.onCourseCompleted()` (M4-ə qədər boşdur).
- Server tərəfdə hər oxu/yazıda eyni funksiya işləyir → kilidli addıma `403 STEP_LOCKED`. UI yalnız göstərir.
- Yollar (M4): kurs tipli addım həmin kursun faizini birbaşa oxuyur; beş yolda olan kurs beşində də dərhal yenilənir. `pathPercent = məcburi tamamlanmış / məcburi cəmi`; seçmə addımlar məxrəcə girmir və kilidləmir.

---

## 4. Marşrutlar

### Web (Azərbaycan dilində slug-lar)

| Marşrut | Məzmun |
|---|---|
| `/` | giriş varsa `/panel`, yoxsa `/kurslar` |
| `/giris`, `/qeydiyyat` | header-siz, mərkəzdə kart |
| `/kurslar` | tünd hero, filtr çipləri (istiqamət + səviyyə, URL-ə bağlı), kartlar (üstü `Track.color`), skeleton, boş vəziyyət |
| `/kurs/[slug]` | tünd başlıq (sol haşiyə istiqamət rəngi), fəsil akkordeonu, addım ikonları (T ? {} ⚑ ▮), ✓ / "Davam et →" / 🔒, sağda dairəvi faiz + "Davam et" |
| `/kurs/[slug]/[moduleKey]/[stepKey]` | **dərs ekranı**: tam ekran, həmişə tünd; üst zolaq (loqo, Fəsil › Addım, irəliləyiş, XP). theory/quiz: mərkəzdə max 720px. sql/python/terminal/ctf: solda təlimat + tapşırıq siyahısı + ipucu, ortada sürüklənən ayırıcı, sağda redaktor/terminal/suallar. `/kurs/[slug]/2/4` kimi rəqəmli URL açara yönləndirilir. `?onizle=1` = müəllim önizləməsi |
| `/panel` | "Qaldığınız yer", kurs faizləri, XP / seriya / tapşırıq / sertifikat, "Bu həftə" |
| `/profil` | ad, şifrə, tema, dil |
| `/sertifikatlar`, `/sertifikat/[id]` | M3 (indi yer tutucu) |
| `/yollar`, `/yol/[slug]`, `/baslangic` | M4 (indi yer tutucu, header-də link var) |
| `/admin/kurslar`, `/admin/kurslar/[slug]` | solda dnd-kit ağacı, sağda tipə görə forma, "Tələbə kimi bax", Qaralama / Dərc et |
| `/admin/istiqametler`, `/admin/telebeler`, `/admin/fayllar` (M2), `/admin/idxal` (M2), `/admin/yollar` (M4) | |

### API (NestJS, :4000; web `/api/*` ilə proksi edir)

- **Auth:** `POST /auth/register | login | refresh | logout`, `GET /auth/me`. argon2id; access JWT 15 dəq + rotasiya olunan refresh 30 gün, hər ikisi httpOnly cookie (`Path=/`). Rollar yalnız API-də yoxlanır.
- **Kataloq (ictimai):** `GET /tracks`, `GET /courses?track=&level=&q=`, `GET /courses/:slug`.
- **Admin kontent (INSTRUCTOR|ADMIN):** tracks / courses / modules / steps CRUD, `GET /admin/courses/:id` (tam ağac), `PUT /admin/steps/:id` (StepDefinition → split), `PATCH …/publish` (sərt validasiya, 422 ilə səhv siyahısı), `PATCH …/reorder {ids}` (bir tranzaksiyada), `PATCH /admin/steps/:id/move`, assets upload/serve (CHECK_SCRIPT tələbəyə verilmir).
- **Tələbə:** `POST /courses/:slug/enroll`, `GET /learn/courses/:slug` (xəritə + vəziyyətlər), `GET /learn/courses/:slug/steps/:moduleKey/:stepKey`, `POST /learn/steps/:id/start | complete | submit`, `GET /me/dashboard`.
- **Rezerv (toqquşmasın deyə):** M2 `/admin/import/*`, `/admin/courses/:id/export.zip`, `/learn/ctf-tasks/:id/answer`, `/learn/steps/:id/hints/:i`; M3 `/certificates/:id`, `/learn/labs/*`; M4 `/paths/*`, `/learn/paths/*`, `/admin/paths/*`.

---

## 5. Mərhələ 1 — addımlar

1. **Monorepo skeleti:** root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, eslint/prettier, `.env.example`, `docker-compose.yml`, `docs/` (spesifikasiya + dizayn faylı köçürülür), `PROGRESS.md`. Yoxlama: `pnpm install`, `docker compose config`, `grep 3100|5433` boş.
2. **packages/shared:** enum-lar, slugify/açar funksiyaları, `az.ts` lüğəti, 6 tip üçün zod sxemləri, `splitStep/mergeStep/toStudentView/validateForPublish`, kilid/faiz funksiyaları. Vitest: round-trip, cavabın heç vaxt `config`-ə düşməməsi, kilid matrisi.
3. **apps/api skeleti:** env (zod), Prisma, global zod pipe, xəta filtri `{code, message, details}`, helmet, cookie-parser, throttler, `/health`. `schema.prisma` təsdiqlənmiş formada, `migrate dev --name init`.
4. **`pnpm dev` (bir əmr):** `scripts/dev.mjs` — DB-yə TCP ilə qoşulmağa çalışır; alınmasa və `docker info` işləyirsə `docker compose up -d db`; alınmasa aydın mesajla lokal Postgres yolunu göstərir; sonra migrate → seed → turbo dev.
5. **Seed (idempotent):** 3 istiqamət (rənglər dizayndakı kimi), SEED_* env-dən ADMIN + STUDENT, kurs `numune` — **"NÜMUNƏ — silinə bilər"** — 1 fəsil, hər tipdən 1 addım (6 addım), məzmun açıq-aşkar yer tutucu mətn, 3 sətirlik `datasets/numune.csv`, `checks/numune.sh`. İki dəfə seed → say dəyişmir.
6. **Auth + istifadəçilər:** register/login/refresh/logout/me, guard-lar, rol dekoratorları, `PATCH /me`, admin istifadəçi siyahısı. Jest e2e.
7. **Admin kontent API:** tracks, courses, modules, steps CRUD, reorder/move, publish validasiyası, asset upload. Jest e2e (qaralama kurs kataloqda görünmür, `answer` heç vaxt qayıtmır, STUDENT → 403).
8. **Tələbə API:** enroll, kurs xəritəsi, addım görünüşü, start/complete, quiz qiymətləndirmə, XP, ActivityDay, dashboard. Jest e2e (kilid, XP bir dəfə, faiz 2/6).
9. **apps/web skeleti:** Tailwind tokenləri, şriftlər, shadcn, tema keçidi, i18n, API müştəriləri, rewrite, middleware, header-lər.
10. **Giriş / qeydiyyat** səhifələri + Playwright.
11. **Kataloq** `/kurslar` → skrinşot müqayisəsi (dizayn `#catalog` vs tətbiq, 1240px və 390px) → düzəliş.
12. **Kurs səhifəsi** `/kurs/[slug]` → skrinşot müqayisəsi → düzəliş.
13. **Dərs ekranı:** tünd layout, üst zolaq, TheoryView ("Oxudum, davam et" → toast → növbəti), QuizView (göndər, sual-sual nəticə, təkrar), sürüklənən panellər (40% / min 300px, localStorage, <900px üst-üstə), sql/python/terminal/ctf üçün sağ panelin tam görünüşü ("Mərhələ 2/3-də aktivləşir" yer tutucu ilə), Ctrl/Cmd+Enter. Skrinşot müqayisəsi.
14. **Şəxsi panel** `/panel` → skrinşot müqayisəsi.
15. **Admin UI:** layout + rol qapısı, istiqamətlər (rəng seçici), kurslar siyahısı, kurs redaktoru (dnd-kit ağac, kurs/fəsil formaları, addım redaktoru: tip seçimi, Nəzəri forması = Markdown + canlı önizləmə + şəkil yükləmə + video link/fayl, Test qurucusu; SQL/Python/Terminal/CTF üçün başlıq + XP + "forma Mərhələ 2/3-də"), Qaralama/Dərc et, Sil, "Tələbə kimi bax". Skrinşot müqayisəsi.
16. **Yer tutucular** (`/yollar`, `/yol/[slug]`, `/sertifikatlar`…), mobil keçid, klaviatura fokus vəziyyətləri.
17. **Keyfiyyət:** `lint + typecheck + test + e2e + build` yaşıl; README; `.env.example`; `PROGRESS.md`; git commit. **DAYAN, təsdiq gözlə.**

Mərhələ 1-dən sonra: **M2** SQL (DuckDB-WASM) + Python (Pyodide) redaktoru və yoxlama, CTF (fayl + flag), ZIP idxal/ixrac + validasiya, XP/panel tamamlanması; **M3** terminal lab (Docker, xterm.js, taymer, check script), sertifikat + QR + ictimai yoxlama; **M4** Learning Path (admin qurucu, `path.yaml`, `/yollar`, `/yol/[slug]` şaquli xəritə, onboarding, panel və kurs səhifəsində yol blokları).

---

## 6. Qərarlar (əmin olunanlar)

- **Auth:** httpOnly cookie-lər, brauzer yalnız eyni mənşəli `/api/*`-a müraciət edir (CORS yoxdur); Google OAuth sonradan bir marşrutla əlavə olunur (`passwordHash` ona görə nullable-dır).
- **Markdown-da fayllar:** mətn ZIP-ə nisbi yol saxlayır (`images/foo.png`), render zamanı `/api/assets/...`-a çevrilir → ixrac/idxal itkisizdir.
- **Quiz:** yalnız sualların sırası qarışdırıla bilər, variantlar heç vaxt (indekslər pozulmasın); `max_attempts` yoxdur (spesifikasiyada yoxdur, ardıcıl kursda tələbəni daimi kilidləyərdi).
- **Vaxt zonası:** seriya və həftəlik aktivlik `APP_TIMEZONE=Asia/Baku` ilə hesablanır.
- **İstiqamət rəngi:** hər yerdə `Track.color`-dan `--c` dəyişəni ilə; badge rəngi `color-mix` ilə törədilir (açıq fonda oxunaqlı).
- **Dərs URL-i:** `/kurs/[slug]/[moduleKey]/[stepKey]` (sıra dəyişəndə əlfəcinlər pozulmur); dizayndakı `/kurs/x/2/4` forması yönləndirmə ilə işləyir.
- **Kataloq hero düyməsi "Səviyyəmi müəyyən et":** spesifikasiyada belə funksiya yoxdur; M1-də səviyyə filtrinə, M4-də onboarding-ə aparır.
- **Qeydiyyat:** açıq (hər kəs qeydiyyatdan keçə bilər); ilk ADMIN `.env`-dəki SEED_ADMIN_* ilə yaranır və `/admin/telebeler`-dən müəllim təyin edir. E-poçt təsdiqi və şifrə bərpası M1–M3-də yoxdur.
- **Kurs bitdikdən sonra yeni addım əlavə olunsa:** tamamlanma (və sertifikat) qalır, faiz 100-dən aşağı düşür.
- **ZIP-də `01-nezeri.md`:** çılpaq `.md` faylı nəzəri addım sayılır; başlıq YAML front-matter-dən (`title`, `video_url`, `xp`) və ya ilk `# H1`-dən götürülür.

## 7. Açıq suallar (cavab lazımdır)

1. **Quiz `correct: [1]`** (options `[A, B, C, D]`): 1 = **A** (1-dən sayma, insan üçün rahat) yoxsa **B** (0-dan sayma, proqramçı üçün)? Daxildə hər halda 0-dan saxlanacaq; sual yalnız sizin YAML-ı necə yazacağınızdır. Təklifim: **1-dən sayma** (`correct: [1]` = birinci variant).
2. **CTF cavablarının ixracı:** spesifikasiyaya görə yalnız hash saxlanılır, ona görə ixrac olunan YAML-da `answer_hash` olacaq (yenidən idxal olunur, amma oxunmur). Bu qəbul edilirmi, yoxsa açıq cavabı da serverdə şifrələnmiş saxlayıb ixracda göstərək?
3. **Mərhələ 3 yoxlaması:** mənim mühitimdə Docker daemon yoxdur. Terminal lab-ın konteyner hissəsini burada yalnız test-lərlə (mock Docker) yoxlaya biləcəyəm; real konteyner axınını siz öz kompüterinizdə yoxlayacaqsınız. Razısınız?
4. **Versiyalar:** spesifikasiyadakı kimi Next.js 15.5 + NestJS 10.4 ilə gedirəm. Ən yeni major-ları (Next 16, NestJS 12) istəyirsinizsə, indi deyin, sonra keçmək bahalı olur.
