---
title: 'Python ilə e-poçt: smtplib və MIME'
xp: 10
estimated_minutes: 9
---

Hər səhər eyni hesabatı hazırlayıb e-poçtla göndərirsən? Python bunu avtomatlaşdıra bilər.

## Məktubu qurmaq: MIME

```python
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

msg = MIMEMultipart()
msg["From"] = "hesabat@sirket.az"
msg["To"] = "rehberlik@sirket.az"
msg["Subject"] = "Gündəlik satış hesabatı"
msg.attach(MIMEText("Salam! Dünənki hesabat əlavədədir.", "plain"))

with open("hesabat.csv", "rb") as f:
    hisse = MIMEBase("application", "octet-stream")
    hisse.set_payload(f.read())
encoders.encode_base64(hisse)
hisse.add_header("Content-Disposition", "attachment; filename=hesabat.csv")
msg.attach(hisse)
```

## Göndərmək: smtplib

```python
import os, smtplib

with smtplib.SMTP("smtp.gmail.com", 587) as server:
    server.starttls()                                    # şifrələnmiş əlaqə
    server.login(os.environ["EMAIL_USER"], os.environ["EMAIL_APP_PASSWORD"])
    server.send_message(msg)
```

- **587** — standart təhlükəsiz SMTP portu (STARTTLS).
- Gmail kimi xidmətlər adi parol əvəzinə **tətbiq parolu** (app password) tələb edir — iki faktorlu autentifikasiya açıq olmalıdır.

## 🔒 Təhlükəsizlik — ən vacib hissə

> ⚠️ **Parolu heç vaxt koda yazma.** Kod faylları paylaşılır, GitHub-a yüklənir, e-poçtla göndərilir — içindəki parol da onunla birlikdə yayılır. Kodda parol görmüsənsə, onu dərhal **ləğv et** və yenisini yarat.

- Parolu **mühit dəyişənində** (`os.environ`), `.env` faylında (git-ə əlavə olunmayan) və ya parol menecerində saxla.
- Hesabatda şəxsi məlumatlar varsa, alıcıların siyahısını yoxla; mümkünsə faylı şifrələ.
- Kütləvi göndərişdə xidmətin limitlərinə əməl et.

> 💻 Brauzer mühitində (DaCy) internetə SMTP əlaqəsi açmaq mümkün deyil. Tapşırıqda məktubu **qurub** yoxlayırıq; göndərmə hissəsini öz kompüterində və ya Colab-da sına.
