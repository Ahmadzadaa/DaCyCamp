---
title: Əsas statistika
xp: 10
estimated_minutes: 7
---

Analitikin gündəlik alətlərindən biri — datanı bir neçə rəqəmlə xülasə etməkdir. Bunun üçün böyük riyaziyyat lazım deyil, amma hər göstəricinin nəyi göstərdiyini və nəyi gizlətdiyini bilmək vacibdir.

## Mərkəzi meyl göstəriciləri

Bir gündə NarMarket-in 7 sifarişinin məbləğləri (₼): **12, 15, 18, 20, 25, 30, 400**

| Göstərici | Necə hesablanır | Nəticə |
| --- | --- | --- |
| **Orta** (mean) | Hamısının cəmi ÷ say | 520 ÷ 7 ≈ **74.3 ₼** |
| **Median** | Sıralanmış datanın ortasındakı dəyər | **20 ₼** |
| **Moda** (mode) | Ən çox təkrarlanan dəyər | Bu datada yoxdur |

Bir korporativ sifariş (400 ₼) ortanı 74 ₼-a qaldırıb, halbuki 7 sifarişdən 6-sı 30 ₼-dan azdır. **Median kənar dəyərlərə daha az həssasdır** və «tipik» sifarişi daha düzgün göstərir.

> 💼 Eyni səbəbdən maaşlar haqqında danışanda median daha düzgündür: bir neçə çox yüksək maaş ortanı şişirdir.

Say cüt olduqda median iki orta dəyərin ortasıdır: 10, 20, 30, 40 → (20 + 30) ÷ 2 = 25.

**Moda** kateqoriyal data üçün xüsusilə faydalıdır: «ən çox seçilən ödəniş üsulu hansıdır?» — kart.

## Yayılma göstəriciləri

Ortalar eyni olsa da, data çox fərqli ola bilər:

- Anbar A-da çatdırılma: 29, 30, 31 dəqiqə
- Anbar B-də çatdırılma: 10, 30, 50 dəqiqə

Hər ikisində orta 30 dəqiqədir, amma B-də müştəri nə vaxt sifariş alacağını bilmir.

- **Diapazon** (range) = maksimum − minimum: A-da 2, B-də 40 dəqiqə.
- **Standart kənarlaşma** (standard deviation) — dəyərlərin ortadan orta hesabla nə qədər uzaq olduğunu göstərir. Kiçikdirsə, data sabitdir; böyükdürsə, dağınıqdır.

## Faizlər və dəyişmə

**Faiz dəyişməsi** = (yeni − köhnə) ÷ köhnə × 100%

Satış sentyabrda 50 000 ₼, oktyabrda 60 000 ₼ → (60 000 − 50 000) ÷ 50 000 × 100% = **+20%**.

> ⚠️ **Faiz və faiz bəndi fərqlidir.** Konversiya 2%-dən 3%-ə qalxıbsa, bu **1 faiz bəndi** artımdır, amma nisbi artım **50%**-dir. Hesabatlarda hansını nəzərdə tutduğunu aydın yaz.

## Qısa xülasə

- Orta bütün dəyərləri nəzərə alır, amma kənar dəyərlər onu təhrif edir; median daha dayanıqlıdır.
- Moda ən çox təkrarlanan dəyərdir — kateqoriyalar üçün faydalıdır.
- Diapazon və standart kənarlaşma datanın nə qədər dağınıq olduğunu göstərir.
- Faiz dəyişməsi = (yeni − köhnə) ÷ köhnə × 100%.
