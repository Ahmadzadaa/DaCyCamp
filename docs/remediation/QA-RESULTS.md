# QA nəticələri — Remediation V4

Tarix: 18 oktyabr 2026 · Mühit: lokal (Linux, Node 22, PostgreSQL 16), **production build** (`next build` +
`next start`, `nest build` + `node dist/main.js`). Hər rəqəm bu mərhələdə işlədilmiş testdən götürülüb.

## 1. Avtomatik testlər

| Dəst                           | Əmr                                                            | Nəticə                        |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------- |
| API unit                       | `pnpm --filter @dacy/api test`                                 | **17 / 17** (6 dəst)          |
| API inteqrasiya (e2e)          | `pnpm --filter @dacy/api test:e2e` (ayrıca `dacy_test` bazası) | **225 / 225** (25 dəst, 87 s) |
| shared (i18n paritet, sxemlər) | `pnpm --filter @dacy/shared test`                              | **107 / 107**                 |
| web unit                       | `pnpm --filter @dacy/web test`                                 | **9 / 9**                     |
| Lint                           | `pnpm lint`                                                    | ✓                             |
| Typecheck                      | `tsc --noEmit` (web, api)                                      | ✓                             |
| Compose statik yoxlaması       | `node scripts/check-compose.mjs`                               | ✓                             |
| Formatlama                     | `prettier --check` (dəyişən fayllar)                           | ✓                             |

V4-də əlavə olunan testlər:

| Fayl                                                         | Nəyi qoruyur                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/integrity.e2e-spec.ts` (6)                    | SEC-04: saxta Python nəticəsi → PENDING sertifikat, PDF yox, sayğaclara düşmür, yalnız admin təsdiqləyir, sübut = keçən kod; Python-suz kurs dərhal etibarlı; SQL hash-i gizlidir; akademiya toplu açıqlaması Python qaralamalarını keçir |
| `apps/api/test/academy-admin.e2e-spec.ts` (3)                | Proqram redaktəsi (yalnız admin, audit), qrup tarixlərinin konflikt yoxlaması (6 hal), yazılış tarixçəsi (sahib görür, yad 403)                                                                                                           |
| `apps/api/test/academy-notifications.e2e-spec.ts` (+1)       | 3 paralel işçi: hər tələbəyə bir bildiriş, PENDING qalmır                                                                                                                                                                                 |
| `apps/api/test/academy-submissions.e2e-spec.ts` (+1 yoxlama) | Akademiya fayl endirməsində CSP `sandbox`                                                                                                                                                                                                 |
| `apps/api/src/config/env.spec.ts` (+1)                       | `LAB_DRIVER` defoltu `off`                                                                                                                                                                                                                |
| `apps/web/e2e/cert-review.spec.ts` (2)                       | Brauzerdə: tələbə «Təsdiq gözləyir» görür; admin kodu açmadan təsdiqləyə bilmir; təsdiqdən sonra «Etibarlıdır» + PDF                                                                                                                      |
| `apps/web/e2e/academy-admin.spec.ts` (1)                     | Proqram redaktəsi, qrup tarixi, yazılış tarixçəsi UI                                                                                                                                                                                      |
| `apps/web/e2e/workspace-mobile.spec.ts` (4)                  | UX-01 tablar 320 / 390 / 768, redaktor vəziyyəti, klaviatura, CTF tab adı, geniş ekranda tab yoxdur                                                                                                                                       |
| `apps/web/e2e/role-access.spec.ts` (5)                       | Qonaq / tələbə / müəllim / admin səhifə + API matrisi, çıxış                                                                                                                                                                              |

## 2. Brauzer e2e (Playwright)

Production build üzərində, hər spec ayrıca (giriş limiti 20 / dəq / IP — aralarda 65 s fasilə). **21 spec, 85 test — hamısı keçir.**

| Spec             | Test | Nəticə                                                          |
| ---------------- | ---- | --------------------------------------------------------------- |
| academy-admin    | 1    | ✓                                                               |
| academy-join     | 6    | ✓                                                               |
| academy          | 6    | ✓                                                               |
| accounts         | 2    | ✓                                                               |
| admin-control    | 7    | ✓                                                               |
| admin            | 3    | ✓ (ilk qaçışda 1 uğursuz — TEST-04, test yeniləndi, təkrar 3/3) |
| cert-review      | 2    | ✓                                                               |
| i18n             | 2    | ✓                                                               |
| intro-courses    | 5    | ✓                                                               |
| landing          | 3    | ✓                                                               |
| phase2           | 7    | ✓                                                               |
| phase3           | 5    | ✓ (ilk qaçışda 1 uğursuz — TEST-04, test yeniləndi, təkrar 5/5) |
| phase4           | 7    | ✓                                                               |
| python-course    | 5    | ✓                                                               |
| roadmap          | 5    | ✓                                                               |
| role-access      | 5    | ✓                                                               |
| screenshots      | 3    | ✓                                                               |
| student-flow     | 3    | ✓                                                               |
| support          | 3    | ✓                                                               |
| video            | 1    | ✓                                                               |
| workspace-mobile | 4    | ✓                                                               |

İlk qaçışdakı 2 uğursuzluğun ikisi də V4-ün bilərəkdən dəyişdirdiyi davranışdan idi (məhsul xətası deyil): markdown `#`
artıq `h2` render olunur (A11Y-04) və Python addımlı NÜMUNƏ kursunun sertifikatı təsdiq gözləyir (SEC-04).

