---
title: Regex nədir? re modulunun əsas funksiyaları
xp: 10
estimated_minutes: 8
---

Müştəri rəylərindən bütün telefon nömrələrini, sifariş qeydlərindən bütün kodları və ya e-poçt ünvanlarını çıxarmaq lazımdır. `find()` və `split()` bir konkret sözü tapır, amma «+994 ilə başlayan istənilən nömrə» kimi **nümunəni** tapa bilmir. Bunun üçün **regular expressions** (regex, mütəmadi ifadələr) var.

Python-da regex `re` modulu ilə işləyir:

```python
import re
```

## Dörd əsas funksiya

| Funksiya | Nə edir | Qaytarır |
| --- | --- | --- |
| `re.search(nümunə, mətn)` | İlk uyğunluğu tapır | `Match` obyekti və ya `None` |
| `re.findall(nümunə, mətn)` | Bütün uyğunluqları tapır | Siyahı |
| `re.sub(nümunə, yeni, mətn)` | Uyğunluqları əvəz edir | Yeni sətir |
| `re.split(nümunə, mətn)` | Uyğunluqlara görə bölür | Siyahı |

```python
metn = "Salam dünya! Salam hamıya!"

m = re.search(r"dünya", metn)
if m:
    print(m.group())                 # dünya

re.findall(r"Salam", metn)           # ['Salam', 'Salam']
re.sub(r"dünya", "planet", metn)     # 'Salam planet! Salam hamıya!'
re.split(r",", "Salam,dünya,hamıya") # ['Salam', 'dünya', 'hamıya']
```

## Niyə `r"..."`?

Nümunələrdə tərs xətt (`\`) çox olur: `\d` — rəqəm, `\s` — boşluq. Adi sətirdə `\` xüsusi mənalıdır (`\n` — yeni sətir), ona görə nümunələri **raw string** — `r"..."` kimi yazırıq: `r"\d+"`.

## Match obyekti

`re.search()` uyğunluq tapanda `Match` obyekti qaytarır:

```python
m = re.search(r"\d+", "Sifariş 1045 çatdırıldı")
m.group()    # '1045'  — tapılan mətn
m.start()    # 8       — başladığı indeks
```

Tapmayanda `None` qaytarır — buna görə nəticəni əvvəlcə `if m:` ilə yoxlayırıq.
