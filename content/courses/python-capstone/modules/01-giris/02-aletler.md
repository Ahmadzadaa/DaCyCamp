---
title: Hər suala uyğun alət
xp: 10
estimated_minutes: 8
---

15 sualın hamısı sənə tanış olan bir neçə pandas əməliyyatı ilə həll olunur. Əsas bacarıq — sualı oxuyub **düzgün aləti seçməkdir**.

| Sual tipi | Alət | Nümunə |
|---|---|---|
| «X üzrə ümumi / orta Y» | `groupby("X")["Y"].sum()` / `.mean()` | ShipMode üzrə Sales |
| «Bir neçə metrika birdən» | `groupby("X").agg(a=("Y", "sum"), b=("Z", "mean"))` | Kateqoriya: orta Sales və Profit |
| «Top N» | `.sort_values(ascending=False).head(N)` və ya `.nlargest(N)` | Top 2 ölkə |
| «Hər qrupun lideri» | `idxmax()` və ya `sort_values` + `drop_duplicates("qrup")` | Hər kateqoriyanın top məhsulu |
| «İki ölçü üzrə say» | `pd.crosstab` / `pivot_table(aggfunc="count")` | Ölkə × seqment |
| «Əlaqə varmı?» | `df["A"].corr(df["B"])` | Sales ~ Profit |
| «Tarix fərqi» | `(df["B"] - df["A"]).dt.days` | ShipDate − OrderDate |
| «Qruplara böl» | `pd.cut` / `pd.qcut` + qayda | RFM seqmentləri |

## Bir neçə qızıl qayda

1. **Tarixləri dərhal çevir:** `pd.read_csv(..., parse_dates=["OrderDate", "ShipDate"])`. Mətn tarixlə çıxma əməliyyatı alınmır.
2. **Müştərini ID ilə say, adla yox.** Eyni ad-soyadlı fərqli insanlar olur — bu datasetdə də var! (Bunu 5-ci fəsildə öz gözünlə görəcəksən.)
3. **Sifariş ≠ sətir.** Bir sifarişdə bir neçə məhsul ola bilər: sifariş sayı üçün `nunique()`, sətir sayı üçün `size()`/`count()`.
4. **Cəmlə yoxla:** qruplar üzrə cəmlərin toplamı ümumi cəmə bərabər olmalıdır.
