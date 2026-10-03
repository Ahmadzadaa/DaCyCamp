---
title: lambda, map, filter, reduce və eval
xp: 10
estimated_minutes: 8
---

## lambda — adsız, qısa funksiya

```python
def kvadrat(x):
    return x ** 2

kvadrat = lambda x: x ** 2    # eyni funksiya, bir sətirdə
```

`lambda arqumentlər: ifadə` — adətən bir dəfə, başqa funksiyanın içində istifadə olunan kiçik funksiyalar üçündür: `sorted(..., key=lambda ...)`, `map()`, `filter()`, sonra pandas-da `apply()`.

## map — hər elementə funksiya tətbiq et

```python
satislar = [120.5, 89.9, 300.0]
endirimli = list(map(lambda x: x * 0.9, satislar))
# [108.45, 80.91, 270.0]
```

`map()` «tənbəl» obyekt qaytarır — nəticəni görmək üçün `list()` ilə siyahıya çeviririk.

## filter — şərtə uyğun elementləri saxla

```python
boyuk = list(filter(lambda x: x > 100, satislar))   # [120.5, 300.0]
```

## reduce — ardıcıllığı tək dəyərə «yığ»

`reduce` `functools` modulundadır. Funksiyanı ilk iki elementə, sonra nəticəyə və növbəti elementə tətbiq edir:

```python
from functools import reduce

cem = reduce(lambda x, y: x + y, [1, 2, 3, 4, 5])
# ((((1 + 2) + 3) + 4) + 5) = 15
```

| Alət | Giriş | Nəticə |
| --- | --- | --- |
| `map(f, siyahı)` | n element | n element (çevrilmiş) |
| `filter(f, siyahı)` | n element | ≤ n element (seçilmiş) |
| `reduce(f, siyahı)` | n element | 1 dəyər |

> 📝 Comprehension çox vaxt `map`/`filter`-dən daha oxunaqlıdır: `[x * 0.9 for x in satislar]`. Hər iki yazılışı tanımaq vacibdir — başqalarının kodunda ikisi də olur.

## eval — sətri Python ifadəsi kimi icra etmək

```python
eval("5 + 10")      # 15
x = 10
eval("x * 2")       # 20
```

⚠️ **Təhlükəsizlik:** `eval()` istifadəçidən və ya internetdən gələn mətni **heç vaxt** icra etməməlidir — həmin mətn istənilən Python kodu ola bilər (faylları silmək, məlumat oğurlamaq). Pandas-da isə `df.eval("A + B")` təhlükəsiz, sütunlarla hesablama üçün nəzərdə tutulmuş başqa alətdir — onu Pandas kursunda görəcəyik.
