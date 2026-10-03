---
title: Funksiyalar
xp: 10
estimated_minutes: 8
---

İndiyədək hazır funksiyalardan istifadə etdik: `print()`, `len()`, `sum()`. İndi **öz funksiyamızı** yazacağıq.

**Funksiya** — müəyyən əməliyyatı yerinə yetirən, adı olan kod blokudur. Bir dəfə yazırsan, istədiyin qədər çağırırsan. Bu, kodun təkrarlanmasının qarşısını alır və proqramı oxunaqlı edir.

## Quruluş

```python
def funksiya_adi(param1, param2):
    # kod bloku
    return netice
```

- `def` — funksiyanı təyin edən açar söz.
- **Parametrlər** — funksiyanın qəbul etdiyi dəyərlər (mötərizədə).
- `return` — funksiyanın **qaytardığı** nəticə. `return` olmayan funksiya `None` qaytarır.

```python
def topla(a, b):
    return a + b

netice = topla(5, 3)
print(netice)   # 8
```

## `return` və `print` fərqi

`print()` nəticəni sadəcə ekrana yazır. `return` isə nəticəni çağırana **qaytarır** — onu dəyişənə yazmaq və sonra istifadə etmək olur:

```python
def kvadrat_yaz(x):
    print(x * x)       # yalnız ekrana yazır

def kvadrat(x):
    return x * x       # nəticəni qaytarır

a = kvadrat_yaz(3)     # ekranda 9, amma a = None
b = kvadrat(3)         # b = 9
print(b + 1)           # 10
```

## Defolt parametrlər

Parametrə əvvəlcədən dəyər vermək olar. Çağıranda həmin arqument verilməsə, defolt dəyər istifadə olunur:

```python
def salamla(ad="Dost"):
    return "Salam, " + ad + "!"

print(salamla("Aysel"))   # Salam, Aysel!
print(salamla())          # Salam, Dost!
```

## Funksiya + if

Funksiyanın içində şərtlərdən istifadə edərək fərqli hallarda fərqli nəticə qaytara bilərik:

```python
def edede_bax(eded):
    if eded > 100:
        return "Böyük"
    else:
        return "Kiçik"

print(edede_bax(250))   # Böyük
print(edede_bax(7))     # Kiçik
```

> `return` icra olunan kimi funksiya dərhal bitir — ondan sonrakı sətirlər işləmir.
