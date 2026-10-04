---
title: Sıralama və dublikatlar
xp: 10
estimated_minutes: 8
---

## sort_values

```python
df.sort_values(by="Total Revenue", ascending=True)     # artan
df.sort_values(by="Total Revenue", ascending=False)    # azalan

# əvvəlcə Region (A→Z), sonra hər regionun içində Total Revenue (çoxdan aza)
df.sort_values(by=["Region", "Total Revenue"], ascending=[True, False])
```

Sıralama indeksi **dəyişmir** — sətirlər öz etiketləri ilə yerini dəyişir. Təzə 0, 1, 2… indeks lazımdırsa: `.reset_index(drop=True)`.

## Ən böyük / ən kiçik

```python
df.nlargest(3, "Total Revenue")     # ən böyük 3 sətir
df.nsmallest(5, "Unit Price")       # ən kiçik 5
df.loc[df["Total Revenue"].idxmax()]   # ən böyük gəlirli sətrin özü
```

## Təkrarlar: duplicated və drop_duplicates

```python
df.duplicated().sum()              # tam təkrarlanan sətirlərin sayı
df.drop_duplicates()               # təkrarları silinmiş yeni DataFrame
```

`drop_duplicates()` parametrləri:

| Parametr | Defolt | Mənası |
| --- | --- | --- |
| `subset` | `None` (bütün sütunlar) | Hansı sütunlara görə təkrar sayılsın: `subset=["Transaction ID"]` |
| `keep` | `"first"` | Hansı saxlansın: `"first"` — ilki, `"last"` — sonuncusu, `False` — heç biri |
| `inplace` | `False` | `True` — orijinal DataFrame dəyişir, yeni yaradılmır |
| `ignore_index` | `False` | `True` — yeni indeks 0-dan başlayır |

```python
df.drop_duplicates(subset=["Product Name"])        # hər məhsuldan bir sətir
df.drop_duplicates(subset=["Transaction ID"], keep="last")
```

## «Hər məhsuldan ən bahalısı» texnikası

Sırala və sonra hər qrupun birincisini saxla:

```python
(df.sort_values("Unit Price", ascending=False)
   .drop_duplicates("Product Name")
   .head(3))
```

> 💡 Mötərizə içində metodları sətir-sətir yazmaq (method chaining) uzun əməliyyatları oxunaqlı edir.
