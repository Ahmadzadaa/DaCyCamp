---
title: 'İlk funksiyalarınız: datanı tanımaq'
xp: 10
estimated_minutes: 9
---

Təhlilə başlamazdan əvvəl datanı **tanımaq** lazımdır: neçə sətir var, hansı sütunlar, tiplər düzgündürmü, boşluqlar, dublikatlar varmı? Buna **EDA** (Exploratory Data Analysis — kəşfiyyat təhlili) deyilir.

> 📁 Bu fəsildə `satislar_xam.csv` ilə işləyirik — eyni satış datasının sistemdən gəldiyi kimi, **təmizlənməmiş** versiyası.

## Gün 3-ün «ilk funksiyaları»

| Kod | Nə göstərir |
| --- | --- |
| `df.shape` | Neçə sətir və neçə sütun |
| `df.columns.tolist()` | Sütun adları (siyahı) |
| `df.dtypes` | Məlumat tipləri |
| `df.info()` | Xülasə: sətir sayı, hər sütunda boş olmayan dəyər sayı, tiplər, yaddaş |
| `df.isnull().sum()` | Hər sütunda itkin (boş) dəyərlərin sayı |
| `(df.isnull().sum() / len(df)) * 100` | İtkin dəyərlərin faizi |
| `df.describe(include="all")` | Təsviri statistika: say, orta, std, min, kvartillər, max (mətn sütunlarında: unikal, ən çox rast gələn) |
| `df[col].nunique()` | Unikal dəyərlərin sayı |
| `df[col].value_counts()` | Hər dəyərin neçə dəfə keçdiyi |
| `df.duplicated().sum()` | Tam təkrarlanan sətirlərin sayı |

## isnull() necə işləyir?

`df.isnull()` cədvəlin eyni ölçüdə **True/False** surətini qaytarır: boş xana — `True`. Python-da `True` = 1, `False` = 0 olduğu üçün `.sum()` hər sütundakı boşluqları sayır.

```python
df.isnull().sum()
```

```text
Transaction ID     0
Date               0
Sales Employee     9
Unit Price         7
Payment Method    14
...
```

## describe()

```python
df.describe()                 # yalnız ədədi sütunlar
df.describe(include="all")    # hamısı
```

| Sətir | Mənası |
| --- | --- |
| `count` | Boş olmayan dəyərlərin sayı |
| `mean` | Orta |
| `std` | Standart kənarlaşma |
| `min`, `max` | Ən kiçik, ən böyük |
| `25%`, `50%`, `75%` | Kvartillər (`50%` — median) |

## value_counts() və nunique()

```python
df["Payment Method"].value_counts()
```

```text
Credit Card      528
Debit Card       356
Cash             230
Mobile Wallet    144
```

`value_counts()` nəticəni çoxdan aza sıralayır. `normalize=True` əlavə etsən, faizlər (paylar) qaytarır.

> 💡 EDA-dan çıxan suallar təmizləmə planını verir: hansı sütunlarda boşluq var, dublikatları silməliyikmi, tiplər düzgündürmü? Təmizləməni sonrakı fəsillərdə edəcəyik.
