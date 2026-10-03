---
title: 'Şərtlər: if, elif, else'
xp: 10
estimated_minutes: 7
---

Excel-dəki `=IF(şərt; doğrudursa; yanlışdırsa)` funksiyasını xatırlayırsan? Python-da bunun qarşılığı `if` ifadəsidir. O, şərtin doğru (`True`) və ya yanlış (`False`) olmasından asılı olaraq fərqli əmrləri icra edir.

```python
yas = 20

if yas >= 18:
    print("Yetkin")
else:
    print("Yetkin deyil")
```

Qaydalar:

- Şərtdən sonra **iki nöqtə** `:` qoyulur.
- Şərt doğru olanda icra olunan kod **4 boşluq** içəridən yazılır (indentasiya). Python blokları mötərizə ilə yox, məhz bu boşluqlarla müəyyən edir.
- `else` bloku şərt yanlış olanda icra olunur və məcburi deyil.

## Bir neçə şərt: `elif`

`elif` («else if») ilə şərtləri ardıcıl yoxlayırıq. İlk doğru şərtin bloku icra olunur, qalanları yoxlanılmır:

```python
if şərt1:
    # şərt1 doğru olduqda
elif şərt2:
    # şərt1 yanlış, şərt2 doğru olduqda
else:
    # heç biri doğru olmadıqda
```

```python
bal = 78

if bal >= 90:
    qiymet = "Əla"
elif bal >= 70:
    qiymet = "Yaxşı"
elif bal >= 50:
    qiymet = "Kafi"
else:
    qiymet = "Qeyri-kafi"

print(qiymet)   # Yaxşı
```

## Şərtləri birləşdirmək: `and`, `or`, `not`

```python
yas = 25
gelir = 1500

if yas >= 18 and gelir > 1000:
    print("Kredit verilə bilər")

if yas < 18 or gelir == 0:
    print("Kredit verilmir")

if not (yas < 18):
    print("Yetkindir")
```

> **Diqqət — `&` və `|`:** adi Python şərtlərində «və» üçün `and`, «və ya» üçün `or` yazılır. `&` və `|` işarələri **pandas**-da cədvəli filtrləyəndə istifadə olunur (hər şərt mötərizədə): `df[(df["yas"] > 18) & (df["gelir"] > 1000)]`. Bunu sonrakı günlərdə görəcəyik. Adi `if`-də `&` yazsan, gözlənilməz nəticə ala bilərsən.
