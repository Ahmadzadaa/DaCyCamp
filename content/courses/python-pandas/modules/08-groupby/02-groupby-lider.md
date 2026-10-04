---
title: Hər qrupun lideri və digər texnikalar
xp: 10
estimated_minutes: 7
---

## «Hər regionda ən çox gəlir gətirən məhsul»

Bu, iki addımlı sualdır: əvvəlcə region × məhsul üzrə cəm, sonra hər regionda maksimum.

```python
pg = df.groupby(["Region", "Product Name"])["Total Revenue"].sum().reset_index()
liderler = pg.loc[pg.groupby("Region")["Total Revenue"].idxmax()]
```

`pg.groupby("Region")["Total Revenue"].idxmax()` hər regionun ən böyük sətrinin **indeksini** qaytarır, `loc` isə həmin sətirləri götürür.

Alternativ — sırala və hər qrupun birincisini saxla:

```python
pg.sort_values("Total Revenue", ascending=False).drop_duplicates("Region")
```

## Qrupda neçə fərqli dəyər?

```python
df.groupby("Sales Employee")["Product Name"].nunique()   # hər işçi neçə fərqli məhsul satıb
```

## transform — qrup nəticəsini hər sətrə qaytar

```python
df["Region Payı"] = df["Total Revenue"] / df.groupby("Region")["Total Revenue"].transform("sum")
```

`transform` nəticəni qrupun hər sətrinə yayır — «əməliyyat regionun gəlirinin neçə faizidir?» kimi suallar üçün.

## Lüğət kimi nəticə

```python
dict(zip(liderler["Region"], liderler["Product Name"]))
# {"Bakı": "iPhone 15", "Gəncə": ...}
```
