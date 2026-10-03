---
title: Planlaşdırma (scheduling)
xp: 10
estimated_minutes: 7
---

Pipeline onlarla tapşırıqdan ibarətdir: çıxarma, təmizləmə, birləşdirmə, yükləmə... Onların **nə vaxt** və **hansı ardıcıllıqla** işə düşəcəyini planlaşdırma (scheduling) müəyyən edir. Planlaşdırma pipeline-ın bütün hissələrini bir-birinə bağlayan «yapışqandır».

## Üç işə salma üsulu

| Üsul | Necə | Nümunə |
| --- | --- | --- |
| **Əl ilə** (manual) | İnsan düyməni basır | Data engineer xətanı düzəldib pipeline-ı yenidən başladır |
| **Vaxta görə** (time-based) | Müəyyən vaxtda avtomatik | Hər gecə saat 02:00-da sifarişlər yüklənir |
| **Hadisəyə görə** (sensor / event-based) | Müəyyən hadisə baş verəndə | Anbara yeni qaimə faylı düşən kimi emal başlayır |

Real sistemlərdə üsullar birlikdə istifadə olunur.

## Asılılıqlar (dependencies)

Tapşırıqların ardıcıllığı vacibdir: datanı çıxarmamış təmizləmək, təmizləməmiş cəmləmək olmaz. Planlaşdırıcı bu **asılılıqları** izləyir — əvvəlki addım uğurla bitməyincə növbəti başlamır.

NarMarket-in gecəlik pipeline-ı:

```text
01:00 sifarişləri çıxar ─┐
                         ├─► 01:30 təmizlə və birləşdir ─► 02:00 cəmlə ─► 02:30 dashboard-u yenilə
01:00 ödənişləri çıxar ──┘
```

Bu cür sxem **DAG** (Directed Acyclic Graph — istiqamətli, dövrsüz qraf) adlanır: oxlar ardıcıllığı göstərir və heç bir tapşırıq özünə qayıtmır. Əgər «ödənişləri çıxar» uğursuz olarsa, sonrakı addımlar gözləyir və data engineer xəbərdarlıq alır — beləliklə, dashboard natamam datanı göstərmir.

## Planlaşdırma alətləri

- **Apache Airflow** — ən populyar alət; Airbnb-də yaradılıb, DAG-lar Python ilə yazılır.
- **Prefect**, **Dagster**, **Luigi** — alternativlər.
- Sadə hallarda **cron** — Linux-un vaxta görə işə salma aləti.

## Batch və streaming — yenidən

- **Batch:** data qruplaşdırılır və planlaşdırılmış vaxtda emal olunur. Ucuz və sadədir; gündəlik hesabatlar üçün idealdır. Tez-tez gecə, sistemlər az yüklənəndə işləyir.
- **Streaming:** hər qeyd dərhal emal olunur. Saxtakarlığın aşkarlanması, kuryerin canlı izlənməsi, anbar qalığının anlıq yenilənməsi üçün lazımdır. Bu iş üçün **Apache Kafka** kimi alətlər istifadə olunur.

## Qısa xülasə

- Planlaşdırma tapşırıqları düzgün vaxtda və düzgün ardıcıllıqla işə salır.
- Üç üsul: əl ilə, vaxta görə, hadisəyə görə.
- Asılılıqlar DAG kimi təsvir olunur; Airflow ən populyar planlaşdırma alətidir.
