---
title: Çirkli data və təmizləmə
xp: 10
estimated_minutes: 7
---

Analitikada məşhur bir qayda var: **«Garbage in, garbage out»** — zibil girirsə, zibil çıxır. Ən mükəmməl qrafik də səhv datanın üzərində qurulubsa, səhv qərara aparır. Buna görə analitiklər vaxtlarının çox hissəsini — bəzən yarıdan çoxunu — datanı təmizləməyə sərf edirlər.

## Ən çox rast gəlinən problemlər

| Problem | Nümunə | Nə etməli |
| --- | --- | --- |
| **Dublikatlar** | Eyni sifariş №1045 iki dəfə yazılıb | Təkrarları sil; nəyə görə təkrarlandığını yoxla |
| **Boş dəyərlər** (missing) | Müştərinin telefonu və ya çatdırılma tarixi yoxdur | Səbəbi araşdır; məntiqli dəyərlə doldur və ya həmin sətri təhlildən çıxar |
| **Format uyğunsuzluğu** | «Bakı», «baku», «BAKI»; `03.10.2026` və `2026-10-03` | Vahid formata sal |
| **Kənar dəyərlər** (outliers) | Orta sifariş 35 ₼ ikən bir sifariş 250 000 ₼ | Səhvdirsə düzəlt; realdırsa ayrıca təhlil et |
| **Səhv tip** | Məbləğ mətn kimi saxlanılıb: «42,50 AZN» | Ədədə çevir |
| **Yazı səhvləri** | «Gənca», «Sumgait» | Düzgün dəyərə uyğunlaşdır |
| **Lazımsız data** | Test sifarişləri, işçilərin sınaq hesabları | Təhlildən çıxar |

## Əvvəl və sonra

| sifariş | şəhər | məbləğ | tarix |
| --- | --- | --- | --- |
| 1045 | baku | 42,50 AZN | 03.10.2026 |
| 1045 | baku | 42,50 AZN | 03.10.2026 |
| 1046 | Gənca | 18.20 | 2026-10-03 |
| 1047 | BAKI | 250000 | 2026-10-03 |
| 1048 | Sumqayıt | | 2026-10-04 |

Aysel nə edir?

1. 1045-in **dublikatını** silir.
2. Şəhərləri **vahid formaya** salır: Bakı, Gəncə.
3. Məbləği **ədədə** çevirir: 42.50.
4. 1047-ni araşdırır: kassir 250.00 əvəzinə 250000 yazıb → **düzəldir**.
5. 1048-in məbləği **boşdur**: ödəniş sistemindən tapır və doldurur; tapmasaydı, bu sifarişi məbləğ hesablamalarından çıxarıb qeyd edərdi.

## Boş dəyərlərlə ehtiyatlı ol

Bütün boş sətirləri silmək ən asan yoldur, amma təhlükəlidir: datanın böyük hissəsi itə və nəticə **təhrif** oluna bilər. Məsələn, telefon nömrəsi yalnız köhnə müştərilərdə boşdursa, onları silmək təhlili yalnız yeni müştərilərə çevirər.

> 📋 **Qızıl qayda:** təmizləmə zamanı nə etdiyini qeyd et. Başqası (və ya bir aydan sonra sən özün) nəticəni təkrarlaya bilməlidir.

## Qısa xülasə

- Səhv data səhv qərar deməkdir — təmizləmə analizin ən vacib hissələrindəndir.
- Əsas problemlər: dublikatlar, boş dəyərlər, format uyğunsuzluğu, kənar dəyərlər, səhv tiplər.
- Hər problemin səbəbini araşdır və etdiyin dəyişiklikləri sənədləşdir.
