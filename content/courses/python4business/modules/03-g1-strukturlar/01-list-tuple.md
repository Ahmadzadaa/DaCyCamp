---
title: List və tuple
xp: 10
estimated_minutes: 7
---

Bir dəyişəndə çoxlu dəyər saxlamaq üçün **məlumat strukturlarından** istifadə edirik. Python-da dörd əsas struktur var: `list`, `tuple`, `dict`, `set`. Əvvəlcə ilk ikisi.

## List — `[ ]`

List sıralı və **dəyişdirilə bilən** (mutable) strukturdur. İstənilən tipli məlumatı saxlaya bilər, təkrarlara icazə verir.

- Elementləri əlavə etmək, silmək və dəyişdirmək olar.
- Eyni dəyər bir neçə dəfə ola bilər.
- Elementlərə **indekslə** müraciət olunur — sayma **0-dan** başlayır.

```python
meyveler = ["alma", "armud", "heyva"]
print(meyveler[0])     # alma — birinci element
print(meyveler[-1])    # heyva — sonuncu element
meyveler[1] = "nar"    # ikinci elementi dəyiş
print(meyveler)        # ['alma', 'nar', 'heyva']
```

### Əsas metodlar

| Metod       | Nə edir                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `append(x)` | sona yeni element əlavə edir                                           |
| `remove(x)` | verilən **dəyəri** silir (ilk rast gələni)                             |
| `pop(i)`    | verilən **indeksdəki** elementi silir və qaytarır; `pop()` — sonuncunu |
| `len(list)` | elementlərin sayı                                                      |

```python
my_list = [1, 2, 3, "apple"]
my_list.append(4)          # [1, 2, 3, 'apple', 4]
my_list.remove("apple")    # [1, 2, 3, 4]
print(my_list)             # [1, 2, 3, 4]
print(len(my_list))        # 4

son = my_list.pop()        # 4 — sonuncu element silinir və qaytarılır
print(my_list)             # [1, 2, 3]
```

> «3-cü element» dedikdə indeksi **2** olan element nəzərdə tutulur, çünki sayma 0-dan başlayır: `[0] → 1-ci`, `[1] → 2-ci`, `[2] → 3-cü`.

## Tuple — `( )`

Tuple sıralı, lakin **dəyişdirilə bilməyən** (immutable) strukturdur. Yaradıldıqdan sonra elementlərini dəyişmək olmur — buna görə dəyişməməli olan məlumatlar üçün təhlükəsiz seçimdir (məsələn, koordinatlar, tarixlər, sabit parametrlər).

- Dəyişdirilə bilməz.
- Təkrarlara icazə var.
- İndekslə müraciət olunur.

### Əsas metodlar

| Metod        | Nə edir                              |
| ------------ | ------------------------------------ |
| `len(tuple)` | elementlərin sayı                    |
| `count(x)`   | x-in neçə dəfə göründüyü             |
| `index(x)`   | x-in ilk dəfə harada olduğu (indeks) |

```python
my_tuple = (1, 2, 3, "banana")
print(len(my_tuple))             # 4
print(my_tuple.count(2))         # 1
print(my_tuple.index("banana"))  # 3

my_tuple[0] = 10   # TypeError — tuple dəyişdirilə bilməz
```
