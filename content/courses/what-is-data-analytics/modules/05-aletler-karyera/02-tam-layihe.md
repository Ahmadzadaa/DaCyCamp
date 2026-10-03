---
title: 'Tam layihə: NarMarket-də tərk edilən səbətlər'
xp: 10
estimated_minutes: 8
---

Kurs boyu öyrəndiklərimizi bir real layihədə birləşdirək. Aysel bütün prosesi başdan sona keçir.

## 1. Soruş

Rəhbərlik narahatdır: «Müştərilər səbəti doldurur, amma sifariş vermir.» Aysel sualı SMART edir:

> «İyul–sentyabr aylarında səbətin tərk edilmə dərəcəsi niyə 60%-dən 70%-ə qalxıb və onu 4 həftə ərzində ən azı 5 faiz bəndi azaltmaq üçün nə etmək olar?»

**KPI:** səbətin tərk edilmə dərəcəsi və konversiya.

## 2. Hazırla

Data mənbələri: tətbiq hadisələri (səbətə əlavə, ödəniş səhifəsinə keçid, sifariş), sifarişlər cədvəli, çatdırılma qiymətləri tarixçəsi. Hamısı daxili, data warehouse-dadır.

## 3. Təmizlə

- Test hesablarını və işçilərin sifarişlərini çıxarır.
- Dublikat hadisələri silir (tətbiq bəzən eyni hadisəni iki dəfə göndərir).
- Vaxtları vahid saat qurşağına salır.

## 4. Təhlil et

**Huni (funnel) təhlili** — müştərilər hər addımda nə qədər itir:

| Addım | Müştəri | Növbəti addıma keçən |
| --- | --- | --- |
| Tətbiqə daxil olub | 100 000 | 30% |
| Səbətə məhsul atıb | 30 000 | 40% |
| Ödəniş səhifəsini açıb | 12 000 | 75% |
| Sifariş verib | 9 000 | — |

Ən böyük itki «səbət → ödəniş səhifəsi» addımındadır — məhz çatdırılma haqqının göründüyü yer. Tarixçə göstərir ki, iyulda haqq **2 ₼-dan 4 ₼-a** qaldırılıb. **Seqmentasiya**: itki ən çox 20 ₼-dan aşağı səbətlərdə artıb — kiçik sifarişdə 4 ₼ çatdırılma nisbətən baha görünür.

Bu hələ **korrelyasiyadır** — səbəbi sübut etmək üçün test lazımdır.

## 5. Paylaş

Aysel direktora 3 slayd göstərir:

1. **Nəticə:** «Səbətlərin tərk edilməsi 10 faiz bəndi artıb; itki ödəniş səhifəsinə keçiddə, əsasən kiçik səbətlərdə baş verir.»
2. **Qrafik:** aylar üzrə tərk edilmə dərəcəsi (xətt), haqqın dəyişdiyi tarix qeyd olunub.
3. **Tövsiyə:** «25 ₼-dan yuxarı sifarişlərdə pulsuz çatdırılmanı A/B testlə yoxlayaq.»

## 6. Hərəkət et

4 həftəlik **A/B test**: A qrupu — köhnə qayda, B qrupu — 25 ₼-dan yuxarı pulsuz çatdırılma.

| Qrup | Tərk edilmə | Konversiya | Orta səbət |
| --- | --- | --- | --- |
| A (köhnə) | 70% | 9.0% | 31 ₼ |
| B (yeni) | 63% | 10.1% | 34 ₼ |

Tərk edilmə 7 faiz bəndi azalıb, orta səbət də artıb — müştərilər pulsuz çatdırılma həddinə çatmaq üçün əlavə məhsul alır. Yeni qayda hamı üçün tətbiq olunur, dashboard-a yeni KPI əlavə edilir və nəticə növbəti aylarda izlənir.

## Bu layihədən dərslər

- Qeyri-müəyyən narahatlıq SMART suala çevrildi.
- Təmizləmə olmasa, dublikat hadisələr nəticəni təhrif edərdi.
- Huni və seqmentasiya problemin **harada** olduğunu göstərdi.
- Korrelyasiya fərziyyə verdi, **A/B test** onu sübut etdi.
- Qısa hekayə və aydın tövsiyə qərarı sürətləndirdi.
