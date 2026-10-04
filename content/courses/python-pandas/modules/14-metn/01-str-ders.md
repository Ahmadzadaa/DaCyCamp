---
title: 'DataFrame-də mətn: .str metodları və regex'
xp: 10
estimated_minutes: 9
---

Python sətirlərinin metodları pandas sütunlarında `.str` vasitəsilə **bütün sütuna birdən** tətbiq olunur.

```python
df["Product Name"].str.upper()
df["Product Name"].str.len()
df["Product Name"].str.strip()
df["Product Name"].str.replace("Pro", "PRO")
df["Product Name"].str.startswith("Nike")
```

## Regex ilə: contains, match, extract, findall, split

Gün 6 nümunəsi:

```python
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "David", "Eve"],
    "email": ["alice@example.com", "bob123@example.com", "charlie@domain.com",
              "david@website.org", "eve@company.com"],
})
```

| Metod | Nümunə | Nə edir |
| --- | --- | --- |
| `str.contains` | `df[df["email"].str.contains("example")]` | Nümunə varmı → True/False |
| `str.match` | `df[df["name"].str.match("^A")]` | Əvvəldən uyğun gəlirmi |
| `str.replace` | `.str.replace(r"example\.com", "newdomain.com", regex=True)` | Əvəz etmək |
| `str.extract` | `.str.extract(r"([^@]+)")` | Qrupu ayrıca sütun kimi çıxarmaq |
| `str.findall` | `.str.findall(r"@(\w+\.\w+)")` | Bütün uyğunluqlar (siyahı) |
| `str.split` | `.str.split("@", expand=True)` | Bölüb ayrı sütunlara yazmaq |

```python
df["username"] = df["email"].str.extract(r"([^@]+)")
df[["user", "domain"]] = df["email"].str.split("@", expand=True)
```

## Faydalı fəndlər

```python
df["Brend"] = df["Product Name"].str.split().str[0]          # ilk söz: "Nike", "iPhone"...
df[df["Product Name"].str.contains(r"\d", regex=True)]      # adında rəqəm olanlar
df["Model"] = df["Product Name"].str.extract(r"(\d+)").astype(float)
```

> ⚠️ `str.contains` defolt olaraq regex kimi işləyir: nöqtə (`.`) «istənilən simvol» deməkdir. Adi mətn axtarırsansa `regex=False` yaz və ya xüsusi simvolları `\` ilə qoru.
