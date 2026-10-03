---
title: Bir gün data engineer kimi
xp: 10
estimated_minutes: 6
---

Tanış ol: **Nigar**, NarMarket-in data engineer-i. Gəlin onun bir iş gününə baxaq.

## 08:45 — Səhər xəbərdarlığı 🚨

Nigar telefonunda Airflow-dan bildiriş görür: gecəlik pipeline-ın **«ödənişləri yüklə»** addımı uğursuz olub. Asılı addımlar gözləyir, satış dashboard-u yenilənməyib. Direktor saat 10:00-da hesabata baxacaq.

## 09:00 — Araşdırma

Nigar xəta jurnalını (log) açır: ödəniş provayderi xəbərdarlıq etmədən tarix formatını `03.10.2026`-dan `2026/10/03`-ə dəyişib və çevirmə addımı bu formatı tanımır. Nigar:

1. çevirmə qaydasını yeni formata uyğunlaşdırır;
2. gələcəkdə belə dəyişikliyi dərhal tutan **yoxlama** (data quality test) əlavə edir;
3. pipeline-ı əl ilə yenidən başladır.

09:40-da dashboard yenilənir. Nigar analitiklərə qısa mesaj yazır: nə baş verdi, nə düzəldi, data artıq düzgündür.

## 11:00 — Görüş: real vaxt dashboard-u

Marketinq komandası kampaniya zamanı satışları **canlı** görmək istəyir. Gecəlik batch pipeline buna uyğun deyil. Nigar sifariş hadisələrini **Kafka** vasitəsilə ötürən streaming həll təklif edir, tələbləri dəqiqləşdirir: hansı göstəricilər, nə qədər gecikmə məqbuldur, büdcə nə qədərdir.

## 14:00 — Data keyfiyyəti

Analitik Aysel müştəri sayının şişirdildiyini bildirir. Nigar araşdırır: bəzi müştərilər həm tətbiqdən, həm saytdan qeydiyyatdan keçib və iki dəfə sayılır. O, müştəriləri telefon nömrəsinə görə birləşdirən emal addımı və **unikallıq yoxlaması** əlavə edir.

## 16:00 — Xərc nəzarəti 💸

Aylıq bulud hesabına baxarkən Nigar keçən həftə test üçün qaldırılmış və unudulmuş Spark klasterini görür — hər saat pul xərcləyir. Klasteri söndürür və bundan sonra test klasterlərinin avtomatik sönməsi qaydasını qurur.

## 17:00 — Sənədləşdirmə

Gün sonunda Nigar yeni yoxlamaları və müştəri birləşdirmə qaydasını **data kataloqunda** təsvir edir ki, komandada hər kəs nəyin necə işlədiyini bilsin.

## Bu gündən nə öyrəndik?

- Data engineer-in işinin böyük hissəsi **etibarlılıqdır**: problemi analitiklər görməmiş tapıb həll etmək.
- Hər xəta yeni **avtomatik yoxlama** üçün fürsətdir.
- Texniki iş qədər **ünsiyyət** vacibdir: nə baş verdiyini izah etmək, tələbləri dəqiqləşdirmək.
- Xərc və sənədləşdirmə də işin bir hissəsidir.
