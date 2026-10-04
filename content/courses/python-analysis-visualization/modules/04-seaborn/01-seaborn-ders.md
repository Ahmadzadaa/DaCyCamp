---
title: 'Seaborn: az kodla gözəl qrafiklər'
xp: 10
estimated_minutes: 9
---

**Seaborn** matplotlib üzərində qurulmuş statistik vizuallaşdırma kitabxanasıdır. Əsas üstünlüyü: DataFrame və sütun adları ilə işləyir, qruplaşdırmanı və rəngləri özü edir.

```python
import seaborn as sns
import matplotlib.pyplot as plt
```

> ⏳ DaCy-də seaborn ilk istifadədə internetdən quraşdırılır (bir neçə saniyə).

## Əsas funksiyalar

| Funksiya | Qrafik |
| --- | --- |
| `sns.histplot(data=df, x="Total Revenue", bins=20)` | Histoqram |
| `sns.boxplot(data=df, x="Product Category", y="Total Revenue", palette="Set2")` | Qutu (qruplar üzrə) |
| `sns.barplot(data=df, x="Region", y="Total Revenue", estimator="sum", errorbar=None)` | Sütun (aqreqasiya ilə) |
| `sns.countplot(data=df, x="Payment Method")` | Say |
| `sns.scatterplot(data=df, x="Units Sold", y="Total Revenue", hue="Product Category")` | Səpələnmə |
| `sns.lineplot(data=ayliq, x="Ay", y="Gəlir")` | Xətt |
| `sns.regplot(data=df, x="Sales", y="Profit")` | Səpələnmə + trend xətti |
| `sns.pairplot(df, hue="Category")` | Bütün rəqəmsal cütlər |
| `sns.catplot(data=df, x=..., y=..., hue=..., kind="bar")` | Kateqoriya qrafikləri (figure səviyyəli) |

## hue — üçüncü ölçü rənglə

```python
sns.scatterplot(data=df, x="Units Sold", y="Total Revenue", hue="Product Category")
```

Hər kateqoriya fərqli rəngdə, legend avtomatik.

## barplot və estimator

`sns.barplot` defolt olaraq **ortanı** göstərir və etibar intervalı (qara xətt) çəkir. Cəm lazımdırsa `estimator="sum"`, intervalsız — `errorbar=None`.

## Trend xətti: regplot

```python
sns.regplot(x="total_bill", y="tip", data=tips,
            scatter_kws={"alpha": 0.5},
            line_kws={"color": "red", "linewidth": 2})
```

## Başlıq

Seaborn funksiyaları matplotlib **axes** qaytarır: `ax = sns.boxplot(...)`, sonra `ax.set_title(...)` və ya `plt.title(...)`.
