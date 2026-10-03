---
title: Sətirlər və Boolean dəyərlər (str, bool)
xp: 10
estimated_minutes: 7
---

## Sətirlər — `str`

Sətir (string) mətndir və tək `'...'` və ya cüt `"..."` dırnaq arasında yazılır. `str()` funksiyası istənilən dəyəri sətirə çevirir.

```python
name = "Riyad"
print(type(name))   # <class 'str'>
print(name)         # Riyad
```

### Əsas funksiya və metodlar

| Funksiya / metod         | Nə edir                                          | Nümunə                             | Nəticə                |
| ------------------------ | ------------------------------------------------ | ---------------------------------- | --------------------- |
| `str(x)`                 | sətirə çevirir                                   | `str(10)`                          | `'10'`                |
| `len(s)`                 | uzunluq (simvol sayı)                            | `len("Code")`                      | `4`                   |
| `s.upper()`              | bütün hərfləri böyüdür                           | `"Code".upper()`                   | `'CODE'`              |
| `s.lower()`              | bütün hərfləri kiçildir                          | `"Code".lower()`                   | `'code'`              |
| `s.replace(köhnə, yeni)` | hissəni əvəz edir                                | `"Code".replace("e", "e Academy")` | `'Code Academy'`      |
| `s.split()`              | sətiri hissələrə bölür (defolt: boşluqlara görə) | `"Code Academy".split()`           | `['Code', 'Academy']` |
| `ayırıcı.join(siyahı)`   | siyahının elementlərini birləşdirir              | `" ".join(["Hello", "World"])`     | `'Hello World'`       |

```python
name = "Code"
print(str(10))                          # 10
print(len(name))                        # 4
print(name.upper())                     # CODE
print(name.lower())                     # code
print(name.replace("e", "e Academy"))   # Code Academy
print("Code Academy".split())           # ['Code', 'Academy']
print("a,b,c".split(","))               # ['a', 'b', 'c'] — vergülə görə
print(" ".join(["Hello", "World"]))     # Hello World
```

> **Diqqət:** sətirlər dəyişdirilə bilməz. `name.replace(...)` `name`-i dəyişmir — **yeni** sətir qaytarır. Nəticəni saxlamaq üçün onu dəyişənə yaz: `yeni = name.replace("C", "K")`.

> Kodda yalnız düz dırnaqlardan (`"` və `'`) istifadə et. Word və ya slayddan köçürülən əyri dırnaqlar (`“ ”`, `‘ ’`) Python-da `SyntaxError` verir.

## Boolean dəyərlər — `bool`

Boolean məntiqi dəyərdir və cəmi iki dəyəri var: `True` (doğru) və `False` (yanlış). Müqayisələrin nəticəsi Boolean-dır: `5 > 3` → `True`.

```python
is_active = True
print(type(is_active))   # <class 'bool'>
print(is_active)         # True
```

### Əsas funksiya və operatorlar

|               | Nə edir                                                  | Nümunə                      | Nəticə  |
| ------------- | -------------------------------------------------------- | --------------------------- | ------- |
| `bool(x)`     | Boolean-a çevirir (`0`, boş sətir, boş siyahı → `False`) | `bool(0)`                   | `False` |
| `all(siyahı)` | **bütün** elementlər doğrudursa `True`                   | `all([True, True, False])`  | `False` |
| `any(siyahı)` | **hər hansı** element doğrudursa `True`                  | `any([False, True, False])` | `True`  |
| `not`         | əksinə çevirir                                           | `not True`                  | `False` |
| `and`         | hər ikisi doğrudursa `True`                              | `True and False`            | `False` |
| `or`          | biri doğrudursa `True`                                   | `True or False`             | `True`  |

```python
a = True
b = False
print(bool(1))                       # True
print(bool(0))                       # False
print(all([True, True, False]))      # False
print(any([False, True, False]))     # True
print(not a)                         # False
print(a and b)                       # False
print(a or b)                        # True
```
