---
title: Plotly ilə interaktiv qrafiklər
xp: 10
estimated_minutes: 9
---

Matplotlib və seaborn **statik** şəkil çəkir. **Plotly** isə interaktiv qrafiklər yaradır: siçanı nöqtənin üstünə gətirəndə dəyəri görünür (hover), yaxınlaşdırmaq (zoom), seriyaları legend-dən gizlətmək olur. Veb dashboard-lar (Dash, Streamlit) və hesabatlar üçün idealdır.

## plotly.express — qısa yol

```python
import plotly.express as px

fig = px.histogram(df, x="Total Revenue", nbins=20, title="Gəlirin paylanması",
                   color_discrete_sequence=["blue"], opacity=0.5)
fig.show()

fig = px.scatter(df, x="Units Sold", y="Total Revenue", color="Product Category",
                 size="Unit Price", hover_data=["Product Name"], title="Ədəd və gəlir")

fig = px.bar(df, x="Region", y="Total Revenue", color="Payment Method", title="Region və ödəniş")

fig = px.box(df, x="Region", y="Total Revenue", color="Region")

fig = px.scatter_matrix(o, dimensions=["Sales", "Quantity", "Discount", "Profit"], color="Category")
```

Seaborn-dakı kimi: `color` — qruplara görə rəng (seaborn-un `hue`-su), `size` — nöqtə ölçüsü, `hover_data` — hover-də əlavə sütunlar.

## graph_objects — tam nəzarət

```python
import plotly.graph_objects as go

fig = go.Figure(data=go.Scatter(x=[1, 2, 3, 4, 5], y=[10, 12, 14, 16, 18],
                                mode="lines", name="Xətt"))
fig.update_layout(title="İnteraktiv xətt qrafiki", xaxis_title="X dəyəri", yaxis_title="Y dəyəri")
fig.show()
```

## Faylda saxlamaq

```python
fig.write_html("dashboard.html")    # brauzerdə açılan interaktiv fayl — e-poçtla göndərmək olar
```

| | matplotlib / seaborn | plotly |
| --- | --- | --- |
| Nəticə | Şəkil (PNG, PDF) | İnteraktiv HTML |
| Üstünlük | Çap, məqalə, slayd | Kəşfiyyat, veb, dashboard |
| Kod | Çox detal | Az kodla interaktivlik |

> 💻 DaCy-nin brauzer mühiti qrafikləri şəkil kimi göstərir, ona görə Plotly qrafiklərini burada işə salmırıq. Kodları **Google Colab** və ya **Jupyter**-də sına — orada `fig.show()` interaktiv qrafiki dərhal göstərir. Bu fəslin testi anlayışları yoxlayır.
