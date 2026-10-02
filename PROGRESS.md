# PROGRESS — DaCy Academy

Hər mərhələnin sonunda nə edildiyi, necə işə salınacağı və nəyin yoxlanmalı olduğu bura yazılır.
Tam plan: `docs/PLAN.md`. Quraşdırma: `README.md`.

---

## Mərhələ 1 — Əsas (tamamlandı)

### Nə quruldu

**Monorepo və infrastruktur**

- pnpm workspaces + Turborepo: `apps/web`, `apps/api`, `packages/shared`
- `docker-compose.yml` (db həmişə; `--profile full` ilə api + web), `infra/docker/*.Dockerfile`, `infra/postgres/init.sql`
- `.env.example`, `README.md`, `.github/workflows/ci.yml`
- `scripts/dev.mjs` — **bir əmr** (`pnpm dev`): .env → DB yoxla (lazımsa `docker compose up -d db`) → migrate → seed → turbo dev
- Portlar yalnız 3000 / 4000 / 5432 (3100 və 5433 skript tərəfindən də rədd edilir)

**packages/shared**

- enum-lar, konstantlar, Azərbaycan hərflərinə uyğun `slugify`, fayl adından açar/sıra (`03-select.yaml` → `select`, 3)
- `i18n/az.ts` lüğəti (bütün UI mətnləri) + tipli `t()`; `en.ts` boş şablon
- 6 addım tipi üçün zod sxemləri (qaralama + dərc üçün sərt); `splitStep / mergeStep / toStudentView / validateForPublish / emptyDefinition`
- `computeCourseMap` — kilid, faiz, "davam et" hesablanması (API və web eyni funksiyanı işlədir)
- API DTO sxemləri və cavab tipləri
- 23 Vitest testi

**apps/api (NestJS 10 + Prisma 6)**

- `prisma/schema.prisma` — 23 model (Learning Path cədvəlləri daxil), `migrations/…_init`
- Auth: register / login / refresh (rotasiya) / logout / me; argon2id; httpOnly cookie-lər; `AuthGuard` + `RolesGuard` (qlobal, `@Public`, `@OptionalAuth`, `@Staff`, `@AdminOnly`)
- Tracks (ictimai siyahı + admin CRUD + sıralama), Catalog (`/courses`, `/courses/:slug`)
- Admin kontent: kurs / fəsil / addım CRUD, iki fazalı sıralama (`unique(parent, order)` pozulmur), fəsillərarası köçürmə, dərc validasiyası (422 + səhv siyahısı), tipi dəyişmə qorunması, CTF cavablarının HMAC hash-i
- Assets: yükləmə (növ avtomatik), `(courseId, path)` unikal, servis qaydaları (üz şəkli ictimai, CHECK_SCRIPT yalnız heyət, qalanı yazılmış tələbə)
- Learn: yazılma, kurs xəritəsi, addım görünüşü (secret heç vaxt göndərilmir), `start / complete / submit` (quiz serverdə qiymətləndirilir), rəqəmli mövqe → açar, `?preview=1` müəllim önizləməsi
- Progress: tamamlama tranzaksiyası (StepProgress → XP bir dəfə → ActivityDay (Bakı vaxtı) → Enrollment keşi → kurs bitəndə `completedAt` + `PathsService.onCourseCompleted` hook)
- Dashboard: davam et kartı, kurs faizləri, XP, seriya, həftəlik aktivlik
- Seed: 3 istiqamət, admin + tələbə, **«NÜMUNƏ — silinə bilər»** kursu (1 fəsil, hər tipdən 1 addım, 3 nümunə fayl); iki dəfə işlədəndə dəyişmir
- 27 Jest e2e testi (auth, admin kontent, tələbə axını)

**apps/web (Next.js 15 + Tailwind 4)**

