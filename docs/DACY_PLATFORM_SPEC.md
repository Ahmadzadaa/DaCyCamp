# DaCy Academy — Onlayn Təlim Platforması (Spesifikasiya)

> Bu fayl Claude Code üçündür. İşə başlamazdan əvvəl tam oxu və hər mərhələnin sonunda dayanıb nəticəni göstər.

---

## 0. ƏN VACİB QAYDA: Kontent yaratma

Sən **yalnız platformanın mühərrikini** qurursan. Kursların, dərslərin, lab-ların və tapşırıqların məzmununu **müəllim (admin) özü yükləyəcək**.

- Öz başına kurs, dərs, tapşırıq, sual, lab və ya tədris planı **YAZMA**.
- Kontenti kodun içinə **hardcode ETMƏ**. Hər şey verilənlər bazasından gəlməlidir.
- Test və demo üçün yalnız **bir nümunə kurs** yarat (`seed`). Adı `NÜMUNƏ — silinə bilər` olsun və hər tapşırıq tipindən bir dənə olsun. Məqsəd yalnız formatı göstərməkdir.
- Tədris ardıcıllığını müəllim təyin edir. Platforma tələbəni **müəllimin qoyduğu sıra ilə** aparmalıdır.

---

## 1. Kontekst

- **Layihə sıfırdan, boş qovluqda qurulur.** Qovluqda yalnız bu spesifikasiya və dizayn faylı var.
- Stack: Next.js 15 (App Router), NestJS 10, Prisma + PostgreSQL, Docker Compose, TypeScript
- Struktur: monorepo (pnpm workspaces) — `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (ortaq tiplər)
- Portlar: web `3000`, API `4000`, DB `5432`. Kompüterdə başqa layihə `3100` və `5433` portlarını istifadə edir — onları tutma.
- Bütün sistem bir əmrlə işə düşməlidir (`docker compose up` və ya `pnpm dev`), `.env.example` faylı və `README.md` (quraşdırma addımları ilə) olmalıdır.
- **İlk iş:** heç nə yazmadan əvvəl qovluq strukturu, verilənlər bazası sxemi və Mərhələ 1 üçün plan təqdim et.

Platforma DataCamp / TryHackMe modelindədir: tələbə qeydiyyatdan keçir, kurs seçir, ardıcıl dərsləri və tapşırıqları həll edir, sertifikat alır.

Üç müstəqil istiqamət var (bunlar da bazada saxlanılır, hardcode deyil):
- Data Analytics
- Data Engineering
- Cyber Security

---

## 2. Kontent strukturu

```
Track (istiqamət)
 └── Course (kurs)
      └── Module (fəsil)
           └── Step (addım) — sıralı
                ├── theory      — nəzəri hissə (Markdown + şəkil/video)
                ├── quiz        — test sualları
                ├── sql         — SQL tapşırığı
                ├── python      — Python tapşırığı
                ├── terminal    — terminal lab (Docker konteyner)
                └── ctf         — CTF otağı (sual + flag)
```

Hər səviyyədə `order` (sıra nömrəsi) və `isPublished` (dərc olunub/qaralama) sahəsi olmalıdır.

---

## 3. Müəllim kontenti necə yükləyir

İki yol olmalıdır. Hər ikisi eyni bazaya yazır.

### 3.1 Admin redaktoru (veb interfeys)

`/admin` bölməsi (yalnız `ADMIN` / `INSTRUCTOR` rolu):

- Track, Course, Module və Step yarat / redaktə et / sil
- Drag-and-drop ilə sıranı dəyiş
- Theory üçün Markdown redaktoru + canlı önizləmə
- Şəkil, PDF, dataset (CSV, SQLite) faylı yüklə
- Video üçün YouTube/Vimeo linki və ya fayl
- Hər step üçün tipinə uyğun forma (aşağıdakı 4-cü bölmə)
- "Tələbə kimi bax" (preview) düyməsi
- Qaralama / dərc et

### 3.2 Kurs paketi idxalı (toplu yükləmə)

Müəllim bütöv kursu ZIP qovluq kimi yükləyə bilməlidir:

```
sql-ile-analiz/
├── course.yaml
├── datasets/
│   └── sales.csv
└── modules/
    ├── 01-giris/
    │   ├── module.yaml
    │   ├── 01-nezeri.md
    │   ├── 02-test.yaml
    │   └── 03-select.yaml
    └── 02-qruplasdirma/
        ├── module.yaml
        └── ...