## 3. Əlçatanlıq (axe-core 4.13, WCAG 2.1 A/AA)

| Səhifə                                                                                      | Əvvəl                                                                             | Sonra |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| Yol (`/yol/numune-yol`), «Təcrübə», layihələr, kurs səhifələri — kilidli addımlar (A11Y-05) | color-contrast 2.5–4.47:1                                                         | **0** |
| Dərs ekranları (nəzəri, test, SQL, Python, CTF, terminal) — best-practice daxil             | heading-order, landmark-one-main, region, color-contrast (sətir nömrələri 2.68:1) | **0** |
| Nəzəri dərs — `h1` sayı (A11Y-04)                                                           | 2                                                                                 | **1** |
| «Açıq fonda açıq mətn» skanı (axe qradiyentdə tuta bilmir) — 5 rol, 225 səhifə              | 25 hal (yol səhifəsinin rəqəmləri)                                                | **0** |

## 4. Klaviatura (A11Y-06)

Kataloq → «Səviyyə» menyusu, səhifə `load` olan kimi: Enter → ↓ → Enter.

| ↓ ilə Enter arası | Uğurlu  |
| ----------------- | ------- |
| 0 ms (sintetik)   | 5 / 10  |
| 30 ms             | 10 / 10 |
| 80 ms             | 10 / 10 |

## 5. Desktop düzüm (1280 / 1440)

| Yoxlama                                                                         | Nəticə                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Admin səhifələrində cədvəl qablarının üfüqi sürüşməsi (bütün admin marşrutları) | Əvvəl: akademiya qrupları (1440-da kəsilir), istifadəçilər 23px, qrup yazılışları 39–54px → **0** |
| Səhifə səviyyəsində üfüqi sürüşmə                                               | 0                                                                                                 |
| Vizual baxış (15 ekran, 3 rol)                                                  | 6 tapıntı düzəldildi, 1 açıq (UI-06) — UX-REVIEW                                                  |

## 6. Mobil dərs ekranı (UX-01)

| En  | Tablar | Redaktor eni | Kod qalır | ← / → | Daşma |
| --- | ------ | ------------ | --------- | ----- | ----- |
| 320 | ✓      | 320          | ✓         | ✓     | 0     |
| 375 | ✓      | 375          | ✓         | ✓     | 0     |
| 390 | ✓      | 390          | ✓         | ✓     | 0     |
| 768 | ✓      | 768          | ✓         | ✓     | 0     |

Python 320px: işlət → nəticə → tab dəyişmə → nəticə qalır ✓. Konsolda səhifə xətası: 0.

## 7. Baza, ehtiyat nüsxə, asılılıqlar

