---
title: 'Dövrlər: for və while'
xp: 10
estimated_minutes: 7
---

Excel-də formulu yüz sətrə «dartıb» köçürürsən. Python-da eyni işi **dövrlər** (loops) görür: bir əməliyyatı təkrar-təkrar, avtomatik icra edir.

## `for` dövrü

`for` verilmiş ardıcıllığın (siyahı, sətir, `range`) **hər elementi** üçün bloku bir dəfə icra edir:

```python
seherler = ["Bakı", "Gəncə", "Şəki"]
for seher in seherler:
    print(seher)
```

### `range()` — ədəd ardıcıllığı

| Yazılış           | Ardıcıllıq                                |
| ----------------- | ----------------------------------------- |
| `range(5)`        | 0, 1, 2, 3, 4                             |
| `range(1, 6)`     | 1, 2, 3, 4, 5 — **son dəyər daxil deyil** |
| `range(2, 11, 2)` | 2, 4, 6, 8, 10 — üçüncü arqument addımdır |

```python
# 1-dən 5-ə qədər olan ədədləri çap et
for i in range(1, 6):
    print(i)
```

### Dövrdə toplamaq (akkumulyator)

Çox rast gəlinən üsul: dövrdən əvvəl dəyişən yaradıb hər addımda ona əlavə edirik:

```python
satislar = [120, 340, 90]
cem = 0
for s in satislar:
    cem = cem + s      # qısa yazılış: cem += s
print(cem)             # 550
```

## `while` dövrü

`while` şərt **doğru olduğu müddətcə** bloku təkrarlayır. Neçə dəfə təkrarlanacağını əvvəlcədən bilmədikdə istifadə olunur (məsələn, istifadəçi «0» daxil edənə qədər).

```python
# 1-dən 5-ə qədər olan ədədləri çap et
i = 1
while i <= 5:
    print(i)
    i += 1     # i-ni artırmasaq, şərt həmişə doğru qalar!
```

> **Sonsuz dövr:** `while`-ın şərti heç vaxt yanlış olmursa, dövr dayanmır. Yuxarıdakı nümunədə `i += 1` sətrini unutsan, proqram dayanmadan `1` yazacaq. Bu platformada belə kod 10 saniyədən sonra avtomatik dayandırılır və xəta göstərilir.

## Hansını seçməli?

- Elementlərin və ya təkrarların sayı məlumdursa — `for`.
- Şərt ödənənə qədər təkrarlamaq lazımdırsa — `while`.
