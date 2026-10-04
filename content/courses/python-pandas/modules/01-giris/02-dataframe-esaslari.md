---
title: DataFrame ilə ilk addımlar
xp: 10
estimated_minutes: 8
---

> 📁 **Dataset — `satislar.csv`:** TechNar elektronika, geyim, idman, məişət texnikası və kosmetika mağazalar şəbəkəsinin 2023–2024 satışları (1260 əməliyyat). Sütunlar: `Transaction ID`, `Date`, `Region`, `Filial`, `Sales Employee`, `Product Name`, `Product Category`, `Units Sold`, `Unit Price`, `Total Revenue`, `Payment Method`.


## Faylı oxumaq

```python
import pandas as pd
df = pd.read_csv("satislar.csv")
```

## İlk baxış

| Kod | Nə göstərir |
| --- | --- |
| `df.head()` | İlk 5 sətir (`df.head(10)` — ilk 10) |
| `df.tail()` | Son 5 sətir |
| `df.sample(3)` | Təsadüfi 3 sətir |
| `df.shape` | `(sətir sayı, sütun sayı)` — mötərizəsiz, atributdur |
| `df.columns` | Sütun adları (`df.columns.tolist()` — siyahı kimi) |
| `df.dtypes` | Hər sütunun tipi |
| `len(df)` | Sətir sayı |

```python
df.shape          # (1260, 11)
setir, sutun = df.shape
```

## Sütun seçmək

```python
df["Total Revenue"]        # Series
df[["Region", "Total Revenue"]]   # DataFrame (iki cüt mötərizə!)
```

> ⚠️ Sütun adında boşluq varsa (`Total Revenue`), yalnız `df["Total Revenue"]` yazılışı işləyir. `df.Region` qısa yazılışı yalnız boşluqsuz adlarda mümkündür.

## Series üzərində hesablamalar

```python
df["Total Revenue"].sum()     # ümumi gəlir
df["Units Sold"].mean()       # orta satış ədədi
df["Unit Price"].max()        # ən yüksək qiymət
df["Region"].unique()         # unikal dəyərlər
df["Total Revenue"].idxmax()  # ən böyük dəyərin indeksi
```

## Tək dəyərə müraciət

```python
df.loc[0, "Product Name"]     # 0 indeksli sətrin məhsul adı
df["Product Name"].iloc[0]    # eyni nəticə
```

`loc` — **etiketlə**, `iloc` — **mövqe nömrəsi ilə** müraciət edir. Fərqi növbəti fəsillərdə ətraflı görəcəyik.

## Məlumat tipləri (dtype)

| dtype | Mənası | Nümunə sütun |
| --- | --- | --- |
| `int64` | Tam ədəd | `Units Sold` |
| `float64` | Onluq ədəd | `Unit Price`, `Total Revenue` |
| `object` | Mətn (və ya qarışıq) | `Region`, `Product Name` |
| `datetime64` | Tarix | `Date` (çevrildikdən sonra) |
| `bool` | True/False | şərt nəticələri |
