---
title: Niyə vizuallaşdırma? pandas ilə ilk qrafiklər
xp: 10
estimated_minutes: 8
---

1260 sətirlik cədvələ baxıb «satışlar artır, yoxsa azalır?» sualına cavab vermək çətindir. Bir xətt qrafiki isə cavabı bir saniyədə göstərir. Vizuallaşdırma — datanı **görməli** etməkdir: trendləri, paylanmanı, müqayisəni, kənar dəyərləri.

## Python-un qrafik kitabxanaları

| Kitabxana | Nə üçün |
| --- | --- |
| **pandas `.plot()`** | Ən sürətli yol — DataFrame/Series-dən birbaşa |
| **matplotlib** | Təməl kitabxana: hər detalı idarə etmək olar |
| **seaborn** | matplotlib üzərində: statistik qrafiklər, gözəl görünüş, az kod |
| **plotly** | İnteraktiv qrafiklər (hover, zoom) — veb və dashboard-lar |

pandas və seaborn arxa planda matplotlib istifadə edir — buna görə matplotlib-in əsaslarını bilmək hamısında kömək edir.

## pandas ilə qrafik: `.plot(kind=...)`

```python
df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")
ayliq.plot(kind="line", title="Aylıq gəlir")
df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")
region.plot(kind="pie", autopct="%1.1f%%", title="Regionlar")
df["Total Revenue"].plot(kind="hist", bins=5, color="lightgreen")
```

| `kind=` | Qrafik | Nə vaxt |
| --- | --- | --- |
| `"line"` | Xətt | Zamanla dəyişmə |
| `"bar"` / `"barh"` | Sütun / üfüqi sütun | Kateqoriyaların müqayisəsi |
| `"hist"` | Histoqram | Paylanma |
| `"pie"` | Dairə | Bütövün hissələri |
| `"box"` | Qutu | Yayılma və kənar dəyərlər |
| `"scatter"` | Səpələnmə | İki rəqəmin əlaqəsi (`df.plot(kind="scatter", x=..., y=...)`) |

## Bir neçə qrafik — bir neçə «figure»

Ardıcıl `.plot()` çağırışları **eyni** qrafikin üstünə çəkilir. Hər qrafik ayrıca olsun deyə əvvəlcə yeni pəncərə (figure) aç:

```python
import matplotlib.pyplot as plt

plt.figure()
df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")

plt.figure()
df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")
```

> 💻 DaCy-də qrafiklər icradan sonra **«Qrafik»** sekməsində görünür. `plt.show()` yazmaq olar, amma lazım deyil. Konsolda da çap olunmuş mətn varsa, «Konsol •» işarəsi görünür.
