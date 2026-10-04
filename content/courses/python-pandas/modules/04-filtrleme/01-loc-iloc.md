---
title: 'Sütun və sətir seçimi: loc və iloc'
xp: 10
estimated_minutes: 8
---

## Sütunlar

```python
df["Region"]                          # bir sütun → Series
df[["Product Name", "Total Revenue"]] # bir neçə sütun → DataFrame
```

## loc — etiketlə

`df.loc[sətirlər, sütunlar]` — sətir **indeksinin etiketi** və sütun **adı** ilə:

```python
df.loc[10]                                  # indeksi 10 olan sətir
df.loc[10:14, ["Date", "Total Revenue"]]    # 10-dan 14-ə qədər (14 DAXİL!)
df.loc[:, "Region"]                         # bütün sətirlər, bir sütun
```

## iloc — mövqe ilə

`df.iloc[sətirlər, sütunlar]` — sətir və sütunun **sıra nömrəsi** ilə (adi Python kəsməsi kimi):

```python
df.iloc[0]          # birinci sətir
df.iloc[-1]         # sonuncu sətir
df.iloc[:3, :3]     # ilk 3 sətir, ilk 3 sütun (3 DAXİL DEYİL)
```

| | `loc` | `iloc` |
| --- | --- | --- |
| Nə ilə | Etiket (indeks, sütun adı) | Mövqe (0, 1, 2…) |
| Kəsmənin sonu | Daxildir | Daxil deyil |
| Nümunə | `df.loc[0:4, "Region"]` → 5 sətir | `df.iloc[0:4, 2]` → 4 sətir |

> 💡 Defolt indeks 0, 1, 2… olduğu üçün `loc` və `iloc` çox vaxt eyni görünür. Fərq filtrləmədən və ya sıralamadan sonra ortaya çıxır: indeks etiketləri qalır, mövqelər dəyişir.

## Tək xana

```python
df.loc[0, "Product Name"]
df.iloc[0, 5]
df.at[0, "Product Name"]      # tək dəyər üçün sürətli variant
```
