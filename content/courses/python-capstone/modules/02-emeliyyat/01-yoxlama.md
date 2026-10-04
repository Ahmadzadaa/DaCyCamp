---
title: 'Datanı tanımaq: 5 dəqiqəlik yoxlama siyahısı'
xp: 10
estimated_minutes: 8
---

Hər yeni datasetdə ilk iş — onu tanımaqdır. Bu 6 sətir səni saatlarla yanlış nəticədən qoruyur:

```python
import pandas as pd

df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

df.shape                      # (1582, 16) — neçə sətir, neçə sütun?
df.dtypes                     # tarixlər datetime64-dürmü?
df.isna().sum().sum()         # boş xana varmı?
df["OrderDate"].agg(["min", "max"])   # hansı dövrü əhatə edir?
df["OrderID"].nunique()       # neçə sifariş (sətir yox!)?
df["CustomerID"].nunique()    # neçə müştəri?
```

## Gizli problem: təkrarlanan adlar

```python
df.groupby("CustomerName")["CustomerID"].nunique().sort_values(ascending=False).head()
```

Əgər bir adın arxasında birdən çox ID varsa — deməli fərqli insanlar eyni adı daşıyır. Adla qruplaşdırsan, onların alışları **birləşəcək** və «saxta» super-müştəri yaranacaq.

## Tarix fərqi

İki `datetime` sütununun fərqi `Timedelta`-dır; gün sayı üçün `.dt.days`:

```python
df["ShipDays"] = (df["ShipDate"] - df["OrderDate"]).dt.days
df["ShipDays"].describe()
```

## Bir neçə metrika birdən: named aggregation

```python
df.groupby("ShipMode").agg(
    ort_gun=("ShipDays", "mean"),
    satis=("Sales", "sum"),
    ort_say=("Quantity", "mean"),
).sort_values("ort_gun")
```

Nəticə cədvəlinin sütun adlarını özün seçirsən — hesabat üçün hazır cədvəl.
