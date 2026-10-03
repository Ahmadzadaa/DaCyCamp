---
title: Modul, paket, kitabxana; PyPI və pip
xp: 10
estimated_minutes: 8
---

Python-un gücü təkcə dilin özündə deyil — milyonlarla proqramçının yazdığı hazır **paketlərdədir**. Data analitikası üçün pandas, qrafiklər üçün matplotlib, maşın öyrənməsi üçün scikit-learn — hamısı paketdir.

## Anlayışlar

| Anlayış | Nədir | Nümunə |
| --- | --- | --- |
| **Modul** | Bir `.py` faylı | `hesablama.py`, `math` |
| **Paket** | Modulları birləşdirən qovluq | `pandas`, `matplotlib` |
| **Kitabxana** | Bir və ya bir neçə paketdən ibarət hazır alətlər toplusu (gündəlik danışıqda «paket» ilə eyni mənada) | pandas kitabxanası |
| **Standart kitabxana** | Python ilə birlikdə gələn modullar — quraşdırmaq lazım deyil | `math`, `datetime`, `random`, `json`, `csv` |

## PyPI və pip

**PyPI** (Python Package Index, pypi.org) — Python paketlərinin mərkəzi anbarıdır: yüz minlərlə paket, mütəmadi yenilənir. Paketlər **pip** aləti ilə quraşdırılır:

```bash
pip install pandas          # terminalda
!pip install pandas         # Jupyter / Colab hüceyrəsində
```

Paket bir dəfə quraşdırılır, amma hər yeni sessiyada (notebook-u yenidən açanda) **import** edilməlidir.

> 💻 DaCy-də pandas, numpy, matplotlib kimi paketlər brauzerdə avtomatik yüklənir — `import` yazmaq kifayətdir. seaborn kimi bəziləri ilk istifadədə internetdən quraşdırılır (bir neçə saniyə).

## import yazılışları

```python
import math                     # math.sqrt(16)
import pandas as pd             # ləqəb (alias): pd.read_csv(...)
from math import sqrt, ceil     # birbaşa: sqrt(16)
from datetime import date       # date(2024, 12, 2)
```

Data dünyasında qəbul olunmuş ləqəblər:

| Paket | Ləqəb |
| --- | --- |
| pandas | `pd` |
| numpy | `np` |
| matplotlib.pyplot | `plt` |
| seaborn | `sns` |

> ⚠️ `from paket import *` yazılışından qaç — hansı adın haradan gəldiyi bilinmir və adlar toqquşa bilər.

## Funksiya haqqında məlumat

- Jupyter-də funksiyanın adından sonra mötərizənin içində **Shift + Tab** — arqumentləri göstərir.
- `help(funksiya)` — sənədləşməni çap edir.
