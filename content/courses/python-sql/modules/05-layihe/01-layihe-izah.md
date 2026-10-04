---
title: 'Layihə: CSV-dən verilənlər bazasına'
xp: 10
estimated_minutes: 6
---

`sifarisler.csv` bir böyük cədvəldir: hər sətirdə müştərinin adı, ölkəsi, şəhəri və məhsulun adı təkrarlanır. Real bazalarda data **normallaşdırılır** — təkrarlanan məlumat ayrıca cədvəllərə çıxarılır:

```text
musteriler (CustomerID, CustomerName, CustomerSegment, Country, City)
mehsullar  (ProductID, ProductName, Category)
sifarisler (OrderID, OrderDate, ShipDate, ShipMode, CustomerID, ProductID, Sales, Quantity, Discount, Profit)
```

Faydaları:

- Müştərinin şəhəri dəyişəndə **bir** yerdə yenilənir;
- Yaddaşa qənaət olunur;
- Səhvlər azalır (eyni müştərinin adı müxtəlif sətirlərdə fərqli yazılmır).

Sorğu zamanı cədvəllər `JOIN` ilə birləşdirilir.

```python
musteriler = o[["CustomerID", "CustomerName", "CustomerSegment", "Country", "City"]].drop_duplicates()
```

> 💡 `drop_duplicates()` hər müştərini bir dəfə saxlayır — bu, «ölçü» cədvəlidir. `sifarisler` isə «fakt» cədvəlidir (ulduz sxemi — What is Data Engineering kursunda gördük).
