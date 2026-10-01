# DaCy Academy

DataCamp / TryHackMe modelində onlayn təlim platforması: tələbə qeydiyyatdan keçir, istiqamət (Data Analytics, Data Engineering, Cyber Security) və kurs seçir, dərsləri müəllimin qoyduğu ardıcıllıqla keçir.

> **Kontent platformaya daxil deyil.** Kurslar, dərslər, tapşırıqlar və Learning Path-lər admin paneldən (`/admin`) və ya ZIP paketlə (Mərhələ 2) yüklənir. Bazada yalnız bir nümunə kurs var: **«NÜMUNƏ — silinə bilər»**.

## Texnologiyalar

| Hissə | Texnologiya |
|---|---|
| Web | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn-tipli komponentlər |
| API | NestJS 10, Prisma 6, PostgreSQL 16 |
| Ortaq | `packages/shared` — zod sxemləri, tiplər, lüğət (az), irəliləyiş hesablanması |
| Alətlər | pnpm 10 workspaces, Turborepo, Vitest, Jest + supertest, Playwright |

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

**B) Mövcud PostgreSQL.** Rol və bazaları yaradın, `.env`-də `DATABASE_URL`/`DATABASE_URL_TEST` dəyişənlərini uyğunlaşdırın:

```sql
CREATE ROLE dacy LOGIN PASSWORD 'dacy' CREATEDB;
CREATE DATABASE dacy OWNER dacy;
CREATE DATABASE dacy_test OWNER dacy;   -- API e2e testləri üçün
```

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

| Rol | E-poçt | Şifrə |
|---|---|---|
| ADMIN | `admin@dacy.local` | `Admin123!` |
| STUDENT | `telebe@dacy.local` | `Telebe123!` |

Müəllim (INSTRUCTOR) rolunu admin `/admin/telebeler` səhifəsindən verir.

## Əmrlər

| Əmr | Nə edir |
|---|---|
| `pnpm dev` | hər şeyi işə salır (yuxarıda) |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` | bütün paketlər |
| `pnpm test` | shared (Vitest) + web (Vitest) unit testləri |
| `pnpm --filter @dacy/api test:e2e` | API e2e testləri (`DATABASE_URL_TEST` bazasında) |
| `pnpm e2e` | Playwright tələbə axını (API + web işləməlidir) |
| `pnpm screenshots` | dizayn referansı vs tətbiq skrinşotları → `docs/screenshots/` |
| `pnpm db:migrate` | yeni migrasiya (`prisma migrate dev`) |
| `pnpm db:seed` | seed-i yenidən işə sal (idempotent) |
| `pnpm db:reset` | bazanı sıfırla (⚠ bütün məlumat silinir) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm --filter @dacy/api recompute-progress` | irəliləyiş/XP keşlərini yenidən hesabla |

Playwright üçün brauzer bir dəfə yüklənir: `pnpm --filter @dacy/web exec playwright install chromium` (hazır Chromium varsa `PLAYWRIGHT_CHROMIUM_PATH=/yol/chrome`).

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

| URL | Məzmun |
|---|---|
| `/kurslar` | kataloq (istiqamət / səviyyə filtri) |
| `/kurs/[slug]` | kurs səhifəsi (fəsillər, addımlar, irəliləyiş) |
| `/kurs/[slug]/[fəsil]/[addım]` | dərs ekranı (tam ekran, tünd) — `/kurs/x/2/4` forması da işləyir |
| `/panel` | şəxsi panel |
| `/admin/kurslar` | admin redaktoru (INSTRUCTOR / ADMIN) |
| `http://localhost:4000/health` | API sağlamlıq yoxlaması |
