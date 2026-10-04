---
title: 'Matplotlib: qrafik funksiyaları'
xp: 10
estimated_minutes: 9
---

```python
import matplotlib.pyplot as plt
```

Hər qrafik **figure** (pəncərə, kətan) və onun içindəki bir və ya bir neçə **axes** (oxlu qrafik sahəsi) üzərində çəkilir. `plt.bar(...)` kimi funksiyalar **cari** axes-ə çəkir.

## Əsas funksiyalar

| Funksiya | Qrafik |
| --- | --- |
| `plt.plot(x, y)` | Xətt |
| `plt.bar(x, height)` / `plt.barh(y, width)` | Sütun / üfüqi sütun |
| `plt.scatter(x, y)` | Səpələnmə (nöqtə) |
| `plt.hist(data, bins=...)` | Histoqram |
| `plt.pie(data, labels=...)` | Dairə |
| `plt.boxplot(data)` | Qutu (yayılma, mərkəz, kənar dəyərlər) |

## Parametrlər

```python
plt.bar(x, height, color="steelblue", width=0.5)
plt.barh(y, width, color="orange", height=0.5)

plt.scatter(x, y,
            c=rengler,          # nöqtələrin rəngi (dəyərə görə rəng xəritəsi də olar)
            cmap="viridis",     # rəng xəritəsi
            s=olculer,          # nöqtələrin ölçüsü
            alpha=0.5)          # şəffaflıq: 0 — tam şəffaf, 1 — qeyri-şəffaf
plt.colorbar()                  # rəng şkalası

plt.hist(data, bins=10, color="blue", alpha=0.5, edgecolor="black")

plt.pie(data, labels=labels,
        startangle=90,          # başlanğıc bucaq
        explode=[0.1, 0, 0],    # ilk dilim 10% kənara çıxsın
        shadow=True,
        autopct="%1.1f%%")      # faizlər

plt.boxplot(data, notch=True, vert=True, patch_artist=True)

plt.plot(x, y, color="red", linestyle="-", linewidth=2,
         marker="o", markersize=8, markerfacecolor="r")
```

## Qutu qrafikini oxumaq

```text
    ●          ← kənar dəyər (outlier)
   ─┬─         ← maksimum (1.5 × IQR daxilində)
  ┌─┴─┐
  │   │        ← Q3 (75%)
  ├───┤        ← median
  │   │        ← Q1 (25%)
  └─┬─┘
   ─┴─         ← minimum
```

Qutunun hündürlüyü — **IQR** (Q3 − Q1): datanın ortadakı 50%-i. Uzun qutu — dağınıq data.
