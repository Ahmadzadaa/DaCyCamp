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

## Mərhələ 3 — Server lab-ları və sertifikat (tamamlandı)

### Nə quruldu

- **Lab sürücüləri** (`apps/api/src/labs/`): `LabDriver` interfeysi; `DockerDriver` (dockerode — konteyner yaradılması: `Memory`/`NanoCpus`/`PidsLimit`, `NetworkMode: none` (addımda `network: true` ilə açılır), `CapDrop ALL` + entrypoint üçün minimum capability, `no-new-privileges`; `exec` ilə TTY qabıq, `/dacy/check.sh` yazılması, yoxlama `exec`-i (stdout/stderr demux, exit kodu, vaxt limiti), `docker pull` (`LAB_PULL`), etiketlə yetim axtarışı) və `MockDriver` (Docker-siz mühit: yaddaşda fayl sistemi, `ls/cd/cat/touch/echo/mkdir/rm/check/help`; yoxlama skriptinin `test -f/-d`, `grep -q`, `exit` sətirlərinin şərhi — heç bir real proses işləmir).
- **LabsService**: sessiya həyat dövrü (STARTING → RUNNING → PASSED/STOPPED/EXPIRED/FAILED), hər addım üçün bir aktiv sessiya, ümumi limit (`LAB_MAX_SESSIONS`), kilid yoxlaması, yoxlama → `completeStep` (XP) / uğursuz cəhd sayı, 30 saniyəlik **reaper** (vaxtı bitənlər + yetim konteynerlər), admin siyahı/dayandırma. Marşrutlar: `GET/POST /learn/labs/steps/:stepId[/start]`, `POST /learn/labs/:id/stop|check|ticket`, `GET /admin/labs`, `POST /admin/labs/:id/stop`.
- **WebSocket** (`labs.gateway.ts`, `@nestjs/platform-ws`, yol `/labs/ws`): 60 saniyəlik HMAC **bilet** ilə qoşulma (cookie başqa porta getmədiyi üçün), JSON mesajlar (`in`/`resize` ↔ `ready`/`out`/`exit`/`error`), ölçü dəyişməsi, bağlananda qabıq bağlanır.
- **Web**: `terminal-workspace.tsx` (Terminal / Lab haqqında tabları, geri sayan taymer, «Lab-ı başlat», «Lab-ı sıfırla», «Yoxla», yoxlama çıxışı paneli, «Davam et»), `lab-terminal.tsx` (xterm.js + fit + web-links, yenidən qoşulma; yalnız brauzerdə yüklənir), `lab-panel.tsx` (başlat / hazırlanır / vaxt bitdi / xəta ekranları), `use-lab.ts`; CTF otağında `docker_image` varsa «Terminal» tabı (`ctf-lab-tab.tsx`). WebSocket ünvanı: `NEXT_PUBLIC_LAB_WS_URL` və ya eyni host + API portu.
- **Sertifikat** (`apps/api/src/certificates/`): kurs bitəndə `ProgressService.completeStep`/`recomputeCourse` içində idempotent verilmə (`Certificate.seq` autoincrement → `DACY-C-<il>-000001`, snapshot: ad, kurs, istiqamət, saat, XP); `GET /certificates/:id` (ictimai, QR data-URL), `GET /certificates/:id.pdf` (pdfkit + DejaVu Sans, A4 landşaft, QR, ləğv möhürü), `GET /me/certificates`, `POST /admin/certificates/:id/revoke`. Web: `/sertifikat/[id]` (ictimai kart: ad, kurs, istiqamət, tarix, seriya, QR, «Etibarlıdır / Ləğv edilib», PDF, linki kopyala), `/sertifikatlar`, paneldə «Sertifikatlarım», kurs səhifəsində «Sertifikatı aç», kurs bitəndə toast. `CourseMapDto.certificateId`, `CompleteResultDto.certificateId`, `DashboardDto.certificateItems`.
- **Admin**: `/admin/lablar` (aktiv sessiyalar, qalan vaxt, dayandır), terminal formasında «Konteynerdə internet» seçimi; ZIP formatında `network` sahəsi (`docs/content-package.md`).
- **İnfrastruktur**: `infra/lab-images/numune/Dockerfile` (Alpine + bash + python3, `student` istifadəçisi, `check` əmri) və `infra/lab-images/README.md`; `pnpm lab:images`; docker-compose `api` servisinə Docker soketi; `.env.example` `LAB_*` dəyişənləri; migration `20261002110000_phase3_certificate_seq`.
- **Seed**: nümunə terminal addımı real tapşırıqla (`touch ~/done.txt`), yoxlama skripti `test -f "$HOME/done.txt"`; nümunə kursun addım/fayl məzmunu dəyişəndə seed onları yeniləyir (SQL `expected` heşi qorunur).
- **Testlər**: API unit `mock.driver.spec.ts`, `ticket.spec.ts`; API e2e `test/phase3.e2e-spec.ts` (kilid, başlat/sorğula, yoxlama keçmir/keçir + XP, WebSocket bilet + əmr, səhv bilet, dayandır/sıfırla, başqa tələbə 404, admin siyahı/dayandırma, reap → EXPIRED, CTF konteyneri, sertifikat: seriya/ictimai/QR/PDF/ikinci verilmir/panel/ləğv/403) — 12 test; Playwright `e2e/phase3.spec.ts` (tam kurs: SQL UI → Python → terminal xterm ilə `touch` → Yoxla → CTF → sertifikat səhifəsi, PDF, ictimai giriş, 404, admin lab siyahısı) — 5 test.

