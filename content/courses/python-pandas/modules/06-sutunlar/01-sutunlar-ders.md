---
title: Sütunlarla iş
xp: 10
estimated_minutes: 9
---

## Yeni sütun yaratmaq və dəyişmək

`df["Sütun"] = dəyər/ifadə` — sütun yoxdursa yaradılır, varsa üzərinə yazılır:

```python
df["Ümumi_Əməkhaqqı"] = df["Əməkhaqqı"] + df["Bonus"]
df["Ümumi_Əməkhaqqı"] = df["Ümumi_Əməkhaqqı"] + 50      # mövcudu dəyiş
df["Revenue Rounded"] = df["Total Revenue"].round()
df["Name Length"] = df["Product Name"].str.len()
```

Əməliyyat bütün sütuna birdən tətbiq olunur — dövr yazmağa ehtiyac yoxdur (buna **vektorlaşdırma** deyilir).

## Adlandırmaq

```python
df.columns = ["a", "b", "c"]                                    # hamısını yenidən ver
df = df.rename(columns={"Total Revenue": "Gelir"})              # seçilmişləri
df.columns = df.columns.str.replace(" ", "_")                   # boşluq → alt xətt
```

## Silmək

```python
df = df.drop("Filial", axis=1)               # və ya columns="Filial"
df = df.drop(columns=["Filial", "Transaction ID"])
del df["Filial"]                             # yerində silir
```

> ⚠️ Əksər metodlar (`rename`, `drop`, `assign`) **yeni** DataFrame qaytarır — nəticəni dəyişənə yazmasan, dəyişiklik itir: `df = df.drop(...)`.

## insert — müəyyən yerə sütun

```python
df.insert(1, "Il", df["Date"].str[:4])      # 1-ci mövqeyə (ikinci sütun)
```

`insert` df-i **yerində** dəyişir və heç nə qaytarmır.

## assign — yeni DataFrame ilə

```python
df_yeni = df.assign(EDV=df["Total Revenue"] * 0.18)
```

Orijinal `df` dəyişmir — zəncirli yazılışda rahatdır.

## eval — sütun ifadəsi sətir kimi

```python
df["Hesab"] = df.eval("`Units Sold` * `Unit Price`")
```

Python-un `eval()` funksiyasından fərqli olaraq `df.eval()` yalnız sütunlarla hesablama aparır və təhlükəsizdir. Boşluqlu adlar `` ` `` arasında yazılır.
