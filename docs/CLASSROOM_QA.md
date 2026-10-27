# Sinif və etibarlılıq — yoxlama nəticələri

26 oktyabr 2026. Node.js 24, pnpm 10.28, PostgreSQL 17 və Chromium; `codex/sql-python-pilot` yerli budağı. Aşağıdakılar faktiki yerli yoxlamalardır.

## Avtomatik yoxlamalar

| Yoxlama                        | Nəticə                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                           | **137 keçdi**: shared 111, API 17, web 9.                                                                                                         |
| Bütün API inteqrasiya testləri | **27 suite, 250 test keçdi**, ayrıca `dacy_test` bazasında. Son təhlükəsizlik dəyişikliklərindən sonra 13 etibarlılıq testi ayrıca yenidən keçdi. |
| Seçilmiş brauzer ssenariləri   | **35 keçdi**, production yığımı üzərində Chromium-da.                                                                                             |
| Native Python kurs uyğunluğu   | **117 həll, 0 xəta**; paketdəki həll və server assert-ləri real sandbox-da işlədilib.                                                             |
| Lint və Typecheck              | Üç paketdə keçdi; lint xəbərdarlığı yoxdur.                                                                                                       |
| Production build               | shared, NestJS API və Next.js uğurla yığıldı.                                                                                                     |
| Sandbox doctor                 | Node, baza, izolə SQL və pandas/Python yoxlaması keçdi.                                                                                           |
| İstehsal asılılıq auditi       | **0 kritik, 0 yüksək, 0 orta, 0 aşağı**.                                                                                                          |
| Oxuma yükü                     | **200/200 HTTP 200**, 20 paralel sorğu; p50 **184 ms**, p95 **365 ms**, maksimum **433 ms**, ümumi **2071 ms**.                                   |
| Avtomatik restart              | API SIGKILL ilə dayandırıldı; supervisor yeni PID açdı, sağlamlıq **1538 ms** ərzində bərpa olundu.                                               |
| Monitor xəbərdarlığı           | Planlı sınaq zamanı 3 uğursuz yoxlamadan sonra `service_unhealthy`, servislər açılanda `service_recovered` yazıldı.                               |

Brauzer faylları: `classroom.spec.ts`, `runtime-reliability.spec.ts`, `reliability.spec.ts`, `academy-join.spec.ts`, `academy-admin.spec.ts`, `role-access.spec.ts`, `cert-review.spec.ts`, `academy.spec.ts`. Bütün tarixi terminal/CTF brauzer ssenarilərinin işlədildiyi iddia edilmir; bu profil SQL/Python-dur.

Əhatə olunan əsas hallar:

- Qrup kodu ilə qeydiyyat, yanlış kodda hesabın yaranmaması, mövcud qrup/müəllim/tələbə axını.
- Material, mövzu, elan, qorunan fayl, məşq seçimi, şəxsi sual/cavab, müəllim masası, qiymət və rəy.
- Desktop açıq/tünd mövzu və sonda mobil daşma yoxlaması; səhifə runtime xətası yoxdur.
- Etibarsız cookie-də yönləndirmə dövrəsinin olmaması; iki tabın eyni sessiyanı və ingilis dilini saxlaması.
- Yenilənmiş materialı açan forma, səhifə yenilənməsindən sonra müəllim qaralaması, köhnəlmiş qaralama üçün seçim, versiyalı yadda saxlama.
- Versiya tarixçəsindən bərpa; əvəz olunmuş mətnin tarixçədə qalması və ekranda yeni versiyanın görünməsi.
- Şifrə bərpa forması, şəxsi yerli məktub linki, köhnə sessiyanın bağlanması; admin blok/blok açma ilə qrup qeydlərinin qalması.
- SQL yüklənərkən client keçidində worker-in bağlanması; aktual kodun göndərilməsi, səhvdən sonra bərpa və ayrı dərs sessiyaları.
- Python-da stdin/stdout, stop, təkrar işlətmə, sərt vaxt limiti, pandas və Matplotlib-in brauzerdə real şəkil renderi.
- Serverdə SQL nəticəsi, saxta hash-in rəddi, yanlış həldə mövcud dərc olunmuş məzmunun qorunması və ağır SQL zamanı API cavabı.
- Serverdə Python qiymətləndirməsi: saxta `passed`, stdout ilə verdict saxtalaşdırması, test/builtin dəyişdirmə cəhdləri keçmir; host tətbiq faylları əlçatmazdır.
- 117 native Python həllində funksiyalar, yerli modul, məlumat tipləri, pandas, Excel, sqlite3, qrafiklər və elmi kitabxanalar saxlanılıb.

