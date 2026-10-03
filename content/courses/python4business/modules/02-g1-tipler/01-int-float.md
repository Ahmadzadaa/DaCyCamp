---
title: Tam və ondalıqlı ədədlər (int, float)
xp: 10
estimated_minutes: 7
---

Hər dəyərin bir **tipi** var. Tip dəyərlə nə edə biləcəyimizi müəyyən edir. Tipi `type()` funksiyası göstərir.

## Tam ədədlər — `int`

Tam ədədlərin ondalıq hissəsi yoxdur. `int()` funksiyası dəyəri tam ədədə çevirir.

```python
x = 10
print(type(x))   # <class 'int'>
print(x)         # 10
```

### Əsas funksiyalar

| Funksiya       | Nə edir                                   | Nümunə          | Nəticə   |
| -------------- | ----------------------------------------- | --------------- | -------- |
| `int(x)`       | tam ədədə çevirir (kəsr hissəni **atır**) | `int(5.7)`      | `5`      |
| `abs(x)`       | mütləq dəyər                              | `abs(-10)`      | `10`     |
| `pow(x, y)`    | x-in y qüvvəti (`x ** y` ilə eyni)        | `pow(2, 3)`     | `8`      |
| `divmod(x, y)` | qisməti və qalığı birlikdə qaytarır       | `divmod(10, 3)` | `(3, 1)` |
| `max(...)`     | ən böyük dəyər                            | `max(1, 2, 3)`  | `3`      |
| `min(...)`     | ən kiçik dəyər                            | `min(1, 2, 3)`  | `1`      |

```python
x = -10
print(int(5.7))        # 5  — yuvarlaqlaşdırmır, sadəcə kəsri atır
print(abs(x))          # 10
print(pow(2, 3))       # 8
print(divmod(10, 3))   # (3, 1): 10 = 3 · 3 + 1
print(max(1, 2, 3))    # 3
print(min(1, 2, 3))    # 1
```

`divmod()` iki dəyər qaytarır — onları birbaşa iki dəyişənə yaza bilərik:

```python
qismet, qaliq = divmod(10, 3)
print(qismet)   # 3
print(qaliq)    # 1
```

`max()` və `min()` siyahı ilə də işləyir: `max([4, 9, 2])` → `9`.

## Ondalıqlı ədədlər — `float`

Ondalıqlı ədədlər nöqtə ilə yazılır (vergül yox!). `float()` funksiyası dəyəri ondalıqlı ədədə çevirir.

```python
y = 10.5
print(type(y))   # <class 'float'>
print(y)         # 10.5
```

### Əsas funksiyalar

| Funksiya        | Nə edir                             | Nümunə                 | Nəticə |
| --------------- | ----------------------------------- | ---------------------- | ------ |
| `float(x)`      | ondalıqlı ədədə çevirir             | `float(7)`             | `7.0`  |
| `round(x)`      | ən yaxın tam ədədə yuvarlaqlaşdırır | `round(10.75)`         | `11`   |
| `round(x, n)`   | n rəqəmə qədər yuvarlaqlaşdırır     | `round(10.75, 1)`      | `10.8` |
| `sum(siyahı)`   | elementləri toplayır                | `sum([1.5, 2.5, 3.0])` | `7.0`  |
| `math.ceil(x)`  | **yuxarı** yuvarlaqlaşdırır         | `math.ceil(10.2)`      | `11`   |
| `math.floor(x)` | **aşağı** yuvarlaqlaşdırır          | `math.floor(10.8)`     | `10`   |

`ceil` və `floor` `math` modulundadır — əvvəlcə onu import etmək lazımdır:

```python
import math

y = 10.75
print(float(7))                 # 7.0
print(round(y, 1))              # 10.8
print(sum([1.5, 2.5, 3.0]))     # 7.0
print(math.ceil(y))             # 11
print(math.floor(y))            # 10
```

> **Maraqlı fakt:** `round(2.5)` nəticəsi `2`-dir, `3` yox! Python tam ortadakı dəyərləri ən yaxın **cüt** ədədə yuvarlaqlaşdırır («bankir yuvarlaqlaşdırması»): `round(3.5)` → `4`, `round(2.5)` → `2`.
