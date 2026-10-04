---
title: 'Bin və label: cut və qcut'
xp: 10
estimated_minutes: 7
---

Yaşı «Gənc / Orta / Yetkin» qruplarına, qiyməti «Ucuz / Orta / Baha» səviyyələrinə bölmək tez-tez lazım olur.

## pd.cut — sərhədləri sən verirsən

```python
bins = [0, 18, 35, 50, 100]
labels = ["Gənc", "Orta", "Yetkin", "Yaşlı"]
df["Kateqoriya"] = pd.cut(df["Yaş"], bins=bins, labels=labels, right=False)
```

- `bins` — sərhədlər; 4 aralıq üçün 5 sərhəd lazımdır.
- `labels` — aralıqların adları (aralıq sayı qədər).
- `right=False` — aralıq `[0, 18)`: sol daxil, sağ yox. Defolt `right=True`: `(0, 18]`.
- Sonsuz yuxarı sərhəd: `float("inf")`.

Labels verilməsə, nəticədə aralığın özü görünür: `[0, 18)`, `[18, 35)`…

## pd.qcut — bərabər paylar (kvantillər)

```python
df["Q_Bin"] = pd.qcut(df["Ballar"], q=4, labels=["Aşağı", "Orta", "Yaxşı", "Mükəmməl"])
```

`qcut` sərhədləri datanın özünə görə seçir ki, hər qrupda təxminən **eyni sayda** sətir olsun. `q=4` — kvartillər, `q=5` — kvintillər, `q=10` — decillər.

| | `cut` | `qcut` |
| --- | --- | --- |
| Sərhədlər | Sən verirsən | Data əsasında |
| Qrupların ölçüsü | Fərqli ola bilər | Təxminən bərabər |
| Nümunə | Qiymət səviyyələri (0–100–500 ₼) | «Ən yaxşı 25%» |

Nəticə **category** tipindədir. Qruplaşdırarkən `observed=True` boş kateqoriyaları gizlədir:

```python
df.groupby("Q_Bin", observed=True)["Total Revenue"].mean()
```
