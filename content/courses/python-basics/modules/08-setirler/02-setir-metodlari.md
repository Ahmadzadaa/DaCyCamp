---
title: Sətir metodları və f-string
xp: 10
estimated_minutes: 8
---

Sətirlərlə ən çox görülən işlər — təmizləmək, axtarmaq, bölmək və formatlamaq — hazır **metodlarla** edilir.

## Əsas metodlar

| Metod | Nə edir | Nümunə → nəticə |
| --- | --- | --- |
| `upper()` / `lower()` | Böyük / kiçik hərflər | `"Bakı".upper()` → `'BAKI'` |
| `title()` | Hər sözün ilk hərfi böyük | `"aysel məmmədova".title()` → `'Aysel Məmmədova'` |
| `strip()` | Kənar boşluqları silir | `"  salam  ".strip()` → `'salam'` |
| `replace(a, b)` | `a`-nı `b` ilə əvəz edir | `"Credit Card".replace("Credit", "Visa")` → `'Visa Card'` |
| `split(ayırıcı)` | Siyahıya bölür | `"a-b-c".split("-")` → `['a', 'b', 'c']` |
| `ayırıcı.join(siyahı)` | Siyahını birləşdirir | `", ".join(["a", "b"])` → `'a, b'` |
| `find(alt)` | İlk yerin indeksi (yoxdursa −1) | `"TechNar".find("Nar")` → `4` |
| `count(alt)` | Neçə dəfə keçir | `"banana".count("a")` → `3` |
| `startswith()` / `endswith()` | Belə başlayır / bitir? | `"iPhone 15".startswith("iPhone")` → `True` |
| `isdigit()` | Yalnız rəqəmlərdir? | `"2024".isdigit()` → `True` |

Metodları **zəncirləmək** olar — hər biri yeni sətir qaytarır:

```python
musteri = "   aYSEL məmmədova  "
print(musteri.strip().title())   # Aysel Məmmədova
```

## f-string ilə formatlama

`f"..."` sətrinin içində `{}` mötərizələrinə dəyişən və ifadə yazılır. İki nöqtədən sonra **format** göstərilir:

| Yazılış | Nəticə | Mənası |
| --- | --- | --- |
| `f"{2399:.2f}"` | `2399.00` | 2 onluq rəqəm |
| `f"{1690500.5:,.2f}"` | `1,690,500.50` | minliklər ayrılır |
| `f"{0.256:.1%}"` | `25.6%` | faiz |
| `f"{'Bakı':>8}"` | `'    Bakı'` | sağa düzləndir (8 simvol) |
| `f"{7:03d}"` | `007` | sıfırlarla doldur |

```python
mehsul, say, qiymet = "AirPods Pro 2", 2, 599
print(f"{mehsul} x{say} = {say * qiymet:.2f} ₼")
# AirPods Pro 2 x2 = 1198.00 ₼
```

## Xüsusi simvollar

- `\n` — yeni sətir, `\t` — tab.
- Sətrin içində dırnaq: `"Levi's 501"` (fərqli dırnaq növü) və ya `'Levi\'s 501'`.
