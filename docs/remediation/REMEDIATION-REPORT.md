# Remediation V4 — hesabat

Tarix: 17–18 oktyabr 2026 · Budaq: `claude/clever-dirac-f7c6aa` · Əsas: [AUDIT-2026-10-17.md](../AUDIT-2026-10-17.md)

Əlaqəli sənədlər: [ISSUE-REGISTER](ISSUE-REGISTER.md) · [QA-RESULTS](QA-RESULTS.md) ·
[SECURITY-REVIEW](SECURITY-REVIEW.md) · [UX-REVIEW](UX-REVIEW.md) · [RELEASE-READINESS](RELEASE-READINESS.md)

## Qaydalar (necə işlənildi)

- Tətbiq yenidən yazılmadı, arxitektura dəyişmədi; mövcud tələbə məlumatı silinmədi, real / production bazaya
  toxunulmadı, deploy edilmədi.
- Bütün iş lokal. Commit / push yalnız sahibin açıq göstərişi ilə (iki dəfə: «save» / «push» deyiləndə).
- Real e-poçt / bildiriş göndərilmədi; test məlumatı süni hesablardır (`e2e-*@dacy.local`).
- Biznes qaydasını, rəsmi qiymətləri və ya mövcud tələbə qeydlərini dəyişən hər şey «REQUIRES PRODUCT DECISION»
  kimi saxlanıldı (DATA-01, DATA-03, SEC-04b, SEC-08, SEC-07, SEC-13, ACA-05).
- «İşləyir» deyilən hər şey test və ya brauzer yoxlaması ilə təsdiqləndi; yoxlanılmayan — açıq yazıldı.

## Mərhələlər

| Mərhələ                               | Nə edildi                                                                                                                                                                                                 | Nəticə                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 0–1. Baza xətti, problemlərin təsdiqi | Build, testlər, əvvəlki auditin açıq maddələri təkrar yoxlandı                                                                                                                                            | SEC-04, SEC-06, UX-01, A11Y-04/05/06 açıq idi |
| 2. Təhlükəsizlik                      | SEC-04 sertifikat təsdiqi (API + UI + akademiya), SQL etibar modeli testlə sənədləşdirildi, SEC-06 docker.sock çıxarıldı + CI yoxlaması, SEC-01/02/03 yenidən yoxlandı, git tarixçəsində gizli açar skanı | [SECURITY-REVIEW](SECURITY-REVIEW.md)         |
| 3. Akademiya admin boşluqları         | Proqram redaktəsi, qrup tarixləri (konflikt yoxlaması ilə), yazılış tarixçəsi, işçinin paralel nüsxələrdə təkrarı yoxlandı, akademiya fayllarına CSP, e-poçt dizaynı                                      | ACA-01..05, SEC-10                            |
| 4. UX / əlçatanlıq                    | Mobil «Tapşırıq / Kod» tabları, markdown başlıqları, kilidli addımların kontrastı, dərs ekranının landmark / başlıq sırası, desktop vizual baxış (6 tapıntı düzəldildi)                                   | [UX-REVIEW](UX-REVIEW.md)                     |
| 5. Rol əsaslı testlər                 | `role-access.spec.ts` (qonaq / tələbə / müəllim / admin / çıxış), `cert-review`, `academy-admin`, `workspace-mobile` brauzer testləri; `integrity`, `academy-admin` API testləri                          | TEST-03                                       |
| 6. Asılılıqlar, baza                  | `pnpm audit` 23 → 16, baza bütövlüyü (10 yoxlama), FK silmə qaydalarının təhlili                                                                                                                          | SEC-05, DATA-01..05                           |
| 7. Ehtiyat nüsxə                      | `pnpm db:backup` / `pnpm db:restore`, müvəqqəti bazaya bərpa sınağı                                                                                                                                       | OPS-03                                        |
| 8–9. Reqressiya, sənədlər             | Bütün test dəstləri, production build üzərində tam gəzinti, bu sənədlər                                                                                                                                   | [QA-RESULTS](QA-RESULTS.md)                   |

## Əsas dəyişikliklər (fayllar)

**API**

- `certificates/*`, `progress.service.ts`, `dashboard/*`, `users.controller.ts` — sertifikat `reviewStatus`
  (PENDING / APPROVED), sübut və təsdiq endpoint-ləri; miqrasiya `20261018120000_certificate_review` (additiv).
- `academy/grading/grading.service.ts` — Python ballı avtomatik qaralamalar toplu açıqlanmır.
- `academy/organization/organization.service.ts` — qrup tarixlərinin dəyişməsində konflikt yoxlaması.
- `academy/files/files.controller.ts` — endirmədə CSP `sandbox`.
- `config/env.ts` — `LAB_DRIVER` defoltu `off`, `envSchema` testlər üçün ixrac.
- Testlər: `test/integrity.e2e-spec.ts`, `test/academy-admin.e2e-spec.ts`, bildiriş işçisinin paralel testi,
  `env.spec.ts`.

**Web**

- `admin/sertifikatlar`, `components/admin/cert-review.tsx`, `certificate-card.tsx` — sertifikat təsdiqi.
- `components/academy/admin/*` — proqram redaktəsi, qrup tarixləri, yazılış tarixçəsi; `admin/akademiya` düzümü.
- `components/workspace/split-layout.tsx` — mobil tablar; `instructions-pane.tsx`, `(workspace)/layout.tsx`,
  `code-editor.tsx` — başlıq sırası, `main`, sətir nömrələrinin kontrastı.
