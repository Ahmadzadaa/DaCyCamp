---
title: Nəticəni fayla yazmaq (export)
xp: 10
estimated_minutes: 7
---

Təhlilin nəticəsini başqalarına ötürmək üçün DataFrame fayla yazılır:

| Metod | Format |
| --- | --- |
| `to_csv()` | CSV |
| `to_excel()` | Excel |
| `to_json()` | JSON |
| `to_parquet()` | Parquet (böyük datalar üçün sıxılmış format) |
| `to_html()` | HTML cədvəl |
| `to_sql()` | Verilənlər bazası cədvəli |

## Əsas parametrlər

```python
df.to_csv(
    "hesabat.csv",
    sep=";",            # ayırıcı
    index=False,        # indeksi (0, 1, 2…) yazma
    header=True,        # sütun adlarını yaz
    columns=["Region", "Total Revenue"],   # yalnız bu sütunlar
)

df.to_excel("hesabat.xlsx", sheet_name="Satış", startrow=2, startcol=1, index=False)
df.to_json("hesabat.json", orient="records", force_ascii=False)
```

> ⚠️ `index=False` unudulsa, faylda adsız əlavə sütun yaranır və geri oxuyanda `Unnamed: 0` adlı sütun görünür. Çox rast gəlinən səhvdir.

## Bir Excel faylında bir neçə vərəq

```python
with pd.ExcelWriter("aylıq.xlsx") as yazici:
    yanvar.to_excel(yazici, sheet_name="Yanvar", index=False)
    fevral.to_excel(yazici, sheet_name="Fevral", index=False)
```

## JSON-un `orient` parametri

`orient="records"` hər sətri ayrıca obyekt kimi yazır — API-lər üçün ən rahat formadır:

```json
[{"Region": "Bakı", "Total Revenue": 2399.0}, {"Region": "Gəncə", "Total Revenue": 549.0}]
```

`force_ascii=False` Azərbaycan hərflərini olduğu kimi saxlayır.