### Skrinşot müqayisəsi

`workspace-terminal.app.png` referansla müqayisə olundu: tab zolağı (Terminal / Lab haqqında + sağda taymer), tünd terminal sahəsi, prompt rəngi, «Lab-ı sıfırla» / «Lab keçildi» / «Davam et» düymə sırası referansa uyğundur. Fərq: referansdakı «etl.py» fayl tabı yoxdur (fayllar konteynerin içindədir, redaktor konteynerdəki `nano`-dur).

### Necə işə salmaq

- Real konteyner: serverdə Docker işləməlidir (`docker info`), `.env`-də `LAB_DRIVER=docker` (defolt), nümunə imic `pnpm lab:images`. Sonra `pnpm dev`.
- Docker-siz (bu konteyner, CI): `LAB_DRIVER=mock` — virtual qabıq, UI və axın eynidir.
- `docker compose --profile full up` API-yə Docker soketini montaj edir.

### Nəyi yoxlamalı (öz kompüterinizdə, Docker ilə)

1. `pnpm lab:images` → nümunə kursda terminal addımı → «Lab-ı başlat» → bir neçə saniyəyə `student@dacy-lab:~$` promptu (real bash). `docker ps` → `dacy.lab=1` etiketli konteyner, yaddaş limiti 512 MB.
2. «Yoxla» → «✗ ~/done.txt yoxdur»; `touch ~/done.txt` → «Yoxla» → «✓ done.txt tapıldı», +100 XP, «Davam et». Terminalda `check` əmri də eyni skripti işlədir.
3. «Lab-ı sıfırla» → köhnə konteyner silinir, yenisi açılır (fayl yoxdur). Vaxt limitini addımda 1 dəq qoyub bitməsini gözləyin → «Vaxt bitdi», konteyner `docker ps`-dən itir.
4. `/admin/lablar` → aktiv sessiya, «Dayandır».
5. CTF addımında «Docker imici» verin → otaqda «Terminal» tabı.
6. Bütün addımları bitirin → «Sertifikat qazandınız» → kurs səhifəsində «Sertifikatı aç» → `/sertifikat/<id>` (girişsiz pəncərədə də açılır), «PDF yüklə», QR-ı telefonla skan edin → eyni səhifə. Admin API ilə ləğv: `POST /api/admin/certificates/<id>/revoke` → səhifədə «Ləğv edilib».
7. Testlər: `pnpm test`, `pnpm --filter @dacy/api test:e2e`, `pnpm e2e`.

### Məlum məhdudiyyətlər

- Lab WebSocket-i Next proksisindən keçmir: brauzer API portuna birbaşa qoşulur; əks-proksi arxasında `NEXT_PUBLIC_LAB_WS_URL` verilməlidir.
- Docker sürücüsü bu mühitdə yoxlanıla bilmədi (daemon yoxdur) — mock ilə eyni API/axın test olunub; real konteyner axını sizin kompüterinizdə yoxlanmalıdır (razılaşdırıldığı kimi).
- Konteynerdə fayl redaktoru yoxdur (imic `nano`/`vim` verməlidir); fayl yükləmə/endirmə tabı yoxdur.
- Sertifikat PDF-i server tərəfdə sinxron hazırlanır; çox böyük yüklənmə üçün keşləmək olar.

---

## Mərhələ 4 — Learning Path (tamamlandı)

### Nə quruldu

