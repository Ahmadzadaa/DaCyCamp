# Təhlükəsizlik baxışı — Remediation V4

Tarix: 18 oktyabr 2026. Bütün yoxlamalar lokal mühitdə aparıldı (dağıdıcı test, xarici xidmət, real e-poçt yoxdur).
Hesabatlarda heç bir parol / açar dəyəri yoxdur.

## 1. Qiymətləndirmənin etibarlılığı (SEC-04, SEC-08)

### Etibar modeli

| Tapşırıq növü        | Harada icra olunur    | Server nəyi yoxlayır                                           | Saxtalaşdırma                                                                    | Nəticə                                           |
| -------------------- | --------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Nəzəri / test (quiz) | Server                | Cavabların özü                                                 | Mümkün deyil                                                                     | Etibarlı                                         |
| SQL                  | Brauzer (DuckDB-WASM) | Nəticə cədvəlinin hash-i; gözlənilən hash tələbəyə göndərilmir | Təxmin etmək olmur; başqasının düzgün nəticəsini köçürmək olur (cavab paylaşımı) | Avtomatik yoxlanan istənilən sistem səviyyəsində |
| Python               | Brauzer (Pyodide)     | Heç nə — brauzer `passed: true` bildirir                       | Bir sorğu ilə mümkündür                                                          | **Etibarlı deyil** → aşağıdakı qayda             |
| CTF                  | Server                | Flag (pepper ilə hash)                                         | Mümkün deyil                                                                     | Etibarlı                                         |
| Terminal lab         | Server (konteyner)    | `check` skripti                                                | —                                                                                | Lab-lar defolt söndürülüb (SEC-06)               |

### Tətbiq olunan qayda (SEC-04)

- Python nəticəsi **addımı tamamlayır və XP verir** (öyrənmə axını pozulmasın; XP addım başına bir dəfə və addımın
  XP-si ilə məhduddur; XP rəsmi qiymət deyil).
- **Sertifikat** — dərc olunmuş Python addımı olan kursda (və belə kursu olan yolda) `PENDING` yaranır: ictimai
  səhifədə «Təsdiq gözləyir», PDF yoxdur (409 `CERT_PENDING_REVIEW`), panel / profil sayğaclarına düşmür.
- Admin `/admin/sertifikatlar` səhifəsində tələbənin hər Python addımı üçün sonuncu keçən kodunu görür; kodu açmadan
  «Təsdiqlə» düyməsi bağlıdır; təsdiq `AuditLog`-da qalır.
- **Akademiya:** toplu açıqlama (`releaseAll`) müəllimin baxmadığı, Python balı olan avtomatik qaralamaları keçir
  (`ACADEMY_GRADE_NEEDS_REVIEW`); müəllim baxıb ayrıca açıqlaya bilər.
- Mövcud sertifikatlar dəyişdirilmədi (miqrasiya additivdir, defolt `APPROVED`) — 14 köhnə Python sertifikatı üçün
  qərar lazımdır (DATA-03).

Sübut: `apps/api/test/integrity.e2e-spec.ts` (6 test), `apps/web/e2e/cert-review.spec.ts` (2 brauzer testi).

### Qərar tələb edən

- **SEC-04b** — Python-u serverdə (izolə edilmiş sandbox-da) icra etmək: XP / irəliləyiş də etibarlı olar, amma
  yeni infrastruktur, təhlükəsizlik sərhədi və xərc deməkdir.
- **SEC-08** — SQL rəsmi qiymət üçün istifadə olunacaqsa, server tərəfində icra.

## 2. Konfiqurasiya və deploy

| ID     | Yoxlama                                                         | Nəticə                                                                                                   |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SEC-02 | Production-da nümunə / qısa / eyni JWT açarları ilə API açılmır | `env.spec.ts` 3 test ✓                                                                                   |
| SEC-03 | PostgreSQL yalnız `127.0.0.1`                                   | `scripts/check-compose.mjs` (CI) ✓; canlı şəbəkə yoxlaması bloklanıb (Docker yoxdur)                     |
| SEC-06 | Defolt compose-da Docker socket yoxdur, `LAB_DRIVER=off`        | `check-compose.mjs` ✓, `env.spec.ts` ✓                                                                   |
| SEC-12 | API konteyneri `root` kimi işləyir                              | Tövsiyə: `USER node`                                                                                     |
| —      | Cookie bayraqları                                               | `HttpOnly`, `SameSite=Lax`; `Secure` — `COOKIE_SECURE=true` ilə (production-da false olanda xəbərdarlıq) |

## 3. Giriş nəzarəti (rol matrisi)

Brauzerdə yoxlandı — `apps/web/e2e/role-access.spec.ts` (5/5), əlavə olaraq API e2e (225 test) rolları yoxlayır.

| Hissə                              | Qonaq             | Tələbə                   | Akademiya müəllimi | Admin |
| ---------------------------------- | ----------------- | ------------------------ | ------------------ | ----- |
| `/panel`, `/sertifikatlar`         | → `/giris?next=…` | ✓                        | ✓                  | ✓     |
| `/admin/*`                         | → `/giris?next=…` | → `/kurslar`             | → yönləndirilir    | ✓     |
| `/muellim`                         | → `/giris?next=…` | 404 (varlığı açıqlanmır) | ✓                  | ✓     |
| `/api/admin/*`                     | 401               | 403                      | 403                | 200   |
| `/api/academy/programs` (yaratmaq) | 401               | 403                      | 403                | ✓     |
| Sertifikat təsdiqi                 | 401               | 403                      | 403                | ✓     |
| Çıxışdan sonra                     | —                 | API 401, səhifə → giriş  | —                  | —     |

