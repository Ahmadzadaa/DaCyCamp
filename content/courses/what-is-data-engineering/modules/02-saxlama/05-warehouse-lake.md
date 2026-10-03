---
title: Data warehouse və data lake
xp: 10
estimated_minutes: 7
---

NarMarket-də hər gün həm səliqəli cədvəllər, həm də nəhəng həcmdə xam data (loglar, fotolar, JSON hadisələr) yaranır. Bunların hamısını eyni yerdə və eyni üsulla saxlamaq səmərəsizdir. Buna görə iki fərqli anbar növü var.

## Data lake (data gölü) 🏞️

**Data lake** bütün xam datanı — strukturlaşdırılmış, yarım-strukturlaşdırılmış və strukturlaşdırılmamış — **olduğu kimi** saxlayır.

- Çox böyük həcmlər (petabaytlar) və ucuz saxlama.
- Data yazılanda sxem tələb olunmur — strukturu oxuyanda müəyyən edirlər (**schema-on-read**).
- Əsasən data scientist-lər istifadə edir: kəşfiyyat, maşın öyrənməsi, yeni fikirlərin sınağı.
- Nümunələr: Amazon S3, Azure Data Lake Storage, Google Cloud Storage üzərində qurulan göllər.

⚠️ **Risk:** nizam olmasa, göl **«data bataqlığına»** (data swamp) çevrilir — nə olduğu, haradan gəldiyi və etibarlı olub-olmadığı bilinməyən fayllar yığını.

## Data warehouse (data anbarı) 🏬

**Data warehouse** təmizlənmiş, strukturlaşdırılmış və **analitika üçün optimallaşdırılmış** datanı saxlayır.

- Data yazılmazdan əvvəl sxem müəyyən olunur (**schema-on-write**).
- Oxuma sorğuları üçün çox sürətlidir: dashboard-lar, hesabatlar, biznes sualları.
- Əsasən biznes analitikləri istifadə edir.
- Nümunələr: Snowflake, Google BigQuery, Amazon Redshift.

## Bəs adi verilənlər bazası?

Tətbiqin öz bazası (məsələn, NarMarket tətbiqinin PostgreSQL-i) **əməliyyatlar** üçündür: sifariş yaratmaq, statusu yeniləmək — hər saniyə minlərlə kiçik yazı. Analitik sorğular (məsələn, «son 3 ilin satışları») bu bazanı yavaşladar və müştərilər əziyyət çəkər. Buna görə data engineer datanı əməliyyat bazasından **ayrıca anbara** köçürür.

| | Əməliyyat bazası | Data warehouse | Data lake |
| --- | --- | --- | --- |
| **Məqsəd** | Tətbiqin gündəlik işi | Analitika, hesabatlar | Xam datanın saxlanması, ML |
| **Data** | Cari, strukturlaşdırılmış | Təmiz, strukturlaşdırılmış, tarixi | Hər növ, xam |
| **Sxem** | Sərt | Yazanda (on-write) | Oxuyanda (on-read) |
| **İstifadəçi** | Tətbiq | Analitiklər | Data scientist-lər |
| **Xərc** | Orta | Daha baha | Ucuz |

## Data kataloqu

**Data kataloqu** — datanın «kitabxana kartoçkası»dır: hər cədvəlin nə olduğu, mənbəyi, sahibi, nə vaxt yeniləndiyi və sütunların mənası. Kataloq data lake-in bataqlığa çevrilməsinin qarşısını alır və hər kəsə lazım olan datanı tapmağa kömək edir.

## Lakehouse

Son illərdə hər iki dünyanın üstünlüklərini birləşdirən **lakehouse** yanaşması yayılıb: ucuz göl saxlaması üzərində anbar kimi sürətli və nizamlı sorğular (məsələn, Databricks, Delta Lake).

## NarMarket-də

- Kuryer fotoları, tətbiq logları, xam JSON hadisələr → **data lake**.
- Təmizlənmiş satış, müştəri və məhsul cədvəlləri → **data warehouse** → dashboard-lar.
- Canlı sifarişlər → tətbiqin **əməliyyat bazası**.

## Qısa xülasə

- Data lake hər növ xam datanı ucuz saxlayır; kataloqsuz bataqlığa çevrilə bilər.
- Data warehouse təmiz, strukturlaşdırılmış datanı analitika üçün saxlayır.
- Analitik sorğular tətbiqin əməliyyat bazasını yükləməməlidir — buna görə ayrıca anbar qurulur.
