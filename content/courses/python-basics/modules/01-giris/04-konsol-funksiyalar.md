---
title: '«Spreadsheet»-dən «Console»-a: funksiyalar və operatorlar'
xp: 10
estimated_minutes: 7
---

Excel-də `=SUM(A1:A5)` yazmağa öyrəşmisənsə, Python funksiyaları sənə tanış gələcək: funksiyanın adı və mötərizədə **arqumentlər**. Excel-də olduğu kimi, bir funksiyanın arqumentinin yerinə başqa funksiya yazmaq olar.

```python
sum([2, 3])               # 5
len([2, 3])               # 2 — siyahıdakı elementlərin sayı
sum([2, len([2, 3])])     # 4 — len() nəticəsi sum()-ın arqumentidir
```

Diqqət: Excel-dəki hər funksiyanın Python-da eyni adlı qarşılığı yoxdur.

```python
sum([2, count(2, 3)])     # NameError — count() adlı hazır funksiya yoxdur
sum([2, len(2, 3)])       # TypeError — len() bir arqument (məsələn, siyahı) gözləyir
```

## List nədir?

**List (siyahı)** — dəyərlərdən ibarət sıralı toplu: sətir, sütun və ya sadəcə dəyərlər dəsti. Kvadrat mötərizədə yazılır və müxtəlif tipli məlumatları saxlaya bilir:

```python
qiymetler = [12.5, 8, 30]
qarisiq = [1, "alma", 3.14, True]
len(qarisiq)   # 4
```

## Operatorlar

| Operator   | Məna                         | Nümunə   | Nəticə  |
| ---------- | ---------------------------- | -------- | ------- |
| `+`        | toplama                      | `7 + 2`  | `9`     |
| `-`        | çıxma                        | `7 - 2`  | `5`     |
| `*`        | vurma                        | `7 * 2`  | `14`    |
| `/`        | bölmə                        | `7 / 2`  | `3.5`   |
| `//`       | tam bölmə                    | `7 // 2` | `3`     |
| `%`        | bölmədən qalıq               | `7 % 2`  | `1`     |
| `**`       | qüvvət                       | `2 ** 3` | `8`     |
| `==`       | bərabərdir                   | `7 == 7` | `True`  |
| `!=`       | bərabər deyil                | `7 != 2` | `True`  |
| `>`, `<`   | böyük, kiçik                 | `7 > 2`  | `True`  |
| `>=`, `<=` | böyük bərabər, kiçik bərabər | `7 <= 2` | `False` |

> **Diqqət:** Excel-də qüvvət `^` ilə yazılır, Python-da isə `**` ilə. Python-da `^` tamam başqa əməliyyatdır (bit üzrə XOR): `2 ^ 3` nəticəsi `1`-dir, `8` yox!

### Niyə bərabərlik `==` ilədir?

Çünki tək `=` Python-da **mənimsətmə** deməkdir — dəyişənə dəyər yazır. Müqayisə üçün iki bərabərlik işarəsi lazımdır:

```python
a = 5        # a dəyişəninə 5 yaz
a == 5       # a 5-ə bərabərdirmi? → True
```

## Nöqtə `.` və kvadrat mötərizə `[]`

Bu iki işarə obyektin bir hissəsinə müraciət edir (Excel-də cədvəlin bir sütununa müraciət etmək kimi):

```python
ad = "Python"
ad.upper()       # "PYTHON" — nöqtə ilə obyektin metodunu çağırırıq
ad[0]            # "P" — kvadrat mötərizə ilə elementə müraciət (sayma 0-dan başlayır)
```
