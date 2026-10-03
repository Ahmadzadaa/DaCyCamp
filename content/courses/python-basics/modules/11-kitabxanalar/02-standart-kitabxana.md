---
title: 'Standart kitabxana: math, statistics, datetime, collections'
xp: 10
estimated_minutes: 9
---

Quraşdırmadan istifadə olunan ən faydalı modullar.

## math — riyazi funksiyalar

```python
import math
math.sqrt(16)      # 4.0
math.ceil(4.2)     # 5   — yuxarı yuvarlaqlaşdırma
math.floor(4.8)    # 4   — aşağı
math.pi            # 3.14159...
```

## statistics — sadə statistika

```python
import statistics as st
satis = [42, 38, 51, 47, 38]
st.mean(satis)     # 43.2  — orta
st.median(satis)   # 42    — median
st.mode(satis)     # 38    — ən çox təkrarlanan
st.stdev(satis)    # standart kənarlaşma
```

## datetime — tarix və vaxt

```python
from datetime import date, datetime, timedelta

sifaris = date(2024, 11, 25)
catdi = date(2024, 12, 2)
(catdi - sifaris).days            # 7 — iki tarix arasındakı fərq (timedelta)
sifaris + timedelta(days=14)      # date(2024, 12, 9)
sifaris.strftime("%d.%m.%Y")      # '25.11.2024'
sifaris.strftime("%A")            # 'Monday' — həftənin günü
datetime.strptime("02.12.2024", "%d.%m.%Y").date()   # sətirdən tarixə
```

| Kod | Mənası | Nümunə |
| --- | --- | --- |
| `%Y` | İl (4 rəqəm) | 2024 |
| `%m` | Ay (01–12) | 12 |
| `%d` | Gün (01–31) | 02 |
| `%A` | Həftənin günü | Monday |
| `%B` | Ayın adı | December |
| `%H:%M` | Saat:dəqiqə | 14:05 |

## collections.Counter — saymaq

```python
from collections import Counter
odenisler = ["Kart", "Nağd", "Kart", "Mobil", "Kart"]
say = Counter(odenisler)   # Counter({'Kart': 3, 'Nağd': 1, 'Mobil': 1})
say["Kart"]                # 3
say.most_common(1)         # [('Kart', 3)]
```

## Digər faydalı modullar

- `random` — təsadüfi ədədlər və seçim (`random.choice`, `random.seed`);
- `json` və `csv` — fayl formatları (növbəti fəsildə);
- `os`, `pathlib` — fayllar və qovluqlar.
