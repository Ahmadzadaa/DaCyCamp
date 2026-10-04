---
title: Korrelyasiya, marja və «top N»
xp: 10
estimated_minutes: 10
---

## Korrelyasiya: əlaqənin gücü

Pearson korrelyasiyası −1 ilə +1 arasındadır:

| r | Şərh |
|---|---|
| 0.7 … 1.0 | güclü müsbət əlaqə |
| 0.3 … 0.7 | orta müsbət |
| 0 … 0.3 | zəif müsbət |
| ≈ 0 | xətti əlaqə yoxdur |
| < 0 | biri artdıqca digəri azalır |

```python
df["Sales"].corr(df["Profit"])           # iki sütun
df[["Sales", "Profit", "Discount"]].corr()   # matris
```

> ⚠️ Korrelyasiya **səbəb deyil**. Həm də çox satış həmişə çox mənfəət demək deyil — endirim və maya dəyəri mənfəəti «yeyə» bilər. Ona görə analitiklər **mənfəət marjasına** baxır.

## Mənfəət marjası

```python
marja = df["Profit"].sum() / df["Sales"].sum() * 100   # faizlə
```

Qrup üzrə marja = qrupun mənfəət cəmi / qrupun satış cəmi. **Sətir marjalarının ortalaması deyil!** (Kiçik sətirlər nəticəni təhrif edir.)

```python
k = df.groupby("Category")[["Sales", "Profit"]].sum()
k["Marja"] = k["Profit"] / k["Sales"] * 100
```

## Top N və sıralama

```python
olke = df.groupby("Country")["Profit"].sum().sort_values(ascending=False)
olke.head(2)                 # top 2
olke.nlargest(2)             # eyni nəticə
olke.rank(ascending=False)   # hər ölkənin yeri: 1, 2, 3...
```

## Pay (%)

```python
seg = df.groupby("CustomerSegment")["Sales"].sum()
(seg / seg.sum() * 100).round(1)
```