- `components/app/markdown.tsx` — başlıqların bir pillə aşağı salınması.
- `globals.css`, `ios.css` — kilidli addımlar, yol səhifəsinin rəqəmləri, sidebar sütunu, `.tint-*` status nişanları,
  tünd tema tokenləri (`--ok-ink`, `--muted`, istiqamət nişanı), `.tbl-wrap { position: relative }`.
- `admin/labs-table.tsx` (hidratasiya), `admin/reviews-table.tsx`, `app/certificate-card.tsx` (nişan kontrastı),
  `admin/users-table.tsx`, `academy/admin/group-people.tsx` (cədvəllər 1280px-də sığır).
- Testlər: `e2e/cert-review`, `academy-admin`, `workspace-mobile`, `role-access`; `screenshots.spec` tablara uyğunlaşdı.

**Repo / əməliyyat**

- `docker-compose.yml` (socket yoxdur), `docker-compose.labs.yml`, `scripts/check-compose.mjs` + CI addımı.
- `scripts/backup.mjs`, `scripts/restore.mjs`, `scripts/backup-lib.mjs`; `pnpm db:backup`, `pnpm db:restore`;
  `.gitignore` → `backups/`.
- `pnpm-workspace.yaml` — 4 yeni `overrides` (yalnız inkişaf alətləri).
- `packages/shared` i18n (az / en).

## E-poçt bildirişləri — dizayn (ACA-05, qurulmayıb)

Real göndəriş xarici SMTP / e-poçt xidməti (və onun hesabı, domen SPF / DKIM) tələb etdiyi üçün qurulmadı.
Dizayn mövcud outbox-a əsaslanır — yeni hadisə mənbəyi lazım deyil.

**Axın:** `AcademyOutboxEvent` → işçi (`academy-worker.service.ts`) → `AcademyNotification` (artıq var) →
**yeni** `AcademyEmailDelivery` (növbə) → göndərici adapter.

| Bildiriş (`type`)                             | Kimə               | E-poçt                                                           | Defolt                 |
| --------------------------------------------- | ------------------ | ---------------------------------------------------------------- | ---------------------- |
| `ENROLLED`                                    | Tələbə             | «Qrupa qəbul olundunuz» + qrupun linki                           | Açıq                   |
| `ASSIGNMENT_PUBLISHED` / `ASSIGNMENT_UPDATED` | Qrupun tələbələri  | Tapşırıq, son tarix (qrupun saat qurşağında)                     | Açıq / gündəlik xülasə |
| `DEADLINE_SOON`                               | Göndərməmiş tələbə | 24 saat qalıb                                                    | Açıq                   |
| `DEADLINE_EXTENDED`                           | Tələbə             | Yeni son tarix                                                   | Açıq                   |
| `GRADE_RELEASED` / `SUBMISSION_RETURNED`      | Tələbə             | «Qiymətiniz açıqlandı» — **balı e-poçtda yazmamaq**, yalnız link | Açıq                   |
| `SUBMISSION_RECEIVED`                         | Müəllim            | Gündəlik xülasə                                                  | Xülasə                 |
| `CLASS_RESCHEDULED` / `CLASS_CANCELLED`       | Qrup               | Dərs vaxtı / ləğv                                                | Açıq                   |

**Prinsiplər:**

- **Təkrarsızlıq:** `AcademyEmailDelivery` üzərində `(userId, dedupeKey)` unikal (bildirişlə eyni açar); işçi
  `FOR UPDATE SKIP LOCKED` ilə götürür — bir neçə API nüsxəsində də bir məktub (ACA-04-də sınanan model).
- **Təkrar cəhd:** eksponensial (1, 5, 30 dəq, 2, 12 saat), 5 cəhddən sonra `FAILED` + admin panelində sayğac.
- **İstifadəçi seçimi:** profil → «Bildirişlər»: hər kateqoriya üçün açıq / xülasə / söndür; hər məktubda bir
  kliklə abunəlikdən çıxma linki (imzalı token).
- **Məxfilik:** məktubda bal, rəy mətni, fayl yoxdur — yalnız başlıq və sayta link; ünvan loglara yazılmır.
- **Konfiqurasiya:** `EMAIL_DRIVER=off|log|smtp` (defolt `off`; `log` — test / lokal, göndərmir), `SMTP_*`
  mühit dəyişənləri, `EMAIL_FROM`. Testlərdə yalnız `log` sürücüsü.
- **Şablonlar:** az / en (istifadəçinin dili), sadə HTML + mətn versiyası, saytın rəngləri.
- **Ölçü:** ilk mərhələdə yalnız `ENROLLED`, `DEADLINE_SOON`, `GRADE_RELEASED`.

**Qərar lazımdır:** e-poçt xidməti (SMTP provayder), göndərən domen, hansı bildirişlərin defolt açıq olacağı.

## Nəticə

Kritik təhlükəsizlik problemləri (SEC-01..04, SEC-06) bağlandı və testlə qorunur; akademiya admin boşluqları
dolduruldu; ehtiyat nüsxə / bərpa aləti var və sınanıb; bütün test dəstləri yaşıldır (bax: QA-RESULTS).
Buraxılışdan əvvəl sahibin qərarı lazım olan əsas məsələ — **DATA-01** (istifadəçini silmək rəsmi qiymətləri silir).
Hazırlıq qiymətləndirməsi: [RELEASE-READINESS](RELEASE-READINESS.md).
