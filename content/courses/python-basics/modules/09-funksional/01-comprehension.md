---
title: List comprehension və sıralama
xp: 10
estimated_minutes: 8
---

Data ilə işləyəndə tez-tez bir siyahıdan başqa siyahı yaradırıq: qiymətlərə ƏDV əlavə etmək, bahalı məhsulları seçmək... Bunu `for` dövrü ilə də etmək olar, amma Python-da daha qısa və oxunaqlı yol var — **comprehension**.

## List comprehension

```python
qiymetler = [2399, 549, 39, 899]

# for dövrü ilə
edv_li = []
for q in qiymetler:
    edv_li.append(q * 1.18)

# list comprehension ilə — eyni nəticə, bir sətirdə
edv_li = [q * 1.18 for q in qiymetler]
```

Quruluş: **`[ifadə for element in siyahı]`**.

## Şərtlə seçmək

```python
bahali = [q for q in qiymetler if q > 500]   # [2399, 549, 899]
```

Quruluş: **`[ifadə for element in siyahı if şərt]`**.

## Dictionary və set comprehension

```python
mehsullar = ["iPhone 15", "Redmi Note 13"]
qiymetler = [2399, 549]

cedvel = {m: q for m, q in zip(mehsullar, qiymetler)}
# {'iPhone 15': 2399, 'Redmi Note 13': 549}

seherler = {s.strip().title() for s in ["bakı", " Bakı", "gəncə"]}
# {'Bakı', 'Gəncə'} — set təkrarları atır
```

`zip()` iki siyahını cüt-cüt birləşdirir: `("iPhone 15", 2399)`, `("Redmi Note 13", 549)`.

## Sıralama: `sorted()` və `key`

```python
sorted([3, 1, 2])                 # [1, 2, 3]
sorted([3, 1, 2], reverse=True)   # [3, 2, 1]
```

Mürəkkəb elementləri sıralamaq üçün **`key`** — hər elementdən sıralama dəyərini çıxaran funksiya:

```python
mehsullar = [("iPhone 15", 2399), ("T-Shirt", 39), ("Dyson V15", 1499)]
sorted(mehsullar, key=lambda m: m[1])
# [('T-Shirt', 39), ('Dyson V15', 1499), ('iPhone 15', 2399)]

max(mehsullar, key=lambda m: m[1])   # ('iPhone 15', 2399)
```

> 💡 `lambda m: m[1]` — «elementi götür, onun ikinci hissəsini (qiyməti) qaytar» deməkdir. Növbəti dərsdə lambda-nı ətraflı öyrənəcəyik.