```

`course.yaml` nümunəsi:

```yaml
track: data-analytics
title: SQL ilə data analizi
slug: sql-ile-analiz
level: beginner          # beginner | intermediate | advanced
description: ...
cover: cover.png
```

Tələblər:
- Fayl adındakı rəqəm sıranı təyin edir (`01-`, `02-`).
- İdxaldan əvvəl **validasiya**: səhv varsa heç nə yazılmır, hansı faylda hansı səhv olduğu göstərilir.
- Eyni `slug` ilə yenidən yükləmə kursu yeniləyir (tələbələrin irəliləyişi silinmir).
- Kursu eyni formatda geri **ixrac** etmək mümkün olsun.

---

## 4. Step tipləri və onların sxemi

### theory
```yaml
type: theory
title: SELECT nədir?
content_file: 01-nezeri.md   # və ya inline content
video_url: (istəyə bağlı)
```
Tələbə "Oxudum, davam et" düyməsi ilə tamamlayır.

### quiz
```yaml
type: quiz
title: Yoxlama testi
pass_score: 70
questions:
  - text: ...
    type: single         # single | multiple
    options: [A, B, C, D]
    correct: [1]
    explanation: ...
```

### sql
```yaml
type: sql
title: Ən çox satış edən şəhərlər
instructions: |
  Markdown təlimat...
dataset: datasets/sales.csv     # və ya .sqlite / .sql
starter_code: "SELECT "
solution: "SELECT city, SUM(amount) ..."
check: result_match             # result_match | result_match_unordered
hints: ["...", "..."]
xp: 50
```
- Brauzerdə **DuckDB-WASM** ilə işləyir (server xərci yoxdur).
- Yoxlama: tələbənin nəticəsi `solution`-un nəticəsi ilə müqayisə olunur.

### python
```yaml
type: python
title: ...
instructions: |
  ...
starter_code: |
  import pandas as pd
dataset: datasets/sales.csv
solution: |
  ...
tests: |
  assert 'df' in globals()
  assert df.shape[0] == 100
hints: [...]
xp: 50
```
- Brauzerdə **Pyodide** ilə işləyir (pandas, numpy, matplotlib).
- `tests` tələbə kodundan sonra işə düşür; bütün assert-lər keçərsə tapşırıq həll olunub.

### terminal (Data Engineering lab)
```yaml
type: terminal
title: İlk ETL pipeline
instructions: |
  ...
docker_image: dacy/de-lab-postgres:latest
time_limit_minutes: 60
check_script: checks/etl_check.sh   # konteynerin içində işləyir, exit 0 = keçdi
xp: 100
```
- Hər tələbəyə müvəqqəti, izolə konteyner; brauzerdə terminal (xterm.js).
- Vaxt bitəndə və ya tamamlananda konteyner silinir.
- **Bu tip Mərhələ 3-də qurulur**, əvvəlcə sxemi və UI-ı hazırla.

### ctf (Cyber Security otağı)
```yaml
type: ctf
title: Şübhəli girişləri tap
instructions: |
  ...
attachments: [logs/auth.log]    # yüklənəcək fayllar
docker_image: (istəyə bağlı, Mərhələ 3)
tasks:
  - question: Neçə uğursuz giriş cəhdi var?
    answer: "147"
    hint: ...
  - question: Hücum hansı IP-dən gəlib?
    answer: "DACY{...}"