## Ehtiyat nüsxədən bərpa

Yoxlanmış nüsxə: `backups/dacy-20261026-070932/`.

- SHA-256 yoxlamaları keçdi.
- İşlək bazaya toxunmadan ayrıca **`dacy_restore_final_20261026`** bazasına bərpa edildi.
- **67 cədvəl, 1292 sətir**, son miqrasiya **`20261026060000_pilot_reliability`** manifestlə eynidir.
- Fayl arxivi `.local/restore-final-20261026/storage` qovluğuna açıldı; **40 fayl**.
- Əvvəlki `backups/dacy-20261025-230807/` nüsxəsi və əvvəlki yoxlama bərpası saxlanılıb. Hər nüsxə alındığı anın vəziyyətini əks etdirir; sonrakı sintetik QA qeydləri əvvəlki manifesti dəyişmir.

Gündəlik yerli backup monitorla avtomatik işlədi və `ops:backup` ayrıca yoxlandı. `test:operations` iki paralel backup əmrindən yalnız birinin nüsxə yaratdığını, kilidin açıldığını və 22 saniyə sonra monitorun yeni backup statusunu qoruduğunu təsdiqlədi. SMTP/xarici rclone hesabı verilmədiyindən real xarici poçt və serverdən kənar nüsxə ötürməsi yoxlanmış/aktiv kimi göstərilmir.

## Vizual baxış

Əvvəlki ekran şəkilləri saxlanılıb. Yeni ekranlar ayrıca `docs/screenshots/remediation/` qovluğundadır. 1440 px desktop-da yeni 5 görünüş üçün üfüqi daşma **0 px**, səhifə JS xətası **0** qeydə alındı. Tarixçə nümunəsi açıq şəkildə sintetik QA materialıdır. Son tanıtım düzəlişindən sonra AZ/EN dillərində giriş, bərpa və tanıtım səhifələrinin aktual SQL/Python mətnləri də brauzerdə yoxlanıb; daşma və JS xətası yoxdur.

- [Sistem vəziyyəti](screenshots/remediation/system-light.png)
- [Tünd mövzu](screenshots/remediation/system-dark.png)
- [Material tarixçəsi](screenshots/remediation/material-history.png)
- [Hesabın təhlükəsizliyi](screenshots/remediation/account-controls.png)
- [Şifrə bərpası](screenshots/remediation/password-recovery.png)
- Əvvəlki nümunələr: [Sinif](screenshots/classroom/student-stream.png), [materiallar](screenshots/classroom/student-materials.png), [dərs](screenshots/classroom/student-lesson.png), [müəllim masası](screenshots/classroom/teacher-desk.png).

## Təkrar işlətmək

API e2e testləri yalnız ayrıca `DATABASE_URL_TEST` bazasında işləyir. Brauzer sınaqları sintetik istifadəçi/qrup/məzmun yaradır; özəl sınaq mühitində icra edin. `.env` və hesab şifrələri Git-ə daxil edilmir.

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @dacy/api test:e2e
corepack pnpm build
corepack pnpm run doctor
corepack pnpm pilot:start
E2E_SCREENSHOT_DIR=.local/qa/screenshots corepack pnpm --filter @dacy/web exec playwright test classroom.spec.ts runtime-reliability.spec.ts reliability.spec.ts academy-join.spec.ts academy-admin.spec.ts role-access.spec.ts cert-review.spec.ts academy.spec.ts
corepack pnpm --filter @dacy/api check:python:native
corepack pnpm test:load
corepack pnpm test:operations
corepack pnpm audit --prod
```

Hazır Chromium üçün `PLAYWRIGHT_CHROMIUM_PATH=/tam/yol/chromium` verilir. Screenshot-ların ayrıca qovluğu əvvəlki vizual arxivi saxlayır. Müvafiq nəticə logları və diaqnostika `.local/qa/` daxilindədir.

Cari mühitin giriş hesabları `.local/PILOT_ACCESS.md` faylındadır; Git-ə daxil deyil. `PILOT-01` qrupu kurs sahibinin ilkin sınağı üçün saxlanılıb. GitHub workflow-u yenilənib, amma push edilmədiyindən uzaqda işə düşdüyü iddia edilmir.
