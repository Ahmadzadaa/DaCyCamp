---
title: 'Regex sintaksisi: simvollar, saylar, qruplar'
xp: 10
estimated_minutes: 9
---

## Simvol sinifləri

| Nümunə | Uyğun gəlir |
| --- | --- |
| `.` | İstənilən bir simvol (yeni sətirdən başqa) |
| `\d` | Rəqəm (0–9) |
| `\w` | Hərf, rəqəm və ya `_` |
| `\s` | Boşluq simvolu (boşluq, tab, yeni sətir) |
| `[abc]` | `a`, `b` və ya `c` |
| `[A-Z]` | Böyük latın hərfi |
| `[^0-9]` | Rəqəm **olmayan** simvol |

## Say göstəriciləri (quantifiers)

| Nümunə | Mənası |
| --- | --- |
| `*` | 0 və ya daha çox |
| `+` | 1 və ya daha çox |
| `?` | 0 və ya 1 |
| `{n}` | Dəqiq n dəfə |
| `{n,m}` | n-dən m-ə qədər |

## Mövqe və seçim

| Nümunə | Mənası |
| --- | --- |
| `^` | Sətrin əvvəli |
| `$` | Sətrin sonu |
| `a\|b` | `a` və ya `b` |
| `\.` | Nöqtənin özü (xüsusi simvolu adi simvol etmək üçün `\`) |

## Qruplar `( )`

Mötərizə nümunənin bir hissəsini **ayırır**. `findall` qrup olanda yalnız qrupun içini qaytarır:

```python
metn = "Sifariş #A-10234 və #B-20871"
re.findall(r"#[A-Z]-\d+", metn)     # ['#A-10234', '#B-20871']
re.findall(r"#([A-Z]-\d+)", metn)   # ['A-10234', 'B-20871']  — # olmadan
```

## Real nümunələr

```python
# Azərbaycan mobil nömrəsi: +994 50 123 45 67
r"\+994 \d{2} \d{3} \d{2} \d{2}"

# e-poçt (sadələşdirilmiş): ad@domen.zona
r"[\w.+-]+@[\w-]+\.[\w.]+"

# tarix: 2024-12-02
r"\d{4}-\d{2}-\d{2}"
```

> 💡 Regex-i addım-addım qur: əvvəl sadə nümunə (`\d+`), sonra dəqiqləşdir (`\d{4}-\d{2}`). Mürəkkəb nümunəni bir dəfəyə yazmağa çalışma.

> ⚠️ `+` və `*` «acgözdür» — mümkün qədər çox simvol tutur. `<.*>` nümunəsi `<a><b>` mətnində bütün `<a><b>`-ni tutur; yalnız `<a>` lazımdırsa, `<.*?>` yaz.