xp: 150
```
- Cavablar bazada **hash** şəklində saxlanılır, frontend-ə heç vaxt göndərilmir.
- Yoxlama yalnız backend-də.
- Rate limit: dəqiqədə maksimum 10 cəhd.

---

## 5. Tələbə axını

1. Qeydiyyat / giriş (e-poçt + şifrə; Google OAuth sonradan)
2. Kurs kataloqu: istiqamət, səviyyə üzrə filtr
3. Kursa yazılma (enrollment)
4. Kurs səhifəsi: modullar və addımlar, irəliləyiş
5. Addım ekranı:
   - theory: məzmun + "Davam et"
   - sql / python: solda təlimat, sağda redaktor, altda nəticə; "İşə sal" və "Göndər"
   - quiz, ctf: suallar və cavab sahələri
6. Şəxsi panel: kurslar üzrə faiz, XP, ardıcıl günlər, "Davam et" düyməsi
7. Kurs bitəndə sertifikat (unikal ID, QR kod, ictimai yoxlama səhifəsi)

### Ardıcıllıq qaydası
- Addımlar **müəllimin qoyduğu sıra** ilə açılır: əvvəlki tamamlanmadan növbəti kilidlidir.
- Kurs səviyyəsində ayar: `sequential: true | false` (müəllim istəsə sərbəst rejim açır).

---

## 6. Verilənlər bazası (Prisma modelləri — təxmini)

`User` (rol: STUDENT / INSTRUCTOR / ADMIN), `Track`, `Course`, `Module`, `Step` (tip + JSON config), `Asset` (yüklənmiş fayllar), `Enrollment`, `StepProgress` (status, cəhd sayı, tarix), `Submission` (tələbə cavabı/kodu, nəticə), `Certificate`, `XpEvent`.

Sxemi yazmazdan əvvəl mənə göstər və təsdiq al.

---

## 7. Mərhələlər

Hər mərhələnin sonunda dayan, nə etdiyini xülasə et və təsdiq gözlə.

**Mərhələ 1 — Əsas**
- Monorepo qurulması, Docker Compose (PostgreSQL), `.env.example`, README
- Prisma sxemi (6-cı bölmə), migration
- Auth və rollar
- Admin redaktoru: Track / Course / Module / Step CRUD, sıralama, theory və quiz formaları
- Tələbə tərəfi: kataloq, yazılma, kurs səhifəsi, theory və quiz addımları, irəliləyiş
- Nümunə seed kurs

**Mərhələ 2 — Brauzer tapşırıqları**
- SQL (DuckDB-WASM) və Python (Pyodide) redaktoru, yoxlama
- CTF (fayl əlavəsi + flag, backend yoxlaması)
- Kurs paketi idxalı / ixracı (ZIP + YAML, validasiya)
- XP, şəxsi panel

**Mərhələ 3 — Server lab-ları və sertifikat**
- Terminal lab: Docker orkestrasiya, xterm.js, vaxt limiti, check script
- CTF üçün istəyə bağlı konteyner
- Sertifikat və ictimai yoxlama səhifəsi

---

## 8. Dizayn — DataCamp-dan referans

**Vizual nümunə:** `DACY_DESIGN_REFERENCE.html` faylını brauzerdə aç və hər ekranı ona maksimum yaxın qur. Rənglər, ölçülər, ekran quruluşu oradadır.

### Ümumi istiqamət
- UX quruluşu **DataCamp** kimi olmalıdır: təmiz, müasir, peşəkar; kart əsaslı kataloq, kurs xəritəsi, split-screen dərs ekranı.
- DataCamp-ın **loqosunu, adını, brend rənglərini və illüstrasiyalarını KOPYALAMA**. Brend DaCy-nindir (rənglər aşağıda).
- Hər detal cilalanmış olsun: boşluqlar ardıcıl, künclər yumşaq (8–14px), hover/focus vəziyyətləri, skeleton loading, boş vəziyyət ekranları.

### Rəng tokenləri (Tailwind config-ə əlavə et)
| Token | Hex | İstifadə |
|---|---|---|
| navy | `#13233F` | header, tünd bloklar |
| workspace | `#0E1B30` | redaktor/terminal fonu |
| navy-3 | `#1B2F52` | tünd fonda ikinci səviyyə |
| brand | `#2BD4A4` | əsas düymə, uğur, irəliləyiş |
| da | `#6C7CF0` | Data Analytics |
| de | `#F0A93E` | Data Engineering |
| cy | `#F06A8D` | Cyber Security |
| paper | `#F5F7FB` | açıq səhifə fonu |
| error | `#FF6B6B` | xəta |

