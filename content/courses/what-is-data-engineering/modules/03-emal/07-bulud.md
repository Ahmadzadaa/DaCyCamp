---
title: Bulud hesablamaları (cloud computing)
xp: 10
estimated_minutes: 7
---

Datanı saxlamaq və emal etmək üçün serverlər lazımdır. Bu serverlər ya şirkətin öz binasında olur, ya da buludda icarəyə götürülür.

## Öz serverlərin (on-premise)

Şirkət serverləri alır və öz server otağında saxlayır:

- avadanlıq almaq, yer, elektrik, soyutma və təhlükəsizlik lazımdır;
- serverlərə qulluq edən mütəxəssislər lazımdır;
- güc **ən yüksək yüklənməyə** görə alınmalıdır — ilin qalan vaxtında isə resursların çoxu boş dayanır.

## Bulud (cloud)

Bulud provayderindən resursları **lazım olduğu qədər** icarəyə götürmək:

- **İstifadəyə görə ödəniş** — 20 serveri 2 saatlığa götür, yalnız 2 saat üçün ödə.
- **Miqyaslanma** — yük artanda resursları bir neçə dəqiqəyə artır, azalanda azalt.
- **Etibarlılıq** — data müxtəlif regionlarda surətlənir; bir data mərkəzində problem olsa, digəri işləyir.
- **Hazır xidmətlər** — bazaları, anbarları, pipeline alətlərini özün qurmaq əvəzinə hazır, idarə olunan xidmət kimi istifadə edirsən.

## Böyük üçlük

Bazarın böyük hissəsi üç provayderin əlindədir: **Amazon Web Services (AWS)**, **Microsoft Azure** və **Google Cloud**. Onların əsas xidmətləri:

| Xidmət növü | AWS | Azure | Google Cloud |
| --- | --- | --- | --- |
| **Saxlama** (fayllar, data lake) | S3 | Blob Storage | Cloud Storage |
| **Hesablama** (virtual serverlər) | EC2 | Virtual Machines | Compute Engine |
| **Verilənlər bazası** | RDS | Azure SQL Database | Cloud SQL |
| **Data warehouse** | Redshift | Synapse Analytics | BigQuery |

## Multicloud

Bəzi şirkətlər bir neçə provayderdən birlikdə istifadə edir — **multicloud**.

- ✅ Bir provayderdən asılılıq azalır (vendor lock-in), qiymətləri müqayisə etmək olur, bəzi ölkələrin datanın yerləşməsi tələblərinə uyğunlaşmaq asanlaşır.
- ❌ Fərqli xidmətləri birlikdə idarə etmək mürəkkəbdir, komandadan daha çox bilik tələb olunur, təhlükəsizliyi hər yerdə eyni səviyyədə saxlamaq çətinləşir.

## Nəyə diqqət etməli?

- **Xərc nəzarəti** — unudulmuş, boş işləyən server hər saat pul yandırır.
- **Məxfilik və qanunvericilik** — bəzi datalar (məsələn, bank və tibbi data) müəyyən ölkənin ərazisində saxlanmalıdır.
- **Təhlükəsizlik** — buludda səhv konfiqurasiya (məsələn, hamıya açıq qalan fayl anbarı) ən çox rast gəlinən data sızması səbəblərindəndir.

## NarMarket-də

«Qara Cümə» günü trafik adi günə nisbətən 5 dəfə artır. Öz serverləri ilə NarMarket bütün il ərzində 5 qat güc saxlamalı olardı. Buludda isə həmin gün resurslar avtomatik artırılır, ertəsi gün azaldılır — ödəniş yalnız istifadə olunan güc üçündür.

## Qısa xülasə

- On-premise — öz serverlərin: tam nəzarət, amma böyük xərc və boş qalan güc.
- Bulud — resursları lazım olduğu qədər icarəyə götürmək: çevik, miqyaslanan, istifadəyə görə ödəniş.
- Əsas xidmətlər: saxlama, hesablama, verilənlər bazası; böyük üçlük — AWS, Azure, Google Cloud.
