---
title: GROUP BY, HAVING və tarix funksiyaları
xp: 10
estimated_minutes: 8
---

## Aqreqat funksiyalar

`COUNT(*)`, `SUM(x)`, `AVG(x)`, `MIN(x)`, `MAX(x)`, `COUNT(DISTINCT x)`.

```sql
SELECT "Product Category" AS kateqoriya,
       COUNT(*)            AS emeliyyat,
       SUM("Units Sold")   AS eded,
       ROUND(AVG("Total Revenue"), 2) AS orta_cek
FROM satislar
GROUP BY "Product Category"
ORDER BY eded DESC;
```

## WHERE və HAVING

- `WHERE` — qruplaşdırmadan **əvvəl** sətirləri filtrləyir.
- `HAVING` — qruplaşdırmadan **sonra** qrupları filtrləyir.

```sql
SELECT "Sales Employee", SUM("Total Revenue") AS gelir
FROM satislar
WHERE Region = 'Bakı'              -- yalnız Bakı əməliyyatları
GROUP BY "Sales Employee"
HAVING SUM("Total Revenue") > 150000   -- yalnız böyük nəticəli satıcılar
ORDER BY gelir DESC;
```

## Sorğunun icra sırası

```text
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

Buna görə `WHERE`-də aqreqat (`SUM`) istifadə etmək olmaz — o mərhələdə qruplar hələ yoxdur.

## Tarixlər (SQLite)

SQLite-də tarix mətn kimi saxlanılır (`'2024-03-15'`), funksiyalar isə onu başa düşür:

```sql
SELECT strftime('%Y-%m', Date) AS ay, SUM("Total Revenue") AS gelir
FROM satislar
WHERE strftime('%Y', Date) = '2024'
GROUP BY ay
ORDER BY ay;
```

MySQL-də: `DATE_FORMAT(Date, '%Y-%m')`, PostgreSQL-də: `TO_CHAR(Date, 'YYYY-MM')` və ya `DATE_TRUNC('month', Date)`.
