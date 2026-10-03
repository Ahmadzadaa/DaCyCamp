---
title: Kibertəhlükəsizlik peşələri
xp: 10
estimated_minutes: 7
---

Kibertəhlükəsizlik dünyada ən sürətlə böyüyən sahələrdən biridir və ixtisaslı mütəxəssislərə ehtiyac təklifdən çoxdur. Sahə genişdir — hər kəs öz marağına uyğun istiqamət tapa bilər.

## Komandalar: mavi, qırmızı, bənövşəyi

- 🔵 **Mavi komanda** (blue team) — müdafiəçilər: izləyir, aşkarlayır, cavab verir.
- 🔴 **Qırmızı komanda** (red team) — icazə ilə hücumçu rolunu oynayan etik hakerlər: zəiflikləri real hücumçulardan əvvəl tapırlar.
- 🟣 **Bənövşəyi komanda** (purple team) — hər ikisinin əməkdaşlığı: qırmızının tapdıqları dərhal mavinin müdafiəsini gücləndirir.

## Əsas peşələr

| Peşə | Nə edir |
| --- | --- |
| **SOC analitiki** | Xəbərdarlıqları izləyir və araşdırır (L1 → L2 → L3); bir çoxları sahəyə buradan başlayır |
| **İnsidentə cavab mütəxəssisi** | Hücum zamanı və sonra məhdudlaşdırma, təmizləmə, bərpa |
| **Penetrasiya testçisi** (pentester) | İcazə ilə sistemləri sındırmağa çalışıb zəiflikləri hesabat edir |
| **Təhlükəsizlik mühəndisi** | Firewall, EDR, SIEM kimi müdafiə sistemlərini qurur |
| **Təhdid ovçusu** (threat hunter) | Hələ xəbərdarlıq verməmiş gizli hücumçuları axtarır |
| **Rəqəmsal kriminalist** (forensics) | Sübutları toplayır, hücumun necə baş verdiyini bərpa edir |
| **GRC mütəxəssisi** | İdarəetmə, risk və uyğunluq: siyasətlər, auditlər, standartlar (ISO 27001, PCI DSS) |
| **AppSec / DevSecOps** | Proqram təminatının təhlükəsiz yazılmasını təmin edir |
| **Bulud təhlükəsizliyi mütəxəssisi** | AWS, Azure, Google Cloud mühitlərinin qorunması |

## Hansı bacarıqlar lazımdır?

1. **Şəbəkələr** — TCP/IP, DNS, HTTP necə işləyir.
2. **Əməliyyat sistemləri** — Linux və Windows; komanda sətri.
3. **Skript yazmaq** — Python, Bash: təkrarlanan işləri avtomatlaşdırmaq.
4. **Təhlükəsizlik əsasları** — bu kursda gördüklərimiz və onların dərinləşdirilməsi.
5. **Şəxsi bacarıqlar** — maraq, analitik düşüncə, stress altında sakitlik, aydın hesabat yazmaq.

**Sertifikatlar** (başlanğıcdan irəliyə): CompTIA Security+ → CEH, CySA+ → OSCP (praktik pentest) → CISSP (təcrübəli mütəxəssislər üçün).

## Necə məşq etməli? 🧩

- **CTF yarışları** (Capture The Flag) — qanuni tapşırıqlarda «bayraq» tapmaq; DaCy-də də CTF tapşırıqları var.
- **Ev laboratoriyası** — öz kompüterində virtual maşınlar qurub hücum və müdafiəni sınamaq.
- **Təlim platformaları** — qanuni, xüsusi hazırlanmış zəif sistemlər.

## Etika və qanun ⚖️

Etik hakeri cinayətkardan ayıran əsas şey — **yazılı icazədir**. İcazəsiz sistemi yoxlamaq, hətta «sadəcə maraq üçün» olsa belə, qanunsuzdur: Azərbaycan da daxil olmaqla əksər ölkələrin cinayət qanunvericiliyində kompüter sistemlərinə icazəsiz giriş üçün cəza nəzərdə tutulub. Həmişə yalnız öz sistemlərində, laboratoriyada və ya icazə verilmiş çərçivədə məşq et.

## Qısa xülasə

- Mavi komanda müdafiə edir, qırmızı komanda icazə ilə hücum edir, bənövşəyi — əməkdaşlıq.
- Bir çox mütəxəssis SOC analitiki kimi başlayır.
- Əsaslar: şəbəkələr, Linux, skriptlər; məşq — CTF və laboratoriyalar; qızıl qayda — yalnız icazə ilə.