- **Paylaşılan** (`packages/shared`): `content/path.ts` — `path.yaml` sxemi (kurs / imtahan / layihə / final addımları, `path-items/<açar>.yaml` əlavə faylları, test cavabları 1-dən), admin giriş sxemləri (`pathInputSchema`, `pathItemInputSchema`), imtahanın public/secret bölünməsi və balı, dərc yoxlaması; `progress/path-map.ts` — `computePathMap` (vəziyyətlər: completed / current / available / locked / submitted; faiz = məcburi tamamlanan / məcburi cəmi; seçmə addımlar nömrələnmir və kilidləmir); DTO-lar (`PathCardDto`, `PathDetailDto`, `PathItemDto`, `PathItemViewDto`, `ActivePathDto`, `AdminPathDto`, `AdminProjectReviewDto`); lüğət `paths.*`, `admin.*`.
- **API** (`apps/api/src/paths/`): `PathsService` (nüvə — xəritə hesablanması, `onCourseCompleted` hook-u (kurs bitəndə bütün yollar yenilənir), `recomputeEnrollment`, yol sertifikatı), `PathsLearnService` (kataloq, yol səhifəsi, yazılma/aktiv yol, addım səhifələri, layihə təhvili (fayllar yaddaşa, link, qeyd; `manual` → SUBMITTED, `auto` → PASSED), imtahan (bal, keçid, ən yaxşı nəticə, cəhd), final (bütün məcburi addımlar bitəndə sertifikat), onboarding hədəfi, panel üçün aktiv yol, «kurs hansı yollardadır»), `PathsAdminService` (CRUD, addım əlavə/dəyiş/sil, iki fazalı sıralama, dərc yoxlaması (422 + səhv siyahısı), layihə rəyləri (qəbul/qaytar + XP), `path.yaml` idxalı (`upsertFromInput`) və ixracı). Marşrutlar `/paths/*`, `/learn/paths/*`, `/learn/path-items/*`, `/me/paths|active-path|target-path`, `/admin/paths/*`, `/admin/path-reviews/*`. ZIP idxalçısı `path.yaml`-ı tanıyır (kursla birlikdə və ya təkbaşına; kurs slug-larının mövcudluğu yoxlanılır). Sertifikat servisi kurs və yol sertifikatlarını birləşdirir (`kind`, `DACY-P-` seriyası, PDF başlığı «Karyera yolu sertifikatı»). Migration `PathCertificate.seq`.
- **Web**: `/yollar` (istiqamət çipləri, `PathCard`), `/yol/[slug]` (dizayndakı `.lp` / `.road2` quruluşu: tünd başlıq bloku, faktlar, faiz, şaquli xəritə (`path-map.tsx`), sağda bacarıqlar / kimlər üçündür / digər yollar; «Yola başla» → «Davam et» / «Aktiv yol et»), `/yol/[slug]/[key]` (layihə: təlimat + təhvil forması + vəziyyət/rəy; imtahan: sual kartları, nəticə, izah, təkrar; final: çatışmayanlar və ya «Sertifikatı al»), `/baslangic` onboarding (istiqamət → uyğun yollar → «Bu yola başla»; qeydiyyatdan sonra bura yönlənir), paneldə «Aktiv yol» bloku (faiz, növbəti addım) və ya «Yol seç» çağırışı, kurs səhifəsində yol istinadları; admin `/admin/yollar` (siyahı), `/admin/yollar/yeni`, `/admin/yollar/[slug]` (addımlar dnd-kit ilə, addım forması tipə görə — imtahan üçün kurs test qurucusu təkrar istifadə olunur, dərc/qaralama, önizləmə, path.yaml ixrac, yolu sil), `/admin/layiheler` (rəy növbəsi).
- **Seed**: «NÜMUNƏ YOL — silinə bilər» (nümunə kurs → nümunə imtahan → nümunə layihə (müəllim yoxlayır) → final).
- **Testlər**: shared `path.test.ts` (yaml parse/round-trip, imtahan bal, `computePathMap`, dərc yoxlaması — 9), API e2e `test/phase4.e2e-spec.ts` (admin CRUD + dərc xətası, sıralama, kataloq/yazılma/kilid, kurs bitəndə yol irəliləyir + panel, imtahan gizli cavablar/keçmədi/keçdi + XP, layihə boş/təhvil/qaytar/qəbul + fayl girişi, final → `DACY-P` sertifikat + PDF + panel, onboarding hədəfi, path.yaml idxal/yenidən idxal/ixrac/kurs+yol paketi, silmə 409/force — 10), Playwright `e2e/phase4.spec.ts` (admin redaktor + addım dialoqu, qeydiyyat → onboarding → yol, imtahan UI, layihə UI + müəllim rəyi UI, final → sertifikat səhifəsi, nümunə yol + kurs səhifəsi bloku, təmizlik — 7). Köhnə spec-lər uyğunlaşdırıldı: `student-flow` qeydiyyatdan sonra onboarding-i «Keç» ilə ötür, `admin` tələbələr siyahısında axtarışla tapır (siyahı səhifələnir).
- **Yoxlama nəticəsi** (bu mərhələnin sonunda): `pnpm typecheck` ✓, `pnpm lint` ✓, `pnpm build` ✓, `pnpm test` (shared 44, api 11, web 5) ✓, API e2e 59/59 ✓, Playwright 28/28 ✓.

