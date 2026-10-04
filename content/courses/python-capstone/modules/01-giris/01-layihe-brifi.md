---
title: 'Layihə brifi: «DaCy Store» satış təhlili'
xp: 10
estimated_minutes: 10
---

Sən «DaCy Store» onlayn mağazasının data analitikisən. Mağaza 2023–2024-cü illərdə **Azərbaycan, Türkiyə, Gürcüstan, Qazaxıstan və Özbəkistanda** ofis ləvazimatı, mebel və texnologiya satıb. Rəhbərlik növbəti ilin büdcəsini planlaşdırır və səndən **15 suala** cavab gözləyir — bunlar Python4Business kursunun Gün 9 qiymətləndirilən tapşırıqlarıdır.

## Rəhbərliyin sualları (5 blok)

| Blok | Suallar |
|---|---|
| 🚚 **Əməliyyat** | Sifarişdən göndərməyə neçə gün keçir? Hansı `ShipMode` nə qədər satış gətirir? Orta say və satış? |
| 💰 **Mənfəət** | `Sales` və `Profit` arasında əlaqə varmı? Kateqoriyaların orta satış və mənfəəti? |
| 🌍 **Coğrafiya** | Ən mənfəətli 2 ölkə? Ən mənfəətli şəhərlər? Seqmentlər üzrə satış? |
| 📦 **Məhsul** | Hansı məhsul daha çox gəlir gətirir? Hər kateqoriyanın lider məhsulu? Vizual müqayisə. |
| 👥 **Müştəri** | Ən dəyərli müştəri kimdir? Müştəriləri seqmentlərə ayır. Top müştərilər haradandır və nə alırlar? |

## Kursun quruluşu

Hər fəsil bir bloka cavab verir. Tapşırıqlar **eyni dataset** üzərindədir və ardıcıl açılır — əvvəlki addımda öyrəndiyin üsulu növbətidə istifadə edəcəksən. Sonda bütün nəticələri **bir dashboard**-da birləşdirib yekun testdən keçəcəksən.

> 💡 Real layihədə ən çox vaxt data yoxlamasına gedir. Ona görə də birinci tapşırıq heç bir «gözəl» nəticə vermir — amma sonrakı bütün nəticələrin düzgünlüyü ondan asılıdır.

## Dataset lüğəti

> 📁 **`sifarisler.csv`** — 1582 sətir, hər sətir bir sifarişin **bir məhsul sətridir** (bir `OrderID`-də bir neçə məhsul ola bilər).

| Sütun | Məna | Nümunə |
|---|---|---|
| `OrderID` | Sifariş nömrəsi | ORD-50001 |
| `OrderDate`, `ShipDate` | Sifariş və göndərmə tarixi | 2023-01-02 |
| `ShipMode` | Çatdırılma növü | Standard Class, Second Class, First Class, Same Day |
| `CustomerID`, `CustomerName` | Müştəri kodu və adı | C-1050, Nurlan Əliyev |
| `CustomerSegment` | Müştəri tipi | Consumer, Corporate, Small Business |
| `Country`, `City` | Ölkə və şəhər | Azerbaijan, Baku |
| `ProductID`, `ProductName`, `Category` | Məhsul | TEC-1004, Lenovo ThinkPad E14, Technology |
| `Sales`, `Quantity`, `Discount`, `Profit` | Satış (məbləğ), say, endirim, mənfəət | 2265.0, 2, 0, 270.28 |

## Analitik iş axını

```text
1. Sual        → biznes nə bilmək istəyir?   («ən dəyərli müştəri»)
2. Metrika     → necə ölçək?                 (Sales cəmi, CustomerID üzrə)
3. Hazırlıq    → tiplər, tarixlər, yeni sütunlar
4. Hesablama   → groupby / agg / pivot / corr
5. Yoxlama     → nəticə məntiqlidirmi? cəmlər tutur?
6. Təqdimat    → cədvəl + qrafik + 1 cümləlik nəticə
```
