# DaCy Academy

DataCamp / TryHackMe modelində onlayn təlim platforması: tələbə qeydiyyatdan keçir, istiqamət (Data Analytics, Data Engineering, Cyber Security) və kurs seçir, dərsləri müəllimin qoyduğu ardıcıllıqla keçir.

> **Kontent platformaya daxil deyil.** Kurslar, dərslər, tapşırıqlar və Learning Path-lər admin paneldən (`/admin`) və ya ZIP paketlə (Mərhələ 2) yüklənir. Bazada yalnız bir nümunə kurs var: **«NÜMUNƏ — silinə bilər»**.

## Texnologiyalar

| Hissə   | Texnologiya                                                                   |
| ------- | ----------------------------------------------------------------------------- |
| Web     | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn-tipli komponentlər  |
| API     | NestJS 10, Prisma 6, PostgreSQL 16                                            |
| Ortaq   | `packages/shared` — zod sxemləri, tiplər, lüğət (az), irəliləyiş hesablanması |
| Alətlər | pnpm 10 workspaces, Turborepo, Vitest, Jest + supertest, Playwright           |

Portlar: **web 3000 · api 4000 · db 5432** (3100 və 5433 istifadə olunmur).

## Quraşdırma (bir əmrlə)

Tələblər: Node.js 22+, pnpm 10 (`corepack enable`), və ya Docker, ya da lokal PostgreSQL 16.

```bash
pnpm install
pnpm dev
```

`pnpm dev` (`scripts/dev.mjs`) ardıcıl olaraq:

1. `.env` yoxdursa `.env.example`-dan yaradır;
2. `DATABASE_URL`-ə qoşulmağa çalışır; alınmasa və Docker işləyirsə `docker compose up -d db` edir;
3. `prisma migrate deploy` + idempotent seed (3 istiqamət, admin və tələbə hesabı, nümunə kurs);
4. `turbo run dev` → shared (watch) + API (`http://localhost:4000`) + web (`http://localhost:3000`).

### Verilənlər bazası — iki yol

**A) Docker (tövsiyə olunur).** Heç nə etmək lazım deyil: `pnpm dev` `db` servisini özü qaldırır. Yalnız bazanı qaldırmaq üçün: `docker compose up -d`.
Kompüterinizdə 5432 portunda artıq başqa PostgreSQL varsa (və orada `dacy` rolu yoxdursa), skript bunu özü tanıyır: Docker bazasını boş portda (5434-dən başlayaraq) qaldırır və `.env`-dəki `DATABASE_URL` / `DB_PORT` dəyərlərini yeniləyir.

**B) Mövcud PostgreSQL.** Rol və bazaları yaradın, `.env`-də `DATABASE_URL`/`DATABASE_URL_TEST` dəyişənlərini uyğunlaşdırın:

```sql
CREATE ROLE dacy LOGIN PASSWORD 'dacy' CREATEDB;
CREATE DATABASE dacy OWNER dacy;
CREATE DATABASE dacy_test OWNER dacy;   -- API e2e testləri üçün
```

Rol varsa, amma baza yoxdursa, `pnpm dev` bazanı özü yaradır. Giriş alınmayanda skript dəqiq səbəbi (`P1000` şifrə, `P1003` baza yoxdur) və həll yollarını yazır.

### Quraşdırmasız: GitHub Codespaces

1. GitHub-da repo səhifəsində **Code → Codespaces → Create codespace** (branch: `claude/dacy-academy-platform-4f2r5r`).
2. Hazırlıq bitəndə (asılılıqlar avtomatik qurulur) terminalda `pnpm dev` yazın.
3. «Ports» panelində 3000 portunun linkini açın (brauzer özü də açır). API 4000 portu daxili işləyir, kənara çıxmır.

### Tam stack Docker-də

```bash
docker compose --profile full up --build
```

`db` + `api` (4000) + `web` (3000) konteynerləri qalxır; `.env` faylı oxunur.

## Seed hesabları

`.env`-dəki `SEED_*` dəyişənlərindən (defolt):

| Rol     | E-poçt              | Şifrə        |
| ------- | ------------------- | ------------ |
| ADMIN   | `admin@dacy.local`  | `Admin123!`  |
| STUDENT | `telebe@dacy.local` | `Telebe123!` |

