---
title: 'Müştəri seqmentasiyası: RFM'
xp: 10
estimated_minutes: 10
---

Gün 9-un 13-cü sualı: «müştəriləri seqmentə ayırın». Marketinqdə ən çox istifadə olunan sadə və güclü üsul — **RFM**:

| Hərf | Metrika | Sual | Hesablama |
|---|---|---|---|
| **R** — Recency | Son alışdan keçən gün | Nə vaxt alıb? | `(ref_tarix - son_OrderDate).days` |
| **F** — Frequency | Sifariş sayı | Nə qədər tez-tez? | `OrderID.nunique()` |
| **M** — Monetary | Ümumi xərc | Nə qədər xərcləyib? | `Sales.sum()` |

`ref_tarix` = datasetdəki son tarix + 1 gün (təhlil «bu gün» aparılır kimi).

```python
ref = df["OrderDate"].max() + pd.Timedelta(days=1)
rfm = df.groupby("CustomerID").agg(
    Recency=("OrderDate", lambda s: (ref - s.max()).days),
    Frequency=("OrderID", "nunique"),
    Monetary=("Sales", "sum"),
)
```

## Ballar: kvartillər (1–4)

`pd.qcut` müştəriləri bərabər sayda 4 qrupa bölür. Bərabər dəyərlər qrup sərhədini pozmasın deyə əvvəl `rank(method="first")`:

```python
rfm["R"] = pd.qcut(rfm["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)   # az gün = yaxşı → 4
rfm["F"] = pd.qcut(rfm["Frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
rfm["M"] = pd.qcut(rfm["Monetary"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
```

> ⚠️ Recency-də **kiçik** dəyər yaxşıdır, ona görə etiketlər tərsinədir: `[4, 3, 2, 1]`.

## Seqmentlər: R × F matrisi

| | F ≥ 3 (tez-tez alır) | F ≤ 2 (az alır) |
|---|---|---|
| **R ≥ 3** (yaxınlarda alıb) | 🏆 **Çempion** — mükafatlandır | 🌱 **Perspektivli** — sadiq et |
| **R ≤ 2** (çoxdandır gəlmir) | ⚠️ **Risk altında** — geri qaytar! | 😴 **Yuxuda** — ucuz kampaniya |

```python
def seqment(row):
    if row["R"] >= 3 and row["F"] >= 3:
        return "Çempion"
    if row["F"] >= 3:
        return "Risk altında"
    if row["R"] >= 3:
        return "Perspektivli"
    return "Yuxuda"

rfm["Seqment"] = rfm.apply(seqment, axis=1)
```

«Risk altında» qrupu ən qiymətlisidir: əvvəllər tez-tez alıb, amma son vaxtlar yoxdur — onları itirmək bahadır.
