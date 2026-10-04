---
title: 'Ən dəyərli müştəri: adla yox, ID ilə'
xp: 10
estimated_minutes: 8
---

«Ən çox gəlir gətirən müştəri kimdir?» — sadə sual kimi görünür. Gəl iki yolu müqayisə edək:

```python
df.groupby("CustomerName")["Sales"].sum().nlargest(3)
# Zaur Quliyeva     67316.17   ← ?!
# Zeynep Həsənli    66266.49
# Giorgi Nurlanov   52824.87

df.groupby("CustomerID")["Sales"].sum().nlargest(3)
# C-1099    52824.87   ← Giorgi Nurlanov
# C-1061    50204.05
# C-1015    45604.92
```

«Zaur Quliyeva» adı arxasında **4 fərqli müştəri** var! Adla qruplaşdırma onların alışlarını toplayıb mövcud olmayan «super-müştəri» yaradıb. Real həyatda bu səhv yanlış adama VIP endirim göndərmək deməkdir.

> ✅ Qayda: hesablama həmişə **ID** ilə, göstərmə **ad** ilə.

## Müştəri profili

```python
top_id = df.groupby("CustomerID")["Sales"].sum().idxmax()
sec = df[df["CustomerID"] == top_id]

profil = {
    "ad": sec["CustomerName"].iloc[0],
    "olke": sec["Country"].iloc[0],
    "sifaris": sec["OrderID"].nunique(),
    "satis": sec["Sales"].sum(),
}
```
