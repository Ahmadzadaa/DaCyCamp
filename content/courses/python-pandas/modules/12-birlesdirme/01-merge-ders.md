---
title: 'JOIN vaxtıdır: merge və join'
xp: 10
estimated_minutes: 9
---

Data çox vaxt bir neçə cədvəldə olur: müştərilər ayrıca, sifarişlər ayrıca. Onları ortaq sütun (açar) üzrə birləşdirmək — **join**-dir. Excel-də VLOOKUP, SQL-də JOIN, pandas-da `merge`.

```python
musteriler = pd.DataFrame({"MüştəriID": [1, 2, 3], "Ad": ["Aysel", "Namiq", "Cavid"]})
sifarisler = pd.DataFrame({"MüştəriID": [2, 3, 4], "Sifariş": ["Kitab", "Telefon", "Komputer"]})
```

## Dörd tip

| `how=` | Nə saxlanılır | Nəticə |
| --- | --- | --- |
| `"inner"` | Yalnız hər iki cədvəldə olan açarlar | 2, 3 |
| `"left"` | Sol cədvəlin hamısı (sağda tapılmayan → NaN) | 1, 2, 3 |
| `"right"` | Sağ cədvəlin hamısı | 2, 3, 4 |
| `"outer"` | Hər ikisinin hamısı | 1, 2, 3, 4 |

```python
pd.merge(musteriler, sifarisler, on="MüştəriID", how="inner")
```

## Əsas parametrlər

| Parametr | Mənası |
| --- | --- |
| `on` | Ortaq sütun(lar) |
| `left_on`, `right_on` | Adları fərqli olanda: `left_on="ID", right_on="MüştəriID"` |
| `suffixes` | Eyni adlı sütunlara sonluq (defolt `("_x", "_y")`) |
| `indicator=True` | `_merge` sütunu: `both`, `left_only`, `right_only` |
| `sort` | Nəticəni açara görə sırala |

`indicator=True` xüsusilə faydalıdır: «sifarişi olmayan müştərilər» (`left_only`) və ya «qeydiyyatda olmayan müştərinin sifarişləri» (`right_only`) dərhal görünür.

## join — indeksə görə

```python
df1 = pd.DataFrame({"Ad": ["Aysel", "Namiq", "Cavid"]}, index=[1, 2, 3])
df2 = pd.DataFrame({"Sifariş": ["Kitab", "Telefon", "Komputer"]}, index=[2, 3, 4])
df1.join(df2, how="left")
```

`merge` — sütunlara görə (SQL üslubu), `join` — əsasən indeksə görə birləşdirir.

> ⚠️ Açarda təkrarlar varsa (bir müştərinin bir neçə sifarişi), nəticədə sətirlər çoxalır — bu normaldır. Amma hər iki tərəfdə təkrar olanda sətirlər gözlənilmədən partlaya bilər: birləşdirmədən əvvəl və sonra `len()`-ə bax.
