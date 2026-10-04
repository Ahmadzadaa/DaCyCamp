---
title: catplot, FacetGrid, wedgeprops və wordcloud
xp: 10
estimated_minutes: 9
---

## catplot — kateqoriyalar üçün

```python
sns.catplot(data=df, x="Payment Method", y="Units Sold", kind="box", height=4, aspect=1.5)
```

`kind=` — `"bar"`, `"box"`, `"violin"`, `"strip"`, `"count"`. `catplot` **öz figure-ini** yaradır (axes deyil) — başlıq üçün `g.figure.suptitle(...)`.

## FacetGrid — eyni qrafik hər qrup üçün

```python
g = sns.FacetGrid(df, col="Region", col_wrap=3, height=3)
g.map(sns.histplot, "Total Revenue")
g.figure.suptitle("Regionlar üzrə paylanma", y=1.03)
```

- `col` — hər dəyər üçün ayrıca sütun-qrafik; `row` — sətir-qrafik; `hue` — rənglə;
- `col_wrap=3` — hər sətirdə 3 qrafik;
- `g.map(funksiya, "sütun")` — hər qrafikdə nə çəkiləcək;
- `g.add_legend()` — legend.

Çoxluq (facet) analizi müxtəlif qrupların paylanmasını yan-yana müqayisə etməyə imkan verir.

## Dairəvi qrafik: wedgeprops

```python
df.set_index("Products").plot(kind="pie", y="Sales", autopct="%1.1f%%",
                              wedgeprops={"edgecolor": "black", "linewidth": 2})
plt.ylabel("")
```

`wedgeprops` — dilimlərin xassələri: kənar xətt rəngi, qalınlığı; `{"width": 0.4}` — «donut» qrafik.

## Wordcloud — mətnin vizuallaşdırılması

```python
from wordcloud import WordCloud, STOPWORDS

wc = WordCloud(width=800, height=400, background_color="white",
               colormap="plasma", max_words=50, stopwords=set(STOPWORDS)).generate(metn)
plt.imshow(wc, interpolation="bilinear")
plt.axis("off")
```

Söz nə qədər tez-tez keçirsə, o qədər böyük yazılır. Hazır tezliklər varsa (məs. məhsul → satış sayı), `generate_from_frequencies(dict)` istifadə et — onda çoxsözlü adlar bölünmür.
