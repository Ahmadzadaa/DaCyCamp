---
title: CSV və Excel fayllarını oxumaq
xp: 10
estimated_minutes: 8
---

Statik məlumat (fayl) pandas-a `read_...` funksiyaları ilə daxil edilir.

## read_csv

```python
df = pd.read_csv(
    "satislar.csv",
    sep=",",                                  # ayırıcı (Avropa fayllarında çox vaxt ";")
    usecols=["Date", "Region", "Total Revenue"],   # yalnız bu sütunlar
    nrows=100,                                # yalnız ilk 100 sətir
    skiprows=range(1, 11),                    # başlıqdan sonrakı 10 sətri keç
    parse_dates=["Date"],                     # Date sütununu tarix kimi oxu
    encoding="utf-8",
)
```

| Parametr | Nə edir |
| --- | --- |
| `sep` | Sütun ayırıcısı: `","`, `";"`, `"\t"` |
| `usecols` | Oxunacaq sütunlar |
| `nrows` | Neçə sətir oxunsun |
| `skiprows` | Keçiləcək sətirlər (say və ya siyahı) |
| `header` | Başlıq sətri (defolt `0`; başlıq yoxdursa `None`) |
| `index_col` | İndeks kimi istifadə olunacaq sütun |
| `parse_dates` | Tarixə çevriləcək sütunlar |

## read_excel

```python
fev = pd.read_excel(
    "satislar_2024q1.xlsx",
    sheet_name="Fevral",     # vərəqin adı və ya nömrəsi (0 — birinci)
    usecols="A:D",           # Excel hərfləri ilə də olur
    header=0,
    skiprows=0,
    nrows=50,
)

hamisi = pd.read_excel("satislar_2024q1.xlsx", sheet_name=None)
# {"Yanvar": DataFrame, "Fevral": DataFrame, "Mart": DataFrame}
```

`sheet_name=None` **bütün vərəqləri** dictionary kimi qaytarır: açar — vərəqin adı, dəyər — DataFrame.

> 💻 Excel faylları üçün `openpyxl` paketi lazımdır. DaCy-də o, ilk `read_excel` çağırışında avtomatik quraşdırılır.

## Göstərmə ayarları

Böyük cədvəllər çap olunanda pandas ortasını `...` ilə qısaldır. Bunu ayarlarla idarə etmək olar:

```python
pd.options.display.max_rows = 100        # neçə sətir göstərilsin
pd.options.display.max_columns = 20      # neçə sütun
pd.options.display.width = 120           # ekranın eni (simvol)
pd.options.display.colheader_justify = "center"   # başlıqlar ortada
```
