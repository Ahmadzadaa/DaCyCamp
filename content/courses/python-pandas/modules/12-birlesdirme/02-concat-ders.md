---
title: 'Şaquli və üfüqi birləşmə: concat'
xp: 10
estimated_minutes: 6
---

`merge` açar üzrə «yan-yana» birləşdirir. Bəzən isə eyni strukturlu cədvəlləri sadəcə **altına** və ya **yanına** qoymaq lazımdır.

## Şaquli (row bind) — axis=0

Yanvar, fevral və mart satışları ayrı fayllardadır — hamısını bir cədvəldə yığırıq:

```python
yan = pd.read_csv("satis_yanvar.csv")
fev = pd.read_csv("satis_fevral.csv")
mar = pd.read_csv("satis_mart.csv")

q1 = pd.concat([yan, fev, mar], axis=0, ignore_index=True)
```

- Sütun adları uyğun olmalıdır — uyğun gəlməyənlər NaN ilə doldurulur.
- `ignore_index=True` — yeni indeks 0-dan başlayır (əks halda hər faylın 0, 1, 2… indeksi təkrarlanır).
- `keys=["Yanvar", "Fevral", "Mart"]` — hər sətrin hansı fayldan gəldiyini indeksə yazır.

## Üfüqi (column bind) — axis=1

```python
pd.concat([df1, df3], axis=1)
```

Sətirlər indeksə görə yan-yana qoyulur. İndekslər uyğun gəlmirsə, NaN-lar yaranır.

| | `merge` | `concat` |
| --- | --- | --- |
| Necə | Açar sütun üzrə uyğunlaşdırır | Sadəcə altına/yanına qoyur |
| Nümunə | Sifarişə müştəri adını əlavə etmək | Aylıq faylları birləşdirmək |
