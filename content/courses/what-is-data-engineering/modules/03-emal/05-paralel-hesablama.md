---
title: Paralel hesablama
xp: 10
estimated_minutes: 6
---

NarMarket ildə 18 milyon sifariş qəbul edir. «Son 3 ilin bütün sifarişlərini məhsul üzrə təhlil et» kimi tapşırıq bir kompüterdə saatlarla çəkə bilər, hətta yaddaş çatmaya bilər. Həll yolu — **paralel hesablama** (parallel computing).

## Əsas ideya

1. Böyük tapşırıq **kiçik alt tapşırıqlara** bölünür.
2. Alt tapşırıqlar bir neçə **emal vahidində** (prosessor nüvəsində və ya kompüterdə) **eyni vaxtda** icra olunur.
3. Nəticələr birləşdirilir.

> 📝 **Bənzətmə:** müəllim 1000 imtahan vərəqini təkbaşına 10 günə yoxlayır. 10 müəllim vərəqləri bölüşsə, iş təxminən 1 günə bitər. Sonda hər kəs öz nəticəsini ümumi cədvələ yazır.

## Üstünlükləri

- **Emal gücü** — eyni anda çoxlu prosessor işləyir, nəticə daha tez hazır olur.
- **Yaddaş** — data bir neçə maşın arasında bölünür; heç bir maşının bütün datanı yaddaşda saxlaması lazım deyil.

## Riskləri və «gizli xərc» (overhead)

Paralellik pulsuz deyil:

- Tapşırığı bölmək, hissələri maşınlara göndərmək və nəticələri birləşdirmək **vaxt aparır**.
- Maşınlar arasında **ünsiyyət** (kommunikasiya) xərci yaranır.
- Kiçik tapşırıqlarda bu xərc qazancdan çox ola bilər — paralel versiya **daha yavaş** işləyər.
- Bəzi tapşırıqlar ümumiyyətlə bölünmür: hər addım əvvəlkinin nəticəsindən asılıdırsa, onları eyni vaxtda icra etmək olmaz.

> 📦 **Bənzətmə:** ev köçürəndə 4 dost işi sürətləndirir. 100 dost isə bir-birinə mane olar və onları idarə etməyə daha çox vaxt gedər.

## Alətlər

- **Hadoop MapReduce** — paralel emalın ilk populyar çərçivəsi: «map» addımında data hissələrə bölünüb emal olunur, «reduce» addımında nəticələr birləşdirilir.
- **Apache Spark** — bu gün ən geniş istifadə olunan alət; datanı yaddaşda saxladığı üçün MapReduce-dan xeyli sürətlidir.
- Bir-biri ilə birlikdə işləyən kompüterlər qrupuna **klaster** deyilir.

## NarMarket-də

İllik təhlil 12 hissəyə — aylar üzrə — bölünür. 12 maşının hər biri bir ayı emal edir, sonda nəticələr bir cədvəldə birləşir. Saatlarla çəkən iş dəqiqələrə enir.

## Qısa xülasə

- Paralel hesablama böyük tapşırığı hissələrə bölüb eyni vaxtda bir neçə emal vahidində icra edir.
- Üstünlükləri: daha çox emal gücü və bölünmüş yaddaş.
- Bölmə və birləşdirmə xərci var — kiçik tapşırıqlarda paralellik sərfəli olmaya bilər.
