---
title: Təsviri statistika, korrelyasiya və kovariasiya
xp: 10
estimated_minutes: 10
---

## describe — xülasə statistikası

```python
df.describe()                                    # say, orta, std, min, 25%, 50%, 75%, max
df.describe(percentiles=[.1, .25, .5, .75, .9])  # öz kvantillərin
df.describe(include="all")                       # mətn sütunları da
df.describe(include=["object", "number"])
df.describe(exclude=["object"])
```

## Kvantillər (percentiles)

```python
df["Total Revenue"].quantile([0.25, 0.5, 0.75])
df["Total Revenue"].quantile(0.9)     # əməliyyatların 90%-i bundan kiçikdir
```

## IQR ilə kənar dəyərlər

```python
q1, q3 = s.quantile(0.25), s.quantile(0.75)
iqr = q3 - q1
kenar = s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)]
```

Bu, qutu qrafikindəki «bığların» kənarındakı nöqtələrin qaydasıdır.

## Korrelyasiya matrisi

```python
o[["Sales", "Quantity", "Discount", "Profit"]].corr()
```

Pearson korrelyasiyası −1 ilə +1 arasında: **+1** — mükəmməl müsbət xətti əlaqə, **0** — xətti əlaqə yoxdur, **−1** — mükəmməl mənfi. Yalnız **rəqəmsal** sütunlar üçündür (`df.corr(numeric_only=True)`).

| |r| | Təfsir (təxmini) |
| --- | --- |
| 0.0–0.2 | Çox zəif |
| 0.2–0.4 | Zəif |
| 0.4–0.6 | Orta |
| 0.6–0.8 | Güclü |
| 0.8–1.0 | Çox güclü |

## Kovariasiya

```python
o[["Sales", "Profit"]].cov()
```

Kovariasiya iki dəyişənin birlikdə necə dəyişdiyini göstərir, amma ölçü vahidindən asılıdır (₼², ədəd×₼) — buna görə müqayisə üçün korrelyasiya (vahidsiz) daha rahatdır.

## İstilik xəritəsi (heatmap)

```python
plt.figure(figsize=(8, 6))
sns.heatmap(corr, annot=True, cmap="coolwarm", linewidths=0.5, fmt=".2f", cbar=True)
plt.title("Korrelyasiya matrisinin istilik xəritəsi")
```

`annot=True` — hər xanada rəqəm, `fmt=".2f"` — 2 onluq, `cmap="coolwarm"` — mənfi mavi, müsbət qırmızı.

> ⚠️ Kateqoriyal sütunla (məs. Product Category) korrelyasiya birbaşa hesablanmır. Əvvəlcə onu rəqəmə çevirmək (məs. `pd.get_dummies`) və ya qruplar üzrə ortaları müqayisə etmək lazımdır.
