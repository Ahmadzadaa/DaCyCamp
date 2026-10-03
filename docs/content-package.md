# Kurs paketi formatı (ZIP + YAML)

Müəllim bütöv kursu ZIP kimi yükləyir (`/admin/idxal`) və eyni formatda geri ixrac edir (kurs redaktorunda «ZIP ixrac»).
Format spesifikasiyanın §3.2 və §4 bölmələrinə uyğundur. Aşağıdakı nümunələr yalnız **formatı** göstərir.

## Repo-dakı kurslar: `content/courses/`

`content/courses/<slug>/` qovluğundakı hər paket **API açılanda avtomatik idxal olunur** (`ContentSyncService`): yalnız bazada olmayan kurslar, admin paneldəki düzəlişlərin üzərinə yazılmır, giriş/şifrə tələb etmir. Söndürmək: `.env`-də `CONTENT_SYNC=false`; başqa qovluq: `CONTENT_DIR=/yol`. Əl ilə:

```bash
pnpm content:sync --update <slug>    # mövcud kursu paketdən yenilə (tələbə irəliləyişi qorunur; SEED_ADMIN_* lazımdır)
pnpm --filter @dacy/web check:python # bütün paketlərdə Python addımlarını yoxla (CI-da da işləyir)
```

CI hər paketin idxal validasiyasından səhvsiz keçdiyini və avtomatik idxalı yoxlayır (`apps/api/test/content-packages.e2e-spec.ts`).

## Qovluq quruluşu

```
sql-ile-analiz/                ← ZIP-in kökü (bu qovluq ZIP-də olsa da, olmasa da olar)
├── course.yaml
├── cover.png                  ← course.yaml-da `cover:` ilə göstərilirsə
├── datasets/
│   └── sales.csv
├── images/  files/  videos/  checks/  logs/   ← fayllar, yol olduğu kimi saxlanılır
└── modules/
    ├── 01-giris/
    │   ├── module.yaml
    │   ├── 01-nezeri.md       ← çılpaq .md = nəzəri addım
    │   ├── 02-test.yaml
    │   └── 03-select.yaml
    └── 02-qruplasdirma/
        ├── module.yaml
        └── ...
```

Qaydalar:

- Fayl və qovluq adındakı rəqəm **sıranı** təyin edir (`01-`, `02-`), rəqəmdən sonrakı hissə isə **açardır** (`01-giris` → `giris`). Açar URL-də və yenidən yükləmədə istifadə olunur; eyni açarla yenidən yükləmə addımı **yeniləyir**, tələbələrin irəliləyişi silinmir.
- Paketdə olmayan köhnə fəsil/addımlar silinmir, **qaralamaya** keçirilir.
- Validasiya keçməsə heç nə yazılmır; hansı faylda hansı səhv olduğu göstərilir.
- Fayllara (dataset, şəkil və s.) addımlarda **paketə nisbi yolla** istinad edilir: `datasets/sales.csv`, `images/qrafik.png`.

## course.yaml

```yaml
track: data-analytics # admin-də mövcud istiqamətin slug-ı
title: SQL ilə data analizi
slug: sql-ile-analiz
level: beginner # beginner | intermediate | advanced
description: ...
cover: cover.png # istəyə bağlı
sequential: true # false = sərbəst rejim
estimated_hours: 6 # istəyə bağlı
published: false # true olsa kurs dərhal dərc olunur (defolt: qaralama)
topics: [sql, excel] # istəyə bağlı — admin «Mövzular» bölməsindəki slug-lar; olmayanlar xəbərdarlıqla ötürülür
```

`topics` verilməsə kursun mövcud mövzuları dəyişmir; boş siyahı (`topics: []`) hamısını silir.

## module.yaml

```yaml
title: SQL-ə giriş
description: ... # istəyə bağlı
published: true # defolt true
```

## Addım faylları

### theory — `NN-ad.md` (front-matter ilə) və ya `NN-ad.yaml`