### Skrinşot müqayisəsi

`path.app.png` ↔ `path.ref.png`: tünd başlıq bloku (badge, başlıq, təsvir, faktlar, «Davam et»), şaquli xəritə (yaşıl ✓ dairələr, «Siz buradasınız» etiketi, kilidli solğun kartlar, romb imtahan/final nöqtələri, seçmə çiplər), sağ panel (bacarıqlar, kimlər üçündür, digər yollar) referansa uyğundur; xətt irəliləyişə görə rənglənir. `paths.app.png` — kart siyahısı; `path.mobile.png` — mobil (başlıq bloku, xəritə və sağ panel alt-alta).

### Necə işə salmaq

`pnpm dev` (əvvəlki kimi). Yeni yol: admin → Yollar → «Yeni yol» və ya `path.yaml` ilə ZIP idxalı.

### Nəyi yoxlamalı

1. Yeni hesab açın → avtomatik `/baslangic` → istiqamət seçin → «NÜMUNƏ YOL» → «Bu yola başla» → yol səhifəsində 1-ci addım «Siz buradasınız», qalanları kilidli; paneldə «Aktiv yol» bloku.
2. Nümunə kursu bitirin → yol səhifəsində kurs ✓, imtahan açılır (faiz 25%); imtahanda səhv → «keçmədi» + izah, düzgün → keçdi (+50 XP).
3. Layihə: fayl/link təhvil verin → «Müəllim yoxlayır»; admin → Layihələr → rəy yazıb «Qəbul et» → tələbədə «Layihə qəbul edildi» (+100 XP); «Qaytar» → yenidən təhvil.
4. Final → «Sertifikatı al» → `/sertifikat/<id>` (DACY-P seriyası, «Karyera yolu sertifikatı» PDF); `/sertifikatlar` və paneldə görünür.
5. Admin: yeni yol yaradın, kurs/imtahan/layihə/final əlavə edin, sürükləyib sıralayın, boş imtahanla «Dərc et» → səhv siyahısı; «path.yaml ixrac» → `/admin/idxal`-da yenidən yükləyin.
6. Testlər: `pnpm test`, `pnpm --filter @dacy/api test:e2e`, `pnpm e2e`.

### Məlum məhdudiyyətlər

- Layihə yoxlaması: `manual` (müəllim) və `auto` (təhvil verən kimi qəbul); fayl üzərində avtomatik test yoxdur.
- Yoxlamada olan (SUBMITTED) layihə ardıcıl rejimdə növbəti addımı kilidli saxlayır (spesifikasiyadakı qayda); istənilsə `sequential: false` ilə yumşaldıla bilər.
- Layihə faylları yaddaş qovluğunda (`STORAGE_DIR/path-<id>/`) saxlanılır, yalnız sahibi və müəllim yükləyə bilər.

---

## Qeydlər — 2 oktyabr 2026 (Mərhələ 4 təsdiqindən sonra)

### Qeyd 1 — «Tezliklə» yer tutucuları

Repoda yer tutucu səhifə qalmayıb (`/yollar`, `/sertifikatlar` Mərhələ 3–4-də real səhifələrlə əvəz olunub; `grep "Tezliklə"` yalnız lüğətdəki ümumi sözü tapır). Skrinşotdakı səhifələr Mərhələ 1 nüsxəsidir — lokal nüsxə `origin/claude/dacy-academy-platform-4f2r5r` budağından geridədir. Həll: `git pull origin claude/dacy-academy-platform-4f2r5r && pnpm install && rm -rf apps/web/.next && pnpm dev`.

### Qeyd 3 — Test hesabları (tamamlandı)

