---
title: pivot_table və melt
xp: 10
estimated_minutes: 9
---

## pivot_table — Excel-in pivot cədvəli

```python
pivot = df.pivot_table(
    index="Region",               # sətirlər
    columns="Product Category",   # sütunlar
    values="Total Revenue",       # hesablanacaq dəyər
    aggfunc="sum",                # aqreqasiya
    fill_value=0,                 # boş xanalar
    margins=True,                 # cəmlər
    margins_name="Cəm",           # cəm sətrinin/sütununun adı
)
```

```text
Product Category  Beauty  Clothing  Electronics  ...      Cəm
Region
Bakı               ...       ...        ...             ...
...
Cəm                ...       ...        ...             ...
```

`groupby([...]).sum().unstack()` ilə eyni nəticə, amma daha oxunaqlı və cəmlərlə.

## melt — pivot-un əksi

**Geniş** formatda hər fənn ayrıca sütundur; **uzun** formatda isə bir sütunda fənn, birində bal:

```text
Geniş:                         Uzun:
Ad     Riyaziyyat  Fizika      Ad     Fənn        Bal
Aysel  85          88          Aysel  Riyaziyyat  85
Namiq  90          92          Namiq  Riyaziyyat  90
                               Aysel  Fizika      88
                               Namiq  Fizika      92
```

```python
uzun = pd.melt(geniş, id_vars=["Ad"], value_vars=["Riyaziyyat", "Fizika"],
               var_name="Fənn", value_name="Bal")
```

| Parametr | Mənası |
| --- | --- |
| `id_vars` | Dəyişməz qalan sütunlar |
| `value_vars` | Uzun formata çevriləcək sütunlar |
| `var_name` | Köhnə sütun adlarının yazılacağı yeni sütun |
| `value_name` | Dəyərlərin sütunu |

Uzun format qruplaşdırma və qrafiklər (seaborn) üçün çox rahatdır: `uzun.groupby("Fənn")["Bal"].mean()`. Geri qayıtmaq üçün: `uzun.pivot(index="Ad", columns="Fənn", values="Bal")`.