- Dizayn tokenləri `globals.css`-də (açıq + tünd tema, `next-themes`), IBM Plex Sans + JetBrains Mono lokal (`@fontsource`)
- `/api/*` → API rewrite (CORS yoxdur), `middleware.ts` (qorunan marşrutlar, səssiz refresh)
- Səhifələr: `/giris`, `/qeydiyyat`, `/kurslar` (hero, filtr çipləri, kartlar, skeleton, boş vəziyyət), `/kurs/[slug]` (tünd başlıq, fəsil akkordeonu, ✓ / Davam et → / 🔒, dairəvi faiz), `/kurs/[slug]/[fəsil]/[addım]` (tam ekran tünd dərs ekranı), `/panel`, `/profil`, yer tutucular (`/yollar`, `/yol/[slug]`, `/sertifikatlar`, `/sertifikat/[id]`, `/baslangic`)
- Dərs ekranı: theory (Markdown + video + "Oxudum, davam et"), quiz (sual-sual nəticə, izah, təkrar cəhd), sql / python / terminal / ctf üçün sol panel (təlimat, nömrəli tapşırıq siyahısı, fayllar, ipucu düyməsi) + **sürüklənən ayırıcı** (react-resizable-panels, localStorage-da yadda qalır, <900px üst-üstə) + sağ panelin tam görünüşü (fayl tabları, redaktor sahəsi, nəticə/konsol, düymələr) — redaktorun özü Mərhələ 2/3-də
- Admin redaktoru: `/admin/kurslar`, `/admin/kurslar/yeni`, `/admin/kurslar/[slug]` (dnd-kit ağac, kurs / fəsil / addım formaları, Nəzəri: Markdown + canlı önizləmə + şəkil/video yükləmə, Test qurucusu, digər tiplər üçün başlıq/XP + "Mərhələ 2/3"), `/admin/istiqametler`, `/admin/telebeler`, yer tutucular (`/admin/fayllar`, `/admin/idxal`, `/admin/yollar`)
- Playwright: `e2e/student-flow.spec.ts` (qeydiyyat → kurs → nəzəri → quiz → irəliləyiş → kilid → rəqəmli URL → panel; sürüklənən ayırıcı), `e2e/admin.spec.ts` (rol qapısı; kurs → fəsil → nəzəri addım → dərc → tələbə görür → sil; istiqamətlər, tələbələr), `e2e/screenshots.spec.ts` (referans vs tətbiq)
- Vitest: Markdown fayl yolu çevrilməsi, kart meta mətni

### Skrinşot müqayisəsi (`docs/screenshots/`)

`*.ref.png` = dizayn faylı, `*.app.png` = tətbiq (1240px), `*.mobile.png` = 390px.

- catalog, course, dashboard, workspace-sql / python / terminal / ctf / theory / quiz, admin (+ admin-courses, admin-theory, admin-tracks) — quruluş, rənglər, boşluqlar və künclər referansla üst-üstə düşür.
- Fərqlər (qəsdən): header-də tema düyməsi və "Yollar" linki (Mərhələ 4 üçün); kataloqda "İrəli" səviyyə çipi; dərs ekranında dizayndakı demo tabları yoxdur (real addımlar); badge rəngləri `Track.color`-dan `color-mix` ilə törədilir.

### Necə işə salmaq

```bash
pnpm install
pnpm dev            # http://localhost:3000  (API: http://localhost:4000/health)
```

Hesablar: `admin@dacy.local / Admin123!`, `telebe@dacy.local / Telebe123!` (`.env`-də dəyişdirilə bilər).

### Nəyi yoxlamalı

1. `/kurslar` → «NÜMUNƏ — silinə bilər» kartı → kurs səhifəsi → **Kursa başla** → nəzəri addım → «Oxudum, davam et» → test (keçid balı 70%) → sonrakı addımlar sırayla açılır, kilidli addımın URL-inə birbaşa girəndə kurs səhifəsinə qaytarır.
2. `/kurs/numune/1/1` → açar URL-ə yönlənir.
3. `/panel` → «Qaldığınız yer», XP, həftəlik zolaq.
4. Admin ilə `/admin/kurslar/numune`: fəsil/addım sürüklə, nəzəri addımı redaktə et (canlı önizləmə, şəkil yüklə), test qurucusu, «Dərc et» (boş məzmunla 422 səhv siyahısı), «Tələbə kimi bax» (`?onizle=1` — irəliləyiş yazılmır).
5. Tema düyməsi (açıq / tünd / sistem), mobil görünüş (390px).
6. Testlər: `pnpm test` (shared + web unit, api unit), `pnpm --filter @dacy/api test:e2e`, `pnpm e2e` (API + web işləyərkən; hazır Chromium üçün `PLAYWRIGHT_CHROMIUM_PATH`).
7. `pnpm build` — hər üç paket production build-i keçir.

### Məlum məhdudiyyətlər / növbəti mərhələ

- SQL / Python / Terminal / CTF addımlarının sağ paneli yer tutucudur (Mərhələ 2: DuckDB-WASM + Pyodide + CTF yoxlaması; Mərhələ 3: xterm.js + Docker).
- İpucu düyməsi deaktivdir (Mərhələ 2).
- ZIP idxal / ixrac, fayl kitabxanası (Mərhələ 2); sertifikat (Mərhələ 3); Learning Path (Mərhələ 4 — sxem hazırdır).
- İngilis dili: `en.ts` boş şablon, `t()` az-a düşür.

