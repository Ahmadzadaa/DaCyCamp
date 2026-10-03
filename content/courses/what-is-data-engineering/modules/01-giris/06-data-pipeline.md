---
title: Data pipeline və ETL
xp: 10
estimated_minutes: 8
---

NarMarket-də data onlarla mənbədən gəlir: tətbiq, sayt, ödəniş sistemi, anbar proqramı, kuryer cihazları. Bunları hər gün əl ilə yığmaq həm yavaş, həm də səhvlərlə dolu olardı. Həll yolu — **data pipeline**.

## Data pipeline nədir?

**Data pipeline** — datanı mənbələrdən götürüb, yol boyu emal edərək təyinat yerinə **avtomatik** çatdıran addımlar ardıcıllığıdır. Onu fabrikdəki konveyer lentinə bənzətmək olar: xammal bir tərəfdən daxil olur, hər stansiyada üzərində iş görülür, digər tərəfdən hazır məhsul çıxır.

NarMarket-in sifariş pipeline-ı:

```text
Mobil tətbiq ─┐
Vebsayt ──────┼──► Toplama ──► Təmizləmə ──► Birləşdirmə ──► Data warehouse ──► Dashboard-lar
Ödəniş sistemi┘                                                              └─► Proqnoz modelləri
```

## ETL: Extract, Transform, Load

Pipeline-ların ən klassik forması **ETL**-dir:

| Addım | Mənası | NarMarket-də |
| --- | --- | --- |
| **E — Extract** (çıxarma) | Datanı mənbədən oxumaq | Tətbiqin bazasından dünənki sifarişləri, ödəniş sistemindən əməliyyatları götürmək |
| **T — Transform** (çevirmə) | Datanı təmizləmək, formatlamaq, birləşdirmək | Dublikatları silmək, tarixləri vahid formata salmaq, sifarişi ödənişlə birləşdirmək |
| **L — Load** (yükləmə) | Hazır datanı təyinat yerinə yazmaq | Təmiz cədvəli data warehouse-a yazmaq |

### ETL və ELT

Müasir bulud anbarları çox güclü olduğu üçün tez-tez **ELT** istifadə olunur: data əvvəlcə olduğu kimi anbara **yüklənir** (Load), sonra elə anbarın içində **çevrilir** (Transform). Üstünlüyü: xam data itmir, sonradan başqa cür emal etmək mümkündür.

## Batch və streaming

| | Batch (paket) emal | Streaming (axın) emal |
| --- | --- | --- |
| **Necə işləyir** | Data toplanır və müəyyən vaxtda bir paket kimi emal olunur | Hər qeyd yarandığı anda emal olunur |
| **Nə vaxt** | Gündəlik hesabatlar, gecəlik yükləmələr | Saxtakarlığın aşkarlanması, kuryerin canlı izlənməsi |
| **Üstünlüyü** | Sadə və ucuz | Nəticə saniyələr içində hazırdır |

## Niyə avtomatlaşdırma?

- **Sürət** — data hər gün eyni vaxtda hazır olur.
- **Etibarlılıq** — insan yorulur və səhv edir, pipeline isə hər dəfə eyni addımları təkrarlayır.
- **Nəzarət** — pipeline qırılanda data engineer dərhal xəbərdarlıq alır və problemi analitiklər görməmiş həll edir.

## Qısa xülasə

- Data pipeline datanı mənbələrdən təyinat yerinə avtomatik daşıyan addımlar ardıcıllığıdır.
- ETL: çıxar → çevir → yüklə. ELT-də çevirmə yükləmədən sonra, anbarın içində baş verir.
- Batch — vaxtaşırı paketlərlə, streaming — real vaxtda.