```markdown
---
title: SELECT nədir?
xp: 10
video_url: https://youtu.be/... # istəyə bağlı
---

# SELECT nədir?

Markdown məzmun. Şəkil: ![sxem](images/sxem.png)
```

YAML forması:

```yaml
type: theory
title: SELECT nədir?
content_file: 01-nezeri.md # və ya content: |
video_url: ...
```

### quiz — `correct` **1-dən sayılır** (1 = birinci variant)

Sual mətni (`text`) Markdown kimi göstərilir: sətir daxilində `` `kod` `` və ya çoxsətirli kod bloku yazmaq olar (YAML-da `text: |`).

```yaml
type: quiz
title: Yoxlama testi
pass_score: 70
questions:
  - text: ...
    type: single # single | multiple
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
dataset: datasets/sales.csv # və ya siyahı: [datasets/a.csv, datasets/b.csv]; .sql skript də ola bilər
starter_code: 'SELECT '
solution: 'SELECT city, SUM(amount) ...'
check: result_match # result_match | result_match_unordered
hints: ['...', '...']
tasks: ['Nəticəni city üzrə qruplaşdırın', '...'] # soldakı tapşırıq siyahısı (istəyə bağlı)
hint_penalty_xp: 10
xp: 50
```

Dataset `datasets/sales.csv` tələbənin brauzerində `sales` adlı cədvəl kimi yüklənir (fayl adı → cədvəl adı). Dərc zamanı `solution` serverdə işlədilir və nəticənin hash-i saxlanılır; tələbənin nəticəsi brauzerdə hesablanıb yalnız hash kimi göndərilir.

### python

```yaml
type: python
title: ...
instructions: |
  ...
starter_code: |
  import pandas as pd
dataset: datasets/sales.csv # tələbənin Python mühitində eyni adla fayl kimi yerləşir
solution: | # istəyə bağlı (tələbəyə göndərilmir)
  ...
tests: |
  assert 'df' in globals()
  assert df.shape[0] == 100
hints: [...]
xp: 50
```

Testlər tələbə kodundan sonra **eyni ad sahəsində** işləyir (tələbənin dəyişən və funksiyaları görünür). Əlavə olaraq `dacy` obyekti var:

| Sahə          | Nədir                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| `dacy.stdout` | tələbə kodunun ekrana çap etdiyi bütün mətn                                   |
| `dacy.lines`  | çıxışın boş olmayan sətirləri (kənar boşluqlar silinmiş)                      |
| `dacy.code`   | tələbənin kodu (mətn kimi) — məs. lazımi funksiyadan istifadəni yoxlamaq üçün |

```python
assert tam == 12, f"tam 12 olmalıdır, sənin nəticən: {tam!r}"   # mesaj tələbəyə göstərilir
assert "12" in dacy.lines, "Nəticəni print() ilə ekrana yazdır"
assert "int(" in dacy.code, "int() funksiyasından istifadə et"
```

- Kod və testlər ayrı-ayrılıqda **10 saniyə** işləyə bilər; sonsuz dövr `TimeoutError` ilə dayandırılır, səhifə donmur.
- Brauzerdə klaviatura girişi yoxdur. `input()` lazım olan tapşırıqda starter koda kiçik əvəzedici qoyun — dəyərləri siyahıdan götürür, testlər isə siyahının nə qədər oxunduğunu yoxlaya bilər (nümunə: `content/courses/python4business/modules/05-g2-dovrler/06-while-sifir.yaml`):

```python
girisler = ["8", "-3", "0", "11"]
def input(sual=""):
    deyer = girisler.pop(0)
    print(sual + deyer)
    return deyer
```

- Paketi idxal etməzdən əvvəl yoxlayın: `pnpm --filter @dacy/web check:python <qovluq>` — hər addımda `solution` testdən **keçməli**, `starter_code` isə **keçməməlidir**.

### terminal (Mərhələ 3)

