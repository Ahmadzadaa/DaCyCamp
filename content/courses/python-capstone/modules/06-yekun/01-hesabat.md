---
title: Nəticələri təqdim etmək
xp: 10
estimated_minutes: 8
---

Rəhbər 15 cədvəl oxumayacaq. Ona **4 qrafik + 5 cümlə** lazımdır.

## Dashboard: 2 × 2

```python
fig, axes = plt.subplots(2, 2, figsize=(14, 9))
fig.suptitle("DaCy Store — 2023–2024 satış təhlili", fontsize=16)

aylıq.plot(ax=axes[0, 0], title="Aylıq satış")
olke.plot(kind="bar", ax=axes[0, 1], title="Ölkələr üzrə mənfəət")
kat.plot(kind="barh", ax=axes[1, 0], title="Kateqoriya marjası, %")
seg.plot(kind="pie", ax=axes[1, 1], title="RFM seqmentləri", autopct="%1.0f%%")

plt.tight_layout()
plt.show()
```

## Aylıq trend: resample

```python
ayliq = df.set_index("OrderDate")["Sales"].resample("ME").sum()   # ay sonu
```

## Hesabat şablonu (1 slayd)

1. **Əsas rəqəm:** 2 ildə X AZN satış, Y AZN mənfəət (marja Z%).
2. **Coğrafiya:** mənfəətin ən böyük hissəsi Türkiyə və Azərbaycandan gəlir.
3. **Məhsul:** satış lideri ≠ mənfəət lideri → endirim siyasətinə bax.
4. **Müştəri:** «Risk altında» seqmentində N müştəri var — geri qaytarma kampaniyası.
5. **Əməliyyat:** orta çatdırılma ~4 gün; Same Day payı kiçikdir.

> 💡 Hər qrafikin başlığı **sual** yox, **nəticə** olsun: «Ölkələr üzrə mənfəət» əvəzinə «Mənfəətin 55%-i iki ölkədən gəlir». (Bu kursun testləri sabit başlıqları yoxlayır, real hesabatda isə nəticəni yaz.)