Müəllim (INSTRUCTOR) rolunu admin `/admin/telebeler` səhifəsindən verir.

## Əmrlər

| Əmr                                           | Nə edir                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                    | hər şeyi işə salır (yuxarıda)                                                                            |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` | bütün paketlər                                                                                           |
| `pnpm test`                                   | shared (Vitest) + web (Vitest) unit testləri                                                             |
| `pnpm --filter @dacy/api test:e2e`            | API e2e testləri (`DATABASE_URL_TEST` bazasında)                                                         |
| `pnpm e2e`                                    | Playwright: tələbə axını, admin, Mərhələ 2 (SQL/Python/CTF/ZIP) — API + web işləməlidir                  |
| `pnpm lab:images`                             | nümunə lab imicini qur (`dacy/numune-lab:latest`, Docker lazımdır)                                       |
| `pnpm --filter @dacy/web runtimes`            | brauzer mühitlərini (DuckDB-WASM, Pyodide nüvəsi, Monaco) `public/`-ə kopyala (dev/build avtomatik edir) |
| `pnpm screenshots`                            | dizayn referansı vs tətbiq skrinşotları → `docs/screenshots/`                                            |
| `pnpm db:migrate`                             | yeni migrasiya (`prisma migrate dev`)                                                                    |
| `pnpm db:seed`                                | seed-i yenidən işə sal (idempotent)                                                                      |
| `pnpm db:reset`                               | bazanı sıfırla (⚠ bütün məlumat silinir)                                                                 |
| `pnpm db:studio`                              | Prisma Studio                                                                                            |
| `pnpm --filter @dacy/api recompute-progress`  | irəliləyiş/XP keşlərini yenidən hesabla                                                                  |

Playwright üçün brauzer bir dəfə yüklənir: `pnpm --filter @dacy/web exec playwright install chromium` (hazır Chromium varsa `PLAYWRIGHT_CHROMIUM_PATH=/yol/chrome`).

## Brauzer tapşırıqları (Mərhələ 2)

Tələbə kodu **heç vaxt serverdə işləmir** — hər şey brauzerdədir:

| Addım    | Mühit                                                           | Haradan yüklənir                                                  |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| SQL      | DuckDB-WASM (CSV/Parquet dataset-lər cədvəl kimi)               | `public/duckdb/` (öz serverimiz)                                  |
| Python   | Pyodide 0.29 (pandas, numpy, matplotlib `import` ilə avtomatik) | nüvə `public/pyodide/` + paketlər CDN (`NEXT_PUBLIC_PYODIDE_URL`) |
| Redaktor | Monaco                                                          | `public/monaco/` (öz serverimiz)                                  |

- `apps/web/scripts/copy-runtimes.mjs` bu faylları `node_modules`-dan `public/`-ə kopyalayır (`pnpm dev` / `pnpm build` avtomatik; qovluqlar git-ə düşmür).
- **Pyodide paketləri** (pandas və s.) defolt olaraq `https://cdn.jsdelivr.net/pyodide/v0.29.5/full/`-dan gəlir. İnternetsiz və ya korporativ şəbəkədə tam güzgünü öz serverinizə qoyub `.env`-də `NEXT_PUBLIC_PYODIDE_URL=/pyodide/` (və ya tam URL) verin. CDN əlçatmaz olanda tətbiq avtomatik lokal nüvəyə keçir — bu halda yalnız standart kitabxana işləyir.
- **SQL yoxlaması**: müəllimin həlli dərc zamanı serverdə (DuckDB, yalnız müəllim kodu) icra olunub nəticənin heşi saxlanılır; tələbənin nəticəsi brauzerdə heşlənib müqayisə edilir (`check: result_match` — sütun adları + sətirlər; `row_count` — yalnız sətir sayı).
- **Python yoxlaması**: `tests` (assert-lər) tələbə kodundan sonra brauzerdə işləyir; keçdi/keçmədi serverə göndərilir, cəhd sayılır.
- **CTF**: cavablar bazada yalnız HMAC-SHA256 (`CTF_PEPPER`) heşi kimi saxlanılır, frontend-ə heç vaxt getmir; yoxlama `POST /learn/ctf-tasks/:id/answer` — istifadəçi başına **10 cəhd / dəq**.
- **İpucu**: hər açılan ipucu `hint_penalty_xp` qədər XP cəriməsi (addımın XP-si bundan azalır; tapşırıq səviyyəsində `0` = pulsuz).

