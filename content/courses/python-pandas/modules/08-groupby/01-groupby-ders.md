---
title: 'groupby: böl, hesabla, birləşdir'
xp: 10
estimated_minutes: 9
---

«Hər region üzrə gəlir», «hər məhsulun orta satışı», «hər işçinin satış sayı» — bu suallar **qruplaşdırma** tələb edir. Excel-də pivot table, SQL-də `GROUP BY`, pandas-da `groupby`.

## Böl → hesabla → birləşdir

```python
df.groupby("Region")["Total Revenue"].sum()
```

1. **Böl:** sətirlər Region dəyərinə görə qruplara bölünür.
2. **Hesabla:** hər qrupda Total Revenue cəmlənir.
3. **Birləşdir:** nəticə — indeksi region olan Series.

## Aqreqasiya funksiyaları

| Funksiya | Nə hesablayır |
| --- | --- |
| `sum()` | Cəm |
| `mean()` | Orta |
| `count()` | Boş olmayan dəyərlərin sayı |
| `size()` | Qrupdakı sətirlərin sayı |
| `min()`, `max()` | Ən kiçik, ən böyük |
| `nunique()` | Unikal dəyərlərin sayı |
| `agg([...])` | Bir neçə funksiya birdən |

```python
df.groupby("Region")["Total Revenue"].agg(["sum", "mean", "count"])
```

## Bir neçə açar

```python
df.groupby(["Region", "Payment Method"])["Total Revenue"].sum()
```

Nəticənin indeksi iki səviyyəlidir (MultiIndex). Adi cədvəl lazımdırsa — `.reset_index()`.

## Adlandırılmış aqreqasiya

```python
df.groupby("Product Name").agg(
    orta_say=("Units Sold", "mean"),
    orta_qiymet=("Unit Price", "mean"),
    emeliyyat=("Transaction ID", "count"),
)
```

Format: `yeni_ad=("sütun", "funksiya")` — nəticə sütunlarının adlarını özün seçirsən.

## Nəticə ilə işləmək

```python
gelir = df.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
gelir.idxmax()        # ən çox gəlir gətirən region
gelir.head(3)         # ilk 3
```
