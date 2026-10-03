---
title: Faylları oxumaq və yazmaq
xp: 10
estimated_minutes: 8
---

Data çox vaxt fayllarda gəlir: mətn, CSV cədvəlləri, JSON. Python faylları `open()` funksiyası ilə açır.

## with open(...)

```python
with open("reyler.txt", encoding="utf-8") as f:
    metn = f.read()
```

`with` bloku bitəndə fayl **avtomatik bağlanır** — hətta xəta baş versə belə. Faylla işləməyin tövsiyə olunan yolu budur.

> 🔤 `encoding="utf-8"` Azərbaycan hərflərinin (ə, ş, ç, ğ, ö, ü, ı) düzgün oxunması üçün vacibdir.

## Rejimlər

| Rejim | Mənası |
| --- | --- |
| `"r"` | Oxumaq (defolt) |
| `"w"` | Yazmaq — fayl varsa **içindəkini silir** |
| `"a"` | Sonuna əlavə etmək |
| `"rb"` / `"wb"` | İkili (binary) — şəkil, Excel |

## Oxuma üsulları

```python
with open("reyler.txt", encoding="utf-8") as f:
    hamisi = f.read()          # bütün mətn bir sətirdə

with open("reyler.txt", encoding="utf-8") as f:
    setirler = f.readlines()   # sətirlərin siyahısı ("\n" ilə)

with open("reyler.txt", encoding="utf-8") as f:
    for setir in f:            # sətir-sətir — böyük fayllar üçün ən yaxşısı
        print(setir.strip())
```

## Yazmaq

```python
with open("hesabat.txt", "w", encoding="utf-8") as f:
    f.write("Yanvar hesabatı\n")
    f.write(f"Sifariş sayı: {152}\n")
```

`write()` sətrin sonuna `\n` əlavə etmir — yeni sətri özün yazmalısan.

> 💻 DaCy-də fayllar brauzerin daxilindəki virtual fayl sistemində saxlanılır. Tapşırığa əlavə olunmuş datasetlər (məs. `reyler.txt`) iş qovluğunda hazırdır — sadəcə adı ilə aç.
