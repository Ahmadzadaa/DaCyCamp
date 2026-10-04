---
title: 'Yekun layihə: rəhbərlik üçün vizual hesabat'
xp: 10
estimated_minutes: 5
---

Gün 7 və Gün 8-in tapşırıqlarını bir **dashboard**-da birləşdiririk. Rəhbərlik bir səhifədə görmək istəyir:

1. Kateqoriyalar üzrə gəlir (sütun);
2. Regionların gəlir payı (dairə);
3. Apple məhsullarının aylıq satılan ədədi (xətt);
4. Units Sold ilə Total Revenue əlaqəsi (səpələnmə);
5. Məhsul qiymətlərinin paylanması (histoqram);
6. Regionlar üzrə satış məbləğlərinin yayılması (qutu).

Sonra ən çox satılan 3 məhsulun gəlirini və regionların aylıq dinamikasını ayrıca göstərəcəyik.

## Yaxşı dashboard qaydaları (xatırlatma)

- Hər qrafikin **başlığı nəticəni** və ya sualı desin.
- Ox adları və vahidlər olsun.
- Rənglər ardıcıl və az olsun; vacib olan vurğulansın.
- `figsize` və `tight_layout()` ilə qrafiklər bir-birini örtməsin.

> 💡 Apple məhsullarını tapmaq üçün adın başlanğıcına bax: iPhone, iPad, MacBook, AirPods, Apple Watch — `str.contains(r"^(?:iPhone|iPad|MacBook|AirPods|Apple)", regex=True)`.