- Hesablar koda yazılmır: seed `.env`-dəki `SEED_ADMIN_EMAIL/PASSWORD`, `SEED_STUDENT_EMAIL/PASSWORD`-dan oxuyur; boşdursa hesab yaradılmır (xəbərdarlıq). `.env.example`-da adlar boş dəyərlə.
- Upsert: mövcud hesab təkrar yaranmır, şifrəsi dəyişmir; admin rolu təmin olunur. Tələbə avtomatik «NÜMUNƏ» kursuna yazılır.
- Şifrələr bazada **argon2id** heşi ilə (bcrypt əvəzinə — platformanın mövcud, daha güclü sxemi; dəyişdirilməsi bütün hesabların heşlərini pozardı). İstənilsə bcrypt-ə keçid ayrıca iş kimi edilə bilər.
- Yoxlama: `apps/web/e2e/accounts.spec.ts` — admin giriş → `/admin` açılır; tələbə giriş → `/admin`-dən `/kurslar`-a yönlənir, `GET /api/admin/courses` 403, nümunə kursa yazılıb (2/2 ✓). README-də «Test hesabları (seed)» bölməsi.

### Qeyd 2 — Dizayn referansı v2 (tamamlandı — 3 oktyabr 2026-da bütün sayta köçürüldü, aşağıya bax)

`docs/DACY_DESIGN_REFERENCE.html` yenidən yazıldı (rəng tokenləri dəyişməyib): ağ header + 260px navy sidebar (ikonlu menyu, ÖYRƏN / TƏTBİQ ET bölmələri, «YENİ» badge), 24px radiuslu hero (mint badge, 2 sətir təsvir, xətti SVG), kurs kartı anatomiyası (etiket, 24px başlıq, 3 zolaqlı səviyyə, 4 sətir təsvir, müəllim, müddət + «Başla»), kvadratvari çiplər + «+N» + sayğac/axtarış/Mövzu/Daha çox filtr, tip şkalası 40/28/24/16, boşluq şkalası 4–48, hover/focus/active, skeleton, kömək düyməsi, mobil alt naviqasiya, admin siyahı/redaktor/«…» menyu/təhlükəsiz silmə dialoqu/toast. Skrinşotlar: `docs/screenshots/v2/*.png`. Platformaya köçürmə təsdiqdən sonra.

### Qeyd 4 — Admin kurs nəzarəti (tamamlandı)

**Rollar.** Təhlükəli əməliyyatlar (arxiv, surət, silmə / bərpa / həmişəlik silmə, kursun tələbələrinə müdaxilə, fəaliyyət tarixçəsi) **yalnız ADMIN** — backend-də `@AdminOnly()` ilə yoxlanır, UI-da da gizlədilir. Kontent redaktəsi (fəsil/addım əlavə, redaktə, sil, sürüklə, köçür, dərc et / gizlət, fayllar) INSTRUCTOR-da da qalır (istifadəçi ilə razılaşdırılıb).

**Kurs səviyyəsində** (`/admin/kurslar` sətirdə ✎ / 👁 / 🗑 + «…» menyusu, kurs redaktorunun başlığında düymələr):

- Redaktə et: başlıq, təsvir, istiqamət, səviyyə, **müəllim (ad, vəzifə, şəkil)**, müddət, örtük şəkli (yeni `Course.instructorName/instructorTitle/instructorAvatarId`).
- Dərc et / Dərcdən çıxar.
- Arxivlə: kataloqdan gizlənir, yeni yazılma `409 COURSE_ARCHIVED`; yazılmış tələbələr kurs səhifəsini, dərsləri və irəliləyişi görməyə davam edir.
- Kopyala: bütün fəsil, addım (config + secret), CTF tapşırıqları (hash-lər) və fayllar (diskdə yeni nüsxə) ilə `<slug>-kopya` qaralama; yazılma/irəliləyiş kopyalanmır.
- Önizlə (tələbə kimi), Sil.
- Status tabları: Hamısı · Dərc olunub · Qaralama · Arxivdə · **Silinənlər** (sayğaclarla).

**Təhlükəsiz silmə.**

