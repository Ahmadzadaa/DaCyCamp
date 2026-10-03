---
title: Müdafiə qatları (defense in depth)
xp: 10
estimated_minutes: 7
---

Heç bir müdafiə vasitəsi 100% etibarlı deyil. Buna görə təhlükəsizlik **qatlarla** qurulur: bir qat yarılsa, növbəti qat hücumu dayandırır. Bu yanaşma **defense in depth** (dərin müdafiə) adlanır.

## Qala bənzətməsi 🏰

Orta əsr qalasını düşün: xəndək, hündür divarlar, qapıda keşikçilər, içəridə mühafizəçilər, xəzinə isə kilidli otaqda. Düşmən xəndəkdən keçsə, divar; divarı aşsa, keşikçilər onu dayandırır.

## Nəzarət tədbirlərinin üç növü

**Texniki tədbirlər:**

- **Firewall** — şəbəkəyə daxil olan və çıxan trafiki qaydalara görə süzür.
- **IDS/IPS** — şübhəli şəbəkə fəaliyyətini aşkarlayan və bloklayan sistemlər.
- **Antivirus / EDR** — cihazlarda zərərli proqramları və şübhəli davranışı aşkarlayır.
- **Yeniləmələr** (patching) — məlum zəiflikləri bağlayır. Ən sadə, amma ən təsirli tədbirlərdən biridir.
- **Şifrələmə** — oğurlansa belə datanı oxunmaz edir.
- **Jurnallar və monitorinq (SIEM)** — bütün sistemlərin qeydlərini bir yerdə toplayıb anomaliyaları göstərir.

**İnzibati tədbirlər (qaydalar və insanlar):**

- təhlükəsizlik siyasətləri və parol qaydaları;
- işçilərin fişinq və təhlükəsizlik təlimləri;
- giriş hüquqlarının mütəmadi yoxlanması;
- insidentə cavab planı.

**Fiziki tədbirlər:**

- server otağına kartla giriş, kilidlər;
- videomüşahidə kameraları, mühafizəçilər;
- yanğın söndürmə və fasiləsiz enerji təchizatı.

## Əsas prinsiplər

- **Ən az imtiyaz** (least privilege) — hər kəs yalnız işi üçün lazım olan minimum hüquqa sahib olmalıdır. Marketinq təcrübəçisinə ödəniş bazasına giriş lazım deyil.
- **Şəbəkənin seqmentləşdirilməsi** — şəbəkəni hissələrə bölmək: ofis kompüterləri ödəniş serverləri ilə eyni şəbəkədə olmamalıdır. Bir hissə yoluxsa, hücum yayılmır.
- **Zero trust** — «heç vaxt etibar etmə, həmişə yoxla»: şəbəkənin içində olmaq avtomatik etibar demək deyil, hər giriş yoxlanılır.

## Ehtiyat nüsxə: 3-2-1 qaydası 💾

- **3** nüsxə data (orijinal + 2 ehtiyat),
- **2** fərqli daşıyıcıda (məsələn, disk və bulud),
- **1** nüsxə başqa yerdə (offsite) — ideal halda şəbəkədən ayrılmış, ransomware-in çata bilmədiyi yerdə.

Və ən vacibi: **bərpanı mütəmadi yoxla**. Yoxlanılmamış ehtiyat nüsxə — ümiddir, plan deyil.

## Qısa xülasə

- Defense in depth: bir-birini tamamlayan bir neçə müdafiə qatı.
- Tədbirlər üç növdür: texniki, inzibati, fiziki.
- Əsas prinsiplər: ən az imtiyaz, seqmentləşdirmə, zero trust, 3-2-1 ehtiyat nüsxə.
