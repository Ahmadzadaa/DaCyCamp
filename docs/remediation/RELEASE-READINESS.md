# Buraxılışa hazırlıq — Remediation V4

Tarix: 18 oktyabr 2026 · Budaq: `claude/clever-dirac-f7c6aa`

## Yekun qərar

**ŞƏRTLİ (CONDITIONAL):** pilot / staging mühitinə hazırdır. Production-a çıxmazdan əvvəl:

1. **DATA-01 üzrə qərar** — istifadəçini silmək rəsmi qiymətləri və sertifikatları həmişəlik silir. Qərar verilənə
   qədər əməliyyat qaydası: akademiya qeydi və ya sertifikatı olan hesabı silməyin (rolu dəyişin / bloklayın).
2. **Production siyahısı** (aşağıda) — açarlar, HTTPS, baza parolu, ehtiyat nüsxə cron-u.
3. Qərar tələb edən digər maddələr (SEC-04b, SEC-08, SEC-13, DATA-03, ACA-05) buraxılışı bloklamır, amma sahibin
   razılığı ilə qəbul edilməlidir.

## Keyfiyyət qapıları

| #   | Qapı                                               | Nəticə          | Sübut / qeyd                                                                                                                                    |
| --- | -------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Build (shared, api, web — production)              | **PASS**        | `tsup`, `nest build`, `next build` xətasız                                                                                                      |
| 2   | Lint + typecheck                                   | **PASS**        | `pnpm lint`, `tsc --noEmit` (web, api)                                                                                                          |
| 3   | Unit testlər                                       | **PASS**        | API 17/17, shared 107/107 (az / en paritet daxil), web 9/9                                                                                      |
| 4   | API inteqrasiya (e2e)                              | **PASS**        | 25 dəst / 225 test (ayrıca `dacy_test` bazasında)                                                                                               |
| 5   | Brauzer e2e (Playwright, 21 spec)                  | **PASS**        | 85 / 85 (ilk qaçışda 2 köhnə test V4 davranışına uyğunlaşdırıldı — TEST-04)                                                                     |
| 6   | Production build üzərində tam gəzinti              | **PASS**        | 225 səhifə, 5 rol: gözlənilməyən HTTP xətası 0, JS xətası 0 (BUG-01 düzəldildi), qırıq şəkil 0, axe 0 (A11Y-12 düzəldildi), `h1` hər səhifədə 1 |
| 7   | Kritik təhlükəsizlik (SEC-01..04, SEC-06)          | **PASS**        | Testlərlə qorunur; SEC-03 canlı şəbəkə yoxlaması — BLOCKED (Docker yoxdur), statik CI yoxlaması PASS                                            |
| 8   | Giriş nəzarəti (rol matrisi)                       | **PASS**        | `role-access.spec.ts` 5/5 + API e2e                                                                                                             |
| 9   | Qiymətləndirmənin etibarlılığı                     | **CONDITIONAL** | Sertifikat və akademiya toplu açıqlaması qorunur; Python XP / irəliləyiş brauzerə etibar edir (SEC-04b)                                         |
| 10  | Rəsmi qeydlərin qəza ilə silinməyə qarşı qorunması | **FAIL**        | DATA-01 — qərar tələb edir (düzəliş kiçikdir, biznes qaydasıdır)                                                                                |
| 11  | Baza bütövlüyü                                     | **PASS**        | Miqrasiya fərqi yoxdur; 10 SQL yoxlaması təmiz                                                                                                  |
| 12  | Ehtiyat nüsxə / bərpa                              | **PASS**        | `pnpm db:backup` / `db:restore`; müvəqqəti bazaya bərpa, paralel yazı zamanı ardıcıllıq, mənfi hallar                                           |
| 13  | Asılılıqların zəiflikləri                          | **CONDITIONAL** | Production-da 5 (hamısı əlçatmaz, major yeniləmə lazımdır); dev alətlərində 11                                                                  |
| 14  | Gizli açarlar                                      | **PASS**        | Tarixçə skanı təmiz; `.env` izlənmir; CI skanı yoxdur (SEC-11, tövsiyə)                                                                         |
| 15  | Əlçatanlıq (desktop, WCAG 2.1 AA)                  | **PASS**        | Tam gəzinti axe 0; dərs ekranları best-practice daxil 0; tünd temada 17 əsas səhifə 0 (A11Y-13)                                                 |
| 16  | Desktop UX (1280 / 1440)                           | **PASS**        | 6 tapıntı düzəldildi; UI-06 (P3) açıq                                                                                                           |
| 17  | Mobil UX                                           | **NOT TESTED**  | Sahibin göstərişi ilə təxirə salındı; yalnız UX-01 (mobil dərs tabları) — PASS                                                                  |
| 18  | Deploy konfiqurasiyası (Docker)                    | **CONDITIONAL** | Statik yoxlamalar PASS; konteynerlərin canlı qaldırılması bu mühitdə mümkün deyil; API konteyneri root (SEC-12); seed hər başlanğıcda (DATA-04) |
| 19  | E-poçt bildirişləri                                | **NOT TESTED**  | Qurulmayıb — dizayn hazırdır (ACA-05), xidmət qərarı lazımdır                                                                                   |
| 20  | Terminal lab-ları                                  | **BLOCKED**     | Defolt söndürülüb (SEC-06); Docker bu mühitdə yoxdur                                                                                            |