İstiqamət rəngi bazada `Track.color` sahəsində saxlanılır və bütün UI (badge, kart üstü, irəliləyiş zolağı) ondan götürür.

### Şriftlər
- UI: **IBM Plex Sans** (Azərbaycan hərfləri düzgün göstərilir)
- Kod/terminal: **JetBrains Mono**

### Dərs ekranı (ən vacib ekran)
- **Tam ekran, tünd tema**, saytın adi header-i gizlənir.
- Yuxarıda nazik zolaq: loqo, breadcrumb (Fəsil › Addım), kurs irəliləyiş zolağı, XP.
- **Sol panel (~40%):** nəzəri mətn (Markdown), tapşırıq siyahısı (tamamlanan maddələr üstündən xətt çəkilir), "İpucu göstər" düyməsi.
- **Ortada sürüklənən ayırıcı** — panellərin eni dəyişdirilə bilir (`react-resizable-panels`).
- **Sağ panel**, tapşırıq tipinə görə:
  - `sql` / `python`: yuxarıda fayl tabları, ortada **Monaco Editor**, altda nəticə paneli (cədvəl / konsol / qrafik tabları), ən altda "İşə sal" və "Göndər və davam et" düymələri.
  - `terminal`: **xterm.js** terminal, fayl tabları, geri sayan taymer, "Lab-ı sıfırla".
  - `ctf`: sual kartları, hər birində cavab sahəsi və "Göndər"; düzgün cavab yaşıl çərçivə + XP.
  - `theory` / `quiz`: sağ panel olmadan, mərkəzdə oxunaqlı genişlikdə (max ~720px).
- Düzgün cavabda kiçik uğur animasiyası (toast + XP), səhvdə nə səhv olduğunu göstərən aydın mesaj.
- Klaviatura: `Ctrl/Cmd + Enter` = İşə sal.
- Mobildə panellər üst-üstə düzülür (əvvəl təlimat, sonra redaktor).

### Digər ekranlar
- **Kataloq:** açıq fon, tünd hero blok, filtr çipləri (istiqamət, səviyyə), kartlar (üst hissə istiqamət rəngində + sadə ikon).
- **Kurs səhifəsi:** tünd başlıq bloku, modullar akkordeon şəklində, addım ikonları tipə görə (T, ?, {}, flag), tamamlanan ✓, kilidli 🔒; sağda dairəvi irəliləyiş + "Davam et".
- **Şəxsi panel:** "Qaldığınız yer" bloku, kurs irəliləyişləri, XP, seriya, həftəlik aktivlik.
- **Admin:** solda sürüklənən kurs ağacı, sağda tipə görə dəyişən forma, "Tələbə kimi bax", "Qaralama / Dərc et", yuxarıda "ZIP paket yüklə".

### Texniki UI seçimləri
Tailwind CSS + shadcn/ui, lucide-react ikonlar, Monaco Editor, xterm.js, react-resizable-panels. Animasiyalar az və mənalı olsun; `prefers-reduced-motion` nəzərə alınsın. Açıq/tünd tema dəstəyi.

---

## 9. Ümumi qaydalar

- İnterfeys dili: **Azərbaycan dili** (ə, ğ, ı, ö, ş, ü, ç düzgün göstərilməlidir). Mətnlər ayrıca dil faylında olsun ki, sonra ingilis dili əlavə etmək asan olsun.
- Mobil uyğun dizayn.
- Tələbənin göndərdiyi kod heç vaxt serverdə yoxlanılmadan işə salınmır (SQL/Python brauzerdə, terminal yalnız izolə konteynerdə).
- Hər yeni funksiya üçün əsas testlər.
- Əmin olmadığın yerdə **təxmin etmə, soruş.**

---

## 10. Learning Path — Mərhələ 4 (sonradan əlavə olunur)

> Bu bölmə Mərhələ 1–3 bitəndən sonra qurulur. İndiki mərhələlərdə yalnız sxemi elə qur ki, sonra Learning Path əlavə etmək asan olsun (kurs bir neçə yola aid ola bilməlidir).

