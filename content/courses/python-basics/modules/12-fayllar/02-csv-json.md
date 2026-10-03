---
title: CSV və JSON formatları
xp: 10
estimated_minutes: 8
---

## CSV — vergüllə ayrılmış cədvəl

```text
Transaction ID,Date,Region,Product Name,Total Revenue
100002,2024-01-01,Bakı,iPhone 15,2399
```

`csv` modulu sətirləri düzgün bölür — hətta xanaların içində vergül olsa belə (`"Levi's 501, Blue"`).

```python
import csv

with open("satis_yanvar.csv", encoding="utf-8") as f:
    for setir in csv.DictReader(f):
        print(setir["Region"], setir["Total Revenue"])
```

- `csv.reader` — hər sətri **siyahı** kimi verir.
- `csv.DictReader` — hər sətri başlıqlarla **dictionary** kimi verir (`setir["Region"]`) — daha oxunaqlıdır.
- ⚠️ Dəyərlər həmişə **sətir** kimi gəlir: `float(setir["Total Revenue"])` ilə ədədə çevir.

Yazmaq üçün `csv.writer` və ya `csv.DictWriter`:

```python
with open("xulase.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Region", "Gəlir"])
    w.writerow(["Bakı", 48210.5])
```

## JSON — API-lərin və konfiqurasiyanın dili

JSON Python-un dictionary və siyahılarına çox oxşayır:

```python
import json

hesabat = {"ay": "Yanvar", "sifaris": 152, "top": ["iPhone 15", "AirPods Pro 2"]}

s = json.dumps(hesabat, ensure_ascii=False)       # dict → JSON sətri
geri = json.loads(s)                             # JSON sətri → dict

with open("hesabat.json", "w", encoding="utf-8") as f:
    json.dump(hesabat, f, ensure_ascii=False, indent=2)   # fayla
with open("hesabat.json", encoding="utf-8") as f:
    oxunan = json.load(f)                                 # fayldan
```

`ensure_ascii=False` Azərbaycan hərflərini `\u0259` kimi kodlaşdırmadan, olduğu kimi yazır.

> 💡 Böyük cədvəllərlə işləmək üçün `csv` modulu əvəzinə **pandas** daha güclüdür: `pd.read_csv("satis_yanvar.csv")`. Bunu növbəti kursda öyrənəcəyik — amma pandas da arxa planda eyni prinsiplərlə işləyir.