## Production-a çıxış siyahısı

**Açarlar və konfiqurasiya**

- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CTF_PEPPER` — hər biri `openssl rand -hex 32`, fərqli.
      (`NODE_ENV=production`-da nümunə / qısa açarla API açılmır.)
- [ ] `COOKIE_SECURE=true`, `WEB_ORIGIN` / `NEXT_PUBLIC_APP_URL` — real domen.
- [ ] `docker-compose.yml`-də `POSTGRES_PASSWORD` və `DATABASE_URL` — `dacy/dacy` əvəzinə güclü parol.
- [ ] `LAB_DRIVER=off` (defolt) — terminal addımı olan kursları dərcdən çıxarın (hazırda yalnız «NÜMUNƏ»).
- [ ] Seed admin: ilk girişdən sonra parolu dəyişin, `SEED_*` dəyərlərini silin.

**Şəbəkə**

- [ ] Reverse proxy (Caddy / Nginx) ilə HTTPS; yalnız 80 / 443 açıq; PostgreSQL yalnız `127.0.0.1` (compose belədir).
- [ ] API-ni birbaşa internetə açmayın — web `/api/*`-ni proxy edir.

**Məlumat**

- [ ] `pnpm db:deploy` (yalnız `migrate deploy`).
- [ ] Gündəlik `pnpm db:backup -- --out /mnt/backup` (cron) + serverdən kənara şifrələnmiş köçürmə.
- [ ] İlk həftə ərzində ayrıca bazaya yoxlama bərpası: `pnpm db:restore -- <qovluq> --target-url … --create-db`.
- [ ] DATA-01 qərarına qədər: akademiya qeydi olan istifadəçini silməyin.

**İzləmə**

- [ ] `GET /api/health` (baza yoxdursa 503) — uptime yoxlaması.
- [ ] Bir neçə API nüsxəsi: təkrar bildiriş olmur (ACA-04), amma bir nüsxədən başqa hamısında
      `ACADEMY_WORKER_INTERVAL_SEC=0` tövsiyə olunur (yük azalır).
- [ ] Admin panelində «Sertifikat təsdiqi» sayğacına mütəmadi baxılması (Python kursları).

## Deploy addımları (kiçik VPS, Docker Compose)

```bash
git clone … && cd DaCyCamp
cp .env.example .env              # açarları və SEED_* dəyərlərini doldurun (yuxarıdakı siyahı)
docker compose --profile full up -d --build
docker compose logs -f api        # «migrate deploy» + seed + «API listening»
curl -fsS https://<domen>/api/health
pnpm db:backup                    # ilk nüsxə (host-da pnpm yoxdursa: konteyner daxilində və ya pg_dump)
```

Yeniləmə: `git pull && docker compose --profile full up -d --build` (miqrasiyalar avtomatik `migrate deploy` ilə).
Geri qaytarma: əvvəlki commit + `pnpm db:restore` (yalnız miqrasiya geri uyğun deyilsə).

## Sahibin qərarı lazım olan maddələr

| ID      | Sual                                            | Tövsiyə                                                                       |
| ------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| DATA-01 | Rəsmi qeydi olan istifadəçini silmək olarmı?    | Sərt silməni qadağan edin; «deaktiv et» + istəyə görə anonimləşdirmə          |
| DATA-03 | 14 köhnə Python sertifikatı                     | Olduğu kimi saxlamaq (tələbələrin əlindədir) və ya PENDING-ə keçirib yoxlamaq |
| SEC-04b | Python-u serverdə icra etmək                    | Rəsmi qiymət üçün Python istifadə olunacaqsa — bəli (sandbox, ayrıca server)  |
| SEC-08  | SQL-i serverdə icra etmək                       | Eyni                                                                          |
| SEC-07  | Səhv SQL cavabında ipucu (sütunlar, sətir sayı) | Pedaqoji seçim                                                                |
| SEC-13  | Yüklənən fayllarda antivirus                    | Akademiya göndərişləri artdıqca — ClamAV kimi xidmət                          |
| ACA-05  | E-poçt bildirişləri                             | Provayder və domen seçimi; ilk mərhələ: qəbul, son tarix, qiymət              |
