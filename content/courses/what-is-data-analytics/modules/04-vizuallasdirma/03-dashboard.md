---
title: Dashboard-lar və BI alətləri
xp: 10
estimated_minutes: 6
---

**Dashboard** — ən vacib göstəriciləri bir ekranda toplayan və mütəmadi yenilənən interaktiv paneldir. Avtomobilin cihaz panelini düşün: sürücü yolda olarkən sürəti, yanacağı və xəbərdarlıqları bir baxışda görür.

## Hesabat və dashboard

| | Hesabat | Dashboard |
| --- | --- | --- |
| **Forma** | Sənəd, təqdimat | İnteraktiv panel |
| **Yenilənmə** | Bir dəfəlik və ya dövri | Avtomatik, çox vaxt gündəlik və ya canlı |
| **Məqsəd** | Konkret suala dərin cavab | Vəziyyəti daim izləmək |

## Yaxşı dashboard-un prinsipləri

1. **Auditoriyanı tanı** — direktora 5 əsas KPI, anbar müdirinə isə saatlıq sifariş axını lazımdır.
2. **5 saniyə qaydası** — ən vacib məlumat 5 saniyəyə görünməlidir.
3. **Az, amma vacib** — 3–5 əsas KPI yuxarıda, detallar aşağıda.
4. **Kontekst ver** — «48 210 sifariş» rəqəmi tək-başına az şey deyir. «Dünənə nisbətən +4%, hədəfdən −2%» isə deyir.
5. **Ardıcıl dizayn** — eyni rəng hər yerdə eyni mənanı versin: yaşıl — yaxşı, qırmızı — diqqət.
6. **Filtrlər** — istifadəçi şəhər, tarix, kateqoriya seçib özü dərinləşə bilsin.

## NarMarket-in direktor dashboard-u

```text
┌────────────┬────────────┬────────────┬────────────┐
│ Sifarişlər │ Gəlir      │ Orta məbləğ│ Gecikmələr │
│ 48 210 ↑4% │ 1.69M ₼ ↑6%│ 35.1 ₼ ↑2% │ 7.8% ↑1.2pp│
├────────────┴────────────┴────────────┴────────────┤
│ Gündəlik sifarişlər (son 30 gün) — xətt qrafiki    │
├─────────────────────────┬─────────────────────────┤
│ Şəhərlər üzrə satış     │ Kateqoriyalar üzrə satış│
│ (sütun)                 │ (sütun)                 │
└─────────────────────────┴─────────────────────────┘
```

## BI alətləri

- **Excel / Google Sheets** — kiçik datalar və sürətli təhlil üçün; pivot cədvəllər və qrafiklər.
- **Power BI** (Microsoft) — şirkətlərdə ən geniş yayılmış BI alətlərindən biri.
- **Tableau** — güclü vizuallaşdırma imkanları.
- **Looker Studio** (Google) — pulsuz, Google xidmətləri ilə asan inteqrasiya.

Bu alətlər adətən data warehouse-a qoşulur və data engineer-in hazırladığı cədvəllərdən avtomatik yenilənir. **Self-service BI** ideyası da budur: hər kəs analitikə müraciət etmədən lazım olan rəqəmi özü tapa bilsin.

## Qısa xülasə

- Dashboard vacib göstəriciləri bir ekranda toplayır və avtomatik yenilənir.
- Prinsiplər: auditoriya, 5 saniyə qaydası, az amma vacib KPI, kontekst, ardıcıl dizayn, filtrlər.
- Əsas alətlər: Excel/Sheets, Power BI, Tableau, Looker Studio.
