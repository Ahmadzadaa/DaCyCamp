---
title: 'Mini layihə: TechNar-ın yanvar hesabatı'
xp: 10
estimated_minutes: 5
---

Kursun sonunda öyrəndiklərini real tapşırıqda birləşdirək. TechNar-ın satış meneceri hər ayın əvvəlində qısa hesabat istəyir:

- ümumi gəlir;
- kateqoriyalar üzrə gəlir (çoxdan aza);
- ən çox satılan məhsul (ədədə görə).

Satışlar dictionary-lərin siyahısı kimi verilir:

```python
satislar = [
    {"mehsul": "iPhone 15", "kateqoriya": "Electronics", "say": 2, "qiymet": 2399.0},
    {"mehsul": "Zara Basic T-Shirt", "kateqoriya": "Clothing", "say": 6, "qiymet": 39.9},
    ...
]
```

## Niyə funksiyalar?

Hesabat hər ay təkrarlanır — yalnız data dəyişir. Hesablamaları **funksiyalara** yığsaq, fevral datasını eyni funksiyalara verib dərhal yeni hesabat alarıq. Buna görə testlər funksiyalarını **başqa data ilə də** yoxlayacaq: funksiya konkret rəqəmlərə yox, ona verilən arqumentə əsaslanmalıdır.

## Plan

1. `umumi_gelir(satislar)` — say × qiymət cəmi.
2. `kateqoriya_uzre(satislar)` — `{kateqoriya: gəlir}` dictionary-si.
3. `en_cox_satilan(satislar)` — eyni məhsul bir neçə dəfə ola bilər: əvvəl məhsullar üzrə ədədləri topla, sonra maksimumu tap.
4. `hesabat(satislar)` — hamısını f-string ilə səliqəli mətnə çevir.

> 💡 Kiçik addımlarla irəlilə: hər funksiyanı yazdıqdan sonra **İşə sal** ilə nəticəsini çap edib yoxla.