```yaml
type: terminal
title: İlk ETL pipeline
instructions: |
  ...
docker_image: dacy/de-lab-postgres:latest # hər tələbəyə ayrıca konteyner
time_limit_minutes: 60 # vaxt bitəndə konteyner silinir
check_script: checks/etl_check.sh # konteynerdə /dacy/check.sh kimi işləyir, exit 0 = keçdi
network: false # konteynerdə internet (defolt: bağlı)
hints:
  - İpucu mətni
tasks:
  - Tapşırıq maddəsi
hint_penalty_xp: 0
xp: 100
```

- `check_script` faylı paketdə `checks/` qovluğunda olmalıdır; «Yoxla» düyməsi onu konteynerin içində `sh /dacy/check.sh` ilə işlədir (tələbənin istifadəçisi ilə). stdout/stderr tələbəyə göstərilir.
- İmic hazırlamaq: `infra/lab-images/README.md`.

### ctf

```yaml
type: ctf
title: Şübhəli girişləri tap
instructions: |
  ...
attachments: [logs/auth.log]
hint_penalty_xp: 10
tasks:
  - question: Neçə uğursuz giriş cəhdi var?
    answer: '147' # idxalda hash-lənir və atılır
    hint: ...
    points: 50
  - question: Hücum hansı IP-dən gəlib?
    answer: 'DACY{...}'
xp: 150
```

İxracda `answer` əvəzinə `answer_hash` yazılır (cavab bazada yalnız hash kimi saxlanılır). `answer_hash` olan paket yenidən idxal olunanda hash olduğu kimi qalır.

## path.yaml (Mərhələ 4)

Karyera yolu paketin kökündəki `path.yaml` ilə idxal olunur — kursla eyni ZIP-də və ya təkbaşına (`course.yaml`-sız paket). Kurs tipli addımlar bazada mövcud (və ya eyni paketdəki) kursun `slug`-ına istinad edir; yol `slug` üzrə yenilənir, addımlar açar üzrə; paketdə olmayan addımlar silinir.

```yaml
type: path
track: data-analytics
title: Data Analyst ol
slug: data-analyst
level: beginner # beginner | intermediate | advanced
description: Sıfırdan junior data analitik səviyyəsinə.
skills: [SQL, Python, pandas, Statistika, Power BI]
target_audience: Proqramlaşdırma təcrübəsi olmayanlar
estimated_hours: 72
sequential: true # əvvəlki məcburi addım bitmədən növbəti kilidli
published: true # yoxdursa dərc vəziyyəti dəyişmir
items:
  - course: sql-ile-analiz # mövcud kursun slug-ı
  - assessment: sql-bacariq-yoxlamasi # mərhələ imtahanı (açar)
    title: SQL bacarıq yoxlaması
    pass_score: 70
    questions: # test ilə eyni format, correct 1-dən sayılır
      - text: Hansı əmr sətirləri qruplaşdırır?
        type: single
        options: [ORDER BY, GROUP BY]
        correct: [2]
        explanation: GROUP BY qruplaşdırır.
  - project: baki-eticaret-analizi # layihə (açar)
    title: Bakı e-ticarət datasının analizi
    instructions: |
      Təmizlənmiş CSV və qısa hesabat təhvil verin.
    deliverables: [Təmizlənmiş CSV, Hesabat (PDF)]
    review_mode: manual # manual — müəllim yoxlayır | auto — təhvil verilən kimi qəbul
    allow_link: true
    max_files: 5
    hours: 6
    xp: 100
  - course: excel-power-query
    optional: true # seçmə — yolu bitirmək üçün məcburi deyil
  - milestone: final-portfolio # final: bütün məcburi addımlar bitəndə sertifikat
    title: Portfolio layihəsi və sertifikat
    certificate_title: Data Analyst
```

Uzun məzmunu ayrıca fayla çıxarmaq olar: `path-items/<açar>.yaml` (eyni sahələr: `title`, `instructions`, `deliverables`, `questions`, `pass_score`, `certificate_title`, `description`). `path.yaml`-dakı inline dəyər faylı üstələyir. İxrac: admin → yol → «path.yaml ixrac».
