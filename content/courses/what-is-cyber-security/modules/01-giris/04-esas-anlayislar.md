---
title: Aktiv, təhdid, zəiflik və risk
xp: 10
estimated_minutes: 7
---

Təhlükəsizlik mütəxəssisləri hər şeyi eyni anda qoruya bilməzlər. Hara vaxt və pul xərcləməli olduqlarını müəyyən etmək üçün bir neçə əsas anlayışdan istifadə edirlər.

## Ev bənzətməsi 🏠

| Anlayış | Mənası | Evdə | NarPay-də |
| --- | --- | --- | --- |
| **Aktiv** (asset) | Qorunmalı olan dəyərli şey | Ev və içindəki əşyalar | Müştəri bazası, pul köçürmə sistemi |
| **Təhdid** (threat) | Zərər vura biləcək şəxs və ya hadisə | Oğru, yanğın | Kiberdələduzlar, narazı işçi, sel |
| **Zəiflik** (vulnerability) | Təhdidin istifadə edə biləcəyi boşluq | Açıq qalmış pəncərə | Yenilənməmiş server, zəif parol |
| **Ekspluatasiya** (exploit) | Zəiflikdən istifadə üsulu | Pəncərədən içəri girmək | Köhnə proqramdakı xətadan istifadə edən kod |
| **Risk** | Zərərin baş vermə ehtimalı və təsiri | Oğurluq ehtimalı × itkinin dəyəri | Sızma ehtimalı × cərimə və itirilən etimad |
| **Nəzarət tədbiri** (control) | Riski azaldan vasitə | Kilid, siqnalizasiya, sığorta | 2FA, firewall, ehtiyat nüsxə |

## Risk necə qiymətləndirilir?

Sadə formada:

> **Risk = Ehtimal × Təsir**

- Zəif parolla qorunan və internetə açıq admin paneli: ehtimal **yüksək**, təsir **çox yüksək** → kritik risk, dərhal həll edilməlidir.
- Ofisdəki printerin köhnə proqramı: ehtimal orta, təsir aşağı → sonraya planlaşdırıla bilər.

Təhdid olmadan zəiflik zərər vermir, zəiflik olmadan təhdid uğur qazanmır. Risk — onların **görüşdüyü yerdir**. Biz təhdidləri adətən yox edə bilmərik (dələduzlar həmişə olacaq), amma **zəiflikləri** azalda bilərik.

## Riskə qarşı 4 strategiya

| Strategiya | Mənası | NarPay nümunəsi |
| --- | --- | --- |
| **Azaltmaq** (mitigate) | Nəzarət tədbirləri ilə ehtimalı və ya təsiri kiçiltmək | Bütün işçilərə 2FA tətbiq etmək |
| **Ötürmək** (transfer) | Riskin maliyyə yükünü başqasına keçirmək | Kibersığorta almaq |
| **Qaçmaq** (avoid) | Riskli fəaliyyətdən imtina etmək | Kart məlumatlarını ümumiyyətlə saxlamamaq |
| **Qəbul etmək** (accept) | Risk kiçikdirsə, onunla yaşamaq | Printerin kiçik zəifliyini hələlik saxlamaq |

## Qısa xülasə

- Aktiv — qorunan dəyər; təhdid — zərər mənbəyi; zəiflik — boşluq; risk — ehtimal × təsir.
- Təhdidləri çox vaxt dəyişə bilmirik, zəiflikləri isə azalda bilirik.
- Riskə qarşı: azalt, ötür, qaç, qəbul et.
