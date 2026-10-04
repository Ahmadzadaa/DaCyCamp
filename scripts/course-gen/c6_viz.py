"""Python for Data Analysis & Visualization — Python4Business Gün 6 (vizual), 7, 8, 9 (reqressiya), e-poçt."""
import os
import shutil

from common import Course, classify, multiple, single

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'datasets')

c = Course(
    'python-analysis-visualization',
    {
        '_comment': (
            'Python for Data Analysis & Visualization — Python4Business Gün 6–9: pandas qrafikləri, matplotlib, seaborn,\n'
            'statistika və korrelyasiya, FacetGrid, wordcloud, Plotly (nəzəri), reqressiya (sklearn, statsmodels), e-poçtla\n'
            'hesabat. Qrafik tapşırıqları matplotlib obyektlərini (axes, patches, lines) yoxlayan testlərlə qiymətləndirilir.'
        ),
        'track': 'data-analytics',
        'title': 'Python for Data Analysis & Visualization',
        'level': 'intermediate',
        'description': (
            'Datanı görməli et və ondan nəticə çıxar: pandas qrafikləri, matplotlib və seaborn, qrafiklərin '
            'fərdiləşdirilməsi və subplot-lar, təsviri statistika, korrelyasiya və istilik xəritəsi, FacetGrid, '
            'wordcloud, interaktiv qrafiklər (Plotly), trend xətti və reqressiya modelləri, hesabatın e-poçtla '
            'göndərilməsi. Sonda satış dashboard-u layihəsi.'
        ),
        'sequential': True,
        'estimated_hours': 14,
        'published': True,
        'topics': ['python'],
    },
)
os.makedirs(os.path.join(c.root, 'datasets'))
for f in ['satislar.csv', 'sifarisler.csv', 'reyler.txt']:
    shutil.copy(os.path.join(DATA, f), os.path.join(c.root, 'datasets', f))

S = 'datasets/satislar.csv'
O = 'datasets/sifarisler.csv'

# testlərdə qrafikləri başlığa görə tapmaq
FIND = '''
    import pandas as _pd
    import numpy as _np
    import matplotlib.pyplot as _plt
    def _axes():
        return [a for n in _plt.get_fignums() for a in _plt.figure(n).axes]
    def _ax(title):
        for a in _axes():
            if a.get_title().strip() == title:
                return a
        _t = [a.get_title() for a in _axes()]
        raise AssertionError(f"«{title}» başlıqlı qrafik tapılmadı (title=... ver). Tapılan başlıqlar: {_t}")
'''
FS = FIND + '''
    _s = _pd.read_csv("satislar.csv")
'''
FO = FIND + '''
    _o = _pd.read_csv("sifarisler.csv")
'''

ORDERS_NOTE = '''
    > 📁 **`sifarisler.csv`** — Superstore tipli sifarişlər (2023–2024, 5 ölkə): `OrderID`, `OrderDate`, `ShipDate`, `ShipMode`, `CustomerID`, `CustomerName`, `CustomerSegment`, `Country`, `City`, `ProductID`, `ProductName`, `Category`, `Sales`, `Quantity`, `Discount`, `Profit`.
'''

# ───────────────────────────── 01 · pandas qrafikləri ─────────────────────────────
m = c.module('giris', 'Vizuallaşdırmaya giriş: pandas qrafikləri',
             'Niyə vizuallaşdırma, df.plot() və qrafik növləri: hist, line, bar, pie.')

m.lesson('niye-vizual', 'Niyə vizuallaşdırma? pandas ilə ilk qrafiklər', 8, '''
    1260 sətirlik cədvələ baxıb «satışlar artır, yoxsa azalır?» sualına cavab vermək çətindir. Bir xətt qrafiki isə cavabı bir saniyədə göstərir. Vizuallaşdırma — datanı **görməli** etməkdir: trendləri, paylanmanı, müqayisəni, kənar dəyərləri.

    ## Python-un qrafik kitabxanaları

    | Kitabxana | Nə üçün |
    | --- | --- |
    | **pandas `.plot()`** | Ən sürətli yol — DataFrame/Series-dən birbaşa |
    | **matplotlib** | Təməl kitabxana: hər detalı idarə etmək olar |
    | **seaborn** | matplotlib üzərində: statistik qrafiklər, gözəl görünüş, az kod |
    | **plotly** | İnteraktiv qrafiklər (hover, zoom) — veb və dashboard-lar |

    pandas və seaborn arxa planda matplotlib istifadə edir — buna görə matplotlib-in əsaslarını bilmək hamısında kömək edir.

    ## pandas ilə qrafik: `.plot(kind=...)`

    ```python
    df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")
    ayliq.plot(kind="line", title="Aylıq gəlir")
    df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")
    region.plot(kind="pie", autopct="%1.1f%%", title="Regionlar")
    df["Total Revenue"].plot(kind="hist", bins=5, color="lightgreen")
    ```

    | `kind=` | Qrafik | Nə vaxt |
    | --- | --- | --- |
    | `"line"` | Xətt | Zamanla dəyişmə |
    | `"bar"` / `"barh"` | Sütun / üfüqi sütun | Kateqoriyaların müqayisəsi |
    | `"hist"` | Histoqram | Paylanma |
    | `"pie"` | Dairə | Bütövün hissələri |
    | `"box"` | Qutu | Yayılma və kənar dəyərlər |
    | `"scatter"` | Səpələnmə | İki rəqəmin əlaqəsi (`df.plot(kind="scatter", x=..., y=...)`) |

    ## Bir neçə qrafik — bir neçə «figure»

    Ardıcıl `.plot()` çağırışları **eyni** qrafikin üstünə çəkilir. Hər qrafik ayrıca olsun deyə əvvəlcə yeni pəncərə (figure) aç:

    ```python
    import matplotlib.pyplot as plt

    plt.figure()
    df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")

    plt.figure()
    df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")
    ```

    > 💻 DaCy-də qrafiklər icradan sonra **«Qrafik»** sekməsində görünür. `plt.show()` yazmaq olar, amma lazım deyil. Konsolda da çap olunmuş mətn varsa, «Konsol •» işarəsi görünür.
''')

