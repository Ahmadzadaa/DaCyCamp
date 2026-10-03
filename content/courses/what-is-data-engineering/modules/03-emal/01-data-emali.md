---
title: Data emalı
xp: 10
estimated_minutes: 6
---

Mənbədən gələn data nadir hallarda istifadəyə hazır olur. **Data emalı** (data processing) — xam datanı mənalı və istifadəyə yararlı dataya çevirməkdir.

## Niyə emal edirik?

- **Lazımsız datanı atmaq** — test sifarişləri, boş qeydlər.
- **Yaddaşa qənaət** — hər saniyəlik GPS nöqtəsi əvəzinə marşrutun xülasəsi.
- **Lazım olan formata salmaq** — tarix, valyuta, vahidlər.
- **Sxemə uyğunlaşdırmaq** — data anbardakı cədvəlin strukturuna uyğun olmalıdır.
- **Məxfilik** — şəxsi məlumatları gizlətmək (anonimləşdirmə, maskalama).
- **Məhsuldarlıq** — hər dəfə əl ilə görülən işi avtomatlaşdırmaq.

## Tipik emal tapşırıqları

| Tapşırıq | Nümunə |
| --- | --- |
| **Təmizləmə** | Dublikat sifarişləri silmək, səhv dəyərləri düzəltmək |
| **Formatlama** | `03.10.2026` → `2026-10-03`, `"42,50"` → `42.50` |
| **Cəmləmə** (aggregation) | Hər kateqoriya üzrə gündəlik satış cəmi |
| **Birləşdirmə** (join) | Sifarişi ödəniş qeydi və müştəri məlumatı ilə birləşdirmək |
| **Filtrləmə** | Yalnız tamamlanmış sifarişləri saxlamaq |
| **Maskalama** | Kart nömrəsi: `4169 7380 1122 1234` → `4169 **** **** 1234` |
| **Zənginləşdirmə** | Ünvandan rayonu təyin edib ayrıca sütuna yazmaq |

## Əvvəl və sonra

Xam data:

| sifariş | tarix | məbləğ | şəhər |
| --- | --- | --- | --- |
| 1045 | 03.10.2026 | 42,50 AZN | baku |
| 1045 | 03.10.2026 | 42,50 AZN | baku |
| 1046 | 2026-10-03 | $10.70 | Gəncə |

Emaldan sonra:

| sifariş | tarix | məbləğ_azn | şəhər |
| --- | --- | --- | --- |
| 1045 | 2026-10-03 | 42.50 | Bakı |
| 1046 | 2026-10-03 | 18.19 | Gəncə |

Dublikat silinib, tarixlər və şəhər adları vahid formaya salınıb, dollar manata çevrilib (1 USD = 1.70 AZN).

## Kim emal edir?

Data engineer emal addımlarını **pipeline-ın içinə** qurur ki, hər gün avtomatik işləsin. Analitiklər və data scientist-lər də vaxtaşırı əlavə təmizləmə edir, amma əsas, təkrarlanan işi avtomatlaşdırmaq data engineer-in vəzifəsidir. Bu işdə **SQL**, **Python (pandas)**, **Apache Spark** və **dbt** kimi alətlərdən istifadə olunur.

## Qısa xülasə

- Emal xam datanı istifadəyə yararlı formaya salır: təmizləmə, formatlama, cəmləmə, birləşdirmə, maskalama.
- Emalın məqsədləri: keyfiyyət, qənaət, uyğunluq, məxfilik və avtomatlaşdırma.
- Təkrarlanan emal pipeline-a qurulur və hər gün avtomatik işləyir.