- Dialoqda tələbə / fəsil / addım sayı; kursa tələbə yazılıbsa kursun adı dəqiq yazılmayınca «Sil» deaktivdir — eyni qayda backend-də (`400 CONFIRM_REQUIRED`).
- Silmə əvvəlcə **soft delete**: kurs «Silinənlər»ə düşür, tələbələr üçün hər yerdə 404 (kataloq, kurs, dərs, lab, fayllar, panel), 30 gün ərzində «Bərpa et» (toast-da da «Geri qaytar»).
- «Həmişəlik sil» yalnız Silinənlər-dən, ayrıca dialoqla. 30 gündən köhnə silinənlər avtomatik (6 saatda bir və Silinənlər açılanda) həmişəlik silinir; jurnalda «sistem» kimi qeyd olunur.
- Həmişəlik silmədə fəsil, addım, yazılma, irəliləyiş, göndəriş, ipucu, CTF həlli, lab sessiyası, əl ilə açılmış kilidlər FK cascade ilə silinir, fayllar diskdən silinir — **yetim qeyd qalmır** (API e2e ilə yoxlanır). **Sertifikatlar qalır və etibarlıdır** (`courseId → NULL`, snapshot), qazanılmış XP jurnalı da qalır. Yola daxil olan kurs həmişəlik silinmir (`409 COURSE_IN_PATH`); silinənlərdəki kurs yolda «dərc olunmamış» sayılır, ZIP idxalı eyni slug üçün aydın səhv verir.

**Kursun içində.** Fəsil/addım əlavə, redaktə, sil, sürüklə, fəsillər arası köçürmə, hər addımı ayrıca dərc et / gizlət (Mərhələ 1-dən) + yeni **Fayllar** tabı: hər fayl üçün «Dəyişdir» (eyni yolda yeni fayl — addımlardakı istinadlar pozulmur) və «Sil».

**Tələbələr tabı** (kurs daxilində, yalnız ADMIN): faiz (+ `tamamlanan / cəmi`), son aktivlik, yazılma tarixi; «Kilidi aç» — ardıcıl kursda kilidli addımı seçilmiş tələbəyə əl ilə açır (yeni `StepUnlock`, `computeCourseMap({ unlocked })`; açılmış addım çipdə görünür, ✕ ilə kilid bərpa olunur); «İrəliləyişi sıfırla» (progress, göndəriş, ipucu, CTF həlli, lab, kilidlər silinir; yazılma 0% qalır; XP qalır); «Kursdan çıxar» (irəliləyiş saxlanılır → toast-dakı «Geri qaytar» itkisiz bərpa edir).

**Fəaliyyət tarixçəsi** (`/admin/tarixce`, kurs redaktorunda «Tarixçə» tabı): yeni `AuditLog` (kim — e-poçt snapshot, nə — əməliyyat kodu, nə vaxt, obyektin başlığı — silmədən əvvəl oxunur, kurs id-si, seçilmiş təfərrüatlar). Bütün admin dəyişiklikləri (kurs / fəsil / addım / fayl / istiqamət / rol / tələbə müdaxiləsi) `@Audit()` dekoratoru + qlobal interceptor ilə yalnız **uğurlu** olduqda yazılır; cavablarda gizli məlumat (CTF cavabı, həll) jurnala düşmür. Filtr və «Daha çox» (cursor).

**Toast-lar:** «Kurs silindi — Geri qaytar», «Kurs arxivləndi — Geri qaytar», «Kurs kopyalandı — Aç», «Tələbə kursdan çıxarıldı — Geri qaytar» və s.

**Miqrasiya:** `20261002212450_admin_course_control`. Mövcud bazada: `pnpm db:deploy` (və ya `pnpm dev`).

**Yoxlama:**

- API e2e `apps/api/test/admin-control.e2e-spec.ts` (10 test: rollar 403, tələbə siyahısı, kilid aç, sıfırla, çıxar / geri yaz, arxiv, surət, soft delete / bərpa, həmişəlik silmədə yetim qeyd yoxlaması + sertifikat və XP qalır, audit). Ümumi API e2e: **69/69**.
- Playwright `apps/web/e2e/admin-control.spec.ts` — `.env`-dəki admin hesabı ilə UI üzərindən: kopyala → dərc et → arxivlə / geri qaytar → tələbələr (kilid aç, sıfırla, çıxar / geri qaytar) → fayl dəyişdir → müəllim sahələri → silmə dialoqu (say, ad təsdiqi) → Silinənlər → bərpa → həmişəlik silmə → tarixçə; tələbə hesabı üçün bütün bu API-lər 403, `/admin/*` → `/kurslar` (**7/7**). Skrinşotlar: `docs/screenshots/qeyd4/`.
- Qeyd: Playwright-ın bütün spec-lərini bir dəfəyə işə salanda giriş limiti (dəqiqədə 20, API bütün sorğuları Next proksisinin IP-si ilə görür) `429` verir — spec-ləri ayrı-ayrılıqda işlədin. Bu, istehsalda da bütün istifadəçilər üçün ortaq limit deməkdir; ayrıca düzəliş kimi təklif olunur (`trust proxy` + müştəri IP-sinin ötürülməsi).