## Terminal lab-ları və sertifikat (Mərhələ 3)

**Terminal lab** (`type: terminal`): hər tələbə üçün `docker_image`-dən ayrıca, məhdudlaşdırılmış konteyner açılır (yaddaş/CPU/pid limiti, defolt şəbəkəsiz, `no-new-privileges`), brauzerdə **xterm.js** terminalı WebSocket ilə konteynerin qabığına bağlanır, vaxt limiti bitəndə konteyner silinir. «Yoxla» düyməsi addımın `check_script`-ini konteynerdə `sh /dacy/check.sh` kimi işlədir — **exit 0 = keçdi**, addım tamamlanır və XP verilir. «Lab-ı sıfırla» konteyneri yenidən yaradır. CTF addımında `docker_image` verilsə, otaqda «Terminal» tabı açılır (yoxlamasız mühit).

- API Docker daemon-a `/var/run/docker.sock` (və ya `DOCKER_HOST`) ilə qoşulur; `docker compose --profile full` soketi montaj edir. Docker olmayan serverdə `LAB_DRIVER=mock` virtual qabıq verir (yalnız test/nümayiş), `LAB_DRIVER=off` lab-ları söndürür.
- `.env`: `LAB_MAX_SESSIONS`, `LAB_MEMORY_MB`, `LAB_CPUS`, `LAB_PIDS_LIMIT`, `LAB_PULL`, `LAB_CHECK_TIMEOUT_SEC`; brauzer üçün `NEXT_PUBLIC_LAB_WS_URL` (defolt: eyni host, API portu, `/labs/ws` — Next proksisi WebSocket ötürmür, ona görə API portu brauzerdən əlçatan olmalıdır; Codespaces/əks-proksi arxasında bu dəyişəni verin).
- Lab imicləri və yoxlama skriptləri: `infra/lab-images/README.md`. Nümunə imic: `pnpm lab:images`.
- Vaxtı bitən sessiyalar və yetim konteynerlər hər 30 saniyədə təmizlənir; `/admin/lablar` aktiv sessiyaları göstərir və dayandırır.

**Sertifikat**: kursun bütün dərc olunmuş addımları tamamlananda avtomatik verilir (tələbə + kurs üçün bir dəfə, seriya `DACY-C-<il>-<nömrə>`). Ad, kurs və istiqamət sertifikatda dondurulur (kurs sonradan dəyişsə də). `/sertifikat/[id]` ictimai yoxlama səhifəsi (QR kod ona işarə edir), `/api/certificates/[id].pdf` A4 PDF (DejaVu Sans — ə, ğ, ş düzgün). Admin `POST /admin/certificates/:id/revoke` ilə ləğv edə bilər; səhifə və PDF «Ləğv edilib» göstərir. `NEXT_PUBLIC_APP_URL` yoxlama linkinin bazasıdır.

## Karyera yolları — Learning Path (Mərhələ 4)

Yol = istiqamət daxilində **sıralı addımlar**: `course` (mövcud kurs — bir kurs bir neçə yolda ola bilər), `assessment` (mərhələ imtahanı, keçid balı), `project` (təlimat + fayl/link təhvili; müəllim yoxlayır və ya avtomatik qəbul), `milestone` (final: bütün məcburi addımlar bitəndə **yol sertifikatı** `DACY-P-…`). `optional: true` addımlar faizə girmir və kilidləmir; `sequential: true` olanda əvvəlki məcburi addım bitmədən növbəti kilidlidir. Kurs addımının vəziyyəti kursun öz irəliləyişindən avtomatik hesablanır (kurs bitəndə bütün yollar dərhal yenilənir).

