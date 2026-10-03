---
title: SQL və verilənlər bazaları
xp: 10
estimated_minutes: 7
---

**Verilənlər bazası** (database) — datanın nizamlı şəkildə saxlandığı və asanlıqla tapıla bildiyi sistemdir. Bazanı idarə edən proqrama **DBMS** (Database Management System) deyilir.

## Relyasiyalı bazalar

Ən geniş yayılmış bazalar **relyasiyalıdır**: data cədvəllərdə saxlanılır, cədvəllər isə bir-biri ilə **açarlar** vasitəsilə əlaqələndirilir.

**customers** (müştərilər):

| customer_id | name | city |
| --- | --- | --- |
| 1 | Aysel | Bakı |
| 2 | Rauf | Gəncə |

**orders** (sifarişlər):

| order_id | customer_id | amount |
| --- | --- | --- |
| 1045 | 1 | 42.50 |
| 1046 | 2 | 18.20 |
| 1047 | 1 | 9.90 |

- **Sətir** (row) — bir qeyd, məsələn, bir sifariş.
- **Sütun** (column) — bir xüsusiyyət, məsələn, məbləğ.
- **Primary key** (əsas açar) — hər sətri unikal tanıdan sütun: `order_id`.
- **Foreign key** (xarici açar) — başqa cədvələ istinad edən sütun: `orders.customer_id` → `customers.customer_id`. Beləliklə, 1045 və 1047 nömrəli sifarişlərin Ayselə aid olduğunu bilirik.

## SQL — datanın dili

**SQL** (Structured Query Language) relyasiyalı bazalarla işləmək üçün standart dildir. 1970-ci illərdə yaranıb və bu gün də data ilə işləyən hər kəsin əsas alətidir. Sadə sorğu ingilis dilində cümlə kimi oxunur:

```sql
SELECT name, city        -- hansı sütunlar
FROM customers           -- hansı cədvəldən
WHERE city = 'Bakı';     -- hansı şərtlə
```

Nəticə: Bakıda yaşayan müştərilərin adı və şəhəri.

## SQL-dən kim istifadə edir?

| Data engineer | Data analitik / data scientist |
| --- | --- |
| Cədvəllərin strukturunu (sxemini) yaradır | Datanı sorğulayır və filtrləyir |
| Cədvəllər arasında əlaqələri təyin edir | Cəmləmə, orta, say hesablayır |
| Yeni data mənbələrini qoşur, yükləmələri yazır | Hesabat və dashboard üçün data hazırlayır |

## Baza sxemi və «ulduz» sxemi

**Sxem** (schema) bazadakı cədvəllərin, sütunların və onların əlaqələrinin planıdır — binanın layihəsi kimi. Analitik anbarlarda tez-tez **ulduz sxemi** (star schema) istifadə olunur:

```text
               dim_customer
                    │
dim_product ── fact_orders ── dim_date
                    │
               dim_courier
```

Mərkəzdə **fakt cədvəli** dayanır (hadisələr: hər sifariş, məbləğ). Ətrafında **ölçü cədvəlləri** (dimension) — müştəri, məhsul, tarix, kuryer haqqında təsviri məlumatlar. Bu quruluş «Hansı şəhərdə, hansı ayda, hansı məhsul nə qədər satılıb?» kimi sualları çox sürətli cavablandırmağa imkan verir.

## Populyar bazalar

- **Relyasiyalı (SQL):** PostgreSQL, MySQL, Microsoft SQL Server, Oracle, SQLite.
- **NoSQL:** MongoDB (sənədlər/JSON), Redis (açar-dəyər, çox sürətli), Cassandra (nəhəng həcmlər).

## Qısa xülasə

- Relyasiyalı bazalar datanı açarlarla əlaqələnmiş cədvəllərdə saxlayır.
- SQL bazalarla işləmək üçün standart dildir: data engineer sxem qurur, analitik sorğulayır.
- Ulduz sxemində mərkəzdə fakt cədvəli, ətrafında ölçü cədvəlləri olur.
