# UI / UX və əlçatanlıq baxışı — Remediation V4

Tarix: 18 oktyabr 2026 · Production build (`next build` + `next start`) üzərində.
Sahibin göstərişi ilə bu mərhələdə **desktop** əsas götürüldü; mobil yoxlama (UX-01-dən başqa) təxirə salındı (MOB-01).

## 1. Mobil dərs ekranı — «Tapşırıq / Kod» tabları (UX-01)

**Problem:** ≤900px-də təlimat və redaktor üst-üstə yığılırdı; tapşırıq mətni ekranın ~¼-i boyda zolaqda qalır,
siyahı kəsilirdi.

**Həll** (`components/workspace/split-layout.tsx`):

- ≤900px-də iki tab: «Tapşırıq» və addıma uyğun ikinci tab — **Kod** (SQL / Python), **Terminal**, **Flag** (CTF).
- WAI-ARIA tabs: `role="tablist" / "tab" / "tabpanel"`, `aria-selected`, `aria-controls`, roving `tabIndex`, ← / →.
- Hər iki panel montajda qalır (yalnız `hidden`): yazılmış kod, Monaco vəziyyəti, Python mühiti və konsol nəticəsi
  tab dəyişəndə itmir. Geniş ekranda əvvəlki sürüşdürülən iki panel.

**Yoxlama:**

| En          | Tablar    | Redaktor eni | Kod tab dəyişəndə qalır | Klaviatura | Üfüqi sürüşmə |
| ----------- | --------- | ------------ | ----------------------- | ---------- | ------------- |
| 320         | ✓         | 320          | ✓                       | ✓          | 0             |
| 375         | ✓         | 375          | ✓                       | ✓          | 0             |
| 390         | ✓         | 390          | ✓                       | ✓          | 0             |
| 768         | ✓         | 768          | ✓                       | ✓          | 0             |
| 1024 / 1440 | iki panel | —            | —                       | —          | 0             |

Python (320px): `print(...)` → «İşə sal» → nəticə konsolda; «Tapşırıq» → «Kod» → nəticə yerindədir.
Avtomatik test: `e2e/workspace-mobile.spec.ts` (4 test).
Terminal tabı: xterm gizli paneldə montaj olunur, `ResizeObserver` görünəndə ölçünü yeniləyir (kodla yoxlandı;
mobil brauzer sınağı MOB-01 ilə birlikdə təxirə salındı). Skrinşotlar: `docs/screenshots/ux01-task.mobile.png`,
`ux01-run-320.mobile.png`, `workspace-sql-code.mobile.png`.

## 2. Əlçatanlıq

| ID      | Problem                                                                            | Həll                                                                                                                                                                                                                                           | Yoxlama                                                                        |
| ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A11Y-04 | Dərs mətnindəki `#` səhifədə ikinci `h1` yaradırdı                                 | Markdown başlıqları bir pillə aşağı (`#` → h2 … `######` → h6), `.md-hN` sinfi ilə əvvəlki ölçülər (nəzəri: 21.6 / 18.4px — dəyişməyib)                                                                                                        | 6 dərs növündə `h1` = 1                                                        |
| A11Y-05 | Kilidli addımların mətni 2.5–3.3:1 (bütün kart `opacity`)                          | Şəffaflıq yox: kəsik çərçivə + `--muted` rəng; kilid nişanı / «Kilidli» nişanı vəziyyəti göstərir. Əvvəlki «WCAG istisnası» qərarı ləğv edildi — bu sətirlər qeyri-aktiv düymə deyil, «əvvəlki addımdan sonra açılır» kimi oxunmalı məlumatdır | axe 0: `/kurs/…`, `/yol/…`, `/tecrube`, `/layiheler`                           |
| A11Y-06 | Kataloqda «Səviyyə» menyusunda ↓ bəzən fokusu köçürmür                             | Dəyişiklik yoxdur. Kök səbəb: Radix fokusu `setTimeout(0)` ilə köçürür; Playwright düymələri 0 ms aralıqla göndərəndə və səhifə yüklənərkən Enter fokusdan əvvəl işlənir                                                                       | 0 ms: 5/10, 30 ms: 10/10, 80 ms: 10/10 → real istifadəçidə təkrarlanmır        |
| A11Y-11 | Dərs ekranı: h1 → h4 keçidi, `main` landmark yox, redaktorda sətir nömrələri 2.7:1 | «Tapşırıq» / «Fayllar» → h2 (görünüş eyni), iş sahəsi `<main>`, sətir nömrələri `#8E8E93` (5.6:1; aktiv `#D1D1D6`) — xəta mesajları sətir nömrəsinə istinad edir                                                                               | axe (WCAG 2.1 AA + best-practice) 0 — nəzəri, test, SQL, Python, CTF, terminal |

## 3. Desktop vizual baxış (1280 / 1440)

Baxılan ekranlar: qonaq — giriş səhifəsi, kataloq, giriş; tələbə — panel, kurs, yol, sertifikatlar, profil,
liderlər, «Təcrübə»; admin — ümumi baxış, kurslar, istifadəçilər, sertifikat təsdiqi, akademiya, qrup səhifəsi;
müəllim paneli.