### Qeyd 5 — Mövzular və səviyyə filtri (tamamlandı)

**Admin — «Mövzular»** (`/admin/movzular`, sidebar-da KONTENT → Mövzular): istiqamətlərdən ayrı başlıqlar (məs. «Python», «Excel», «Linux»). Yarat / redaktə et (ad, slug, rəng — 8 hazır + sərbəst, qısa təsvir), «Kataloqda görünür» açarı (gizli mövzu kataloqda yoxdur), sürüklə-burax ilə sıra, sil (kurslar silinmir, yalnız mövzu onlardan çıxır). Hər sətirdə kurs sayı. Heyət (ADMIN + INSTRUCTOR) idarə edir; dəyişikliklər fəaliyyət tarixçəsinə düşür (`topic.create/update/reorder/delete`).

**Kursa təyin:** kurs redaktorunda «Mövzular» sahəsi (çiplərlə çoxlu seçim, «Mövzuları idarə et» linki). ZIP paketində `course.yaml` → `topics: [python, sql]` (slug-lar; naməlum slug xəbərdarlıq verir, ixracda yazılır) — `docs/content-package.md`. Kurs surəti mövzuları saxlayır.

**Admin kurs siyahısı:** «Bütün mövzular» və «Bütün səviyyələr» seçiciləri (`?movzu=`, `?seviyye=`), sətirdə slug-un yanında mövzular rəngli nöqtə ilə.

**Tələbə kataloqu (`/kurslar`):** çip sırasında istiqamətlərdən sonra **Başlanğıc / Orta / Çətin** — üçü də görünür, 1–3 zolaqlı mini ikonla (əvvəl «İrəli» `+N`-in içində idi; ad «Çətin» oldu). «Mövzu» menyusu iki qrupdan: **Mövzular** (admin-in yaratdıqları, rəngli nöqtə + say) və **Praktika növü** (SQL / Python / Terminal / CTF / Test — addım tiplərinə görə). Qruplar birlikdə işləyir (məs. Python mövzusu + SQL tapşırığı olan kurslar); sayğaclar digər filtr nəzərə alınaraq hesablanır, boş seçimlər deaktivdir. Köhnə `?movzu=sql` linkləri praktika növünə yönəlir. Kurs səhifəsində «Bu kursda» blokunda mövzu çipləri → kataloqa filtrlə keçid.

**API:** `GET /topics` (ictimai, dərc olunmuş kurs sayı ilə), `GET/POST /admin/topics`, `PATCH /admin/topics/reorder`, `PATCH/DELETE /admin/topics/:id`; `GET /courses?topic=&level=`, `GET /admin/courses?topic=&level=`; `PATCH /admin/courses/:id` → `topicIds` (naməlum id → 400; verilməsə toxunulmur). Kartda və kurs səhifəsində `topics`.

**Miqrasiya:** `20261003122727_qeyd5_topics` (`Topic` + `_CourseTopics`).

---

## Dizayn v2 köçürməsi + tapşırıq redaktoru — 3 oktyabr 2026

**Tapşırıqlarda yazmaq (SQL / Python).** Səbəb: Chromium-un EditContext API-si ilə Monaco 0.5x bəzi düymələri itirirdi (`SELECT` → `SC`) və redaktor hər düymədə React state-dən yenidən yazılırdı. Həll: Monaco idarəsiz rejimdə (`defaultValue`, xarici dəyişiklik `executeEdits` ilə — geri al / təkrarla işləyir), `editContext: false`, Python üçün 4 boşluq tab. Qaralama brauzerdə avtomatik saxlanılır (`dacy:draft:<addım>`), «Başlanğıc koda qaytar» düyməsi. Admin addım redaktorunda da eyni redaktor + «Həlli yoxla» (SQL: həll sorğusu DuckDB-də işləyir, nəticə cədvəli; Python: həll və başlanğıc kod testlərlə yoxlanır).

