---
title: 'İstisnalar: try, except, else, finally'
xp: 10
estimated_minutes: 8
---

Proqram işləyərkən xəta baş verə bilər: istifadəçi ədəd əvəzinə mətn yazır, fayl tapılmır, ədəd sıfıra bölünür. Belə xətalara **istisna** (exception) deyilir. İdarə olunmayan istisna proqramı dayandırır:

```python
int("salam")   # ValueError: invalid literal for int() with base 10: 'salam'
10 / 0         # ZeroDivisionError: division by zero
```

## Əsas istisnalar

| İstisna             | Nə vaxt                                 |
| ------------------- | --------------------------------------- |
| `ValueError`        | dəyər uyğun deyil — məs. `int("salam")` |
| `ZeroDivisionError` | sıfıra bölmə                            |
| `TypeError`         | uyğunsuz tiplər — məs. `"5" + 3`        |
| `KeyError`          | dictionary-də açar yoxdur               |
| `IndexError`        | siyahıda belə indeks yoxdur             |
| `FileNotFoundError` | fayl tapılmadı                          |

## Quruluş

```python
try:
    # xəta yarada biləcək kod
    number = int(input("Bir rəqəm daxil edin: "))
    print("Sizin rəqəminiz:", number)
except ValueError:
    # xəta baş verdikdə
    print("Bu, düzgün rəqəm deyil. Zəhmət olmasa, tam ədəd daxil edin.")
else:
    # xəta baş VERMƏDİKDƏ
    print("Siz uğurla rəqəm daxil etdiniz.")
finally:
    # HƏR HALDA — xəta olsa da, olmasa da
    print("Proqram icrası tamamlandı.")
```

| Blok              | Nə vaxt işləyir                             |
| ----------------- | ------------------------------------------- |
| `try`             | həmişə — «sınayırıq»                        |
| `except XətaTipi` | `try`-da həmin tip xəta baş verəndə         |
| `else`            | `try`-da heç bir xəta olmayanda             |
| `finally`         | hər halda, sonda (məs. faylı bağlamaq üçün) |

## Nümunə: sıfıra bölmə

```python
try:
    netice = 10 / 0
except ZeroDivisionError:
    print("Sıfıra bölmək mümkün deyil!")
else:
    print("Nəticə:", netice)
```

## Bir neçə xəta tipi

Bir `try`-dan sonra bir neçə `except` yazmaq olar — hər xəta tipinə öz mesajı:

```python
try:
    eded = int(input("Bölən: "))
    netice = 100 / eded
except ValueError:
    print("Ədəd daxil edin!")
except ZeroDivisionError:
    print("Sıfıra bölmək olmaz!")
```

## Xətanı özümüz yaratmaq: `raise`

```python
def yas_yoxla(yas):
    if yas < 0:
        raise ValueError("Yaş mənfi ola bilməz")
    return yas
```

> Bütün xətaları kor-koranə tutan `except:` (tipsiz) yazmaqdan çəkin — həqiqi səhvləri də gizlədir. Gözlədiyin konkret xəta tipini yaz.