| ID    | Tapıntı                                                                                         | Həll                                                                                                                                                    | Status        |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| UI-01 | Yol səhifəsində rəqəmlər (1 kurs · 1 layihə · ~2 saat · 0%) ağ üzərində ağ — görünmürdü         | `.lp-facts` iOS temasında `--ink` / `--muted`. Bütün 225 səhifədə «açıq fonda açıq mətn» skanı: başqa hal yoxdur (axe qradiyent fonda bunu tuta bilmir) | Düzəldildi    |
| UI-02 | Uzun səhifələrdə sidebar sütununun altında qara zolaq (köhnə navy qradiyent)                    | iOS-da sidebar rəngi (≥901px). Real sürüşdürmədə görünmürdü (sidebar sticky) — yalnız tam səhifə skrinşotunda                                           | Düzəldildi    |
| UI-03 | Admin → Akademiya: 1280–1600px-də 7 sütunlu qrup cədvəli 420px-lik yan sütunla yanaşı kəsilirdi | Yan sütun yalnız ≥1680px; aşağıda formalar 2–3 sütunda                                                                                                  | Düzəldildi    |
| UI-04 | 1280px-də istifadəçilər (23px) və qrup yazılışları (54px) cədvəli üfüqi sürüşürdü               | E-poçt sətrə keçir; yazılış tarixçəsi düyməsi nişan + `aria-label`                                                                                      | Düzəldildi    |
| UI-05 | «Sertifikat avtomatik verilir» mətni SEC-04-dən sonra yanlış idi                                | Giriş səhifəsi, FAQ, boş vəziyyət (az / en)                                                                                                             | Düzəldildi    |
| UI-06 | Sağ alt küncdəki kömək düyməsi sürüşdürərkən cədvəl sətrinin «⋯» düyməsini qısa müddət örtür    | Tövsiyə                                                                                                                                                 | Açıq (P3)     |
| —     | Admin cədvəllərində uzun test e-poçtları sətrə keçir                                            | Lokal test məlumatıdır (e2e hesabları)                                                                                                                  | Problem deyil |
| —     | Liderlər cədvəlində «Sizin yeriniz» zolağı cədvəlin ortasında                                   | Sticky zolaq — yalnız tam səhifə skrinşotunda                                                                                                           | Problem deyil |

Admin cədvəllərində üfüqi sürüşmə skanı (bütün admin səhifələri, 1280 və 1440): düzəlişdən sonra 0.

## 4. Tam gəzinti və tünd tema tapıntıları

| ID      | Tapıntı                                                                                                                                                | Həll                                                                                                   | Status     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------- |
| A11Y-12 | Status nişanları rəngli fonda eyni rəngdə — sertifikatın «Etibarlıdır» nişanı 1.92:1, lab sessiyalarında RUNNING 3.07:1, layihə yoxlamasında 1.8–3.1:1 | `.tint-ok / .tint-da / .tint-de` (mətn `--ink` ilə qarışır)                                            | Düzəldildi |
| A11Y-13 | Tünd tema: uğur mətni ~2:1, istiqamət nişanı 1.59:1, boz nişanlarda `--muted` 4.45:1                                                                   | iOS tünd blokunda `--ok-ink`, `--muted`; nişan `white` ilə qarışır. Tünd temada 17 əsas səhifədə axe 0 | Düzəldildi |
| BUG-01  | `/admin/lablar` arabir hidratasiya xətası (#418)                                                                                                       | Qalan vaxt montajdan sonra hesablanır                                                                  | Düzəldildi |
| UI-07   | **V4 reqressiyası:** qrup səhifəsi mobil endə 57px sürüşürdü (yeni `.sr-only` cədvəl başlığı)                                                          | `.tbl-wrap { position: relative }`                                                                     | Düzəldildi |

Tam gəzintidə «adsız düymə» kimi görünən 6 keçid (`role="switch"`) və 2 «etiketsiz» checkbox əvvəlki raundla eynidir —
Radix-in gizli `aria-hidden` input-u və etiketi kənarda olan switch; axe `button-name` / `label` pozuntusu vermir
(yoxlayıcı skriptin yanlış pozitivi).

## 5. Mətn

- Python addımlı kurslar üçün sertifikat qaydası istifadəçiyə açıq yazılıb: sertifikatlar səhifəsi, admin təsdiq
  səhifəsi, giriş səhifəsi, FAQ.
- Yeni açarlar az / en paritetində (`packages/shared` i18n testləri 107/107).

## 6. Təxirə salınanlar

- **MOB-01** — 320 / 390 / 768px-də bütün saytın ətraflı yoxlanması. Tam gəzinti (avtomatik daşma ölçüsü) mobil endə
  yalnız admin panelinin qrafikində 320px-də 2px daşma göstərdi (məlumatdan asılı); qrup səhifəsindəki V4 reqressiyası
  (UI-07) düzəldildi.
- Profil → «Görünüş» seçimindəki tema önizləmələri köhnə (navy sidebar) dizaynı göstərir — kosmetik.
