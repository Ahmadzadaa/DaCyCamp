---
title: OOP, Python skripti və PEP8
xp: 10
estimated_minutes: 6
---

## Obyekt əsaslı proqramlaşdırma (OOP)

**Obyekt əsaslı proqramlaşdırma** (Object Oriented Programming) — proqramın **obyektlər** vasitəsilə qurulduğu yanaşmadır. Python-da hər şey obyektdir: ədəd, sətir, siyahı, funksiya.

Hər obyektin öz **metodları** var — həmin obyektlə işləyən funksiyalar. Metod nöqtə ilə çağırılır:

```python
a = "Code Academy"
a.replace("Academy", "Python")   # "Code Python"
a.upper()                        # "CODE ACADEMY"
```

Müqayisə et: `sum([2, 3])` — adi funksiyadır, arqumenti mötərizədə verirsən. `a.replace(...)` isə metoddur — `a` sətir obyektinə məxsusdur.

Kitabxanalarda da eyni məntiq var: `numpy.sum([2, 3])` — `numpy` modulunun `sum` funksiyası.

## Python skripti

- Python faylları `.py` (adi skript) və ya `.ipynb` (Jupyter notebook) formatında olur.
- Skript adətən lazım olan paketlərin **import**-u ilə başlayır:

```python
import math
import pandas as pd
```

- **Şərh** (comment) `#` ilə başlayır — Python onu icra etmir:

```python
# Bu bir şərhdir
qiymet = 100  # sətrin sonunda da şərh yazmaq olar

# Məlumatların yüklənməsi ####
```

- Bir neçə sətirlik izah üçün üçqat dırnaq istifadə olunur:

```python
"""
Bu skript aylıq satışları hesablayır.
Müəllif: Data komandası
"""
```

## PEP8 — kod yazma tərzi

**PEP8** — Python kodunun necə yazılmalı olduğunu təsvir edən rəsmi tövsiyələrdir. Əsas prinsiplər:

- **İndentasiya:** hər səviyyə üçün 4 boşluq.
- **Sətir uzunluğu:** maksimum 79 simvol.
- **Dəyişən və funksiya adları:** `snake_case` — `orta_gelir`, `hesabla_vergi()`.
- **Sinif adları:** `PascalCase` — `MusteriHesabi`.
- **Boşluqlar:** operatorlardan əvvəl və sonra bir boşluq — `x = a + b`, `x=a+b` yox.

```python
# Pis
def HesablaGelir(Qiymet,Say):
  return Qiymet*Say

# Yaxşı (PEP8)
def hesabla_gelir(qiymet, say):
    return qiymet * say
```

> Python-da vahid «dəst-xətt» yoxdur — bu open source-dur, hər kəs öz üslubunda yaza bilər. PEP8 isə komandada hamının kodunu eyni cür oxunaqlı edir.
