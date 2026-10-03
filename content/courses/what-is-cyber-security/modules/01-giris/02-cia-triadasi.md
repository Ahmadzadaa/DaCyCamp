---
title: CIA triadası
xp: 10
estimated_minutes: 7
---

Kibertəhlükəsizliyin təməlində üç məqsəd dayanır. Onlar ingiliscə baş hərflərinə görə **CIA triadası** adlanır (Kəşfiyyat İdarəsi ilə əlaqəsi yoxdur 🙂).

## C — Confidentiality (məxfilik)

Məlumata **yalnız icazəsi olanlar** baxa bilməlidir.

- **Pozulma nümunələri:** müştərilərin kart məlumatlarının internetə sızması; işçinin icazəsi olmadan həmkarının maaşına baxması.
- **Qoruma vasitələri:** şifrələmə, giriş hüquqlarının idarəsi, güclü autentifikasiya.

## I — Integrity (bütövlük)

Məlumat **dəqiq və tam** olmalı, icazəsiz **dəyişdirilməməlidir**.

- **Pozulma nümunələri:** hücumçunun köçürmə məbləğini 100 ₼-dan 10 000 ₼-a dəyişməsi; virusun mühasibat cədvəlindəki rəqəmləri korlaması.
- **Qoruma vasitələri:** heş (hash) yoxlamaları, rəqəmsal imzalar, dəyişikliklərin jurnalı, versiyalama.

## A — Availability (əlçatanlıq)

Məlumat və sistemlər **lazım olanda** icazəli istifadəçilər üçün **işlək** olmalıdır.

- **Pozulma nümunələri:** DDoS hücumu səbəbindən NarPay tətbiqinin 3 saat açılmaması; ransomware-in faylları şifrələməsi; server otağında yanğın.
- **Qoruma vasitələri:** ehtiyat nüsxələr, ehtiyat serverlər, DDoS müdafiəsi, fəlakətdən bərpa planı.

## Bir cədvəldə

| Prinsip | Sual | NarPay-də qorunan |
| --- | --- | --- |
| **Məxfilik** | Kim görə bilər? | Kart nömrələri, şəxsi məlumatlar |
| **Bütövlük** | Dəyişdirilməyibmi? | Köçürmə məbləğləri, balanslar |
| **Əlçatanlıq** | Lazım olanda işləyirmi? | Tətbiq və ödəniş xidməti 24/7 |

## Balans

Üç prinsip bəzən bir-biri ilə ziddiyyət təşkil edir. Məsələn, məxfiliyi artırmaq üçün hər əməliyyata 5 təsdiq addımı qoysan, əlçatanlıq və rahatlıq azalar. Təhlükəsizlik mütəxəssisinin işi — **riskə uyğun balans** tapmaqdır.

## Daha üç anlayış

- **Autentifikasiya** (authentication) — «Sən kimsən?» Kimliyin yoxlanması: parol, barmaq izi.
- **Avtorizasiya** (authorization) — «Sənə nə etmək icazəlidir?» Hüquqların yoxlanması.
- **Təkzibedilməzlik** (non-repudiation) — əməliyyatı edən sonradan «mən etməmişəm» deyə bilməsin: rəqəmsal imza, jurnal qeydləri.

## Qısa xülasə

- Məxfilik — yalnız icazəlilər görür; bütövlük — data dəyişdirilmir; əlçatanlıq — sistem lazım olanda işləyir.
- Hər hücum bu üç prinsipdən ən azı birini pozur.
- Təhlükəsizlik — üç prinsip və rahatlıq arasında riskə uyğun balansdır.
