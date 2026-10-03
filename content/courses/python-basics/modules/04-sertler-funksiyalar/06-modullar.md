---
title: Modullar
xp: 10
estimated_minutes: 6
---

Proqram böyüdükcə bütün funksiyaları bir faylda saxlamaq çətinləşir. **Modul** — funksiya, dəyişən və siniflərin saxlandığı ayrıca `.py` faylıdır. Onu başqa faylda `import` açar sözü ilə daxil edib istifadə edirik.

Biz artıq hazır modullardan istifadə etmişik: `import math` → `math.ceil()`. İndi öz modulumuzu yaradaq.

## Nümunə

Tutaq ki, `hesablama.py` adlı faylımız var:

```python
# hesablama.py
def topla(a, b):
    return a + b

def vurma(a, b):
    return a * b
```

Bu modulu başqa faylda (məsələn, `main.py` və ya notebook-da) istifadə edirik:

```python
# main.py
import hesablama

netice = hesablama.topla(3, 4)
print(netice)        # 7

vurma_netice = hesablama.vurma(3, 4)
print(vurma_netice)  # 12
```

Qaydalar:

- Modulun adı faylın adıdır (`.py` olmadan): `hesablama.py` → `import hesablama`.
- Modulun funksiyası nöqtə ilə çağırılır: `hesablama.topla(...)`.
- Yalnız lazım olan funksiyanı da götürmək olar: `from hesablama import topla` → sonra sadəcə `topla(3, 4)`.
- Qısa ad vermək olar: `import pandas as pd` → `pd.read_csv(...)`.

> Modul faylı import edən faylla eyni qovluqda (iş direktoriyasında) olmalıdır. İş direktoriyası haqqında Jupyter bölməsində danışacağıq.

## Jupyter-də modul faylı yaratmaq

Jupyter-də hüceyrənin əvvəlinə `%%writefile hesablama.py` yazsan, hüceyrənin məzmunu fayla yazılır. Python-un özündə isə bunu `open()` ilə edirik:

```python
kod = '''
def topla(a, b):
    return a + b
'''

with open("hesablama.py", "w") as f:
    f.write(kod)

import hesablama
print(hesablama.topla(2, 5))   # 7
```

Növbəti tapşırıqda bu üsulla öz modulunu yaradacaqsan.