**Tələbə qabığı (skrinşot 3–4):** ağ header (loqo · Öyrən / Tətbiq et / Sertifikatlar pill menyusu · «/» qısayollu axtarış · zəng · avatar menyusu), 260px navy sidebar (Panel, Fəaliyyətim, Liderlər · ÖYRƏN: Yollar, Kurslar, Təcrübə, İmtahanlar · TƏTBİQ ET: Layihələr, Yarışlar; «YENİ» nişanları; altda «Həftəlik hədəf» kartı), mobil-də alt naviqasiya + «Daha çox» paneli, kömək düyməsi. Səhifələr v2 anatomiyası ilə: Panel (hero «Xoş gəldiniz», qaldığınız yer, kurslarım, 2×2 statistika, bu həftə, aktiv yol), Kurslar (hero, çiplər, sayğac/axtarış/Mövzu/Daha çox filtr, kartlar, skeleton), kurs səhifəsi (hero, akkordeon fəsillər, irəliləyiş halqası), Yollar və yol xəritəsi, Sertifikatlar, Profil (həftəlik hədəf 3/5/8/12/20, liderlər cədvəlində görünmə, tema), giriş/qeydiyyat (iki sütun), onboarding, 404.

**Yeni bölmələr (sidebar-dakı «YENİ»lər real səhifədir):** Fəaliyyətim (53 həftəlik istilik xəritəsi, seriya, XP jurnalı, istiqamətlər üzrə), Liderlər cədvəli (həftə / ay / bütün dövr; profil-dən gizlənmək olur), Təcrübə (yazıldığı kurslardakı SQL / Python / Terminal / CTF tapşırıqları, tip filtri), İmtahanlar (yol imtahanları + kurs testləri), Layihələr (kanban: başlanmayıb / işdə / yoxlamada / tamamlandı), Yarışlar (CTF otaqları + hər otağın xal cədvəli). Zəng: sertifikat, layihə rəyi, yeni kurslar, (heyət üçün) yoxlama gözləyənlər — mövcud qeydlərdən törədilir, «oxundu» `User.notificationsSeenAt`.

**Admin (skrinşot 1–2):** «DaCy Admin» header (axtarış — kurs / tələbə / fayl / yol, «Sayta keç»), navy sidebar Ümumi baxış · KONTENT · İNSANLAR · SİSTEM (yoxlama sayğacı), yeni «Ümumi baxış» (8 KPI, 14 günlük aktivlik, top kurslar, son fəaliyyət), Kurslar cədvəli (status tabları sayğacla, çiplər, axtarış, «…» menyu, status nöqtəli badge-lər), silmə dialoqu (ikon, 3 statistika plitəsi, ad təsdiqi), navy toast-lar sol vurğu xətti ilə, bütün admin səhifələrində vahid başlıq (`PageHeader`) və cədvəl üslubu, mobil-də sürüşən tablar.

**Miqrasiya:** `20261003110423_v2_profile_goal_notifications` (`User.weeklyGoal`, `showOnLeaderboard`, `notificationsSeenAt`).

**Yol üstündə tapılan və düzəldilən səhvlər:**

- Addımı eyni anda iki dəfə açmaq (iki tab, dev-də StrictMode) `stepProgress` unikal pozuntusu ilə 500 verirdi → təkrar cəhd (regressiya testi var).
- Kurs redaktorundan silmədən sonra `router.refresh()` + `router.push()` ardıcıl çağırılırdı, gedən refresh keçidi «udurdu» — admin silinmiş kursun səhifəsində qalırdı → `done(c, next)` ya keçir, ya yeniləyir.
- Admin kurs cədvəlində «N dəq əvvəl» dəqiqə sərhədində hidratasiya xəbərdarlığı verirdi → `suppressHydrationWarning`.

**Yoxlama:**

- API e2e: **83/83** (yeni `apps/api/test/topics-hub.e2e-spec.ts` — 14 test: mövzu CRUD + rollar, kursa təyin, kataloq/admin filtrləri, gizli mövzu, sıra, surət, audit; panel xülasəsi, həftəlik hədəf, bildirişlər, fəaliyyət, təcrübə, liderlər + gizlənmə, yarışlar, admin ümumi baxış/axtarış, eyni anda addım açma).
- Shared unit 45/45, web unit 5/5, typecheck + lint təmiz.
- Playwright: admin, admin-control, student-flow, accounts, phase2, phase3, phase4 — **34/34** (7 spec bir yerdə işlədildi; bir test dev serverin yaddaş limitinə görə avtomatik yenidən başlaması zamanı `ECONNREFUSED` aldı, ayrıca təkrarda keçdi). Dev serverdə ağır marşrutlar (iş sahəsi, sertifikat) soyuq halda 6–10 s kompilyasiya olunduğu üçün iki keçid yoxlamasının gözləmə vaxtı 30 s-ə qaldırıldı (eyni spec-dəki digər keçidlər kimi).
