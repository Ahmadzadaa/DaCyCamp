# Kurs paketi formatı (ZIP + YAML)

Müəllim bütöv kursu ZIP kimi yükləyir (`/admin/idxal`) və eyni formatda geri ixrac edir (kurs redaktorunda «ZIP ixrac»).
Format spesifikasiyanın §3.2 və §4 bölmələrinə uyğundur. Aşağıdakı nümunələr yalnız **formatı** göstərir.

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
```

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

### terminal (Mərhələ 3)

```yaml
type: terminal
title: İlk ETL pipeline
instructions: |
  ...
docker_image: dacy/de-lab-postgres:latest
time_limit_minutes: 60
check_script: checks/etl_check.sh
xp: 100
```

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

Learning Path idxalı 4-cü mərhələdə əlavə olunacaq; indi `path.yaml` faylı nəzərə alınmır (xəbərdarlıq verilir).
