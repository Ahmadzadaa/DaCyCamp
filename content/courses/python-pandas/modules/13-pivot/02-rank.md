---
title: 'Rank: sıra yeri'
xp: 10
estimated_minutes: 6
---

`rank()` hər dəyərin sıradakı **yerini** verir — reytinq cədvəlləri üçün.

```python
df["yer"] = df["Bal"].rank(ascending=False)     # ən böyük — 1-ci yer
```

## Bərabər dəyərlər necə sıralanır? `method`

Ballar: 95, 88, 88, 70 (ikisi bərabər):

| method | 95 | 88 | 88 | 70 | Mənası |
| --- | --- | --- | --- | --- | --- |
| `average` (defolt) | 1 | 2.5 | 2.5 | 4 | Orta yer |
| `min` | 1 | 2 | 2 | 4 | Kiçik yer (idman yarışları kimi) |
| `max` | 1 | 3 | 3 | 4 | Böyük yer |
| `first` | 1 | 2 | 3 | 4 | Datadakı sıraya görə |
| `dense` | 1 | 2 | 2 | 3 | Eyni yer, boşluq olmadan |

## Digər parametrlər

- `ascending=False` — böyük dəyər 1-ci yer;
- `pct=True` — yer faizlə (0–1): «ən yaxşı 10%»;
- `na_option="keep" | "top" | "bottom"` — boş dəyərlərin yeri.

Qrup daxilində reytinq:

```python
df["region_yeri"] = df.groupby("Region")["Total Revenue"].rank(ascending=False)
```
