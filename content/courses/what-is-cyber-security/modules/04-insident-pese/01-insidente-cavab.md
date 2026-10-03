---
title: İnsidentə cavab
xp: 10
estimated_minutes: 8
---

Ən yaxşı müdafiə belə bəzən yarılır. Fərq — şirkətin buna **hazır** olub-olmamasındadır. **İnsident** — təhlükəsizliyi pozan və ya pozmaq təhlükəsi yaradan hadisədir: ransomware, data sızması, hesabın ələ keçirilməsi.

## İnsidentə cavabın mərhələləri

Klassik model (NIST) dörd mərhələdən ibarətdir:

| # | Mərhələ | Nə edilir |
| --- | --- | --- |
| 1 | **Hazırlıq** | Cavab planı, komanda və rollar, alətlər, təlimlər, yoxlanılmış ehtiyat nüsxələr |
| 2 | **Aşkarlama və təhlil** | Xəbərdarlıqların araşdırılması, insidentin təsdiqi, miqyasın və təsirin müəyyən edilməsi |
| 3 | **Məhdudlaşdırma, aradan qaldırma və bərpa** | Yayılmanı dayandırmaq, zərərli proqramı və giriş yollarını təmizləmək, sistemləri bərpa etmək |
| 4 | **İnsidentdən sonrakı fəaliyyət** | «Nə öyrəndik?» görüşü, hesabat, planın və tədbirlərin yenilənməsi |

## NarPay-də ransomware gecəsi 🌙

**Hazırlıq (aylar əvvəl):** NarPay-in insident planı var, ehtiyat nüsxələr 3-2-1 qaydası ilə saxlanılır və hər ay bərpa sınağı keçirilir.

**03:12 — Aşkarlama.** SIEM xəbərdarlıq verir: mühasibat serverində dəqiqədə minlərlə fayl dəyişdirilir. Növbətçi analitik Rauf araşdırır: fayllar şifrələnir, ekranda fidyə tələbi var. İnsident təsdiqlənir, komanda oyadılır.

**03:20 — Məhdudlaşdırma.** Yoluxmuş server və həmin seqmentdəki kompüterlər **şəbəkədən ayrılır**, ələ keçirilmiş hesabın parolu dəyişdirilir. Yayılma dayanır. Sübutlar (jurnallar, yaddaş görüntüsü) silinmədən saxlanılır.

**Aradan qaldırma və bərpa.** Araşdırma göstərir ki, giriş bir işçinin fişinq məktubundakı makroslu fayldan başlayıb. Zərərli proqram təmizlənir, zəiflik bağlanır, server **ehtiyat nüsxədən** bərpa edilir. Fidyə ödənilmir. 11:00-da mühasibat yenidən işləyir.

**İnsidentdən sonra.** Bir həftə sonra «Nə öyrəndik?» görüşü: e-poçtda makroslu faylların bloklanması, mühasibat şöbəsi üçün əlavə fişinq təlimi, xəbərdarlıq qaydalarının yaxşılaşdırılması. Hesabat rəhbərliyə təqdim olunur, qanunun tələb etdiyi bildirişlər edilir.

## Qızıl qaydalar

- **Panika etmə, plana əməl et.** Plan böhran anında düşünməyə vaxt qazandırır.
- **Əvvəlcə məhdudlaşdır.** Yoluxmuş cihazı şəbəkədən ayır — amma sübutları məhv etmə (cihazı dərhal formatlama).
- **Sənədləşdir.** Nə vaxt, nə görüldü, kim nə etdi.
- **Ünsiyyət.** Rəhbərlik, hüquq şöbəsi, lazım olduqda müştərilər və tənzimləyicilər vaxtında məlumatlandırılmalıdır.
- **Hər insident — dərsdir.** Eyni səhv iki dəfə təkrarlanmamalıdır.

## Qısa xülasə

- Mərhələlər: hazırlıq → aşkarlama və təhlil → məhdudlaşdırma, aradan qaldırma, bərpa → insidentdən sonrakı fəaliyyət.
- Hazırlıq insident baş verməmişdən çox əvvəl başlayır.
- Əvvəlcə yayılmanı dayandır, sübutları qoru, sonra təmizlə və bərpa et, sonda dərs çıxar.