| Yoxlama                                                                  | Nəticə                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma migrate status`                                                  | 14 miqrasiya, «Database schema is up to date»                                                                                             |
| `prisma migrate diff` (baza → sxem)                                      | Boş                                                                                                                                       |
| XP keşi = XP jurnalı                                                     | 0 uyğunsuzluq                                                                                                                             |
| İstifadəçi başına təkrar XP                                              | 0 (`HINT_USED + STEP_COMPLETED` cütü qanunidir)                                                                                           |
| Tamamlanmadan verilmiş sertifikat                                        | 0                                                                                                                                         |
| Bağlı qrupda aktiv yazılış / diapazondan kənar bal / səhv qrup tarixləri | 0 / 0 / 0                                                                                                                                 |
| Bildiriş növbəsi                                                         | 47 DONE, 0 PENDING, 0 FAILED                                                                                                              |
| Ehtiyat nüsxə → müvəqqəti bazaya bərpa                                   | 58 cədvəl, 4265 sətir eyni; miqrasiya eyni; 58 fayl eyni (`diff -r`); `Certificate`, `User`, `AcademyGrade`, `XpEvent` məzmun hash-i eyni |
| Paralel yazı zamanı nüsxə                                                | 1450 sətir yazılarkən alınan nüsxə manifestlə tam uyğun bərpa olundu                                                                      |
| Bərpanın mənfi halları                                                   | `--target-url` yox → rədd; hədəf = işlək baza → rədd; boş olmayan baza → rədd; zədələnmiş dump → sha256 xətası                            |
| `pnpm audit` (hamısı)                                                    | 23 → **16** (kritik 4 → 2, yüksək 5 → 3)                                                                                                  |
| `pnpm audit --prod`                                                      | 5 (hamısı bu kodda əlçatmaz — SECURITY-REVIEW)                                                                                            |

## 8. Production build üzərində tam gəzinti (5 rol)

Hər rol üçün daxili linklər üzrə gəzinti (BFS): HTTP statusu, səhifə və konsol xətaları, uğursuz sorğular, qırıq
şəkillər, axe (WCAG 2.1 A/AA), `h1` sayı, düymə / sahə adları, 390 / 320px daşma.

| Rol                | Səhifə  |
| ------------------ | ------- |
| Qonaq              | 34      |
| Tələbə             | 40      |
| Akademiya tələbəsi | 39      |
| Müəllim            | 42      |
| Admin              | 70      |
| **Cəmi**           | **225** |

| Yoxlama                       | Nəticə                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| HTTP ≥ 400                    | 2 — ikisi də gözlənilən: `/olmayan-sehife-xyz` (404 səhifəsi sınağı) və akademiya tələbəsi üçün `/muellim` (bilərəkdən 404) |
| Konsol xətası / uğursuz sorğu | Yalnız yuxarıdakı iki 404                                                                                                   |
| Səhifə xətası (JS)            | 1 → **0**: `/admin/lablar` hidratasiya #418 (BUG-01, düzəldildi; 10 təkrar yükləmədə 0)                                     |
| Qırıq şəkil                   | 0                                                                                                                           |
| axe                           | 2 səhifə → **0**: sertifikat səhifəsi və `/admin/lablar` status nişanları (A11Y-12)                                         |
| `h1` ≠ 1                      | 0 səhifə                                                                                                                    |
| Adsız düymə / etiketsiz sahə  | 6 / 2 — əvvəlki raundla eyni, yoxlayıcının yanlış pozitivi (UX-REVIEW §4)                                                   |
| Mobil daşma (məlumat üçün)    | Qrup səhifələri 57px — V4 reqressiyası (UI-07), düzəldildi → 0; admin paneli qrafiki 320px-də 2px (MOB-01)                  |

Düzəlişlərdən sonra admin rolu üçün təkrar gəzinti (70 səhifə): axe **0**, JS xətası **0**, HTTP ≥ 400 **0**, qrup
səhifələrində daşma **0**; yeganə qeyd — admin panelinin qrafiki 320px-də 2px (MOB-01). Sertifikat səhifəsi ayrıca: axe 0.
Düzəlişlərdən sonra təkrar işlədilən spec-lər: `cert-review` 2/2, `phase3` 5/5, `academy-admin` 1/1.

## 9. Tünd tema (OS «dark», tema «Sistem»)

17 əsas səhifə (tələbə: panel, kataloq, kurs, yol, «Təcrübə», sertifikatlar, profil, liderlər, nəzəri dərs; admin: ümumi
baxış, kurslar, istifadəçilər, sertifikat təsdiqi, akademiya, lab-lar, layihələr, müəllim paneli).

|                 | axe pozuntusu olan səhifə                                         |
| --------------- | ----------------------------------------------------------------- |
| Əvvəl           | 5 (uğur mətni ~2:1, istiqamət nişanı 1.59:1, boz nişanlar 4.45:1) |
| Sonra (A11Y-13) | **0**                                                             |