Giriş limiti (20 / dəq / IP) təhlükəsizlik nəzarətidir — testlər onu keçmir, aralarda fasilə verilir.

## 4. Fayllar

| Yol                            | Qoruma                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kurs aktivləri (`/api/assets`) | Tip siyahısı, magic-byte yoxlaması, `Content-Disposition: attachment` (təhlükəli tiplər), `nosniff`, CSP `sandbox` (SEC-01, brauzerdə yoxlandı)              |
| Akademiya göndərişləri         | Sahib / qrup müəllimi / admin icazəsi, `attachment`, `nosniff`, `no-store` və **yeni** CSP `default-src 'none'; style-src 'unsafe-inline'; sandbox` (SEC-10) |
| Antivirus                      | Yoxdur — qərar tələb edir (SEC-13)                                                                                                                           |

## 5. Gizli açarlar

- Repo tarixçəsi (84 commit): şəxsi açar, AWS / GitHub / Slack / OpenAI / Google açarı, parollu baza URL-i tapılmadı;
  `.env` heç vaxt commit olunmayıb; `JWT_*` sətirləri yalnız `.env.example` nümunələridir (production-da rədd olunur).
- E-poçt dərsi (Python Day 7 əsasında) yalnız `os.environ["EMAIL_USER"]` / `os.environ["EMAIL_APP_PASSWORD"]`
  istifadə edir; real parol və ünvan yoxdur.
- Ehtiyat nüsxə skripti parolu əmr sətrinə vermir (`PG*` mühit dəyişənləri), loglarda URL `***` ilə gizlədilir.
- Tövsiyə: CI-da `gitleaks` (SEC-11). Xarici açarların rotasiyası və tarixçənin yenidən yazılması **edilmədi** (V4 qaydası).

## 6. Asılılıqlar (SEC-05)

`pnpm audit` — bütün asılılıqlar: **23 → 16** (kritik 4 → 2, yüksək 5 → 3, orta 10 → 7).
Eyni major daxilində `overrides` (`pnpm-workspace.yaml`): `handlebars@4 ^4.7.10`, `picomatch@4 ^4.0.4`,
`glob@10 ^10.5.0`, `ajv@8 ^8.18.0`. Sonra: `nest build`, API unit 17/17, API e2e 225/225, shared 107/107, web 9/9, lint ✓.

### Production asılılıqlarında qalanlar (5) — bu kodda əlçatmaz

| Paket                                             | Ciddilik | Zəiflik                            | Niyə əlçatmaz                                                  | Həll                 |
| ------------------------------------------------- | -------- | ---------------------------------- | -------------------------------------------------------------- | -------------------- |
| `@nestjs/core` 10.4                               | orta     | SSE axınında `\r\n` inyeksiyası    | API-də `@Sse()` yoxdur (0 istifadə)                            | Nest 11 (major)      |
| `file-type` 20.4 (`@nestjs/common` vasitəsilə) ×2 | orta     | ASF sonsuz dövr; ZIP bombası       | Nest-in `FileTypeValidator` / `ParseFilePipe` istifadə olunmur | Nest 11              |
| `uuid` 10 (`dockerode` vasitəsilə)                | orta     | v3/v5/v6 `buf` sərhəd yoxlaması    | dockerode yalnız `v4()` çağırır; lab-lar defolt söndürülüb     | dockerode yeniləməsi |
| `deepmerge-ts` 7 (`prisma` CLI)                   | yüksək   | Rekursiv obyektlə stack exhaustion | Yalnız CLI-nin öz konfiqurasiyası; istifadəçi girişi yoxdur    | Prisma 7             |

### Yalnız inkişaf / test alətlərində qalanlar (11)

`tinypool` (kritik ×2, vitest 3 → 4 tələb edir), `@vitest/mocker`, `vitest`, `tmp` ×2 (`@nestjs/cli` → inquirer),
`webpack` ×2 (aşağı), `braces` (yamaq yoxdur), `sprintf-js` (yamaq yoxdur), `esbuild` (tsup, dev server).
Production imicinə düşən koda təsir etmir; vitest 4 və Nest CLI 11 yeniləmələri ayrıca iş kimi tövsiyə olunur.

## 7. Qalan risklər (prioritetə görə)

1. **DATA-01 (P1)** — istifadəçini silmək rəsmi qiymətləri və sertifikatları həmişəlik silir. Qərar: sərt silməni
   qadağan edib deaktiv / anonimləşdirmə.
2. **SEC-04b / SEC-08 (P2)** — Python / SQL nəticəsi brauzerdə hesablanır; sertifikat qorunur, XP qorunmur.
3. **SEC-13 (P2)** — antivirus yoxdur (müvəqqəti qorumalar işləyir).
4. **SEC-05 (P2)** — Nest 11 / Prisma 7 / vitest 4 major yeniləmələri.
5. **SEC-11, SEC-12, DATA-02 (P3)** — CI gizli açar skanı, konteynerdə root, token cədvəlinin təmizlənməsi.
