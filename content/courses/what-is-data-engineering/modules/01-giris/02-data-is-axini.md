---
title: Data iş axını (data workflow)
xp: 10
estimated_minutes: 6
---

Data öz-özünə dəyər yaratmır. Xam data — sadəcə rəqəmlər və qeydlərdir. Ondan qərar çıxarmaq üçün data bir neçə mərhələdən keçir. Buna **data iş axını** (data workflow) deyilir.

## Dörd mərhələ

| # | Mərhələ | Nə baş verir | NarMarket-də nümunə |
| --- | --- | --- | --- |
| 1 | **Toplama və saxlama** (collection & storage) | Data müxtəlif mənbələrdən toplanır və saxlanılır | Tətbiqdən sifarişlər, ödəniş sistemindən əməliyyatlar, kuryerlərin GPS-i |
| 2 | **Hazırlama** (preparation) | Data təmizlənir və istifadəyə hazır formaya salınır | Dublikat sifarişlər silinir, tarixlər vahid formata salınır |
| 3 | **Kəşf və vizuallaşdırma** (exploration & visualization) | Datada trendlər axtarılır, qrafiklər və dashboard-lar qurulur | «Hansı məhsul ən çox satılır?» dashboard-u |
| 4 | **Eksperiment və proqnoz** (experimentation & prediction) | Fərziyyələr yoxlanılır, gələcək proqnozlaşdırılır | Endirimin təsiri A/B testlə yoxlanılır, gələn həftənin sifariş sayı proqnozlaşdırılır |

## Data engineer harada dayanır?

**Data engineer birinci mərhələdən məsuldur.** O, datanı toplayır, saxlayır və digər mərhələlər üçün **hazır və əlçatan** edir. Bəzən hazırlama mərhələsinin bir hissəsini də (avtomatik təmizləmə, formatlama) öz üzərinə götürür.

Qalan mərhələlərdə əsasən **data analitiklər** və **data scientist-lər** işləyir. Lakin onların hamısı bir şeydən asılıdır: data engineer-in qurduğu təməldən. Data toplanmayıbsa, gec gəlirsə və ya səhvdirsə, ən yaxşı analitik də düzgün nəticə çıxara bilməz.

> 🍽️ **Bənzətmə:** restoranı düşün. Data engineer — məhsulların tədarükü və anbardır: təzə məhsul vaxtında gəlməli, düzgün saxlanmalıdır. Aşpaz (analitik, data scientist) yemək bişirir, ofisiant (dashboard) onu müştəriyə təqdim edir. Tədarük pozulsa, mətbəx dayanır.

## NarMarket-də bir səhər

Səhər 09:00-da satış direktoru dashboard-u açır və dünənki satışları görmək istəyir. Bunun mümkün olması üçün gecə ərzində:

1. dünənki bütün sifarişlər tətbiqin bazasından toplanmalı,
2. ödəniş sistemi ilə uzlaşdırılmalı,
3. təmizlənib analitik bazaya yazılmalı idi.

Bu zəncirin hər halqasını data engineer qurur və ona nəzarət edir. Direktor isə yalnız son nəticəni görür — hər şey qaydasındadırsa, data engineer-in işi «görünməz» qalır.

## Qısa xülasə

- Data iş axını 4 mərhələdən ibarətdir: toplama və saxlama → hazırlama → kəşf və vizuallaşdırma → eksperiment və proqnoz.
- Data engineer birinci mərhələnin sahibidir və bütün sonrakı işlərin təməlini qurur.
- Analitiklər və data scientist-lər data engineer-in hazırladığı data ilə işləyir.
