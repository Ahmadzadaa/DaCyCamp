---
title: '«IF» DataFrame-də: apply, np.where, map'
xp: 10
estimated_minutes: 9
---

Excel-də `=IF(D2>1000; "Yüksək"; "Aşağı")` yazırıq. Pandas-da bunun bir neçə yolu var.

## np.where — iki variant

```python
import numpy as np
df["Revenue Class"] = np.where(df["Total Revenue"] > 1000, "High Revenue", "Low Revenue")
```

`np.where(şərt, doğrudursa, yanlışdırsa)` — bütün sütun üzrə bir dəfəyə, sürətli.

## np.select — çox variant

```python
sertler = [df["Total Revenue"] >= 2000, df["Total Revenue"] >= 500]
deyerler = ["Yüksək", "Orta"]
df["Kateqoriya"] = np.select(sertler, deyerler, default="Aşağı")
```

Şərtlər sıra ilə yoxlanılır — birinci doğru olan qalib gəlir.

## apply + funksiya

```python
def qiymetlendir(ball):
    if ball >= 90:
        return "Mükəmməl"
    elif ball >= 75:
        return "Yaxşı"
    elif ball >= 60:
        return "Kafi"
    return "Uğursuz"

df["Qiymət"] = df["Ballar"].apply(qiymetlendir)
df["Kateqoriya"] = df["Yaş"].apply(lambda x: "Yetkin" if x > 30 else "Gənc")
```

`apply` funksiyanı hər dəyərə ayrıca tətbiq edir — istənilən məntiqi yazmaq olar.

## Sətir üzrə apply: axis=1

```python
df["Yer"] = df.apply(lambda r: f"{r['Region']} - {r['Filial']}", axis=1)
```

`axis=1` — funksiya bütöv **sətri** alır və onun bir neçə sütunundan istifadə edir.

## map — dəyərləri çevir

```python
df["A"] = df["A"].map(lambda x: x + 2)
az = {"Electronics": "Elektronika", "Clothing": "Geyim"}
df["Kateqoriya AZ"] = df["Product Category"].map(az)   # lüğətdə olmayan → NaN
```

## replace — konkret dəyəri əvəz et

```python
df["Payment Method"] = df["Payment Method"].replace("Credit Card", "Visa Card")
```

| Alət | Nə vaxt |
| --- | --- |
| `np.where` | İki variantlı şərt — ən sürətli |
| `np.select` | Bir neçə şərt |
| `apply(funksiya)` | Mürəkkəb məntiq, öz funksiyan |
| `apply(..., axis=1)` | Bir neçə sütundan istifadə |
| `map(dict)` | Dəyərləri lüğətə görə çevirmək |
| `replace` | Konkret dəyərləri əvəz etmək |

> 💡 Böyük datada `np.where`/vektor əməliyyatları `apply`-dan dəfələrlə sürətlidir — çünki `apply` hər sətir üçün Python funksiyası çağırır.
