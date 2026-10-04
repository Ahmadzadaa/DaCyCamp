---
title: Pandas nədir və niyə lazımdır?
xp: 10
estimated_minutes: 7
---

Excel-də 1000 sətirlik cədvəllə işləmək rahatdır. Bəs 1 milyon sətir olanda? Hər ay eyni hesabatı əl ilə təkrarlamaq lazım olanda? Və ya 5 fərqli faylı birləşdirmək lazım olanda? Bu suallara cavab — **pandas**.

**pandas** — Python-da cədvəl məlumatları ilə işləmək üçün ən populyar kitabxanadır: oxumaq, təmizləmək, filtrləmək, qruplaşdırmaq, birləşdirmək və nəticəni yazmaq.

```python
import pandas as pd      # qəbul olunmuş ləqəb — pd
```

## Excel ilə müqayisə

| Excel | pandas |
| --- | --- |
| Vərəq (sheet) | `DataFrame` |
| Sütun | `Series` |
| Filtr | `df[df["Region"] == "Bakı"]` |
| Pivot table | `df.pivot_table(...)` / `df.groupby(...)` |
| VLOOKUP | `pd.merge(...)` |
| Əl ilə təkrarlanan addımlar | Bir dəfə yazılan və istənilən vaxt yenidən işləyən kod |

## İki əsas obyekt

**Series** — bir sütun: dəyərlər + onların **indeksi** (etiketləri).

```python
satis = pd.Series([1250, 980, 1430], index=["B.e.", "Ç.a.", "Ç."])
```

```text
B.e.    1250
Ç.a.     980
Ç.      1430
dtype: int64
```

**DataFrame** — cədvəl: eyni indeksi paylaşan bir neçə Series (sütun).

```python
df = pd.DataFrame({
    "Şəhər": ["Bakı", "Gəncə", "Sumqayıt"],
    "Satış": [5200, 1800, 1400],
})
```

```text
      Şəhər  Satış
0      Bakı   5200
1     Gəncə   1800
2  Sumqayıt   1400
```

Soldakı `0, 1, 2` — **indeksdir**. Defolt olaraq 0-dan başlayan nömrələrdir, amma istənilən etiket ola bilər.

## Kurs boyu: TechNar

Kurs boyu uydurma **TechNar** mağazalar şəbəkəsinin real görünüşlü satış datası ilə işləyəcəyik: 5 region, 8 filial, 26 məhsul, 2 il. Python4Business proqramının Gün 3–6 tapşırıqlarının hamısı bu data üzərində qurulub.

> 💻 DaCy-də pandas brauzerdə işləyir: ilk `import pandas` bir neçə saniyə çəkir (kitabxana yüklənir), sonrakı icralar sürətlidir. Kodun **son sətri** ifadədirsə (məs. `df.head()`), nəticəsi Jupyter-dəki kimi konsolda göstərilir.