### Məqsəd
Tələbə platformaya girən kimi **"bu peşəyə çatmaq üçün hansı yolu keçməliyəm"** sualının cavabını görməlidir: hansı kurslar, hansı ardıcıllıqla, nə qədər vaxt, harada olduğu və sonda nə alacağı. Dizayn: `DACY_DESIGN_REFERENCE.html` → "Learning Path" bölməsi.

### Quruluş
```
Track (istiqamət)
 └── LearningPath (məs. "Data Analyst ol", "Data Engineer ol", "SOC Analyst ol")
      └── PathItem — sıralı
           ├── course       — mövcud kurslardan biri
           ├── project      — layihə (təlimat + fayl yükləmə, müəllim yoxlayır və ya avtomatik test)
           ├── assessment   — mərhələ imtahanı (quiz tipli, keçid balı ilə)
           └── milestone    — final / sertifikat nöqtəsi
```
- Eyni kurs bir neçə yolda ola bilər; tələbənin kurs irəliləyişi bütün yollarda avtomatik sayılır.
- `PathItem.isOptional` — seçmə kurslar (yolu bitirmək üçün məcburi deyil).
- Ardıcıllıq: əvvəlki məcburi addım bitməsə, növbəti kilidlidir (yol səviyyəsində `sequential: true | false`).
- Yol bitəndə ayrıca **yol sertifikatı** ("Data Analyst" və s.) verilir.

### Verilənlər bazası (əlavə)
`LearningPath` (track, title, slug, description, level, targetAudience, skills[], estimatedHours, isPublished), `PathItem` (pathId, order, type, courseId?, config JSON, isOptional), `PathEnrollment`, `PathCertificate`.

### Müəllim yolu necə yaradır
- **Admin:** "Yeni yol" → başlıq, təsvir, bacarıqlar, kimlər üçündür → mövcud kursları siyahıdan seçib sürükləyərək sırala → layihə / imtahan / final addımı əlavə et → dərc et.
- **ZIP / YAML idxal:** kursun yanında `path.yaml`:
```yaml
type: path
track: data-analytics
title: Data Analyst ol
slug: data-analyst
level: beginner
skills: [SQL, Python, pandas, Statistika, Power BI]
target_audience: Proqramlaşdırma təcrübəsi olmayanlar
sequential: true
items:
  - course: excel-ve-data-savadliligi
  - course: sql-ile-analiz
  - assessment: sql-bacariq-yoxlamasi
  - course: python-ve-pandas
  - project: baki-eticaret-analizi
  - course: statistika-ab-test
  - course: excel-power-query
    optional: true
  - course: power-bi-dashboard
  - milestone: final-portfolio
```
- Idxal zamanı yoxla: göstərilən bütün kurs `slug`-ları bazada mövcuddurmu.

### Tələbə ekranları
- **Yollar səhifəsi** (`/yollar`): istiqamət üzrə filtr, hər yolun kartı (müddət, kurs sayı, səviyyə).
- **Yol səhifəsi** (`/yol/[slug]`): tünd başlıq bloku (ad, təsvir, kurs/layihə sayı, ümumi saat, faiz), **şaquli yol xəritəsi**:
  - tamamlanan addım: yaşıl dairə ✓
  - cari addım: vurğulanmış, "Siz buradasınız" etiketi, irəliləyiş zolağı
  - kilidli addımlar: solğun
  - imtahan və final: romb formalı nöqtə
  - seçmə kurslar: əsas xəttin yanında kəsik çərçivəli kiçik kartlar
  - xəttin özü irəliləyişə görə rənglənir
  - sağda: qazanılacaq bacarıqlar, kimlər üçündür, digər yollar
- **Qeydiyyatdan sonra onboarding:** "Hansı peşəyə hazırlaşırsınız?" sualı → uyğun yol təklif olunur.
- **Şəxsi panel:** aktiv yol üstdə — faiz, növbəti addım, "Davam et".
- **Kurs səhifəsi:** kurs hansı yollara aiddirsə, kiçik "Bu kurs Data Analyst yolunun 4-cü addımıdır" bloku.
