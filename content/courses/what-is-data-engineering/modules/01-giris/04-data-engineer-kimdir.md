---
title: Data engineer kimdir?
xp: 10
estimated_minutes: 7
---

**Data engineer** datanı toplayan, saxlayan və emal edən sistemləri quran və onlara qulluq edən mütəxəssisdir. Onun əsas vəzifəsini bir cümlə ilə belə ifadə etmək olar:

> Datanı **düzgün formada**, **düzgün insanlara**, **vaxtında** və **səmərəli** şəkildə çatdırmaq.

## Əsas vəzifələri

- **Data pipeline-lar qurmaq** — datanı mənbələrdən götürüb lazım olan yerə avtomatik daşıyan sistemlər.
- **Verilənlər bazalarını idarə etmək** — cədvəllərin strukturunu (sxemini) qurmaq, sürətli işləməsini təmin etmək.
- **Data keyfiyyətinə nəzarət** — dublikatlar, boş dəyərlər, səhv formatlar vaxtında aşkarlanmalıdır.
- **Miqyaslanma** — data həcmi 10 dəfə artanda da sistem dayanmamalıdır.
- **Təhlükəsizlik və giriş hüquqları** — şəxsi məlumatlar qorunmalı, hər kəs yalnız ona lazım olan dataya çatmalıdır.

## Su təchizatı bənzətməsi 🚰

Şəhərin su sistemini düşün. Su mənbələri (çaylar, su anbarları) — **data mənbələridir**: tətbiqlər, saytlar, sensorlar. Borular — **data pipeline-lardır**. Təmizləyici stansiya — **data emalıdır**. Evlərdəki kranlar isə analitiklərin dashboard-ları və hesabatlarıdır.

Data engineer bu sistemin mühəndisi və santexnikidir: boruları layihələndirir, çəkir, sızma olanda təmir edir. Kranı açan adam boruları görmür — sadəcə təmiz suyun gəlməsini gözləyir.

## Data komandasında rollar

| | Data engineer | Data analitik | Data scientist |
| --- | --- | --- | --- |
| **Əsas sual** | Data etibarlı və vaxtında çatırmı? | Nə baş verib və niyə? | Nə baş verəcək? |
| **İşi** | Pipeline, baza, infrastruktur | Hesabat, dashboard, təhlil | Proqnoz modelləri, eksperimentlər |
| **Alətlər** | SQL, Python, Spark, Airflow, bulud | Excel, SQL, Power BI, Tableau | Python, statistika, maşın öyrənməsi |
| **NarMarket-də** | Sifarişləri hər gecə analitik bazaya yükləyir | «Hansı şəhərdə satış düşüb?» | «Gələn həftə neçə kuryer lazımdır?» |

> 📌 Sorğulara görə data scientist-lər vaxtlarının çox hissəsini datanı **tapmağa və təmizləməyə** sərf edirlər. Yaxşı data engineer bu vaxtı kəskin azaldır — və data scientist əsl işinə, modellərə vaxt ayırır.

## Böyük data (Big Data) və 5V

Data engineering-in əhəmiyyəti **Big Data** ilə birlikdə artdı. Big Data — ənənəvi üsullarla emal etmək çətin olan qədər böyük və mürəkkəb data deməkdir. Onu adətən **5V** ilə təsvir edirlər:

| V | Mənası | NarMarket-də |
| --- | --- | --- |
| **Volume** (həcm) | Datanın miqdarı | İldə 18 milyon sifariş, milyardlarla tətbiq hadisəsi |
| **Velocity** (sürət) | Datanın yaranma və emal sürəti | Kuryerlərin GPS-i hər 2 saniyədən bir yer göndərir |
| **Variety** (müxtəliflik) | Datanın növləri | Cədvəllər, JSON hadisələr, foto, rəy mətnləri |
| **Veracity** (etibarlılıq) | Datanın dəqiqliyi və keyfiyyəti | Səhv daxil edilmiş ünvanlar, dublikat qeydlər |
| **Value** (dəyər) | Datadan əldə edilən fayda | Daha dəqiq proqnoz → daha az israf |

## Qısa xülasə

- Data engineer datanı düzgün formada, düzgün insanlara, vaxtında çatdıran sistemləri qurur.
- Analitik keçmişi izah edir, data scientist gələcəyi proqnozlaşdırır — hər ikisi data engineer-in təməlindən asılıdır.
- Big Data 5V ilə təsvir olunur: həcm, sürət, müxtəliflik, etibarlılıq, dəyər.