---

## Mərhələ 2 — Brauzer tapşırıqları (tamamlandı)

**Yekun yoxlama (2026-10-02):** `pnpm build` ✓ (xəbərdarlıqsız), `pnpm typecheck` ✓, `pnpm lint` ✓, `pnpm test` ✓ (shared 35, api unit 4, web 5), API e2e ✓ 37/37 (`test/phase2.e2e-spec.ts` daxil), Playwright ✓ (student-flow, admin, phase2, screenshots). Commit: Mərhələ 2.

### Nə quruldu

- **SQL iş sahəsi** (`apps/web/src/components/workspace/sql-workspace.tsx`, `lib/runtimes/duckdb.ts`): DuckDB-WASM öz serverimizdən (`public/duckdb`), dataset-lər (CSV/Parquet) `/api/assets/...`-dan yüklənib cədvəl kimi qeydiyyata alınır; `query.sql` + cədvəl önizləmə tabları, Monaco redaktoru (Ctrl/Cmd+Enter), **Nəticə / Konsol** paneli (`N sətir · M ms`, xəta mətni), nəticə cədvəli (`.tbl`, 200 sətirə qədər). Göndərəndə nəticə brauzerdə kanonik heşlənir (`packages/shared/src/sql/canonical.ts`), server müəllim həllinin heşi ilə müqayisə edir.
- **Müəllim həllinin heşi** serverdə: `apps/api/src/sql-check/` — DuckDB-nin Node (blocking) variantı yalnız müəllim kodunu icra edir, `Step.secret.expected {columns,row_count,row_hash,mode}` dərc/yadda saxlama zamanı hesablanır. Tələbə kodu serverə kod kimi yox, heş kimi gedir.
- **Python iş sahəsi** (`python-workspace.tsx`, `lib/runtimes/pyodide.ts`): Pyodide 0.29.5 (nüvə `public/pyodide`, paketlər CDN; CDN bloklananda lokal nüvəyə avtomatik keçid), `import` üzrə paketlər avtomatik, dataset-lər Pyodide FS-ə yazılır, **Konsol / Xəta / Qrafik** (matplotlib fiqurları PNG kimi) tabları; `tests` assert-ləri tələbə kodundan sonra işləyir, nəticə `POST /learn/steps/:id/submit {kind:'python'}`.
- **CTF otağı** (`ctf-workspace.tsx`): sual-sual cavab, `POST /learn/ctf-tasks/:id/answer` (10 cəhd/dəq, HMAC-SHA256 heş müqayisəsi, `case_sensitive`), düzgün/səhv vəziyyəti, hər sual üçün ipucu (XP cəriməsi), fayl tabı, hamısı həll olunanda addım tamamlanır; cavab heşi frontend-ə getmir (test var).
- **İpucular və XP**: `hints-box.tsx` — ipucu açılanda `hint_penalty_xp` qədər XP çıxılır (`XpEvent` ilə dedupe, eyni ipucu iki dəfə cərimələnmir), addımın qazandırdığı XP ona uyğun azalır; `POST /learn/steps/:id/hints/:index`.
- **Dərs səhifəsi** artıq addım tipinə görə SQL / Python / CTF iş sahəsini açır (terminal — Mərhələ 3 yer tutucusu).
- **Admin formaları**: SQL (dataset seçimi, başlanğıc kod, həll, yoxlama rejimi, ipucular, maddələr, cərimə), Python (testlər), Terminal (Docker imici, vaxt, yoxlama skripti — Mərhələ 3 üçün), CTF (suallar, cavab, ipucu, bal, hərf ölçüsü) — `components/admin/course-editor/code-forms.tsx`; fayl seçici (`asset-picker.tsx`) və `/admin/fayllar` kitabxanası.
- **ZIP idxal/ixrac** (`apps/api/src/import-export/`, `/admin/idxal`): `POST /admin/import/validate` (hesabat: səhvlər, xəbərdarlıqlar, xülasə, dərcdən çıxacaq addımlar) → `POST /admin/import/apply` (bir tranzaksiya, `slug`/`key` üzrə upsert, irəliləyiş qorunur, fayllar saxlanılır, SQL heşləri hesablanır), `CourseImport` tarixçəsi, `GET /admin/courses/:id/export.zip`. Format: `docs/content-package.md` (test `correct` 1-dən, CTF ixracda yalnız `answer_hash`).
- **Lüğət**: `ws.*`, `admin.*`, `dates.months` açarları (`packages/shared/src/i18n/az.ts`); tarixlər brauzer lokalından asılı olmadan «2 okt 2026» formatında.
- **Testlər**: shared Vitest (canonical, package, arrow — 35), API e2e `test/phase2.e2e-spec.ts` (SQL/Python göndərmə, ipucu cəriməsi, CTF düzgün/səhv/limit/heş sızmır, ZIP validate/apply/export) — cəmi 37, Playwright `e2e/phase2.spec.ts` (qeydiyyat → SQL işə sal/ipucu/göndər → Python test keçmədi/keçdi → CTF → ZIP idxal UI + yanlış paket) — 7 test; köhnə `student-flow`, `admin`, `screenshots` spec-ləri keçir.

