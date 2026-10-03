---
title: Parollar və çoxfaktorlu autentifikasiya
xp: 10
estimated_minutes: 7
---

Hesablarına giriş — sənin rəqəmsal evinin açarıdır. Hücumların böyük hissəsi elə bu açarın oğurlanması və ya təxmin edilməsi ilə başlayır.

## Güclü parol necə olur?

- **Uzunluq mürəkkəblikdən vacibdir.** 8 simvollu `P@ssw0rd!` tez tapılır: həm qısadır, həm də hücumçuların lüğətlərində var. 4–5 təsadüfi sözdən ibarət uzun **parol ifadəsi** (passphrase) həm güclü, həm də yadda saxlanılandır.
- **Unikallıq** — hər hesab üçün ayrı parol. Bir sayt sızsa, digərləri təhlükəsiz qalır (credential stuffing-ə qarşı).
- **Şəxsi məlumatdan qaç** — ad, doğum tarixi, sevdiyin komanda asanlıqla tapılır.

| Parol | Qiymət |
| --- | --- |
| `123456`, `qwerty` | ❌ Saniyələrlə tapılır |
| `Nigar1995` | ❌ Ad və il — sosial şəbəkədən tapılır |
| `P@ssw0rd!` | ❌ Simvollar var, amma məşhur nümunədir |
| `bənövşəyi-kuryer-dəniz-qatar-74` | ✅ Uzun, təsadüfi, yadda qalan |

## Parol meneceri 🔑

Onlarla unikal uzun parolu yadda saxlamaq mümkün deyil — və lazım da deyil. **Parol meneceri** (Bitwarden, 1Password, KeePass və s.) bütün parolları şifrələnmiş seyfdə saxlayır, güclü parollar yaradır və avtomatik doldurur. Sən yalnız **bir** güclü master parolu yadda saxlayırsan.

## Çoxfaktorlu autentifikasiya (MFA)

Parol oğurlansa belə, hesabı qorumağın ən təsirli yolu — **MFA**: kimliyini iki və ya daha çox **fərqli növ** faktorla təsdiqləmək.

| Faktor | Nədir | Nümunələr |
| --- | --- | --- |
| **Bildiyin bir şey** | Yaddaşındakı məlumat | Parol, PIN, gizli sualın cavabı |
| **Sahib olduğun bir şey** | Fiziki əşya və ya cihaz | Telefondakı autentifikator tətbiqi, SMS kodu, fiziki təhlükəsizlik açarı, bank kartı |
| **Olduğun bir şey** | Biometrik göstərici | Barmaq izi, üz tanıma, səs |

> ⚠️ Parol + PIN **MFA deyil** — hər ikisi «bildiyin bir şey»dir. Faktorlar fərqli növdən olmalıdır.

**Hansı ikinci faktor daha güclüdür?** SMS kodu heç olmamasından çox yaxşıdır, amma SIM kartın saxta dəyişdirilməsi (SIM swap) və fişinqlə ələ keçirilə bilər. **Autentifikator tətbiqləri** daha güclüdür, **fiziki təhlükəsizlik açarları** və **passkey**-lər isə fişinqə qarşı ən dayanıqlı seçimdir.

## Passkey — parolsuz gələcək

**Passkey** — parol əvəzinə cihazında saxlanan kriptoqrafik açardır. Barmaq izi və ya üz ilə təsdiqləyirsən, açar heç vaxt cihazdan çıxmır və yalnız həqiqi sayt üçün işləyir — saxta fişinq saytı ondan istifadə edə bilməz.

## Qısa xülasə

- Güclü parol uzun və unikal olur; parol ifadəsi yaxşı seçimdir.
- Parol meneceri unikal parolları idarə etməyi asanlaşdırır.
- MFA fərqli növ faktorları birləşdirir: bildiyin, sahib olduğun, olduğun bir şey.
