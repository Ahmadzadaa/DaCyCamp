---
title: to_datetime və .dt
xp: 10
estimated_minutes: 9
---

CSV-dən oxunan tarix əslində **mətndir** (`object`). Tarixlə hesablama aparmaq üçün onu `datetime` tipinə çevirmək lazımdır:

```python
df["Date"] = pd.to_datetime(df["Date"])
# və ya oxuyanda: pd.read_csv("satislar.csv", parse_dates=["Date"])
```

## .dt — tarixin hissələri

| Kod | Nəticə |
| --- | --- |
| `df["Date"].dt.year` | 2024 |
| `df["Date"].dt.month` | 3 |
| `df["Date"].dt.day` | 15 |
| `df["Date"].dt.quarter` | 1 (rüb) |
| `df["Date"].dt.day_name()` | "Friday" |
| `df["Date"].dt.to_period("M")` | 2024-03 (ay dövrü) |
| `df["Date"].dt.strftime("%d.%m.%Y")` | "15.03.2024" |

## Tarixə görə filtr

```python
df[df["Date"].dt.year == 2024]
df[(df["Date"] >= "2024-01-01") & (df["Date"] < "2024-04-01")]   # I rüb
df[df["Date"].between("2024-06-01", "2024-08-31")]
```

## Aylıq qruplaşdırma

```python
ayliq = df.groupby(df["Date"].dt.to_period("M"))["Total Revenue"].sum()
```

## Aydan-aya dəyişmə: pct_change

```python
deyisme = ayliq.pct_change() * 100     # əvvəlki aya nisbətən %
```

`pct_change()` hər dəyəri əvvəlki ilə müqayisə edir: `(cari − əvvəlki) / əvvəlki`. İlk dəyər `NaN` olur (müqayisə ediləcək əvvəlki ay yoxdur).

## İki ölçülü cədvəl: unstack

```python
region_ay = (df.groupby([df["Date"].dt.to_period("M"), "Region"])["Total Revenue"]
               .sum()
               .unstack(fill_value=0))
```

`unstack()` ikinci səviyyəli indeksi sütunlara çevirir: sətirlər — aylar, sütunlar — regionlar. Bunu `pivot_table` ilə də etmək olar (növbəti fəsillərdən birində).