### Skrinşot müqayisəsi

`workspace-sql`, `workspace-python`, `workspace-ctf` `.app.png` faylları referansla yenidən müqayisə olundu: tab zolağı, redaktor, nəticə cədvəli (haşiyəli hüceyrələr), «İşə sal» / «Göndər və davam et» düymələri, CTF sual kartları (yaşıl/qırmızı vəziyyət) referansa uyğundur. Fərq: referansdakı üst «SQL / Python / Terminal / CTF» tab zolağı yalnız nümayiş üçündür (tətbiqdə addımlar kurs sırası ilə açılır).

### Necə işə salmaq

`pnpm dev` (əvvəlki kimi). Yeni: `apps/web` dev/build əvvəlcə `scripts/copy-runtimes.mjs` ilə DuckDB/Pyodide/Monaco fayllarını `public/`-ə kopyalayır. İnternetsiz mühitdə pandas üçün `NEXT_PUBLIC_PYODIDE_URL` ilə tam Pyodide güzgüsü verin (README «Brauzer tapşırıqları»).

### Nəyi yoxlamalı

1. Tələbə ilə nümunə kursda nəzəri + test keçib **SQL** addımına gəlin: `SELECT * FROM numune` → «İşə sal» → 3 sətirlik cədvəl; səhv cədvəl adı → Konsol tabında xəta; «İpucu göstər (−10 XP)» → təsdiq → ipucu mətni; «Göndər və davam et» → Python addımı, XP 40 (50−10).
2. **Python**: `x = 2` → göndər → «Testlər keçmədi»; `x = 1` → keçir. `print` → Konsol; `import pandas` (internet varsa) → bir neçə saniyə yüklənir; `matplotlib` fiquru → Qrafik tabı.
3. **CTF** (terminal addımı Mərhələ 3-ə qədər keçilə bilmədiyi üçün admin «Tələbə kimi bax» ilə və ya API-dən): `DACY{sehv}` → qırmızı; `dacy{NUMUNE}` → yaşıl, +150 XP, «Bütün suallar həll olundu»; 11-ci cəhd 1 dəqiqədə → «Çox cəhd».
4. **Admin**: SQL addımında həlli dəyişib «Dərc et» → heş yenidən hesablanır (səhv SQL → 422 səhv mesajı); CTF addımında sual əlavə et / cavabı dəyiş; `/admin/fayllar`-a CSV yüklə və SQL addımında dataset kimi seç.
5. **ZIP**: kurs redaktorunda «ZIP ixrac» → `/admin/idxal`-da həmin faylı «Yoxla» → «Tətbiq et» → irəliləyiş və dərc vəziyyəti dəyişmir; `course.yaml`-sız fayl → səhv siyahısı, «Tətbiq et» deaktiv.
6. Testlər: `pnpm test`, `pnpm --filter @dacy/api test:e2e`, `pnpm e2e`; `pnpm build`.

### Məlum məhdudiyyətlər

- Terminal addımı hələ yer tutucudur (Mərhələ 3); nümunə kursda CTF-ə tələbə kimi çatmaq üçün terminal addımı keçilməlidir.
- Pyodide paketləri (pandas, numpy, matplotlib) internet tələb edir, əks halda `NEXT_PUBLIC_PYODIDE_URL` ilə güzgü lazımdır.
- SQL nəticə müqayisəsi sütun adlarına həssasdır (`SELECT a AS b` fərqli sayılır) — müəllim təlimatda sütun adlarını göstərməlidir; `check: row_count` ilə yumşaldıla bilər.
- Brauzerdə eyni anda bir DuckDB instansı; çox böyük dataset-lər (100 MB+) üçün Parquet tövsiyə olunur.

---

## Mərhələ 3 — Server lab-ları və sertifikat (gözləyir)

## Mərhələ 4 — Learning Path (gözləyir)
