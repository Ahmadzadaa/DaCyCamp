---
title: Korrelyasiya, səbəbiyyət və A/B test
xp: 10
estimated_minutes: 8
---

Analitikin ən çox verdiyi suallardan biri: «Bu iki şey əlaqəlidirmi?» və daha vacibi: «Biri digərinə **səbəb** olurmu?»

## Korrelyasiya

**Korrelyasiya** iki göstəricinin birlikdə necə dəyişdiyini göstərir və −1 ilə +1 arasında ölçülür:

| Növ | Mənası | Nümunə |
| --- | --- | --- |
| **Müsbət** (0-dan +1-ə) | Biri artanda digəri də artır | Reklam büdcəsi ↑ → sayt ziyarətləri ↑ |
| **Mənfi** (0-dan −1-ə) | Biri artanda digəri azalır | Çatdırılma gecikməsi ↑ → müştəri reytinqi ↓ |
| **Yoxdur** (~0) | Aralarında əlaqə yoxdur | Kuryerin ayaqqabı ölçüsü və çatdırılma sürəti |

## Korrelyasiya səbəbiyyət deyil ⚠️

Yay aylarında həm **dondurma satışı**, həm də **dənizdə boğulma halları** artır. Bu o demək deyil ki, dondurma boğulmaya səbəb olur. Hər ikisinə **üçüncü amil** — isti hava təsir edir: insanlar həm daha çox dondurma alır, həm daha çox dənizə girir.

Belə gizli amillərə **qarışdırıcı dəyişən** (confounding variable) deyilir. NarMarket-də: «Tətbiqdə çox vaxt keçirən müştərilər daha çox xərcləyir» — bəlkə də hər ikisinin səbəbi müştərinin böyük ailəsi və həftəlik böyük alış-verişidir.

## Səbəbi necə sübut etmək olar? A/B test

**A/B test** — səbəb-nəticə əlaqəsini yoxlamağın ən etibarlı üsuludur:

1. İstifadəçilər **təsadüfi** iki qrupa bölünür.
2. **A qrupu** (nəzarət qrupu) köhnə versiyanı görür, **B qrupu** yeni versiyanı.
3. Qalan hər şey eynidir.
4. Müəyyən müddətdən sonra əsas göstərici (məsələn, konversiya) müqayisə edilir.

Qruplar təsadüfi bölündüyü üçün aralarındakı yeganə sistemli fərq dəyişiklikdir — deməli, nəticədəki fərq də ondan qaynaqlanır.

> 🧪 **NarMarket:** «Sifariş et» düyməsi yaşıldan narıncıya dəyişdirilir. 2 həftə ərzində 50 000 istifadəçi: A (yaşıl) — konversiya 3.0%, B (narıncı) — 3.4%. Fərq kifayət qədər böyük və sabitdirsə, narıncı düymə tətbiq olunur.

**Diqqət:** qrup çox kiçik olarsa və ya test çox qısa çəkərsə, fərq təsadüfi ola bilər. Buna görə testin ölçüsü və müddəti əvvəlcədən planlaşdırılır, nəticənin **statistik əhəmiyyəti** yoxlanılır.

## Seqmentasiya, trend və mövsümilik

- **Seqmentasiya** — datanı qruplara bölmək: şəhər, yaş, yeni/köhnə müştəri. Ümumi orta çox vaxt qrupların arasındakı fərqi gizlədir.
- **Trend** — uzunmüddətli istiqamət: sifarişlər hər ay orta hesabla 3% artır.
- **Mövsümilik** — təkrarlanan dövri dəyişmə: Novruz və Yeni il ərəfəsində sifarişlər artır, yayda bəzi kateqoriyalar düşür. Oktyabrı dekabrla müqayisə etmək yanlış nəticə verə bilər — keçən ilin eyni dövrü ilə müqayisə et.

## Qısa xülasə

- Korrelyasiya iki göstəricinin birlikdə dəyişməsidir: müsbət, mənfi və ya yoxdur.
- Korrelyasiya səbəbiyyət deyil — gizli üçüncü amil ola bilər.
- Səbəbi yoxlamaq üçün A/B test: təsadüfi qruplar, bir dəyişiklik, nəticələrin müqayisəsi.
