---
title: Gəlir lideri ≠ mənfəət lideri
xp: 10
estimated_minutes: 8
---

«Hansı məhsul daha çox gəlir gətirir?» sualının iki cavabı ola bilər: **satış (Sales)** lideri və **mənfəət (Profit)** lideri. Bahalı noutbuk çox satış gətirir, amma endirimlə satılırsa mənfəəti az ola bilər; ucuz kağız isə yüksək marjalıdır.

```python
mehsul = df.groupby(["ProductID", "ProductName"])[["Sales", "Profit"]].sum()
mehsul["Sales"].idxmax()     # ('TEC-1004', 'Lenovo ThinkPad E14') — tuple!
```

> 💡 İki sütunla qruplaşdıranda indeks `MultiIndex` olur və `idxmax()` **tuple** qaytarır. Yalnız ID lazımdırsa — `ProductID` üzrə qruplaşdır və adı ayrıca götür.

## Hər qrupun lideri

**1-ci yol — sort + drop_duplicates:**

```python
p = df.groupby(["Category", "ProductName"])["Sales"].sum().reset_index()
p.sort_values("Sales", ascending=False).drop_duplicates("Category")
```

**2-ci yol — idxmax:**

```python
s = df.groupby(["Category", "ProductName"])["Sales"].sum()
s.loc[s.groupby(level="Category").idxmax()]
```

## Vizual müqayisə

Məhsul adları uzundur — **üfüqi** sütun qrafiki (`barh`) oxunaqlıdır. İki göstərici yan-yana:

```python
import matplotlib.pyplot as plt

t = df.groupby("ProductName")[["Sales", "Profit"]].sum().sort_values("Sales")
ax = t.plot(kind="barh", figsize=(9, 6), title="Məhsullar: Sales və Profit")
ax.set_xlabel("AZN")
plt.tight_layout()
plt.show()
```

Marja ilə satışın əlaqəsini **scatter** daha yaxşı göstərir: sağ yuxarı küncdə həm çox satılan, həm mənfəətli məhsullar olur.
