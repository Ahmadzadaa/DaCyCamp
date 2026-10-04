---
title: 'Filtrləmə: şərtlər, isin, query'
xp: 10
estimated_minutes: 9
---

Python-da filtrləmə xüsusi funksiya ilə deyil, **müqayisə operatorları** ilə edilir. Şərt hər sətir üçün True/False qaytarır, DataFrame isə yalnız True olan sətirləri saxlayır.

```python
df["Total Revenue"] > 2000          # True/False Series (maska)
df[df["Total Revenue"] > 2000]      # yalnız True olan sətirlər
```

## Operatorlar

| Operator | Nümunə |
| --- | --- |
| `==`, `!=` | `df[df["Region"] == "Bakı"]` |
| `>`, `<`, `>=`, `<=` | `df[df["Units Sold"] > 5]` |
| `isin([...])` | `df[df["Region"].isin(["Gəncə", "Şəki"])]` |
| `isnull()`, `notnull()` | `df[df["Payment Method"].isnull()]` |
| `between(a, b)` | `df[df["Unit Price"].between(100, 500)]` (a və b daxil) |

## Bir neçə şərt: `&`, `|`, `~`

```python
df[(df["Region"] == "Bakı") & (df["Total Revenue"] > 1000)]       # VƏ
df[(df["Region"] == "Gəncə") | (df["Region"] == "Şəki")]          # VƏ YA
df[~(df["Payment Method"] == "Cash")]                             # DEYİL
```

> ⚠️ Pandas-da `and` / `or` yox, `&` / `|` yazılır və **hər şərt mötərizədə olmalıdır**. Mötərizəsiz `df["A"] > 1 & df["B"] < 2` səhv nəticə və ya xəta verir.

## query() — oxunaqlı alternativ

```python
df.query("`Units Sold` < 10 and Region == 'Bakı'")
```

Adında boşluq olan sütunlar `` ` `` (backtick) arasında yazılır.

## Filtr + sütun seçimi

```python
df[df["Product Category"] == "Electronics"]["Product Name"].unique()
df.loc[df["Product Category"] == "Electronics", "Product Name"]    # eyni, loc ilə
```

## «Ən azı biri varmı?» — any() və all()

```python
(df["Total Revenue"] > 2000).any()   # ən azı bir sətir? → True/False
(df["Units Sold"] > 0).all()         # hamısı?
```