m.python('pandas-qrafikler', 'pandas ilə üç qrafik', 10, '''
    Gün 6 (sadə vizuallaşdırma): satış datasından üç əsas qrafik. Hər qrafikdən əvvəl `plt.figure()` yaz ki, ayrı-ayrı çəkilsinlər. **Başlıqlar dəqiq tapşırıqdakı kimi olmalıdır** — testlər qrafikləri başlığa görə tapır.
''', [
    'Total Revenue histoqramı: bins=20, title="Gəlir paylanması".',
    'Aylar üzrə gəlirin xətt qrafiki (Date-in ilk 7 simvolu ilə qruplaşdır): title="Aylıq gəlir".',
    'Kateqoriyaların əməliyyat sayının sütun qrafiki (value_counts): title="Kateqoriya tezliyi".',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    # 1. histoqram

    plt.figure()
    ayliq = ...
    # 2. xətt

    plt.figure()
    # 3. sütun
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")

    plt.figure()
    ayliq = df.groupby(df["Date"].str[:7])["Total Revenue"].sum()
    ayliq.plot(kind="line", title="Aylıq gəlir")

    plt.figure()
    df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")
''', FS + '''
    _h = _ax("Gəlir paylanması")
    assert len(_h.patches) == 20, f"Histoqramda 20 sütun (bins=20) olmalıdır, səndə {len(_h.patches)}"
    _l = _ax("Aylıq gəlir")
    assert len(_l.get_lines()) >= 1 and len(_l.get_lines()[0].get_ydata()) == 24, "Aylıq gəlir — 24 aylıq nöqtədən ibarət xətt olmalıdır"
    _b = _ax("Kateqoriya tezliyi")
    assert len(_b.patches) == _s["Product Category"].nunique(), "Kateqoriya tezliyi — hər kateqoriya üçün bir sütun"
    _hs = sorted(round(p.get_height()) for p in _b.patches)
    assert _hs == sorted(_s["Product Category"].value_counts().tolist()), "Sütunların hündürlüyü kateqoriyaların sayı olmalıdır"
''', [
    'df["Total Revenue"].plot(kind="hist", bins=20, title="Gəlir paylanması")',
    'ayliq = df.groupby(df["Date"].str[:7])["Total Revenue"].sum(); ayliq.plot(kind="line", title="Aylıq gəlir")',
    'df["Product Category"].value_counts().plot(kind="bar", title="Kateqoriya tezliyi")',
], dataset=S)

m.python('pandas-pie-barh', 'Dairə və üfüqi sütun', 8, '''
    Regionların gəlir payını dairəvi qrafiklə, ən çox satılan məhsulları üfüqi sütunla göstər.
''', [
    'Regionlar üzrə gəlirin dairəvi qrafiki: autopct="%1.1f%%", title="Regionlar üzrə gəlir".',
    'Ədədə görə ən çox satılan 10 məhsulun üfüqi sütun qrafiki (kind="barh"), rəng "lightgreen": title="Top 10 məhsul".',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    region = ...
    # dairə

    plt.figure()
    top10 = ...
    # üfüqi sütun
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    region = df.groupby("Region")["Total Revenue"].sum()
    region.plot(kind="pie", autopct="%1.1f%%", title="Regionlar üzrə gəlir")

    plt.figure()
    top10 = df.groupby("Product Name")["Units Sold"].sum().nlargest(10)
    top10.plot(kind="barh", color="lightgreen", title="Top 10 məhsul")
''', FS + '''
    from matplotlib.patches import Wedge as _W
    _p = _ax("Regionlar üzrə gəlir")
    _w = [x for x in _p.patches if isinstance(x, _W)]
    assert len(_w) == 5, f"Dairədə 5 dilim (region) olmalıdır, səndə {len(_w)}"
    assert any("%" in t.get_text() for t in _p.texts), "Dilimlərdə faizlər görünmür — autopct='%1.1f%%' əlavə et"
    _b = _ax("Top 10 məhsul")
    assert len(_b.patches) == 10, f"10 sütun olmalıdır, səndə {len(_b.patches)}"
    _wd = sorted(round(x.get_width()) for x in _b.patches)
    assert _wd == sorted(_s.groupby("Product Name")["Units Sold"].sum().nlargest(10).tolist()), "Üfüqi sütunların uzunluğu satılan ədəd olmalıdır (kind='barh')"
''', [
    'region = df.groupby("Region")["Total Revenue"].sum(); region.plot(kind="pie", autopct="%1.1f%%", title=...)',
    'top10 = df.groupby("Product Name")["Units Sold"].sum().nlargest(10)',
    'top10.plot(kind="barh", color="lightgreen", title="Top 10 məhsul")',
], dataset=S)

m.quiz('giris-testi', 'Test: qrafik növləri', [
    classify(
        'Hər sual üçün ən uyğun qrafik növü:',
        [
            ('line', ['Son 24 ayda gəlirin dəyişməsi']),
            ('bar / barh', ['Regionların satışını müqayisə etmək', 'Top 10 məhsul']),
            ('hist', ['Sifariş məbləğlərinin paylanması']),
            ('pie', ['Ödəniş üsullarının payı (4 hissə)']),
        ],
        'Zaman — xətt; müqayisə — sütun; paylanma — histoqram; az hissəli bütöv — dairə.',
    ),
    single(
        'Ardıcıl iki `.plot()` çağırışı niyə eyni qrafikdə görünür?',
        ['pandas-ın xətasıdır', 'İkisi də cari figure-ə çəkilir — ayırmaq üçün plt.figure() lazımdır', 'kind eyni olduğuna görə', 'show() yazılmadığına görə'],
        2,
        'matplotlib cari axes-ə çəkir; plt.figure() yeni pəncərə açır.',
    ),
])

# ───────────────────────────── 02 · matplotlib ─────────────────────────────
m = c.module('matplotlib', 'Matplotlib əsasları',
             'plot, bar, barh, scatter, hist, pie, boxplot və onların əsas parametrləri.')

m.lesson('matplotlib-ders', 'Matplotlib: qrafik funksiyaları', 9, '''
    ```python
    import matplotlib.pyplot as plt
    ```

    Hər qrafik **figure** (pəncərə, kətan) və onun içindəki bir və ya bir neçə **axes** (oxlu qrafik sahəsi) üzərində çəkilir. `plt.bar(...)` kimi funksiyalar **cari** axes-ə çəkir.

    ## Əsas funksiyalar

    | Funksiya | Qrafik |
    | --- | --- |
    | `plt.plot(x, y)` | Xətt |
    | `plt.bar(x, height)` / `plt.barh(y, width)` | Sütun / üfüqi sütun |
    | `plt.scatter(x, y)` | Səpələnmə (nöqtə) |
    | `plt.hist(data, bins=...)` | Histoqram |
    | `plt.pie(data, labels=...)` | Dairə |
    | `plt.boxplot(data)` | Qutu (yayılma, mərkəz, kənar dəyərlər) |

    ## Parametrlər

    ```python
    plt.bar(x, height, color="steelblue", width=0.5)
    plt.barh(y, width, color="orange", height=0.5)

    plt.scatter(x, y,
                c=rengler,          # nöqtələrin rəngi (dəyərə görə rəng xəritəsi də olar)
                cmap="viridis",     # rəng xəritəsi
                s=olculer,          # nöqtələrin ölçüsü
                alpha=0.5)          # şəffaflıq: 0 — tam şəffaf, 1 — qeyri-şəffaf
    plt.colorbar()                  # rəng şkalası

    plt.hist(data, bins=10, color="blue", alpha=0.5, edgecolor="black")

    plt.pie(data, labels=labels,
            startangle=90,          # başlanğıc bucaq
            explode=[0.1, 0, 0],    # ilk dilim 10% kənara çıxsın
            shadow=True,
            autopct="%1.1f%%")      # faizlər

    plt.boxplot(data, notch=True, vert=True, patch_artist=True)

    plt.plot(x, y, color="red", linestyle="-", linewidth=2,
             marker="o", markersize=8, markerfacecolor="r")
    ```

    ## Qutu qrafikini oxumaq

    ```text
        ●          ← kənar dəyər (outlier)
       ─┬─         ← maksimum (1.5 × IQR daxilində)
      ┌─┴─┐
      │   │        ← Q3 (75%)
      ├───┤        ← median
      │   │        ← Q1 (25%)
      └─┬─┘
       ─┴─         ← minimum
    ```

    Qutunun hündürlüyü — **IQR** (Q3 − Q1): datanın ortadakı 50%-i. Uzun qutu — dağınıq data.
''')

m.python('bar-barh', 'Sütun qrafikləri', 10, '''
    Gün 7 (1, 9): kateqoriyalar üzrə gəlir və satılan ədəd.
''', [
    'Kateqoriyalar üzrə ümumi gəliri plt.bar ilə çək (rəng "steelblue"), plt.title("Kateqoriyalar üzrə gəlir").',
    'Yeni figure-də kateqoriyalar üzrə Units Sold cəmini plt.barh ilə çək, plt.title("Kateqoriyalar üzrə satılan ədəd").',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    gelir = df.groupby("Product Category")["Total Revenue"].sum()
    eded = df.groupby("Product Category")["Units Sold"].sum()

    plt.figure()
    # plt.bar(...)

    plt.figure()
    # plt.barh(...)
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    gelir = df.groupby("Product Category")["Total Revenue"].sum()
    eded = df.groupby("Product Category")["Units Sold"].sum()

    plt.figure()
    plt.bar(gelir.index, gelir.values, color="steelblue")
    plt.title("Kateqoriyalar üzrə gəlir")

    plt.figure()
    plt.barh(eded.index, eded.values)
    plt.title("Kateqoriyalar üzrə satılan ədəd")
''', FS + '''
    _a = _ax("Kateqoriyalar üzrə gəlir")
    _g = _s.groupby("Product Category")["Total Revenue"].sum()
    assert len(_a.patches) == len(_g), "Hər kateqoriya üçün bir sütun olmalıdır"
    assert sorted(round(p.get_height()) for p in _a.patches) == sorted(round(v) for v in _g.values), "Sütunların hündürlüyü kateqoriyaların gəliri olmalıdır"
    _b = _ax("Kateqoriyalar üzrə satılan ədəd")
    _e = _s.groupby("Product Category")["Units Sold"].sum()
    assert sorted(round(p.get_width()) for p in _b.patches) == sorted(_e.tolist()), "Üfüqi sütunların uzunluğu satılan ədəd olmalıdır (plt.barh)"
    assert "plt.bar(" in dacy.code and "plt.barh(" in dacy.code, "plt.bar və plt.barh istifadə et"
''', [
    'plt.bar(gelir.index, gelir.values, color="steelblue"); plt.title("Kateqoriyalar üzrə gəlir")',
    'plt.barh(eded.index, eded.values)',
    'Başlıqlar testdə dəqiq yoxlanılır — kopyala.',
], dataset=S)

m.python('scatter-hist', 'Səpələnmə və histoqram', 10, '''
    Gün 7 (7, 8): Units Sold ilə Total Revenue arasındakı əlaqə və qiymətlərin paylanması.
''', [
    'plt.scatter: x=Units Sold, y=Total Revenue, alpha=0.4; title="Ədəd və gəlir"; ox adları xlabel/ylabel.',
    'Yeni figure-də Unit Price histoqramı: bins=15, edgecolor="black"; title="Qiymətlərin paylanması".',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    # scatter

    plt.figure()
    # hist
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    plt.scatter(df["Units Sold"], df["Total Revenue"], alpha=0.4)
    plt.title("Ədəd və gəlir")
    plt.xlabel("Units Sold")
    plt.ylabel("Total Revenue")

    plt.figure()
    plt.hist(df["Unit Price"], bins=15, edgecolor="black")
    plt.title("Qiymətlərin paylanması")
''', FS + '''
    _a = _ax("Ədəd və gəlir")
    assert _a.collections and len(_a.collections[0].get_offsets()) == len(_s), "Səpələnmədə hər əməliyyat üçün bir nöqtə olmalıdır (plt.scatter)"
    assert abs(_a.collections[0].get_alpha() - 0.4) < 1e-9, "alpha=0.4 ver"
    assert _a.get_xlabel() and _a.get_ylabel(), "Ox adlarını yaz: plt.xlabel(...), plt.ylabel(...)"
    _h = _ax("Qiymətlərin paylanması")
    assert len(_h.patches) == 15, f"Histoqramda 15 sütun olmalıdır, səndə {len(_h.patches)}"
''', [
    'plt.scatter(df["Units Sold"], df["Total Revenue"], alpha=0.4)',
    'plt.xlabel("Units Sold"); plt.ylabel("Total Revenue")',
    'plt.hist(df["Unit Price"], bins=15, edgecolor="black")',
], dataset=S)

m.python('pie-boxplot', 'Dairə və qutu qrafiki', 10, '''
    Gün 7 (2, 5, 10): ödəniş üsullarının payı və kateqoriyalar üzrə qiymət yayılması.
''', [
    'Ödəniş üsullarının sayına görə plt.pie: labels, autopct="%1.1f%%", startangle=90, ilk dilim 0.1 kənara (explode); title="Ödəniş üsulları".',
    'Yeni figure-də hər kateqoriyanın Unit Price dəyərlərinin qutu qrafiki (plt.boxplot, patch_artist=True, labels=kateqoriyalar); title="Kateqoriyalar üzrə qiymət".',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    odenis = df["Payment Method"].value_counts()
    kateqoriyalar = sorted(df["Product Category"].unique())
    qiymetler = [df[df["Product Category"] == k]["Unit Price"] for k in kateqoriyalar]

    plt.figure()
    # pie

    plt.figure()
    # boxplot
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    odenis = df["Payment Method"].value_counts()
    kateqoriyalar = sorted(df["Product Category"].unique())
    qiymetler = [df[df["Product Category"] == k]["Unit Price"] for k in kateqoriyalar]

    plt.figure()
    plt.pie(odenis.values, labels=odenis.index, autopct="%1.1f%%", startangle=90,
            explode=[0.1] + [0] * (len(odenis) - 1))
    plt.title("Ödəniş üsulları")

    plt.figure()
    plt.boxplot(qiymetler, patch_artist=True, labels=kateqoriyalar)
    plt.title("Kateqoriyalar üzrə qiymət")
''', FS + '''
    from matplotlib.patches import Wedge as _W, PathPatch as _PP
    _p = _ax("Ödəniş üsulları")
    _w = [x for x in _p.patches if isinstance(x, _W)]
    assert len(_w) == 4, "Dairədə 4 dilim olmalıdır"
    assert any("%" in t.get_text() for t in _p.texts), "autopct='%1.1f%%' əlavə et"
    _c = [_np.hypot(*_np.subtract(_x.center, (0, 0))) for _x in _w]
    assert max(_c) > 0.05, "İlk dilimi explode ilə kənara çıxar: explode=[0.1, 0, 0, 0]"
    _b = _ax("Kateqoriyalar üzrə qiymət")
    assert len([x for x in _b.patches if isinstance(x, _PP)]) == 5, "5 qutu olmalıdır (patch_artist=True)"
''', [
    'plt.pie(odenis.values, labels=odenis.index, autopct="%1.1f%%", startangle=90, explode=[0.1, 0, 0, 0])',
    'plt.boxplot(qiymetler, patch_artist=True, labels=kateqoriyalar)',
    'Hər qrafikdən sonra plt.title(...) yaz.',
], dataset=S)

m.quiz('matplotlib-testi', 'Test: matplotlib', [
    classify(
        'Hər parametri uyğun qrafikə yerləşdir.',
        [
            ('plt.pie', ['explode', 'startangle', 'autopct']),
            ('plt.scatter', ['alpha (nöqtə şəffaflığı)', 'cmap və colorbar']),
            ('plt.hist', ['bins']),
            ('plt.plot', ['linestyle', 'marker']),
        ],
        'explode/startangle/autopct — dairə; alpha/cmap — səpələnmə; bins — histoqram; linestyle/marker — xətt.',
    ),
    single(
        'Qutu qrafikində qutunun hündürlüyü nəyi göstərir?',
        ['Ortanı', 'IQR — datanın ortadakı 50%-ini (Q1–Q3)', 'Maksimumu', 'Sətir sayını'],
        2,
        'Qutu Q1-dən Q3-ə qədərdir, içindəki xətt mediandır.',
    ),
])

# ───────────────────────────── 03 · Fərdiləşdirmə və subplot ─────────────────────────────
m = c.module('ferdilesdirme', 'Qrafiklərin fərdiləşdirilməsi və subplot-lar',
             'Başlıq, ox adları, legend, grid, limitlər, xətt üslubları və bir figure-də bir neçə qrafik.')

m.lesson('ferdilesdirme-ders', 'Fərdiləşdirmə və subplot-lar', 9, '''
    Yaxşı qrafik özü-özünü izah edir: başlıq, ox adları, vahidlər, legend.

    ```python
    plt.plot(x, y1, label="Xətt 1", color="blue", linestyle="-", marker="o", markersize=8, linewidth=2)
    plt.plot(x, y2, label="Xətt 2", color="red", linestyle="--", marker="s", markersize=8, linewidth=2)

    plt.title("Nümunə qrafik", fontsize=14, fontweight="bold")
    plt.xlabel("X oxunun etiketi", fontsize=12)
    plt.ylabel("Y oxunun etiketi", fontsize=12)
    plt.legend(loc="upper left", fontsize=10, shadow=True, frameon=True, fancybox=True)
    plt.grid(True, linestyle=":", linewidth=0.5, color="gray")
    plt.xlim(0, 6)
    plt.ylim(0, 10)
    plt.tight_layout()       # məsafələri tənzimləyir
    plt.show()
    ```

    | Ayar | Funksiya |
    | --- | --- |
    | Başlıq | `plt.title(..., fontsize=, fontweight=)` |
    | Ox adları | `plt.xlabel()`, `plt.ylabel()` |
    | Legend | `label=...` + `plt.legend(loc=...)` |
    | Grid | `plt.grid(axis="both"/"x"/"y", linestyle=":", color=...)` |
    | Limitlər | `plt.xlim()`, `plt.ylim()` |
    | Ölçü | `plt.figure(figsize=(10, 5))` |

    Xətt üslubları: `"-"` bütöv, `"--"` qırıq, `"-."` nöqtə-qırıq, `":"` nöqtəli. Markerlər: `"o"`, `"s"`, `"^"`, `"x"`.

    ## Subplot-lar: bir figure-də bir neçə qrafik

    ```python
    fig, axs = plt.subplots(nrows=2, ncols=1, figsize=(8, 6))

    axs[0].plot(x, y1, color="blue")
    axs[0].set_title("Sine Function")
    axs[0].set_xlabel("X-axis")
    axs[0].grid(True)

    axs[1].plot(x, y2, color="red")
    axs[1].set_title("Cosine Function")

    plt.tight_layout()
    ```

    - `plt.subplots(nrows, ncols)` — figure və axes massivi qaytarır.
    - `nrows=2, ncols=2` olanda `axs[0, 0]`, `axs[0, 1]`, `axs[1, 0]`, `axs[1, 1]`.
    - Axes metodlarında `set_` prefiksi var: `ax.set_title()`, `ax.set_xlabel()`, `ax.set_ylim()`.
    - pandas qrafikini müəyyən axes-ə çəkmək: `seriya.plot(kind="bar", ax=axs[1, 0])`.
''')

m.python('iki-xett', 'İki ilin müqayisəsi: legend, grid, oxlar', 12, '''
    2023 və 2024-ün aylıq gəlirini **eyni** qrafikdə iki xətt kimi göstər.
''', [
    'Hər il üçün aylar (1–12) üzrə gəlir: g23, g24.',
    'İki xətt çək: 2023 — qırıq xətt (linestyle="--"), marker "o", label="2023"; 2024 — bütöv, marker "s", label="2024".',
    'title="Aylıq gəlir: 2023 və 2024", xlabel="Ay", ylabel="Gəlir (AZN)", legend, grid.',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv", parse_dates=["Date"])

    g23 = ...
    g24 = ...

    plt.figure(figsize=(9, 4))
    # xətlər, başlıq, oxlar, legend, grid
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv", parse_dates=["Date"])

    il = df["Date"].dt.year
    g23 = df[il == 2023].groupby(df["Date"].dt.month)["Total Revenue"].sum()
    g24 = df[il == 2024].groupby(df["Date"].dt.month)["Total Revenue"].sum()

    plt.figure(figsize=(9, 4))
    plt.plot(g23.index, g23.values, linestyle="--", marker="o", label="2023")
    plt.plot(g24.index, g24.values, linestyle="-", marker="s", label="2024")
    plt.title("Aylıq gəlir: 2023 və 2024")
    plt.xlabel("Ay")
    plt.ylabel("Gəlir (AZN)")
    plt.legend()
    plt.grid(True, linestyle=":")
    plt.tight_layout()
''', FS + '''
    _a = _ax("Aylıq gəlir: 2023 və 2024")
    _ls = _a.get_lines()
    assert len(_ls) >= 2, "Qrafikdə iki xətt olmalıdır"
    _leg = _a.get_legend()
    assert _leg is not None and sorted(t.get_text() for t in _leg.get_texts()) == ["2023", "2024"], "Legend 2023 və 2024 göstərməlidir (label=... + plt.legend())"
    _st = sorted(l.get_linestyle() for l in _ls[:2])
    assert _st == ["--", "-"] or set(_st) == {"--", "-"}, "2023 qırıq (--), 2024 bütöv (-) xətt olmalıdır"
    assert _a.get_xlabel() == "Ay" and _a.get_ylabel() == "Gəlir (AZN)", "Ox adları: 'Ay' və 'Gəlir (AZN)'"
    assert any(g.get_visible() for g in _a.get_xgridlines()), "Grid əlavə et: plt.grid(True)"
    _d = _s.assign(Date=_pd.to_datetime(_s["Date"]))
    _e = _d[_d["Date"].dt.year == 2024].groupby(_d["Date"].dt.month)["Total Revenue"].sum()
    _y = [l for l in _ls if l.get_label() == "2024"][0].get_ydata()
    assert _np.allclose(sorted(_y), sorted(_e.values)), "2024 xəttinin dəyərləri aylıq gəlir olmalıdır"
''', [
    'g24 = df[il == 2024].groupby(df["Date"].dt.month)["Total Revenue"].sum()',
    'plt.plot(g23.index, g23.values, linestyle="--", marker="o", label="2023")',
    'plt.legend(); plt.grid(True); plt.xlabel("Ay"); plt.ylabel("Gəlir (AZN)")',
], dataset=S)

m.python('subplots', '2×2 subplot: kiçik dashboard', 12, '''
    Bir figure-də dörd qrafik — rəhbərlik üçün mini dashboard.
''', [
    'fig, axs = plt.subplots(2, 2, figsize=(10, 7)).',
    'axs[0, 0]: region gəliri (bar), başlıq "Regionlar"; axs[0, 1]: aylıq gəlir (line), başlıq "Aylıq gəlir".',
    'axs[1, 0]: Total Revenue histoqramı (bins=20), başlıq "Paylanma"; axs[1, 1]: ödəniş üsulları sayı (barh), başlıq "Ödəniş".',
    'plt.tight_layout().',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    fig, axs = ...
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    fig, axs = plt.subplots(2, 2, figsize=(10, 7))

    region = df.groupby("Region")["Total Revenue"].sum()
    axs[0, 0].bar(region.index, region.values)
    axs[0, 0].set_title("Regionlar")

    ayliq = df.groupby(df["Date"].str[:7])["Total Revenue"].sum()
    axs[0, 1].plot(range(len(ayliq)), ayliq.values)
    axs[0, 1].set_title("Aylıq gəlir")

    axs[1, 0].hist(df["Total Revenue"], bins=20)
    axs[1, 0].set_title("Paylanma")

    odenis = df["Payment Method"].value_counts()
    axs[1, 1].barh(odenis.index, odenis.values)
    axs[1, 1].set_title("Ödəniş")

    plt.tight_layout()
''', FS + '''
    _f = [_plt.figure(n) for n in _plt.get_fignums() if len(_plt.figure(n).axes) == 4]
    assert _f, "4 qrafikli bir figure olmalıdır: plt.subplots(2, 2)"
    _t = sorted(a.get_title() for a in _f[0].axes)
    assert _t == sorted(["Regionlar", "Aylıq gəlir", "Paylanma", "Ödəniş"]), f"Başlıqlar: Regionlar, Aylıq gəlir, Paylanma, Ödəniş. Səndə: {_t}"
    assert len(_ax("Regionlar").patches) == 5, "Regionlar — 5 sütun"
    assert len(_ax("Aylıq gəlir").get_lines()[0].get_ydata()) == 24, "Aylıq gəlir — 24 nöqtə"
    assert len(_ax("Paylanma").patches) == 20, "Paylanma — bins=20"
    assert len(_ax("Ödəniş").patches) == 4, "Ödəniş — 4 üfüqi sütun"
''', [
    'fig, axs = plt.subplots(2, 2, figsize=(10, 7))',
    'axs[0, 0].bar(...); axs[0, 0].set_title("Regionlar") — axes-də set_title',
    'axs[1, 0].hist(df["Total Revenue"], bins=20); axs[1, 1].barh(odenis.index, odenis.values)',
], dataset=S)

m.quiz('ferdilesdirme-testi', 'Test: fərdiləşdirmə', [
    single(
        'Legend-də xətlərin adları görünməsi üçün nə lazımdır?',
        ['Yalnız plt.legend()', 'Hər xəttə label=... vermək və plt.legend() çağırmaq', 'plt.title()', 'plt.grid()'],
        2,
        'legend label-ları göstərir — label olmayan xətt legend-ə düşmür.',
    ),
    single(
        '`fig, axs = plt.subplots(2, 3)` — sağ alt qrafikə necə müraciət edilir?',
        ['axs[2, 3]', 'axs[1, 2]', 'axs[6]', 'axs[-1, 3]'],
        2,
        'İndekslər 0-dan başlayır: 2-ci sətir (1), 3-cü sütun (2).',
    ),
    classify(
        'pyplot funksiyası və axes metodu:',
        [
            ('pyplot (cari qrafik)', ['plt.title()', 'plt.xlabel()', 'plt.ylim()']),
            ('axes metodu (subplot)', ['ax.set_title()', 'ax.set_xlabel()', 'ax.set_ylim()']),
        ],
        'Subplot-larla işləyəndə axes metodları set_ prefiksi ilə yazılır.',
    ),
])

# ───────────────────────────── 04 · Seaborn ─────────────────────────────
m = c.module('seaborn', 'Seaborn ilə statistik qrafiklər',
             'histplot, boxplot, barplot, countplot, scatterplot, lineplot, regplot, hue və palitralar.')

m.lesson('seaborn-ders', 'Seaborn: az kodla gözəl qrafiklər', 9, '''
    **Seaborn** matplotlib üzərində qurulmuş statistik vizuallaşdırma kitabxanasıdır. Əsas üstünlüyü: DataFrame və sütun adları ilə işləyir, qruplaşdırmanı və rəngləri özü edir.

    ```python
    import seaborn as sns
    import matplotlib.pyplot as plt
    ```

    > ⏳ DaCy-də seaborn ilk istifadədə internetdən quraşdırılır (bir neçə saniyə).

    ## Əsas funksiyalar

    | Funksiya | Qrafik |
    | --- | --- |
    | `sns.histplot(data=df, x="Total Revenue", bins=20)` | Histoqram |
    | `sns.boxplot(data=df, x="Product Category", y="Total Revenue", palette="Set2")` | Qutu (qruplar üzrə) |
    | `sns.barplot(data=df, x="Region", y="Total Revenue", estimator="sum", errorbar=None)` | Sütun (aqreqasiya ilə) |
    | `sns.countplot(data=df, x="Payment Method")` | Say |
    | `sns.scatterplot(data=df, x="Units Sold", y="Total Revenue", hue="Product Category")` | Səpələnmə |
    | `sns.lineplot(data=ayliq, x="Ay", y="Gəlir")` | Xətt |
    | `sns.regplot(data=df, x="Sales", y="Profit")` | Səpələnmə + trend xətti |
    | `sns.pairplot(df, hue="Category")` | Bütün rəqəmsal cütlər |
    | `sns.catplot(data=df, x=..., y=..., hue=..., kind="bar")` | Kateqoriya qrafikləri (figure səviyyəli) |

    ## hue — üçüncü ölçü rənglə

    ```python
    sns.scatterplot(data=df, x="Units Sold", y="Total Revenue", hue="Product Category")
    ```

    Hər kateqoriya fərqli rəngdə, legend avtomatik.

    ## barplot və estimator

    `sns.barplot` defolt olaraq **ortanı** göstərir və etibar intervalı (qara xətt) çəkir. Cəm lazımdırsa `estimator="sum"`, intervalsız — `errorbar=None`.

    ## Trend xətti: regplot

    ```python
    sns.regplot(x="total_bill", y="tip", data=tips,
                scatter_kws={"alpha": 0.5},
                line_kws={"color": "red", "linewidth": 2})
    ```

    ## Başlıq

    Seaborn funksiyaları matplotlib **axes** qaytarır: `ax = sns.boxplot(...)`, sonra `ax.set_title(...)` və ya `plt.title(...)`.
''')

m.python('sns-hist-box', 'histplot və boxplot', 10, '''
    Gün 7 (5, 10): paylanmalar seaborn ilə.
''', [
    'sns.histplot: Total Revenue, bins=20; plt.title("Gəlirin paylanması").',
    'Yeni figure-də sns.boxplot: x="Region", y="Total Revenue"; plt.title("Regionlar üzrə satış").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    # histplot

    plt.figure()
    # boxplot
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    sns.histplot(data=df, x="Total Revenue", bins=20)
    plt.title("Gəlirin paylanması")

    plt.figure()
    sns.boxplot(data=df, x="Region", y="Total Revenue")
    plt.title("Regionlar üzrə satış")
''', FS + '''
    _h = _ax("Gəlirin paylanması")
    assert len(_h.patches) == 20, f"histplot-da 20 sütun olmalıdır, səndə {len(_h.patches)}"
    _b = _ax("Regionlar üzrə satış")
    assert len(_b.get_xticklabels()) == 5 and _b.get_xlabel() == "Region", "boxplot x='Region' olmalıdır (5 qutu)"
    assert "sns.histplot(" in dacy.code and "sns.boxplot(" in dacy.code, "seaborn funksiyalarından istifadə et"
''', [
    'sns.histplot(data=df, x="Total Revenue", bins=20)',
    'sns.boxplot(data=df, x="Region", y="Total Revenue")',
    'Başlıq: plt.title(...)',
], dataset=S)

m.python('sns-bar-count', 'barplot və countplot', 10, '''
    Gün 7 (3) və Gün 8 (3): regionların gəliri və ödəniş üsulları.
''', [
    'sns.barplot: x="Region", y="Total Revenue", estimator="sum", errorbar=None; plt.title("Regionların gəliri").',
    'Yeni figure-də sns.countplot: x="Payment Method"; plt.title("Ödəniş üsulları üzrə əməliyyat").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    # barplot

    plt.figure()
    # countplot
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    plt.figure()
    sns.barplot(data=df, x="Region", y="Total Revenue", estimator="sum", errorbar=None)
    plt.title("Regionların gəliri")

    plt.figure()
    sns.countplot(data=df, x="Payment Method")
    plt.title("Ödəniş üsulları üzrə əməliyyat")
''', FS + '''
    _b = _ax("Regionların gəliri")
    _g = _s.groupby("Region")["Total Revenue"].sum()
    assert sorted(round(p.get_height()) for p in _b.patches) == sorted(round(v) for v in _g.values), "Sütunlar regionların ümumi gəliri olmalıdır — estimator='sum'"
    assert len(_b.get_lines()) == 0, "Etibar intervalı xətləri olmamalıdır — errorbar=None"
    _c = _ax("Ödəniş üsulları üzrə əməliyyat")
    assert sorted(round(p.get_height()) for p in _c.patches) == sorted(_s["Payment Method"].value_counts().tolist()), "countplot hər ödəniş üsulunun sayını göstərməlidir"
''', [
    'sns.barplot(data=df, x="Region", y="Total Revenue", estimator="sum", errorbar=None)',
    'sns.countplot(data=df, x="Payment Method")',
    'estimator olmadan barplot ortanı göstərir.',
], dataset=S)

m.python('sns-scatter-reg', 'scatterplot, hue və regplot', 10, '''
    Gün 8 (7): qiymət və ədəd əlaqəsi; sifarişlərdə satış və mənfəət arasında trend.
''' + ORDERS_NOTE, [
    'sns.scatterplot: satislar.csv, x="Unit Price", y="Units Sold", hue="Product Category"; plt.title("Qiymət və ədəd").',
    'Yeni figure-də sns.regplot: sifarisler.csv, x="Sales", y="Profit", scatter_kws={"alpha": 0.3}, line_kws={"color": "red"}; plt.title("Satış və mənfəət").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    o = pd.read_csv("sifarisler.csv")

    plt.figure()
    # scatterplot

    plt.figure()
    # regplot
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")
    o = pd.read_csv("sifarisler.csv")

    plt.figure()
    sns.scatterplot(data=df, x="Unit Price", y="Units Sold", hue="Product Category")
    plt.title("Qiymət və ədəd")

    plt.figure()
    sns.regplot(data=o, x="Sales", y="Profit", scatter_kws={"alpha": 0.3}, line_kws={"color": "red"})
    plt.title("Satış və mənfəət")
''', FS + '''
    _a = _ax("Qiymət və ədəd")
    assert _a.collections and len(_a.collections[0].get_offsets()) == len(_s), "Hər əməliyyat üçün nöqtə olmalıdır"
    assert _a.get_legend() is not None and len(_a.get_legend().get_texts()) == 5, "hue='Product Category' — legend-də 5 kateqoriya"
    _r = _ax("Satış və mənfəət")
    assert len(_r.get_lines()) >= 1, "regplot trend xətti çəkməlidir"
    assert "sns.regplot(" in dacy.code, "sns.regplot istifadə et"
''', [
    'sns.scatterplot(data=df, x="Unit Price", y="Units Sold", hue="Product Category")',
    'sns.regplot(data=o, x="Sales", y="Profit", scatter_kws={"alpha": 0.3}, line_kws={"color": "red"})',
    'Hər birindən sonra plt.title(...).',
], dataset=[S, O])

m.quiz('seaborn-testi', 'Test: seaborn', [
    single(
        '`sns.barplot(data=df, x="Region", y="Total Revenue")` defolt olaraq nəyi göstərir?',
        ['Cəmi', 'Ortanı və etibar intervalını', 'Sayı', 'Medianı'],
        2,
        'barplot defolt orta + etibar intervalı; cəm üçün estimator="sum".',
    ),
    classify(
        'Hər tapşırığa uyğun seaborn funksiyası:',
        [
            ('countplot', ['Hər ödəniş üsulunun neçə dəfə istifadə olunduğu']),
            ('regplot', ['Satış və mənfəət arasında trend xətti']),
            ('boxplot', ['Regionlar üzrə satışların yayılması']),
            ('histplot', ['Gəlirin paylanması']),
        ],
        'Say — countplot; trend — regplot; qruplar üzrə yayılma — boxplot; paylanma — histplot.',
    ),
    single('`hue="Product Category"` nə edir?', ['Qrafiki kateqoriyaya görə filtrləyir', 'Nöqtələri/sütunları kateqoriyaya görə rəngləyir', 'Başlıq əlavə edir', 'Sıralayır'], 2,
           'hue üçüncü dəyişəni rənglə göstərir.'),
])

# ───────────────────────────── 05 · Statistika ─────────────────────────────
m = c.module('statistika', 'Python ilə statistika və korrelyasiya',
             'describe parametrləri, kvantillər, IQR ilə kənar dəyərlər, korrelyasiya və kovariasiya matrisi, heatmap.')

m.lesson('statistika-ders', 'Təsviri statistika, korrelyasiya və kovariasiya', 10, '''
    ## describe — xülasə statistikası

    ```python
    df.describe()                                    # say, orta, std, min, 25%, 50%, 75%, max
    df.describe(percentiles=[.1, .25, .5, .75, .9])  # öz kvantillərin
    df.describe(include="all")                       # mətn sütunları da
    df.describe(include=["object", "number"])
    df.describe(exclude=["object"])
    ```

    ## Kvantillər (percentiles)

    ```python
    df["Total Revenue"].quantile([0.25, 0.5, 0.75])
    df["Total Revenue"].quantile(0.9)     # əməliyyatların 90%-i bundan kiçikdir
    ```

    ## IQR ilə kənar dəyərlər

    ```python
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    kenar = s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)]
    ```

    Bu, qutu qrafikindəki «bığların» kənarındakı nöqtələrin qaydasıdır.

    ## Korrelyasiya matrisi

    ```python
    o[["Sales", "Quantity", "Discount", "Profit"]].corr()
    ```

    Pearson korrelyasiyası −1 ilə +1 arasında: **+1** — mükəmməl müsbət xətti əlaqə, **0** — xətti əlaqə yoxdur, **−1** — mükəmməl mənfi. Yalnız **rəqəmsal** sütunlar üçündür (`df.corr(numeric_only=True)`).

    | |r| | Təfsir (təxmini) |
    | --- | --- |
    | 0.0–0.2 | Çox zəif |
    | 0.2–0.4 | Zəif |
    | 0.4–0.6 | Orta |
    | 0.6–0.8 | Güclü |
    | 0.8–1.0 | Çox güclü |

    ## Kovariasiya

    ```python
    o[["Sales", "Profit"]].cov()
    ```

    Kovariasiya iki dəyişənin birlikdə necə dəyişdiyini göstərir, amma ölçü vahidindən asılıdır (₼², ədəd×₼) — buna görə müqayisə üçün korrelyasiya (vahidsiz) daha rahatdır.

    ## İstilik xəritəsi (heatmap)

    ```python
    plt.figure(figsize=(8, 6))
    sns.heatmap(corr, annot=True, cmap="coolwarm", linewidths=0.5, fmt=".2f", cbar=True)
    plt.title("Korrelyasiya matrisinin istilik xəritəsi")
    ```

    `annot=True` — hər xanada rəqəm, `fmt=".2f"` — 2 onluq, `cmap="coolwarm"` — mənfi mavi, müsbət qırmızı.

    > ⚠️ Kateqoriyal sütunla (məs. Product Category) korrelyasiya birbaşa hesablanmır. Əvvəlcə onu rəqəmə çevirmək (məs. `pd.get_dummies`) və ya qruplar üzrə ortaları müqayisə etmək lazımdır.
''')

m.python('describe-iqr', 'describe, kvantillər və kənar dəyərlər', 10, '''
    Gün 8: xülasə statistikası və kvantillər.
''', [
    'describe ilə 10%, 25%, 50%, 75%, 90% kvantillərini də göstər → stat.',
    'Total Revenue-nin 90% kvantili, 2 onluq → p90.',
    'IQR qaydası ilə Total Revenue-də kənar dəyərlərin sayı → kenar_say.',
    'Kənar dəyər olan əməliyyatların ən çox rast gəlinən kateqoriyası → kenar_kateqoriya.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    s = df["Total Revenue"]

    stat = ...
    p90 = ...
    kenar_say = ...
    kenar_kateqoriya = ...

    print(p90, kenar_say, kenar_kateqoriya)
    stat
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    s = df["Total Revenue"]

    stat = df.describe(percentiles=[.1, .25, .5, .75, .9])
    p90 = round(s.quantile(0.9), 2)
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    maska = (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)
    kenar_say = int(maska.sum())
    kenar_kateqoriya = df[maska]["Product Category"].value_counts().idxmax()

    print(p90, kenar_say, kenar_kateqoriya)
    stat
''', FS + '''
    _st = _s.describe(percentiles=[.1, .25, .5, .75, .9])
    assert isinstance(stat, _pd.DataFrame) and "10%" in stat.index and "90%" in stat.index, "describe(percentiles=[.1, .25, .5, .75, .9])"
    _t = _s["Total Revenue"]
    assert p90 == round(_t.quantile(0.9), 2), f"p90 {round(_t.quantile(0.9), 2)} olmalıdır"
    _q1, _q3 = _t.quantile(0.25), _t.quantile(0.75)
    _m = (_t < _q1 - 1.5 * (_q3 - _q1)) | (_t > _q3 + 1.5 * (_q3 - _q1))
    assert kenar_say == int(_m.sum()), f"kenar_say {int(_m.sum())} olmalıdır"
    assert kenar_kateqoriya == _s[_m]["Product Category"].value_counts().idxmax(), "kenar_kateqoriya düzgün deyil"
''', [
    'df.describe(percentiles=[.1, .25, .5, .75, .9])',
    'q1, q3 = s.quantile(0.25), s.quantile(0.75); iqr = q3 - q1',
    'maska = (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr); df[maska]["Product Category"].value_counts().idxmax()',
], dataset=S)

m.python('corr-cov', 'Korrelyasiya və kovariasiya', 10, '''
    Gün 9 (1): sifarişlərdə Sales ilə Profit arasındakı əlaqə; endirimin mənfəətə təsiri.
''' + ORDERS_NOTE, [
    'Sales, Quantity, Discount, Profit sütunlarının korrelyasiya matrisi → corr.',
    'Sales–Profit korrelyasiyası, 3 onluq → sales_profit.',
    'Profit ilə ən güclü mənfi korrelyasiyası olan sütun (Profit-dən başqa) → menfi.',
    'Sales–Profit kovariasiyası, 2 onluq → kov.',
], '''
    import pandas as pd

    o = pd.read_csv("sifarisler.csv")
    cols = ["Sales", "Quantity", "Discount", "Profit"]

    corr = ...
    sales_profit = ...
    menfi = ...
    kov = ...

    print(sales_profit, menfi, kov)
    corr
''', '''
    import pandas as pd

    o = pd.read_csv("sifarisler.csv")
    cols = ["Sales", "Quantity", "Discount", "Profit"]

    corr = o[cols].corr()
    sales_profit = round(corr.loc["Sales", "Profit"], 3)
    menfi = corr["Profit"].drop("Profit").idxmin()
    kov = round(o[cols].cov().loc["Sales", "Profit"], 2)

    print(sales_profit, menfi, kov)
    corr
''', FO + '''
    _c = _o[["Sales", "Quantity", "Discount", "Profit"]].corr()
    assert isinstance(corr, _pd.DataFrame) and corr.shape == (4, 4) and _np.allclose(corr.values, _c.values), "corr = o[cols].corr()"
    assert sales_profit == round(_c.loc["Sales", "Profit"], 3), f"sales_profit {round(_c.loc['Sales', 'Profit'], 3)} olmalıdır"
    assert menfi == _c["Profit"].drop("Profit").idxmin(), f"menfi {_c['Profit'].drop('Profit').idxmin()!r} olmalıdır"
    assert kov == round(_o[["Sales", "Profit"]].cov().loc["Sales", "Profit"], 2), "kov = o[cols].cov().loc['Sales', 'Profit']"
''', [
    'corr = o[cols].corr(); corr.loc["Sales", "Profit"]',
    'corr["Profit"].drop("Profit").idxmin() — özü ilə korrelyasiya (1.0) çıxarılır.',
    'o[cols].cov().loc["Sales", "Profit"]',
], dataset=O)

m.python('heatmap', 'Korrelyasiya istilik xəritəsi', 8, '''
    Gün 8 (2): bütün rəqəmsal sütunlar arasındakı əlaqələri heatmap ilə vizuallaşdır, xanalara dəyərləri yaz.
''', [
    'sifarisler.csv-nin rəqəmsal sütunlarının korrelyasiyası (corr(numeric_only=True)) → corr.',
    'sns.heatmap: annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5.',
    'plt.title("Korrelyasiya matrisi").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    o = pd.read_csv("sifarisler.csv")

    corr = ...
    plt.figure(figsize=(7, 5))
    # heatmap
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    o = pd.read_csv("sifarisler.csv")

    corr = o.corr(numeric_only=True)
    plt.figure(figsize=(7, 5))
    sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5)
    plt.title("Korrelyasiya matrisi")
''', FO + '''
    _c = _o.corr(numeric_only=True)
    assert isinstance(corr, _pd.DataFrame) and corr.shape == _c.shape, "corr = o.corr(numeric_only=True)"
    _a = _ax("Korrelyasiya matrisi")
    from matplotlib.collections import QuadMesh as _QM
    assert any(isinstance(x, _QM) for x in _a.collections), "sns.heatmap çəkilməyib"
    _tx = [t.get_text() for t in _a.texts]
    assert len(_tx) == _c.size, "annot=True — hər xanada dəyər olmalıdır"
    assert all(len(t.split(".")[-1]) == 2 for t in _tx if "." in t), "fmt='.2f' — 2 onluq"
''', [
    'corr = o.corr(numeric_only=True)',
    'sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5)',
    'plt.title("Korrelyasiya matrisi")',
], dataset=O)

m.quiz('statistika-testi', 'Test: statistika', [
    single('Korrelyasiya −0.85-dir. Bu nə deməkdir?', ['Əlaqə yoxdur', 'Güclü mənfi xətti əlaqə', 'Zəif müsbət', 'Səbəb-nəticə sübut olunub'], 2,
           '|r| 0.8-dən böyükdür və işarə mənfidir. Korrelyasiya səbəbiyyəti sübut etmir.'),
    single('Kovariasiya əvəzinə korrelyasiya niyə daha çox istifadə olunur?', ['Daha tez hesablanır', 'Vahidsizdir və −1…+1 aralığındadır — müqayisə etmək asandır', 'Mənfi ola bilmir', 'Kateqoriyalarla işləyir'], 2,
           'Kovariasiya ölçü vahidindən asılıdır.'),
    classify(
        'Hər kodun nəticəsi:',
        [
            ('Tək ədəd', ['s.quantile(0.9)', 'df[["A", "B"]].corr().loc["A", "B"]']),
            ('Matris (DataFrame)', ['df.corr(numeric_only=True)', 'df.cov(numeric_only=True)', 'df.describe()']),
        ],
        'quantile(0.9) və matrisdən bir xana — ədəd; corr/cov/describe — cədvəl.',
    ),
])


# ───────────────────────────── 06 · FacetGrid, catplot, pie, wordcloud ─────────────────────────────
m = c.module('xususi', 'Çoxluq analizi və xüsusi qrafiklər',
             'catplot, FacetGrid, wedgeprops ilə dairəvi qrafik və wordcloud.')

m.lesson('facet-ders', 'catplot, FacetGrid, wedgeprops və wordcloud', 9, '''
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
''')

m.python('facetgrid', 'FacetGrid və catplot', 10, '''
    Gün 8 (3, 4): regionlar üzrə paylanma və ödəniş üsulları üzrə satılan ədəd.
''', [
    'FacetGrid: col="Region", col_wrap=3; hər qrafikdə Total Revenue histoqramı (g.map(sns.histplot, "Total Revenue")) → g.',
    'g.figure.suptitle("Regionlar üzrə paylanma").',
    'sns.catplot: x="Payment Method", y="Units Sold", kind="box" → cat; cat.figure.suptitle("Ödəniş üsulu və ədəd").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    g = ...

    cat = ...
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    g = sns.FacetGrid(df, col="Region", col_wrap=3, height=3)
    g.map(sns.histplot, "Total Revenue")
    g.figure.suptitle("Regionlar üzrə paylanma", y=1.03)

    cat = sns.catplot(data=df, x="Payment Method", y="Units Sold", kind="box")
    cat.figure.suptitle("Ödəniş üsulu və ədəd", y=1.03)
''', FS + '''
    import seaborn as _sns
    assert isinstance(g, _sns.FacetGrid), "g = sns.FacetGrid(...)"
    _fa = [a for a in g.figure.axes if a.patches]
    assert len(_fa) == 5, f"5 region üçün 5 histoqram olmalıdır, səndə {len(_fa)}"
    assert g.figure._suptitle is not None and g.figure._suptitle.get_text() == "Regionlar üzrə paylanma", "g.figure.suptitle('Regionlar üzrə paylanma')"
    assert isinstance(cat, _sns.FacetGrid) and cat.figure._suptitle is not None and cat.figure._suptitle.get_text() == "Ödəniş üsulu və ədəd", "cat = sns.catplot(..., kind='box'); cat.figure.suptitle(...)"
    assert len(cat.ax.get_xticklabels()) == 4, "catplot x='Payment Method' — 4 kateqoriya"
''', [
    'g = sns.FacetGrid(df, col="Region", col_wrap=3, height=3); g.map(sns.histplot, "Total Revenue")',
    'g.figure.suptitle("Regionlar üzrə paylanma", y=1.03)',
    'cat = sns.catplot(data=df, x="Payment Method", y="Units Sold", kind="box")',
], dataset=S)

m.python('wordcloud-pie', 'Wordcloud və donut qrafik', 10, '''
    Gün 8 (5, 9) və wedgeprops: ən çox satılan məhsulların söz buludu və kateqoriyaların donut qrafiki.
''', [
    'Ən çox satılan 10 məhsulun {ad: satılan ədəd} lüğəti → tezlik.',
    'WordCloud(width=800, height=400, background_color="white").generate_from_frequencies(tezlik) → wc; plt.imshow(wc), plt.axis("off"), plt.title("Top 10 məhsul").',
    'Yeni figure-də kateqoriyalar üzrə gəlirin donut qrafiki: plt.pie(..., wedgeprops={"width": 0.4, "edgecolor": "white"}), plt.title("Kateqoriyalar").',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt
    from wordcloud import WordCloud

    df = pd.read_csv("satislar.csv")

    tezlik = ...
    wc = ...
    plt.figure(figsize=(8, 4))

    plt.figure()
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt
    from wordcloud import WordCloud

    df = pd.read_csv("satislar.csv")

    tezlik = df.groupby("Product Name")["Units Sold"].sum().nlargest(10).to_dict()
    wc = WordCloud(width=800, height=400, background_color="white").generate_from_frequencies(tezlik)
    plt.figure(figsize=(8, 4))
    plt.imshow(wc, interpolation="bilinear")
    plt.axis("off")
    plt.title("Top 10 məhsul")

    plt.figure()
    kat = df.groupby("Product Category")["Total Revenue"].sum()
    plt.pie(kat.values, labels=kat.index, autopct="%1.1f%%", wedgeprops={"width": 0.4, "edgecolor": "white"})
    plt.title("Kateqoriyalar")
''', FS + '''
    from wordcloud import WordCloud as _WC
    from matplotlib.patches import Wedge as _W
    _t = _s.groupby("Product Name")["Units Sold"].sum().nlargest(10).to_dict()
    assert tezlik == _t, f"tezlik top 10 məhsulun {{ad: ədəd}} lüğəti olmalıdır: {_t}"
    assert isinstance(wc, _WC) and set(wc.words_) <= set(_t) and len(wc.words_) == 10, "wc = WordCloud(...).generate_from_frequencies(tezlik)"
    _a = _ax("Top 10 məhsul")
    assert _a.images, "plt.imshow(wc) ilə söz buludunu göstər"
    _p = _ax("Kateqoriyalar")
    _w = [x for x in _p.patches if isinstance(x, _W)]
    assert len(_w) == 5 and all(x.width is not None and abs(x.width - 0.4) < 1e-6 for x in _w), "Donut: wedgeprops={'width': 0.4, ...}"
''', [
    'tezlik = df.groupby("Product Name")["Units Sold"].sum().nlargest(10).to_dict()',
    'wc = WordCloud(width=800, height=400, background_color="white").generate_from_frequencies(tezlik)',
    'plt.pie(kat.values, labels=kat.index, wedgeprops={"width": 0.4, "edgecolor": "white"})',
], dataset=S)

m.quiz('xususi-testi', 'Test: çoxluq analizi və xüsusi qrafiklər', [
    single('`sns.FacetGrid(df, col="Region")` nə edir?', ['Regionları filtrləyir', 'Hər region üçün ayrıca qrafik yaradır', 'Regionları rəngləyir', 'Region sütununu silir'], 2,
           'col — hər dəyər üçün ayrı alt-qrafik.'),
    single('Çoxsözlü məhsul adları (məs. "iPhone 15") wordcloud-da bölünməsin deyə nə istifadə olunur?', ['generate(metn)', 'generate_from_frequencies(lüğət)', 'STOPWORDS', 'max_words'], 2,
           'Tezlik lüğəti hər açarı bir «söz» kimi qəbul edir.'),
    single('`wedgeprops={"width": 0.4}` nəticəsi:', ['Dilimlər kənara çıxır', 'Donut (ortası boş) qrafik', 'Qrafik 40% kiçilir', 'Faizlər yazılır'], 2,
           'width dilimin enini təyin edir — ortası boşalır.'),
])

# ───────────────────────────── 07 · Plotly ─────────────────────────────
m = c.module('plotly', 'İnteraktiv vizuallaşdırma: Plotly',
             'plotly.express və graph_objects: histogram, scatter, bar, box, scatter_matrix, xətt qrafiki.')

m.lesson('plotly-ders', 'Plotly ilə interaktiv qrafiklər', 9, '''
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
''')

m.quiz('plotly-testi', 'Test: Plotly', [
    classify(
        'Hər xüsusiyyət hansı kitabxanaya daha uyğundur?',
        [
            ('Plotly', ['Hover ilə dəyəri görmək', 'Zoom və seriyaları gizlətmək', 'Veb dashboard üçün HTML']),
            ('Matplotlib / seaborn', ['Məqalə və slayd üçün statik PNG', 'Çap olunan hesabat']),
        ],
        'Plotly interaktivdir və HTML verir; matplotlib/seaborn statik şəkillər üçündür.',
    ),
    single('`px.scatter(df, x="A", y="B", color="Category")` — `color` seaborn-da hansı parametrə uyğundur?', ['palette', 'hue', 'style', 'size'], 2,
           'color qruplara görə rəngləyir — seaborn-un hue-su kimi.'),
    single('İnteraktiv Plotly qrafikini həmkara göndərmək üçün ən rahat yol?', ['fig.show()', 'fig.write_html("fayl.html")', 'plt.savefig()', 'print(fig)'], 2,
           'HTML faylı brauzerdə interaktiv açılır.'),
    single('`go.Scatter(..., mode="lines")` nə çəkir?', ['Nöqtələr', 'Xətt', 'Sütunlar', 'Histoqram'], 2,
           'mode="lines" — xətt, "markers" — nöqtələr, "lines+markers" — hər ikisi.'),
])

# ───────────────────────────── 08 · Reqressiya ─────────────────────────────
m = c.module('reqressiya', 'Proqnoz vaxtıdır: reqressiya modelləri',
             'Trend xətti, sadə və çoxlu xətti reqressiya, modelin təfsiri, proqnoz və qalıqların təhlili.')

m.lesson('reqressiya-giris', 'Reqressiya nədir və necə təfsir olunur?', 9, '''
    **Reqressiya** — bir dəyişənin (asılı dəyişən, y) digər dəyişən(lər)dən (müstəqil dəyişənlər, X) necə asılı olduğunu modelləşdirən statistik metoddur. Məqsəd: əlaqəni ölçmək və **proqnoz** vermək.

    - **Sadə xətti reqressiya:** bir X — `y = b₀ + b₁·x`
    - **Çoxlu (mürəkkəb) xətti reqressiya:** bir neçə X — `y = b₀ + b₁·x₁ + b₂·x₂ + …`

    ## Əmsallar

    - **b₀ (intercept, sabit)** — x = 0 olanda y-in gözlənilən dəyəri.
    - **b₁ (slope, meyl)** — x 1 vahid artanda y-in orta hesabla nə qədər dəyişdiyi.

    > Mənfəət = −20 + 0.25 × Satış → hər əlavə 100 ₼ satış orta hesabla 25 ₼ mənfəət gətirir.

    ## Modelin keyfiyyəti

    | Göstərici | Mənası |
    | --- | --- |
    | **R²** | y-dəki dəyişkənliyin neçə faizini model izah edir (0–1). 0.8 — 80% |
    | **Adjusted R²** | Dəyişən sayına görə düzəldilmiş R² — çoxlu reqressiyada müqayisə üçün |
    | **t-dəyəri / p-dəyəri** | Əmsal statistik əhəmiyyətlidirmi? p < 0.05 — adətən «əhəmiyyətli» |
    | **Qalıqlar (residuals)** | Faktiki y − proqnoz. Təsadüfi səpələnməlidir |

    ## Qalıqları yoxlamaq

    1. **Qalıqlar vs proqnoz** qrafiki — nöqtələr 0 xəttinin ətrafında **təsadüfi** səpələnməlidir. Naxış (qövs, huni) görünürsə, model nəyisə qaçırır.
    2. **Q-Q qrafiki** — qalıqlar normal paylanıbsa, nöqtələr düz xətt üzərində olur.

    ## Ehtiyat

    - Reqressiya **korrelyasiyanı** modelləşdirir — səbəbiyyəti sübut etmir.
    - Data aralığından çox kənara proqnoz (ekstrapolyasiya) etibarsızdır.
    - Kənar dəyərlər xətti güclü əyə bilər.
''')

m.lesson('reqressiya-kod', 'Python-da reqressiya: polyfit, scikit-learn, statsmodels', 10, '''
    ## 1. Trend xətti: np.polyfit

    ```python
    import numpy as np
    meyl, sabit = np.polyfit(x, y, 1)        # 1 — xətti (1-ci dərəcə)
    plt.scatter(x, y)
    plt.plot(x, meyl * np.array(x) + sabit, color="red", linestyle="--", label="Trend xətti")
    ```

    ## 2. scikit-learn: LinearRegression

    ```python
    from sklearn.linear_model import LinearRegression

    X = df[["Sales"]]          # 2 ölçülü olmalıdır (DataFrame və ya reshape(-1, 1))
    y = df["Profit"]
    model = LinearRegression()
    model.fit(X, y)

    model.coef_          # meyl(lər)
    model.intercept_     # sabit
    model.score(X, y)    # R²
    model.predict(pd.DataFrame({"Sales": [1000]}))   # proqnoz
    ```

    ## 3. statsmodels: OLS və ətraflı xülasə

    ```python
    import statsmodels.api as sm

    X = sm.add_constant(data[["mph", "hp", "wt"]])   # sabit termini əlavə et
    y = data["mpg"]
    results = sm.OLS(y, X).fit()
    print(results.summary())        # əmsallar, t, p, R², Adjusted R²

    results.params                  # əmsallar
    results.rsquared                # R²
    results.pvalues                 # p-dəyərləri

    yeni = sm.add_constant(pd.DataFrame({"mph": [65], "hp": [155], "wt": [2450]}), has_constant="add")
    results.predict(yeni)
    ```

    > ⚠️ statsmodels-də `add_constant` unudulsa, model sabitsiz (xətt 0-dan keçən) qurulur — ən çox edilən səhvlərdən biridir.

    ## Qalıqlar və Q-Q qrafiki

    ```python
    qaliqlar = y - results.predict(X)

    plt.scatter(results.predict(X), qaliqlar)
    plt.axhline(y=0, color="red", linestyle="--")
    plt.title("Qalıqlar")

    import scipy.stats as stats
    stats.probplot(qaliqlar, dist="norm", plot=plt)    # Q-Q qrafiki
    ```

    | Alət | Nə vaxt |
    | --- | --- |
    | `np.polyfit` | Sürətli trend xətti |
    | `sklearn` | Proqnoz yönümlü işlər, maşın öyrənməsi pipeline-ları |
    | `statsmodels` | Statistik təfsir: p-dəyərləri, etibar intervalları, ətraflı xülasə |
''')

m.python('trend-xetti', 'Aylıq gəlirin trend xətti', 10, '''
    Gün 7 (trend line): aylıq gəlir artır, yoxsa azalır? np.polyfit ilə xətti trend tap.
''', [
    'Aylar üzrə gəlir (24 ay) → ayliq; x = 0, 1, …, 23 (np.arange).',
    'np.polyfit(x, ayliq.values, 1) ilə meyl və sabit → meyl, sabit (2 onluq).',
    'Nöqtələri (scatter) və trend xəttini (qırmızı, "--", label="Trend xətti") çək; title="Gəlir trendi"; legend.',
    'Trendə görə növbəti ayın (x = 24) proqnozu, 2 onluq → novbeti.',
], '''
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    ayliq = ...
    x = ...
    meyl, sabit = 0, 0
    novbeti = ...

    plt.figure(figsize=(9, 4))
''', '''
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    ayliq = df.groupby(df["Date"].str[:7])["Total Revenue"].sum()
    x = np.arange(len(ayliq))
    m_, s_ = np.polyfit(x, ayliq.values, 1)
    meyl, sabit = round(m_, 2), round(s_, 2)
    novbeti = round(m_ * 24 + s_, 2)

    plt.figure(figsize=(9, 4))
    plt.scatter(x, ayliq.values, label="Aylıq gəlir")
    plt.plot(x, m_ * x + s_, color="red", linestyle="--", label="Trend xətti")
    plt.title("Gəlir trendi")
    plt.legend()
''', FS + '''
    _m = _s.groupby(_s["Date"].str[:7])["Total Revenue"].sum()
    _k, _b = _np.polyfit(_np.arange(24), _m.values, 1)
    assert (meyl, sabit) == (round(_k, 2), round(_b, 2)), f"meyl, sabit = {round(_k, 2)}, {round(_b, 2)} olmalıdır"
    assert novbeti == round(_k * 24 + _b, 2), f"novbeti {round(_k * 24 + _b, 2)} olmalıdır"
    _a = _ax("Gəlir trendi")
    assert _a.collections and len(_a.collections[0].get_offsets()) == 24, "24 aylıq nöqtə (scatter) olmalıdır"
    _tl = [l for l in _a.get_lines() if l.get_label() == "Trend xətti"]
    assert _tl and _tl[0].get_linestyle() == "--", "label='Trend xətti', linestyle='--' olan xətt olmalıdır"
''', [
    'ayliq = df.groupby(df["Date"].str[:7])["Total Revenue"].sum(); x = np.arange(len(ayliq))',
    'm_, s_ = np.polyfit(x, ayliq.values, 1); trend = m_ * x + s_',
    'novbeti = round(m_ * 24 + s_, 2)',
], dataset=S)

m.python('sklearn-reg', 'Sadə reqressiya: scikit-learn', 10, '''
    Gün 9: sifarişlərdə satış mənfəəti nə qədər izah edir? Profit-i Sales ilə proqnozlaşdıran model qur.
''' + ORDERS_NOTE, [
    'X = o[["Sales"]], y = o["Profit"]; LinearRegression ilə model qur → model.',
    'Meyl (coef_[0]) və sabit (intercept_), 4 onluq → meyl, sabit.',
    'R² (model.score), 3 onluq → r2.',
    'Sales = 1000 üçün proqnoz, 2 onluq → proqnoz_1000.',
], '''
    import pandas as pd
    from sklearn.linear_model import LinearRegression

    o = pd.read_csv("sifarisler.csv")

    model = ...
    meyl, sabit = 0, 0
    r2 = ...
    proqnoz_1000 = ...

    print(meyl, sabit, r2, proqnoz_1000)
''', '''
    import pandas as pd
    from sklearn.linear_model import LinearRegression

    o = pd.read_csv("sifarisler.csv")

    X = o[["Sales"]]
    y = o["Profit"]
    model = LinearRegression()
    model.fit(X, y)
    meyl, sabit = round(model.coef_[0], 4), round(model.intercept_, 4)
    r2 = round(model.score(X, y), 3)
    proqnoz_1000 = round(model.predict(pd.DataFrame({"Sales": [1000]}))[0], 2)

    print(meyl, sabit, r2, proqnoz_1000)
''', FO + '''
    _k, _b = _np.polyfit(_o["Sales"], _o["Profit"], 1)
    assert hasattr(model, "coef_"), "model = LinearRegression(); model.fit(X, y)"
    assert abs(meyl - round(_k, 4)) < 2e-4 and abs(sabit - round(_b, 4)) < 2e-3, f"meyl ≈ {round(_k, 4)}, sabit ≈ {round(_b, 4)} olmalıdır"
    _r2 = _np.corrcoef(_o["Sales"], _o["Profit"])[0, 1] ** 2
    assert abs(r2 - round(_r2, 3)) < 0.0011, f"r2 {round(_r2, 3)} olmalıdır"
    assert abs(proqnoz_1000 - round(_k * 1000 + _b, 2)) < 0.02, f"proqnoz_1000 {round(_k * 1000 + _b, 2)} olmalıdır"
''', [
    'X = o[["Sales"]] (iki cüt mötərizə — 2 ölçülü); model = LinearRegression().fit(X, y)',
    'model.coef_[0], model.intercept_, model.score(X, y)',
    'model.predict(pd.DataFrame({"Sales": [1000]}))[0]',
], dataset=O)

m.python('statsmodels-ols', 'Çoxlu reqressiya: statsmodels və qalıqlar', 12, '''
    Gün 9: mənfəəti satış, endirim və ədədlə izah et. Hansı dəyişən mənfəəti azaldır?
''', [
    'X = sm.add_constant(o[["Sales", "Discount", "Quantity"]]), y = o["Profit"]; results = sm.OLS(y, X).fit().',
    'Discount əmsalı, 2 onluq → endirim_emsali; R², 3 onluq → r2; Discount-un p-dəyəri 0.05-dən kiçikdirmi → ehemiyyetli.',
    'Sales=1000, Discount=0.2, Quantity=3 üçün proqnoz, 2 onluq → proqnoz.',
    'Qalıqlar = y − proqnoz; qalıqlar vs proqnoz səpələnmə qrafiki + plt.axhline(0, color="red", linestyle="--"); title="Qalıqlar".',
], '''
    import pandas as pd
    import statsmodels.api as sm
    import matplotlib.pyplot as plt

    o = pd.read_csv("sifarisler.csv")

    results = ...
    endirim_emsali = ...
    r2 = ...
    ehemiyyetli = ...
    proqnoz = ...

    plt.figure()
''', '''
    import pandas as pd
    import statsmodels.api as sm
    import matplotlib.pyplot as plt

    o = pd.read_csv("sifarisler.csv")

    X = sm.add_constant(o[["Sales", "Discount", "Quantity"]])
    y = o["Profit"]
    results = sm.OLS(y, X).fit()
    endirim_emsali = round(results.params["Discount"], 2)
    r2 = round(results.rsquared, 3)
    ehemiyyetli = bool(results.pvalues["Discount"] < 0.05)
    yeni = pd.DataFrame({"const": [1.0], "Sales": [1000], "Discount": [0.2], "Quantity": [3]})
    proqnoz = round(results.predict(yeni)[0], 2)

    plt.figure()
    texmin = results.predict(X)
    qaliqlar = y - texmin
    plt.scatter(texmin, qaliqlar, alpha=0.4)
    plt.axhline(0, color="red", linestyle="--")
    plt.title("Qalıqlar")
''', FO + '''
    import statsmodels.api as _sm
    _X = _sm.add_constant(_o[["Sales", "Discount", "Quantity"]])
    _r = _sm.OLS(_o["Profit"], _X).fit()
    assert abs(endirim_emsali - round(_r.params["Discount"], 2)) < 0.011, f"endirim_emsali {round(_r.params['Discount'], 2)} olmalıdır — add_constant unutma"
    assert r2 == round(_r.rsquared, 3), f"r2 {round(_r.rsquared, 3)} olmalıdır"
    assert ehemiyyetli == bool(_r.pvalues["Discount"] < 0.05), "ehemiyyetli = results.pvalues['Discount'] < 0.05"
    _p = _r.params["const"] + _r.params["Sales"] * 1000 + _r.params["Discount"] * 0.2 + _r.params["Quantity"] * 3
    assert abs(proqnoz - round(_p, 2)) < 0.02, f"proqnoz {round(_p, 2)} olmalıdır"
    _a = _ax("Qalıqlar")
    assert _a.collections and len(_a.collections[0].get_offsets()) == len(_o), "Hər sifariş üçün qalıq nöqtəsi olmalıdır"
    assert any(_np.allclose(l.get_ydata(), 0) for l in _a.get_lines()), "plt.axhline(0, ...) ilə sıfır xəttini çək"
''', [
    'X = sm.add_constant(o[["Sales", "Discount", "Quantity"]]); results = sm.OLS(o["Profit"], X).fit()',
    'results.params["Discount"], results.rsquared, results.pvalues["Discount"]',
    'Proqnoz üçün const sütunu da lazımdır: pd.DataFrame({"const": [1.0], "Sales": [1000], "Discount": [0.2], "Quantity": [3]})',
], dataset=O)

m.quiz('reqressiya-testi', 'Test: reqressiya', [
    single('Model: Mənfəət = −20 + 0.25 × Satış. Satış 400 ₼ olanda proqnoz?', ['80 ₼', '100 ₼', '−20 ₼', '120 ₼'], 1,
           '−20 + 0.25 × 400 = 80.'),
    single('R² = 0.65 nə deməkdir?', ['Model 65% hallarda düzgündür', 'Mənfəətdəki dəyişkənliyin 65%-i model tərəfindən izah olunur', 'Korrelyasiya 0.65-dir', 'p-dəyəri 0.65-dir'], 2,
           'R² izah olunan dəyişkənlik payıdır.'),
    classify(
        'Hər alət və ya göstərici nə üçündür?',
        [
            ('Modelin keyfiyyəti', ['R²', 'Adjusted R²']),
            ('Əmsalın əhəmiyyəti', ['p-dəyəri', 't-dəyəri']),
            ('Modelin fərziyyələrini yoxlamaq', ['Qalıqlar vs proqnoz qrafiki', 'Q-Q qrafiki']),
        ],
        'R² — izahetmə gücü; p/t — əmsalın əhəmiyyəti; qalıq qrafikləri — modelin uyğunluğu.',
    ),
    single('statsmodels-də `sm.add_constant` unudulsa nə olur?', ['Xəta verir', 'Model sabitsiz — xətt 0-dan keçir', 'R² 1 olur', 'Heç nə'], 2,
           'OLS sabiti avtomatik əlavə etmir.'),
])

# ───────────────────────────── 09 · E-poçt ─────────────────────────────
m = c.module('email', 'Hesabatı avtomatlaşdır: e-poçt göndərmək',
             'smtplib, MIME məktubu, əlavə fayl, tətbiq parolu və təhlükəsizlik.')

m.lesson('email-ders', 'Python ilə e-poçt: smtplib və MIME', 9, '''
    Hər səhər eyni hesabatı hazırlayıb e-poçtla göndərirsən? Python bunu avtomatlaşdıra bilər.

    ## Məktubu qurmaq: MIME

    ```python
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    msg = MIMEMultipart()
    msg["From"] = "hesabat@sirket.az"
    msg["To"] = "rehberlik@sirket.az"
    msg["Subject"] = "Gündəlik satış hesabatı"
    msg.attach(MIMEText("Salam! Dünənki hesabat əlavədədir.", "plain"))

    with open("hesabat.csv", "rb") as f:
        hisse = MIMEBase("application", "octet-stream")
        hisse.set_payload(f.read())
    encoders.encode_base64(hisse)
    hisse.add_header("Content-Disposition", "attachment; filename=hesabat.csv")
    msg.attach(hisse)
    ```

    ## Göndərmək: smtplib

    ```python
    import os, smtplib

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()                                    # şifrələnmiş əlaqə
        server.login(os.environ["EMAIL_USER"], os.environ["EMAIL_APP_PASSWORD"])
        server.send_message(msg)
    ```

    - **587** — standart təhlükəsiz SMTP portu (STARTTLS).
    - Gmail kimi xidmətlər adi parol əvəzinə **tətbiq parolu** (app password) tələb edir — iki faktorlu autentifikasiya açıq olmalıdır.

    ## 🔒 Təhlükəsizlik — ən vacib hissə

    > ⚠️ **Parolu heç vaxt koda yazma.** Kod faylları paylaşılır, GitHub-a yüklənir, e-poçtla göndərilir — içindəki parol da onunla birlikdə yayılır. Kodda parol görmüsənsə, onu dərhal **ləğv et** və yenisini yarat.

    - Parolu **mühit dəyişənində** (`os.environ`), `.env` faylında (git-ə əlavə olunmayan) və ya parol menecerində saxla.
    - Hesabatda şəxsi məlumatlar varsa, alıcıların siyahısını yoxla; mümkünsə faylı şifrələ.
    - Kütləvi göndərişdə xidmətin limitlərinə əməl et.

    > 💻 Brauzer mühitində (DaCy) internetə SMTP əlaqəsi açmaq mümkün deyil. Tapşırıqda məktubu **qurub** yoxlayırıq; göndərmə hissəsini öz kompüterində və ya Colab-da sına.
''')

m.python('email-tapsiriq', 'Hesabatlı məktub hazırla', 12, '''
    Regionlar üzrə gəlir xülasəsini CSV faylı kimi hazırla və onu əlavə edilmiş MIME məktubu qur (göndərmədən).
''', [
    'Regionlar üzrə gəlir (2 onluq) xülasəsini region_hesabat.csv faylına yaz (index=True, sütun adı "Gəlir").',
    'MIMEMultipart məktub → msg: From "hesabat@technar.az", To "rehberlik@technar.az", Subject "Regionlar üzrə gəlir".',
    'Mətn hissəsi: "Salam! Regionlar üzrə gəlir hesabatı əlavədədir." (MIMEText, "plain").',
    'CSV-ni base64 əlavə kimi qoş: filename=region_hesabat.csv. Parol yazma — göndərmə lazım deyil.',
], '''
    import pandas as pd
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    df = pd.read_csv("satislar.csv")

    xulase = ...
    # CSV yaz

    msg = ...
''', '''
    import pandas as pd
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    df = pd.read_csv("satislar.csv")

    xulase = df.groupby("Region")["Total Revenue"].sum().round(2).rename("Gəlir")
    xulase.to_csv("region_hesabat.csv")

    msg = MIMEMultipart()
    msg["From"] = "hesabat@technar.az"
    msg["To"] = "rehberlik@technar.az"
    msg["Subject"] = "Regionlar üzrə gəlir"
    msg.attach(MIMEText("Salam! Regionlar üzrə gəlir hesabatı əlavədədir.", "plain"))

    with open("region_hesabat.csv", "rb") as f:
        hisse = MIMEBase("application", "octet-stream")
        hisse.set_payload(f.read())
    encoders.encode_base64(hisse)
    hisse.add_header("Content-Disposition", "attachment; filename=region_hesabat.csv")
    msg.attach(hisse)
''', FS + '''
    import os as _os, base64 as _b64
    assert _os.path.exists("region_hesabat.csv"), "region_hesabat.csv faylı yaradılmayıb"
    _csv = _pd.read_csv("region_hesabat.csv", index_col=0)
    _e = _s.groupby("Region")["Total Revenue"].sum().round(2)
    assert list(_csv.columns) == ["Gəlir"] and _np.allclose(_csv["Gəlir"].sort_index().values, _e.sort_index().values), "CSV-də Region indeksi və 'Gəlir' sütunu olmalıdır"
    from email.mime.multipart import MIMEMultipart as _MM
    assert isinstance(msg, _MM), "msg = MIMEMultipart()"
    assert (msg["From"], msg["To"], msg["Subject"]) == ("hesabat@technar.az", "rehberlik@technar.az", "Regionlar üzrə gəlir"), "From / To / Subject düzgün deyil"
    _parts = msg.get_payload()
    _txt = [p for p in _parts if p.get_content_type() == "text/plain"]
    assert _txt and "Regionlar üzrə gəlir hesabatı əlavədədir" in _txt[0].get_payload(decode=True).decode("utf-8"), "Mətn hissəsi (MIMEText) yoxdur"
    _att = [p for p in _parts if p.get_filename() == "region_hesabat.csv"]
    assert _att, "region_hesabat.csv əlavəsi yoxdur (Content-Disposition: attachment; filename=...)"
    assert _att[0]["Content-Transfer-Encoding"] == "base64" and "Gəlir" in _att[0].get_payload(decode=True).decode("utf-8"), "Əlavə base64 ilə kodlaşdırılmalı və CSV məzmununu daşımalıdır"
    assert "login(" not in dacy.code and "password" not in dacy.code.lower(), "Bu tapşırıqda parol və login yazma"
''', [
    'xulase = df.groupby("Region")["Total Revenue"].sum().round(2).rename("Gəlir"); xulase.to_csv("region_hesabat.csv")',
    'msg = MIMEMultipart(); msg["Subject"] = ...; msg.attach(MIMEText("...", "plain"))',
    'MIMEBase("application", "octet-stream") → set_payload → encoders.encode_base64 → add_header("Content-Disposition", "attachment; filename=region_hesabat.csv")',
], dataset=S)

m.quiz('email-testi', 'Test: e-poçt və təhlükəsizlik', [
    single('Kodda real e-poçt parolu yazılıb və fayl paylaşılıb. Nə etməli?', ['Faylı silmək kifayətdir', 'Parolu dərhal ləğv edib yenisini yaratmaq, parolu mühit dəyişəninə köçürmək', 'Heç nə — fayl şəxsidir', 'Parolu base64 ilə kodlaşdırmaq'], 2,
           'Yayılmış parol ləğv edilməlidir; base64 şifrələmə deyil.'),
    classify(
        'Hər addım məktubun hansı hissəsinə aiddir?',
        [
            ('Məktubu qurmaq (email.mime)', ['MIMEMultipart()', 'MIMEText(mətn, "plain")', 'encoders.encode_base64(hissə)']),
            ('Göndərmək (smtplib)', ['smtplib.SMTP(server, 587)', 'server.starttls()', 'server.send_message(msg)']),
        ],
        'MIME məktubun quruluşudur; smtplib serverə qoşulub göndərir.',
    ),
    single('587 portu və `starttls()` nə üçündür?', ['Sürət üçün', 'Əlaqəni şifrələmək üçün', 'Əlavə faylları sıxmaq üçün', 'Spam filtrindən keçmək üçün'], 2,
           'STARTTLS əlaqəni şifrələnmiş kanala keçirir.'),
])

# ───────────────────────────── 10 · Yekun layihə ─────────────────────────────
m = c.module('layihe', 'Yekun layihə: satış dashboard-u',
             'Gün 7 və Gün 8-in qiymətləndirilən tapşırıqları: çoxqrafikli dashboard və əsas nəticələr.')

m.lesson('layihe-izah', 'Yekun layihə: rəhbərlik üçün vizual hesabat', 5, '''
    Gün 7 və Gün 8-in tapşırıqlarını bir **dashboard**-da birləşdiririk. Rəhbərlik bir səhifədə görmək istəyir:

    1. Kateqoriyalar üzrə gəlir (sütun);
    2. Regionların gəlir payı (dairə);
    3. Apple məhsullarının aylıq satılan ədədi (xətt);
    4. Units Sold ilə Total Revenue əlaqəsi (səpələnmə);
    5. Məhsul qiymətlərinin paylanması (histoqram);
    6. Regionlar üzrə satış məbləğlərinin yayılması (qutu).

    Sonra ən çox satılan 3 məhsulun gəlirini və regionların aylıq dinamikasını ayrıca göstərəcəyik.

    ## Yaxşı dashboard qaydaları (xatırlatma)

    - Hər qrafikin **başlığı nəticəni** və ya sualı desin.
    - Ox adları və vahidlər olsun.
    - Rənglər ardıcıl və az olsun; vacib olan vurğulansın.
    - `figsize` və `tight_layout()` ilə qrafiklər bir-birini örtməsin.

    > 💡 Apple məhsullarını tapmaq üçün adın başlanğıcına bax: iPhone, iPad, MacBook, AirPods, Apple Watch — `str.contains(r"^(?:iPhone|iPad|MacBook|AirPods|Apple)", regex=True)`.
''')

m.python('dashboard', 'Layihə 1: 2×3 dashboard', 15, '''
    Gün 7-nin qiymətləndirilən tapşırıqları bir figure-də: `plt.subplots(2, 3, figsize=(15, 8))`. Başlıqlar dəqiq aşağıdakı kimi olmalıdır.
''', [
    'axs[0, 0] — kateqoriyalar üzrə gəlir (bar): "Kateqoriyalar üzrə gəlir".',
    'axs[0, 1] — regionların gəlir payı (pie, autopct): "Regionların payı".',
    'axs[0, 2] — Apple məhsullarının aylıq satılan ədədi (line): "Apple satışları".',
    'axs[1, 0] — Units Sold vs Total Revenue (scatter): "Ədəd və gəlir"; axs[1, 1] — Unit Price histoqramı (bins=20): "Qiymət paylanması".',
    'axs[1, 2] — regionlar üzrə Total Revenue qutu qrafiki (boxplot): "Regionlar üzrə yayılma"; plt.tight_layout().',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    fig, axs = plt.subplots(2, 3, figsize=(15, 8))
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    fig, axs = plt.subplots(2, 3, figsize=(15, 8))

    kat = df.groupby("Product Category")["Total Revenue"].sum()
    axs[0, 0].bar(kat.index, kat.values)
    axs[0, 0].set_title("Kateqoriyalar üzrə gəlir")
    axs[0, 0].tick_params(axis="x", rotation=30)

    reg = df.groupby("Region")["Total Revenue"].sum()
    axs[0, 1].pie(reg.values, labels=reg.index, autopct="%1.1f%%")
    axs[0, 1].set_title("Regionların payı")

    apple = df[df["Product Name"].str.contains(r"^(?:iPhone|iPad|MacBook|AirPods|Apple)", regex=True)]
    ay = apple.groupby(apple["Date"].str[:7])["Units Sold"].sum()
    axs[0, 2].plot(range(len(ay)), ay.values, marker="o")
    axs[0, 2].set_title("Apple satışları")

    axs[1, 0].scatter(df["Units Sold"], df["Total Revenue"], alpha=0.4)
    axs[1, 0].set_title("Ədəd və gəlir")

    axs[1, 1].hist(df["Unit Price"], bins=20)
    axs[1, 1].set_title("Qiymət paylanması")

    regionlar = sorted(df["Region"].unique())
    axs[1, 2].boxplot([df[df["Region"] == r]["Total Revenue"] for r in regionlar], labels=regionlar)
    axs[1, 2].set_title("Regionlar üzrə yayılma")

    plt.tight_layout()
''', FS + '''
    from matplotlib.patches import Wedge as _W
    _f = [_plt.figure(n) for n in _plt.get_fignums() if len(_plt.figure(n).axes) == 6]
    assert _f, "6 qrafikli figure olmalıdır: plt.subplots(2, 3)"
    assert len(_ax("Kateqoriyalar üzrə gəlir").patches) == 5, "Kateqoriyalar — 5 sütun"
    assert len([x for x in _ax("Regionların payı").patches if isinstance(x, _W)]) == 5, "Regionların payı — 5 dilim"
    _ap = _s[_s["Product Name"].str.contains(r"^(?:iPhone|iPad|MacBook|AirPods|Apple)", regex=True)]
    _ay = _ap.groupby(_ap["Date"].str[:7])["Units Sold"].sum()
    _l = _ax("Apple satışları").get_lines()
    assert _l and sorted(_l[0].get_ydata()) == sorted(_ay.values), "Apple satışları — Apple məhsullarının aylıq ədədi (iPhone, iPad, MacBook, AirPods, Apple Watch)"
    assert len(_ax("Ədəd və gəlir").collections[0].get_offsets()) == len(_s), "Ədəd və gəlir — bütün əməliyyatlar"
    assert len(_ax("Qiymət paylanması").patches) == 20, "Qiymət paylanması — bins=20"
    assert len(_ax("Regionlar üzrə yayılma").get_xticklabels()) == 5, "Regionlar üzrə yayılma — 5 qutu"
''', [
    'fig, axs = plt.subplots(2, 3, figsize=(15, 8)); hər axes-də set_title(...)',
    'apple = df[df["Product Name"].str.contains(r"^(?:iPhone|iPad|MacBook|AirPods|Apple)", regex=True)]',
    'axs[1, 2].boxplot([df[df["Region"] == r]["Total Revenue"] for r in regionlar], labels=regionlar)',
], dataset=S, xp=70)

m.python('layihe-top3', 'Layihə 2: top 3 məhsul və regionların dinamikası', 12, '''
    Gün 8 (8, 10): ən çox satılan 3 məhsulun gəliri və regionların aylıq satış hərəkəti.
''', [
    'Satılan ədədə görə top 3 məhsulun adları → top3; onların ümumi gəliri (Series) → top3_gelir.',
    'sns.barplot ilə top3_gelir: plt.title("Top 3 məhsulun gəliri").',
    'Yeni figure-də sns.lineplot: hər region üçün aylıq gəlir (Date-in ilk 7 simvolu "Ay" sütunu, hue="Region"); plt.title("Regionların aylıq gəliri").',
], '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    top3 = ...
    top3_gelir = ...
    plt.figure()

    plt.figure(figsize=(10, 4))
''', '''
    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt

    df = pd.read_csv("satislar.csv")

    top3 = df.groupby("Product Name")["Units Sold"].sum().nlargest(3).index.tolist()
    top3_gelir = df[df["Product Name"].isin(top3)].groupby("Product Name")["Total Revenue"].sum()
    plt.figure()
    sns.barplot(x=top3_gelir.index, y=top3_gelir.values)
    plt.title("Top 3 məhsulun gəliri")

    plt.figure(figsize=(10, 4))
    df["Ay"] = df["Date"].str[:7]
    ra = df.groupby(["Ay", "Region"])["Total Revenue"].sum().reset_index()
    sns.lineplot(data=ra, x="Ay", y="Total Revenue", hue="Region")
    plt.xticks(rotation=90)
    plt.title("Regionların aylıq gəliri")
''', FS + '''
    _t = _s.groupby("Product Name")["Units Sold"].sum().nlargest(3).index.tolist()
    assert top3 == _t, f"top3 {_t} olmalıdır"
    _g = _s[_s["Product Name"].isin(_t)].groupby("Product Name")["Total Revenue"].sum()
    assert isinstance(top3_gelir, _pd.Series) and top3_gelir.round(2).to_dict() == _g.round(2).to_dict(), "top3_gelir düzgün deyil"
    _b = _ax("Top 3 məhsulun gəliri")
    assert sorted(round(p.get_height()) for p in _b.patches) == sorted(round(v) for v in _g.values), "barplot top 3 məhsulun gəlirini göstərməlidir"
    _l = _ax("Regionların aylıq gəliri")
    assert len([x for x in _l.get_lines() if len(x.get_xdata()) > 1]) >= 5, "Hər region üçün bir xətt olmalıdır (hue='Region')"
''', [
    'top3 = df.groupby("Product Name")["Units Sold"].sum().nlargest(3).index.tolist()',
    'top3_gelir = df[df["Product Name"].isin(top3)].groupby("Product Name")["Total Revenue"].sum()',
    'ra = df.groupby(["Ay", "Region"])["Total Revenue"].sum().reset_index(); sns.lineplot(data=ra, x="Ay", y="Total Revenue", hue="Region")',
], dataset=S, xp=60)

m.quiz('yekun-test', 'Yekun test: Data Analysis & Visualization', [
    classify(
        'Hər sual üçün qrafik:',
        [
            ('Xətt', ['Aylıq gəlirin dəyişməsi']),
            ('Səpələnmə', ['Satış və mənfəət əlaqəsi']),
            ('Histoqram', ['Qiymətlərin paylanması']),
            ('Qutu', ['Regionlar üzrə yayılma və kənar dəyərlər']),
        ],
        'Zaman — xətt; əlaqə — səpələnmə; paylanma — histoqram; qruplar üzrə yayılma — qutu.',
    ),
    single('Subplot-da başlıq necə verilir?', ['plt.title() hər zaman', 'ax.set_title()', 'ax.title = ...', 'fig.title()'], 2, 'Axes metodları set_ prefiksi ilə.'),
    single('`sns.barplot(..., estimator="sum", errorbar=None)` nə göstərir?', ['Orta və interval', 'Cəm, intervalsız', 'Say', 'Median'], 2, 'estimator — aqreqasiya, errorbar=None — interval yox.'),
    single('Korrelyasiya 0.05-dir. Nəticə?', ['Güclü əlaqə', 'Praktik olaraq xətti əlaqə yoxdur', 'Mənfi əlaqə', 'Səbəbiyyət var'], 2, '0-a yaxın — xətti əlaqə yoxdur.'),
    single('IQR qaydasına görə kənar dəyər:', ['Ortadan 2 dəfə böyük', 'Q3 + 1.5×IQR-dən böyük və ya Q1 − 1.5×IQR-dən kiçik', 'Maksimum', 'Mediandan kiçik'], 2, 'Qutu qrafikinin «bığları» bu qaydadır.'),
    single('Reqressiyada qalıqlar qrafikində aydın qövs görünür. Bu nə deməkdir?', ['Model idealdır', 'Model əlaqənin bir hissəsini (məs. qeyri-xətti) qaçırır', 'Data azdır', 'R² = 1'], 2, 'Qalıqlar təsadüfi olmalıdır.'),
    single('Plotly-nin əsas üstünlüyü:', ['Ən kiçik fayl ölçüsü', 'İnteraktivlik: hover, zoom', 'Yalnız çap üçün', 'Statistik testlər'], 2, 'Plotly interaktiv HTML qrafiklər yaradır.'),
    single('E-poçt parolunu harada saxlamaq düzgündür?', ['Kodun içində', 'Mühit dəyişənində və ya parol menecerində', 'Notebook-un Markdown hüceyrəsində', 'CSV faylında'], 2, 'Parol heç vaxt koda yazılmır.'),
    multiple(
        'Hansılar seaborn funksiyalarıdır? (Bir neçə cavab)',
        ['histplot', 'regplot', 'pivot_table', 'heatmap', 'read_csv'],
        [1, 2, 4],
        'pivot_table və read_csv pandas funksiyalarıdır.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
