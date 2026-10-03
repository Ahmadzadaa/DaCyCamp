---
title: Şəbəkə və veb hücumları
xp: 10
estimated_minutes: 8
---

Bəzi hücumlar insanları yox, birbaşa sistemləri, şəbəkələri və veb tətbiqləri hədəf alır.

## DoS və DDoS

**DoS** (Denial of Service) — xidməti həddən artıq sorğu ilə doldurub əlçatmaz etmək. **DDoS** (Distributed DoS) — eyni hücumun minlərlə cihazdan (çox vaxt **botnet**dən) eyni anda edilməsi. Məqsəd datanı oğurlamaq yox, **əlçatanlığı** pozmaqdır.

🛡️ Müdafiə: DDoS müdafiə xidmətləri, trafikin filtrlənməsi, resursların ehtiyatı.

## Ortadakı adam (Man-in-the-Middle, MitM)

Hücumçu istifadəçi ilə sayt arasına girib trafiki oxuyur və ya dəyişdirir. Klassik ssenari: hava limanında **«Free_Airport_WiFi»** adlı saxta şəbəkə — qoşulanların bütün trafiki hücumçunun cihazından keçir.

🛡️ Müdafiə: HTTPS (brauzerdə qıfıl), VPN, tanımadığın açıq Wi-Fi-da həssas əməliyyatlar etməmək.

## Parol hücumları

- **Brute force** — bütün mümkün kombinasiyaları sınamaq. Qısa parollar dəqiqələrlə tapılır.
- **Lüğət hücumu** — ən populyar parolları və sözləri sınamaq: `123456`, `password`, `qwerty`.
- **Credential stuffing** — başqa saytdan **sızmış** e-poçt və parol cütlərini avtomatik olaraq digər saytlarda sınamaq. Eyni parolu bir neçə yerdə istifadə edənlər hədəfdir.

🛡️ Müdafiə: uzun, unikal parollar, MFA, giriş cəhdlərinin məhdudlaşdırılması.

## SQL injection

Veb tətbiq istifadəçinin yazdığını yoxlamadan birbaşa baza sorğusuna əlavə edirsə, hücumçu giriş sahəsinə **SQL kodu** yazıb sorğunun mənasını dəyişə bilər: parolsuz daxil olmaq, bütün müştəri bazasını çıxarmaq, datanı silmək.

🛡️ Müdafiə: parametrləşdirilmiş sorğular (istifadəçi datası heç vaxt kod kimi icra olunmur), daxil edilən datanın yoxlanması.

## Cross-site scripting (XSS)

Hücumçu sayta (məsələn, şərh sahəsinə) zərərli **JavaScript** yerləşdirir və bu kod səhifəni açan digər istifadəçilərin brauzerində işləyir — sessiyalarını oğurlaya bilər.

🛡️ Müdafiə: istifadəçi datasını səhifədə göstərməzdən əvvəl təhlükəsiz formaya salmaq (escaping).

## Zero-day və təchizat zənciri hücumları

- **Zero-day** — istehsalçının hələ xəbəri olmayan və yamağı (patch) olmayan zəiflik. Müdafiə: müdafiə qatları, anormal davranışın izlənməsi.
- **Təchizat zənciri hücumu** (supply chain) — hədəfin istifadə etdiyi proqram və ya xidmət təchizatçısını sındırmaq. 2020-ci ildə SolarWinds proqramının yeniləməsinə zərərli kod yerləşdirildi və minlərlə təşkilat yoluxdu.

## Qısa xülasə

- DDoS əlçatanlığı pozur; MitM trafiki ələ keçirir.
- Brute force, lüğət hücumu və credential stuffing parolları hədəf alır.
- SQL injection və XSS veb tətbiqlərin istifadəçi datasını yoxlamamasından istifadə edir.
- Zero-day və təchizat zənciri hücumları müdafiə qatlarının vacibliyini göstərir.
