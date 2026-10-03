---
title: Şifrələmə və heşləmə
xp: 10
estimated_minutes: 8
---

Data oğurlansa belə oxunmaz qalırsa, hücumçunun əlində dəyərsiz simvollar yığını olur. Bunu iki fərqli texnologiya təmin edir: **şifrələmə** və **heşləmə**.

## Şifrələmə (encryption)

**Şifrələmə** — oxunaqlı datanı (**plaintext**) açar vasitəsilə oxunmaz formaya (**ciphertext**) çevirmək. Düzgün açarı olan onu geri aça (deşifrə edə) bilər.

```text
"Köçürmə: 250 ₼"  ──(açar)──►  "x9#Lq2!vR7pZ"  ──(açar)──►  "Köçürmə: 250 ₼"
```

### Simmetrik şifrələmə

Şifrələmək və açmaq üçün **eyni açar** istifadə olunur. Ən geniş yayılmış alqoritm — **AES**.

- ✅ Çox sürətlidir, böyük datalar üçün idealdır.
- ❌ Problem: açarı qarşı tərəfə necə təhlükəsiz çatdırmalı?

### Asimmetrik şifrələmə

İki açar: **açıq açar** (public key) hamıya verilir, **gizli açar** (private key) yalnız sahibində qalır. Açıq açarla şifrələnən mesajı yalnız uyğun gizli açar aça bilər. Alqoritmlər: **RSA**, **ECC**.

> 📬 **Bənzətmə:** açıq açar — poçt qutusunun yarığıdır: hər kəs içəri məktub ata bilər. Gizli açar isə qutunun açarıdır — məktubları yalnız sahibi götürə bilər.

Leylaya gizli mesaj göndərmək üçün onu **Leylanın açıq açarı** ilə şifrələyirsən — yalnız Leyla öz gizli açarı ilə aça bilər.

### HTTPS — ikisi birlikdə

Brauzerdə 🔒 işarəsi gördüyün zaman **TLS** protokolu işləyir: əvvəlcə asimmetrik şifrələmə ilə təhlükəsiz şəkildə müvəqqəti açar razılaşdırılır, sonra sürətli simmetrik şifrələmə ilə data ötürülür.

### Hərəkətdə və saxlamada

- **Ötürülmə zamanı** (in transit) — şəbəkədə hərəkət edən data: HTTPS, VPN, mesajlaşma tətbiqlərinin uçdan-uca şifrələməsi.
- **Saxlama zamanı** (at rest) — diskdəki data: noutbukun disk şifrələməsi, bazanın şifrələnməsi. Noutbuk oğurlansa, data oxunmaz qalır.

## Heşləmə (hashing)

**Heş funksiyası** istənilən uzunluqda datadan sabit uzunluqlu «barmaq izi» yaradır. Məsələn, **SHA-256**.

- **Birtərəflidir** — heşdən orijinal datanı geri almaq mümkün deyil. Açar yoxdur.
- Eyni giriş həmişə **eyni heşi** verir.
- Girişdə bir simvol dəyişsə, heş **tamamilə** dəyişir.

### Harada istifadə olunur?

- **Parolların saxlanması** — sayt parolunu özünü yox, heşini saxlayır. Daxil olanda yazdığın parolun heşi hesablanıb müqayisə edilir. Baza sızsa belə, parollar açıq görünmür. Bunun üçün hər parola təsadüfi **duz** (salt) əlavə edən xüsusi yavaş alqoritmlər (bcrypt, Argon2) istifadə olunur.
- **Bütövlüyün yoxlanması** — yüklədiyin faylın heşini rəsmi saytdakı heşlə müqayisə edərək faylın dəyişdirilmədiyinə əmin olursan.

## Şifrələmə və heşləmə

| | Şifrələmə | Heşləmə |
| --- | --- | --- |
| **Geri açmaq** | Mümkündür (açarla) | Mümkün deyil |
| **Açar** | Var | Yoxdur |
| **Məqsəd** | Məxfilik | Bütövlük, parolların saxlanması |
| **Nümunə** | AES, RSA | SHA-256, bcrypt |

## Qısa xülasə

- Şifrələmə datanı açarla oxunmaz edir və geri açılır; simmetrik — bir açar, asimmetrik — açıq və gizli açar.
- HTTPS hər iki növü birləşdirir; data həm ötürülmədə, həm saxlamada şifrələnməlidir.
- Heşləmə birtərəflidir: parolların saxlanması və bütövlüyün yoxlanması üçün.
