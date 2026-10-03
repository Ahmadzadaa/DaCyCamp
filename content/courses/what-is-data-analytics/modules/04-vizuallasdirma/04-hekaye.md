---
title: Data ilə hekayə danışmaq
xp: 10
estimated_minutes: 7
---

Ən dəqiq təhlil də dinləyən başa düşməsə və heç bir qərar verilməsə, dəyərsizdir. **Data storytelling** — rəqəmləri insanları hərəkətə keçirən hekayəyə çevirmək bacarığıdır.

## Hekayənin quruluşu

1. **Kontekst** — vəziyyət nədir? «Gəncə NarMarket-in ikinci böyük bazarıdır.»
2. **Konflikt (kəşf)** — nə dəyişib? «Oktyabrda orada satış 18% düşüb, rəqib yoxdur, qiymətlər eynidir.»
3. **Səbəb** — niyə? «Yeni anbarın açılışı gecikdiyi üçün çatdırılma 35 dəqiqədən 70 dəqiqəyə qalxıb və gecikən sifarişlərdə reytinq kəskin düşüb.»
4. **Həll (tövsiyə)** — nə etməli? «Anbar açılana qədər Gəncəyə 20 əlavə kuryer — aylıq 9 000 ₼. İtirilən satış ayda təxminən 60 000 ₼-dır.»

## Auditoriyanı tanı

| Auditoriya | Nə istəyir |
| --- | --- |
| **Direktor** | Nəticə, təsir (₼), qərar — 3 dəqiqədə |
| **Əməliyyat meneceri** | Harada, nə vaxt, nə qədər — detallar |
| **Analitik həmkar** | Metodologiya, data mənbələri, məhdudiyyətlər |

> 💡 **«Nə olsun?» testi** (So what?): hər slayddan sonra özündən soruş — «bu rəqəm dinləyiciyə nə deyir və ondan nə gözləyirəm?» Cavab yoxdursa, slayd lazımsızdır.

Rəhbərliklə təqdimata **əsas nəticə və tövsiyə ilə** başla, detalları sonraya saxla.

## Aldadıcı qrafiklər 🚩

Qrafik bilərəkdən və ya bilməyərəkdən aldada bilər:

- **Kəsilmiş ox** (truncated axis) — y oxu 0-dan yox, 95-dən başlayır və 96 ilə 98 arasındakı kiçik fərq nəhəng görünür.
- **Seçmə data** (cherry-picking) — yalnız uyğun gələn dövrü göstərmək: «son 3 gündə satış artıb» (son 3 ayda isə düşüb).
- **3D dairəvi qrafiklər** — öndəki dilimlər böyük görünür.
- **İki fərqli miqyaslı ox** — iki xətt «eyni sürətlə» artır kimi görünür, halbuki miqyaslar fərqlidir.
- **Kontekstsiz rəqəm** — «şikayətlər 2 dəfə artıb» (10-dan 20-yə, 50 000 sifarişin içində).

Analitikin məsuliyyəti — datanı **dürüst** göstərməkdir, hətta nəticə gözlənilən olmasa belə.

## Qısa xülasə

- Hekayə: kontekst → kəşf → səbəb → tövsiyə.
- Auditoriyaya uyğunlaş; rəhbərliyə nəticə və tövsiyə ilə başla.
- Kəsilmiş ox, seçmə data, 3D və kontekstsiz rəqəmlərdən qaç — datanı dürüst göstər.