- Tələbə: `/yollar` (istiqamət filtri), `/yol/[slug]` (tünd başlıq, faiz, şaquli xəritə: ✓ tamamlanan, «Siz buradasınız», kilidli, romb imtahan/final, seçmə çiplər), `/yol/[slug]/[addım]`, qeydiyyatdan sonra `/baslangic` onboarding, paneldə «Aktiv yol» bloku, kurs səhifəsində «Bu kurs … yolunun N-ci addımıdır».
- Müəllim: `/admin/yollar` → «Yeni yol» → addımlar (kurs seçimi, imtahan sualları, layihə təlimatı, final), sürüklə-sırala, «Dərc et» (yoxlama: dərc olunmuş kurslar, ən azı bir sual, təlimat), «Tələbə kimi bax», «path.yaml ixrac»; `/admin/layiheler` — təhvil verilən layihələr, rəy, qəbul/qaytar.
- YAML: `path.yaml` (kursla eyni ZIP-də və ya təkbaşına) — format `docs/content-package.md`.
- API: `GET /paths`, `GET /paths/:slug`, `POST /paths/:slug/enroll`, `GET /learn/paths/:slug/items/:key`, `POST /learn/path-items/:id/{project|assessment|milestone}`, `PUT /me/target-path`, `GET /me/active-path`; admin `/admin/paths/*`, `/admin/path-reviews/*`.

## Kurs paketi (ZIP)

Müəllim kursu `course.yaml` + `modules/NN-fesil/NN-addim.(md|yaml)` + `datasets/ files/ images/ checks/` quruluşunda ZIP kimi hazırlayıb `/admin/idxal`-da yükləyir: **Yoxla** (heç nə yazılmır, səhv/xəbərdarlıq siyahısı) → **Tətbiq et** (bir tranzaksiyada; mövcud kurs `slug` + açarlar üzrə yenilənir, tələbə irəliləyişi qorunur, paketdə olmayan addımlar dərcdən çıxarılır). Kurs redaktorundakı **ZIP ixrac** eyni formatda paket verir (CTF cavabları yalnız heş). Formatın tam təsviri: `docs/content-package.md` (test `correct` sahəsi 1-dən sayılır).

## Qovluq strukturu

```
apps/web        Next.js (tələbə + admin UI)
apps/api        NestJS (auth, kontent, irəliləyiş, fayllar), prisma/schema.prisma, seed
packages/shared zod sxemləri, tiplər, az lüğəti, kilid/faiz hesablanması
scripts/        dev.mjs (bir əmr), screenshots
infra/          docker (Dockerfile-lar), postgres/init.sql
docs/           spesifikasiya, dizayn referansı, PLAN.md, screenshots/
```

Ətraflı plan və verilənlər bazası sxemi: `docs/PLAN.md`. Mərhələlərin jurnalı: `PROGRESS.md`.

## Əsas URL-lər

| URL                                     | Məzmun                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/kurslar`                              | kataloq (istiqamət / səviyyə filtri)                                                                    |
| `/kurs/[slug]`                          | kurs səhifəsi (fəsillər, addımlar, irəliləyiş)                                                          |
| `/kurs/[slug]/[fəsil]/[addım]`          | dərs ekranı (tam ekran, tünd) — `/kurs/x/2/4` forması da işləyir                                        |
| `/panel`                                | şəxsi panel                                                                                             |
| `/admin/kurslar`                        | admin redaktoru (INSTRUCTOR / ADMIN)                                                                    |
| `/yollar`, `/yol/[slug]`                | karyera yolları: siyahı və şaquli yol xəritəsi; `/yol/[slug]/[addım]` layihə / imtahan / final səhifəsi |
| `/baslangic`                            | onboarding: «Hansı peşəyə hazırlaşırsınız?» → uyğun yol                                                 |
| `/admin/yollar`, `/admin/layiheler`     | yol qurucusu (addımlar, sürüklə-sırala, dərc), layihə yoxlama növbəsi                                   |
| `/sertifikat/[id]`                      | sertifikatın ictimai yoxlama səhifəsi (girişsiz), `/api/certificates/[id].pdf` — PDF                    |
| `/sertifikatlar`                        | tələbənin sertifikatları                                                                                |
| `/admin/lablar`                         | aktiv terminal lab sessiyaları (dayandırma)                                                             |
| `/admin/idxal`                          | ZIP kurs paketi idxalı (yoxla → tətbiq et) və idxal tarixçəsi                                           |
| `/admin/fayllar`                        | fayl kitabxanası (datasets/, files/, images/, checks/)                                                  |
| `GET /api/admin/courses/:id/export.zip` | kursu ZIP kimi ixrac et (kurs redaktorundakı «ZIP ixrac» düyməsi)                                       |
| `http://localhost:4000/health`          | API sağlamlıq yoxlaması                                                                                 |
