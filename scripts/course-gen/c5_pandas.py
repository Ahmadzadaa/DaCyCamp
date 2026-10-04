"""Python Pandas — Python4Business Gün 3–6 slaydları və tapşırıqları (TechNar satış datası üzərində)."""
import os
import shutil

from common import Course, classify, multiple, single

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'datasets')

c = Course(
    'python-pandas',
    {
        '_comment': (
            'Python Pandas — Python4Business Gün 3–6 (paketlər, import/export, EDA, filtrləmə, qruplaşdırma, join, apply,\n'
            'cut/qcut, concat, pivot/melt/rank, mətn və regex). Datasetlər sintetikdir, sütun adları docx tapşırıqlarındakı kimidir.\n'
            'Python addımları brauzerdə (Pyodide + pandas) işləyir.'
        ),
        'track': 'data-analytics',
        'title': 'Python Pandas',
        'level': 'intermediate',
        'description': (
            'Pandas ilə data emalı — real satış datası üzərində. DataFrame və Series, CSV/Excel oxuma və yazma, datanı '
            'tanımaq, filtrləmə, sıralama, sütunlarla iş, apply və lambda, qruplaşdırma və aqreqasiya, boş dəyərlər, '
            'tarixlər, merge/join/concat, pivot və melt, mətn sütunları və regex. Sonda tam satış təhlili layihəsi.'
        ),
        'sequential': True,
        'estimated_hours': 16,
        'published': True,
        'topics': ['python'],
    },
)
os.makedirs(os.path.join(c.root, 'datasets'))
for f in ['satislar.csv', 'satislar_xam.csv', 'satis_yanvar.csv', 'satis_fevral.csv', 'satis_mart.csv',
          'satislar_2024q1.xlsx', 'musteriler.csv', 'sifarisler_qisa.csv', 'isciler.csv', 'telebeler.csv']:
    shutil.copy(os.path.join(DATA, f), os.path.join(c.root, 'datasets', f))

S = 'datasets/satislar.csv'
X = 'datasets/satislar_xam.csv'
T = '''
    import pandas as _pd
    import numpy as _np
    _s = _pd.read_csv("satislar.csv")
'''
TX = '''
    import pandas as _pd
    import numpy as _np
    _x = _pd.read_csv("satislar_xam.csv")
'''

DATASET_NOTE = '''
    > 📁 **Dataset — `satislar.csv`:** TechNar elektronika, geyim, idman, məişət texnikası və kosmetika mağazalar şəbəkəsinin 2023–2024 satışları (1260 əməliyyat). Sütunlar: `Transaction ID`, `Date`, `Region`, `Filial`, `Sales Employee`, `Product Name`, `Product Category`, `Units Sold`, `Unit Price`, `Total Revenue`, `Payment Method`.
'''

# ───────────────────────────── 01 · Giriş ─────────────────────────────
m = c.module('giris', 'Pandas-a giriş: Series və DataFrame',
             'Pandas nədir, Series və DataFrame, ilk dataset və ona ilk baxış.')

m.lesson('pandas-nedir', 'Pandas nədir və niyə lazımdır?', 7, '''
    Excel-də 1000 sətirlik cədvəllə işləmək rahatdır. Bəs 1 milyon sətir olanda? Hər ay eyni hesabatı əl ilə təkrarlamaq lazım olanda? Və ya 5 fərqli faylı birləşdirmək lazım olanda? Bu suallara cavab — **pandas**.

    **pandas** — Python-da cədvəl məlumatları ilə işləmək üçün ən populyar kitabxanadır: oxumaq, təmizləmək, filtrləmək, qruplaşdırmaq, birləşdirmək və nəticəni yazmaq.

    ```python
    import pandas as pd      # qəbul olunmuş ləqəb — pd
    ```

    ## Excel ilə müqayisə

    | Excel | pandas |
    | --- | --- |
    | Vərəq (sheet) | `DataFrame` |
    | Sütun | `Series` |
    | Filtr | `df[df["Region"] == "Bakı"]` |
    | Pivot table | `df.pivot_table(...)` / `df.groupby(...)` |
    | VLOOKUP | `pd.merge(...)` |
    | Əl ilə təkrarlanan addımlar | Bir dəfə yazılan və istənilən vaxt yenidən işləyən kod |

    ## İki əsas obyekt

    **Series** — bir sütun: dəyərlər + onların **indeksi** (etiketləri).

    ```python
    satis = pd.Series([1250, 980, 1430], index=["B.e.", "Ç.a.", "Ç."])
    ```

    ```text
    B.e.    1250
    Ç.a.     980
    Ç.      1430
    dtype: int64
    ```

    **DataFrame** — cədvəl: eyni indeksi paylaşan bir neçə Series (sütun).

    ```python
    df = pd.DataFrame({
        "Şəhər": ["Bakı", "Gəncə", "Sumqayıt"],
        "Satış": [5200, 1800, 1400],
    })
    ```

    ```text
          Şəhər  Satış
    0      Bakı   5200
    1     Gəncə   1800
    2  Sumqayıt   1400
    ```

    Soldakı `0, 1, 2` — **indeksdir**. Defolt olaraq 0-dan başlayan nömrələrdir, amma istənilən etiket ola bilər.

    ## Kurs boyu: TechNar

    Kurs boyu uydurma **TechNar** mağazalar şəbəkəsinin real görünüşlü satış datası ilə işləyəcəyik: 5 region, 8 filial, 26 məhsul, 2 il. Python4Business proqramının Gün 3–6 tapşırıqlarının hamısı bu data üzərində qurulub.

    > 💻 DaCy-də pandas brauzerdə işləyir: ilk `import pandas` bir neçə saniyə çəkir (kitabxana yüklənir), sonrakı icralar sürətlidir. Kodun **son sətri** ifadədirsə (məs. `df.head()`), nəticəsi Jupyter-dəki kimi konsolda göstərilir.
''')

m.lesson('dataframe-esaslari', 'DataFrame ilə ilk addımlar', 8, DATASET_NOTE + '''

    ## Faylı oxumaq

    ```python
    import pandas as pd
    df = pd.read_csv("satislar.csv")
    ```

    ## İlk baxış

    | Kod | Nə göstərir |
    | --- | --- |
    | `df.head()` | İlk 5 sətir (`df.head(10)` — ilk 10) |
    | `df.tail()` | Son 5 sətir |
    | `df.sample(3)` | Təsadüfi 3 sətir |
    | `df.shape` | `(sətir sayı, sütun sayı)` — mötərizəsiz, atributdur |
    | `df.columns` | Sütun adları (`df.columns.tolist()` — siyahı kimi) |
    | `df.dtypes` | Hər sütunun tipi |
    | `len(df)` | Sətir sayı |

    ```python
    df.shape          # (1260, 11)
    setir, sutun = df.shape
    ```

    ## Sütun seçmək

    ```python
    df["Total Revenue"]        # Series
    df[["Region", "Total Revenue"]]   # DataFrame (iki cüt mötərizə!)
    ```

    > ⚠️ Sütun adında boşluq varsa (`Total Revenue`), yalnız `df["Total Revenue"]` yazılışı işləyir. `df.Region` qısa yazılışı yalnız boşluqsuz adlarda mümkündür.

    ## Series üzərində hesablamalar

    ```python
    df["Total Revenue"].sum()     # ümumi gəlir
    df["Units Sold"].mean()       # orta satış ədədi
    df["Unit Price"].max()        # ən yüksək qiymət
    df["Region"].unique()         # unikal dəyərlər
    df["Total Revenue"].idxmax()  # ən böyük dəyərin indeksi
    ```

    ## Tək dəyərə müraciət

    ```python
    df.loc[0, "Product Name"]     # 0 indeksli sətrin məhsul adı
    df["Product Name"].iloc[0]    # eyni nəticə
    ```

    `loc` — **etiketlə**, `iloc` — **mövqe nömrəsi ilə** müraciət edir. Fərqi növbəti fəsillərdə ətraflı görəcəyik.

    ## Məlumat tipləri (dtype)

    | dtype | Mənası | Nümunə sütun |
    | --- | --- | --- |
    | `int64` | Tam ədəd | `Units Sold` |
    | `float64` | Onluq ədəd | `Unit Price`, `Total Revenue` |
    | `object` | Mətn (və ya qarışıq) | `Region`, `Product Name` |
    | `datetime64` | Tarix | `Date` (çevrildikdən sonra) |
    | `bool` | True/False | şərt nəticələri |
''')

m.python('series-yarat', 'İlk Series: həftəlik satış', 8, '''
    TechNar-ın Nizami filialında həftənin hər günü üzrə satış (₼) verilib. Series-in indeksi — həftənin günləridir.
''', [
    'Həftəlik ümumi satışı tap → cem.',
    'Orta gündəlik satışı tap və 2 onluğa yuvarlaqlaşdır → orta.',
    'Ən çox satış olan günü (indeksi) tap → en_yaxsi_gun (idxmax).',
    '2000 ₼-dan çox satış olan günlərin siyahısı → yuksek_gunler (list).',
], '''
    import pandas as pd

    satis = pd.Series(
        [1250, 980, 1430, 1710, 2210, 2650, 1890],
        index=["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."],
        name="Satış",
    )

    cem = ...
    orta = ...
    en_yaxsi_gun = ...
    yuksek_gunler = ...

    print(cem, orta, en_yaxsi_gun, yuksek_gunler)
''', '''
    import pandas as pd

    satis = pd.Series(
        [1250, 980, 1430, 1710, 2210, 2650, 1890],
        index=["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."],
        name="Satış",
    )

    cem = satis.sum()
    orta = round(satis.mean(), 2)
    en_yaxsi_gun = satis.idxmax()
    yuksek_gunler = list(satis[satis > 2000].index)

    print(cem, orta, en_yaxsi_gun, yuksek_gunler)
''', '''
    assert cem == 12120, f"cem 12120 olmalıdır, sənin nəticən: {cem!r}"
    assert orta == 1731.43, f"orta 1731.43 olmalıdır, sənin nəticən: {orta!r}"
    assert en_yaxsi_gun == "Ş.", f'en_yaxsi_gun "Ş." olmalıdır (2650 ₼), sənin nəticən: {en_yaxsi_gun!r}'
    assert list(yuksek_gunler) == ["C.", "Ş."], f"yuksek_gunler ['C.', 'Ş.'] olmalıdır, sənin nəticən: {yuksek_gunler!r}"
    assert ".idxmax()" in dacy.code, "idxmax() metodundan istifadə et"
''', [
    'cem = satis.sum(); orta = round(satis.mean(), 2)',
    'idxmax() ən böyük dəyərin indeksini (günü) qaytarır.',
    'Filtr: satis[satis > 2000] — sonra .index ilə günləri götür və list() ilə siyahıya çevir.',
])

m.python('dataframe-yarat', 'İlk DataFrame', 8, '''
    Gün 3 slaydındakı nümunə: şəhərlər üzrə iqtisadi göstərici və əhali. Dictionary-dən DataFrame yarat və onu tanı.
''', [
    'data dictionary-sindən df yarat.',
    'Sətir və sütun sayını shape ilə tap → setir, sutun.',
    'Sütun adlarını siyahı kimi götür → sutunlar.',
    '"Əhalisi" sütununun cəmini tap → cem_ehali; ilk 2 sətri ilk_iki-yə yaz.',
], '''
    import pandas as pd

    data = {
        "Şəhər": ["Bakı", "Gəncə", "Bakı", "Gəncə", "Bakı", "Sumqayıt"],
        "İqtisadiyyat": [500, 300, 450, 350, 600, 250],
        "Əhalisi": [3000, 1500, 3200, 1600, 3400, 2000],
    }

    df = ...
    setir, sutun = 0, 0
    sutunlar = ...
    cem_ehali = ...
    ilk_iki = ...

    print(setir, sutun, sutunlar, cem_ehali)
    ilk_iki
''', '''
    import pandas as pd

    data = {
        "Şəhər": ["Bakı", "Gəncə", "Bakı", "Gəncə", "Bakı", "Sumqayıt"],
        "İqtisadiyyat": [500, 300, 450, 350, 600, 250],
        "Əhalisi": [3000, 1500, 3200, 1600, 3400, 2000],
    }

    df = pd.DataFrame(data)
    setir, sutun = df.shape
    sutunlar = df.columns.tolist()
    cem_ehali = df["Əhalisi"].sum()
    ilk_iki = df.head(2)

    print(setir, sutun, sutunlar, cem_ehali)
    ilk_iki
''', '''
    import pandas as _pd
    assert isinstance(df, _pd.DataFrame), "df DataFrame olmalıdır — pd.DataFrame(data)"
    assert (setir, sutun) == (6, 3), f"setir, sutun = 6, 3 olmalıdır, sənin nəticən: {(setir, sutun)!r}"
    assert sutunlar == ["Şəhər", "İqtisadiyyat", "Əhalisi"], f"sutunlar düzgün deyil: {sutunlar!r}"
    assert cem_ehali == 14700, f"cem_ehali 14700 olmalıdır, sənin nəticən: {cem_ehali!r}"
    assert isinstance(ilk_iki, _pd.DataFrame) and len(ilk_iki) == 2, "ilk_iki = df.head(2)"
    assert ".shape" in dacy.code, "Sətir və sütun sayını df.shape ilə tap"
''', [
    'df = pd.DataFrame(data)',
    'setir, sutun = df.shape — shape mötərizəsiz yazılır.',
    'sutunlar = df.columns.tolist(); cem_ehali = df["Əhalisi"].sum(); ilk_iki = df.head(2)',
])

m.python('ilk-baxis', 'satislar.csv-yə ilk baxış', 10, '''
    Kurs boyu istifadə edəcəyimiz əsas datasetı oxu və onunla tanış ol.
''' + DATASET_NOTE, [
    'satislar.csv faylını df-ə oxu və son sətirdə df.head() yaz — ilk 5 sətir konsolda görünəcək.',
    'Sətir və sütun sayını tap → setir_sayi, sutun_sayi.',
    'Sütun adlarını siyahı kimi götür → sutunlar.',
    'İlk əməliyyatın məhsul adını tap → ilk_mehsul.',
    'Bütün satışların ümumi gəlirini (Total Revenue cəmi) 2 onluğa yuvarlaqlaşdır → cem_gelir.',
], '''
    import pandas as pd

    df = ...

    setir_sayi, sutun_sayi = 0, 0
    sutunlar = ...
    ilk_mehsul = ...
    cem_gelir = ...

    print(setir_sayi, sutun_sayi)
    print(ilk_mehsul, cem_gelir)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    setir_sayi, sutun_sayi = df.shape
    sutunlar = df.columns.tolist()
    ilk_mehsul = df.loc[0, "Product Name"]
    cem_gelir = round(df["Total Revenue"].sum(), 2)

    print(setir_sayi, sutun_sayi)
    print(ilk_mehsul, cem_gelir)
    df.head()
''', T + '''
    assert isinstance(df, _pd.DataFrame) and df.shape == _s.shape, "df = pd.read_csv(\\"satislar.csv\\")"
    assert (setir_sayi, sutun_sayi) == _s.shape, f"setir_sayi, sutun_sayi = {_s.shape} olmalıdır, sənin nəticən: {(setir_sayi, sutun_sayi)!r}"
    assert sutunlar == _s.columns.tolist(), f"sutunlar düzgün deyil: {sutunlar!r}"
    assert ilk_mehsul == _s.loc[0, "Product Name"], f"ilk_mehsul {_s.loc[0, 'Product Name']!r} olmalıdır, sənin nəticən: {ilk_mehsul!r}"
    assert cem_gelir == round(_s["Total Revenue"].sum(), 2), f"cem_gelir {round(_s['Total Revenue'].sum(), 2)} olmalıdır, sənin nəticən: {cem_gelir!r}"
    assert ".head(" in dacy.code, "df.head() ilə ilk sətirlərə bax"
''', [
    'df = pd.read_csv("satislar.csv")',
    'ilk_mehsul = df.loc[0, "Product Name"] və ya df["Product Name"].iloc[0]',
    'cem_gelir = round(df["Total Revenue"].sum(), 2); son sətirdə df.head() yaz.',
], dataset=S)

m.quiz('giris-testi', 'Test: Series və DataFrame', [
    classify(
        'Hər ifadənin nəticəsi nədir?',
        [
            ('Series', ['df["Region"]', 'df["Total Revenue"] * 2', 'df.dtypes']),
            ('DataFrame', ['df[["Region"]]', 'df.head()', 'df[["Region", "Total Revenue"]]']),
            ('Tək dəyər və ya tuple', ['df.shape', 'df["Units Sold"].sum()', 'df.loc[0, "Region"]']),
        ],
        'Bir cüt mötərizə ilə bir sütun — Series, iki cüt mötərizə — DataFrame. shape tuple, sum() və loc[sətir, sütun] isə tək dəyər qaytarır.',
    ),
    single(
        '`df.shape` nəticəsi `(1260, 11)`-dir. Bu nə deməkdir?',
        ['1260 sütun, 11 sətir', '1260 sətir, 11 sütun', '1260 unikal məhsul', '11 boş dəyər'],
        2,
        'shape həmişə (sətir sayı, sütun sayı) qaytarır.',
    ),
    single(
        'Kodun son sətri `df.head()`-dir və `print` yoxdur. DaCy-də (və Jupyter-də) nə baş verir?',
        ['Heç nə göstərilmir', 'İlk 5 sətir konsolda göstərilir', 'Xəta verir', 'Bütün cədvəl göstərilir'],
        2,
        'Son sətir ifadədirsə, onun nəticəsi avtomatik göstərilir. Aradakı sətirlərdə isə print() lazımdır.',
    ),
])

# ───────────────────────────── 02 · İmport və eksport ─────────────────────────────
m = c.module('import-export', 'Datanın oxunması və yazılması',
             'read_csv və read_excel parametrləri, göstərmə ayarları, to_csv / to_excel / to_json ilə ixrac.')

m.lesson('oxumaq', 'CSV və Excel fayllarını oxumaq', 8, '''
    Statik məlumat (fayl) pandas-a `read_...` funksiyaları ilə daxil edilir.

    ## read_csv

    ```python
    df = pd.read_csv(
        "satislar.csv",
        sep=",",                                  # ayırıcı (Avropa fayllarında çox vaxt ";")
        usecols=["Date", "Region", "Total Revenue"],   # yalnız bu sütunlar
        nrows=100,                                # yalnız ilk 100 sətir
        skiprows=range(1, 11),                    # başlıqdan sonrakı 10 sətri keç
        parse_dates=["Date"],                     # Date sütununu tarix kimi oxu
        encoding="utf-8",
    )
    ```

    | Parametr | Nə edir |
    | --- | --- |
    | `sep` | Sütun ayırıcısı: `","`, `";"`, `"\\t"` |
    | `usecols` | Oxunacaq sütunlar |
    | `nrows` | Neçə sətir oxunsun |
    | `skiprows` | Keçiləcək sətirlər (say və ya siyahı) |
    | `header` | Başlıq sətri (defolt `0`; başlıq yoxdursa `None`) |
    | `index_col` | İndeks kimi istifadə olunacaq sütun |
    | `parse_dates` | Tarixə çevriləcək sütunlar |

    ## read_excel

    ```python
    fev = pd.read_excel(
        "satislar_2024q1.xlsx",
        sheet_name="Fevral",     # vərəqin adı və ya nömrəsi (0 — birinci)
        usecols="A:D",           # Excel hərfləri ilə də olur
        header=0,
        skiprows=0,
        nrows=50,
    )

    hamisi = pd.read_excel("satislar_2024q1.xlsx", sheet_name=None)
    # {"Yanvar": DataFrame, "Fevral": DataFrame, "Mart": DataFrame}
    ```

    `sheet_name=None` **bütün vərəqləri** dictionary kimi qaytarır: açar — vərəqin adı, dəyər — DataFrame.

    > 💻 Excel faylları üçün `openpyxl` paketi lazımdır. DaCy-də o, ilk `read_excel` çağırışında avtomatik quraşdırılır.

    ## Göstərmə ayarları

    Böyük cədvəllər çap olunanda pandas ortasını `...` ilə qısaldır. Bunu ayarlarla idarə etmək olar:

    ```python
    pd.options.display.max_rows = 100        # neçə sətir göstərilsin
    pd.options.display.max_columns = 20      # neçə sütun
    pd.options.display.width = 120           # ekranın eni (simvol)
    pd.options.display.colheader_justify = "center"   # başlıqlar ortada
    ```
''')

m.lesson('yazmaq', 'Nəticəni fayla yazmaq (export)', 7, '''
    Təhlilin nəticəsini başqalarına ötürmək üçün DataFrame fayla yazılır:

    | Metod | Format |
    | --- | --- |
    | `to_csv()` | CSV |
    | `to_excel()` | Excel |
    | `to_json()` | JSON |
    | `to_parquet()` | Parquet (böyük datalar üçün sıxılmış format) |
    | `to_html()` | HTML cədvəl |
    | `to_sql()` | Verilənlər bazası cədvəli |

    ## Əsas parametrlər

    ```python
    df.to_csv(
        "hesabat.csv",
        sep=";",            # ayırıcı
        index=False,        # indeksi (0, 1, 2…) yazma
        header=True,        # sütun adlarını yaz
        columns=["Region", "Total Revenue"],   # yalnız bu sütunlar
    )

    df.to_excel("hesabat.xlsx", sheet_name="Satış", startrow=2, startcol=1, index=False)
    df.to_json("hesabat.json", orient="records", force_ascii=False)
    ```

    > ⚠️ `index=False` unudulsa, faylda adsız əlavə sütun yaranır və geri oxuyanda `Unnamed: 0` adlı sütun görünür. Çox rast gəlinən səhvdir.

    ## Bir Excel faylında bir neçə vərəq

    ```python
    with pd.ExcelWriter("aylıq.xlsx") as yazici:
        yanvar.to_excel(yazici, sheet_name="Yanvar", index=False)
        fevral.to_excel(yazici, sheet_name="Fevral", index=False)
    ```

    ## JSON-un `orient` parametri

    `orient="records"` hər sətri ayrıca obyekt kimi yazır — API-lər üçün ən rahat formadır:

    ```json
    [{"Region": "Bakı", "Total Revenue": 2399.0}, {"Region": "Gəncə", "Total Revenue": 549.0}]
    ```

    `force_ascii=False` Azərbaycan hərflərini olduğu kimi saxlayır.
''')

m.python('oxuma-parametrleri', 'read_csv parametrləri', 10, '''
    Böyük faylın hamısı həmişə lazım olmur. `read_csv` parametrləri ilə yalnız lazım olan hissəni oxu.
''', [
    'Yalnız Date, Region, Total Revenue sütunlarını və ilk 100 sətri oxu → df_qisa.',
    'Faylı Date sütunu tarix kimi oxunmaqla oxu → df_tarix; Date sütununun tipini sətir kimi yaz → tarix_tipi (str(...dtype)).',
    'Başlıqdan sonrakı ilk 10 sətri keçərək oxu → df_kecid (skiprows=range(1, 11)).',
], '''
    import pandas as pd

    df_qisa = ...
    df_tarix = ...
    tarix_tipi = ...
    df_kecid = ...

    print(df_qisa.shape, tarix_tipi, len(df_kecid))
''', '''
    import pandas as pd

    df_qisa = pd.read_csv("satislar.csv", usecols=["Date", "Region", "Total Revenue"], nrows=100)
    df_tarix = pd.read_csv("satislar.csv", parse_dates=["Date"])
    tarix_tipi = str(df_tarix["Date"].dtype)
    df_kecid = pd.read_csv("satislar.csv", skiprows=range(1, 11))

    print(df_qisa.shape, tarix_tipi, len(df_kecid))
''', T + '''
    assert isinstance(df_qisa, _pd.DataFrame) and df_qisa.shape == (100, 3), f"df_qisa 100 sətir və 3 sütun olmalıdır, səndə: {getattr(df_qisa, 'shape', df_qisa)!r}"
    assert sorted(df_qisa.columns) == ["Date", "Region", "Total Revenue"], f"df_qisa-nın sütunları düzgün deyil: {list(df_qisa.columns)}"
    assert str(tarix_tipi).startswith("datetime64"), f"tarix_tipi datetime64 olmalıdır — parse_dates=['Date'] istifadə et, sənin nəticən: {tarix_tipi!r}"
    assert len(df_kecid) == len(_s) - 10, f"df_kecid {len(_s) - 10} sətir olmalıdır, səndə {len(df_kecid)}"
    assert df_kecid.iloc[0]["Transaction ID"] == _s.iloc[10]["Transaction ID"], "skiprows=range(1, 11) — başlıq (0-cı sətir) qalmalı, sonrakı 10 sətir keçilməlidir"
    assert "usecols" in dacy.code and "nrows" in dacy.code, "usecols və nrows parametrlərindən istifadə et"
''', [
    'pd.read_csv("satislar.csv", usecols=["Date", "Region", "Total Revenue"], nrows=100)',
    'parse_dates=["Date"] → tarix_tipi = str(df_tarix["Date"].dtype)',
    'skiprows=range(1, 11) — 0-cı sətir başlıqdır, 1..10 keçilir.',
], dataset=S)

m.python('excel-oxu', 'Excel faylı və vərəqlər', 10, '''
    `satislar_2024q1.xlsx` faylında 2024-cü ilin ilk rübü üç vərəqdədir: **Yanvar, Fevral, Mart**.

    > ⏳ İlk `read_excel` çağırışında `openpyxl` paketi quraşdırılır — bir neçə saniyə çəkə bilər.
''', [
    '"Fevral" vərəqini oxu → fev.',
    'Bütün vərəqləri bir dəfəyə dictionary kimi oxu → vereqler (sheet_name=None).',
    'Vərəq adlarının siyahısı → vereq_adlari; fevralın ümumi gəliri (2 onluq) → fev_gelir.',
], '''
    import pandas as pd

    fev = ...
    vereqler = ...
    vereq_adlari = ...
    fev_gelir = ...

    print(vereq_adlari, fev_gelir)
''', '''
    import pandas as pd

    fev = pd.read_excel("satislar_2024q1.xlsx", sheet_name="Fevral")
    vereqler = pd.read_excel("satislar_2024q1.xlsx", sheet_name=None)
    vereq_adlari = list(vereqler.keys())
    fev_gelir = round(fev["Total Revenue"].sum(), 2)

    print(vereq_adlari, fev_gelir)
''', '''
    import pandas as _pd
    _fev = _pd.read_csv("satis_fevral.csv")
    assert isinstance(fev, _pd.DataFrame) and len(fev) == len(_fev), f"fev 'Fevral' vərəqi olmalıdır ({len(_fev)} sətir)"
    assert isinstance(vereqler, dict), "vereqler dictionary olmalıdır — sheet_name=None istifadə et"
    assert vereq_adlari == ["Yanvar", "Fevral", "Mart"], f"vereq_adlari ['Yanvar', 'Fevral', 'Mart'] olmalıdır, sənin nəticən: {vereq_adlari!r}"
    assert fev_gelir == round(_fev["Total Revenue"].sum(), 2), f"fev_gelir {round(_fev['Total Revenue'].sum(), 2)} olmalıdır, sənin nəticən: {fev_gelir!r}"
''', [
    'fev = pd.read_excel("satislar_2024q1.xlsx", sheet_name="Fevral")',
    'sheet_name=None bütün vərəqləri {ad: DataFrame} kimi qaytarır.',
    'vereq_adlari = list(vereqler.keys())',
], dataset=['datasets/satislar_2024q1.xlsx', 'datasets/satis_fevral.csv'])

m.python('eksport', 'Nəticəni CSV və JSON kimi yaz', 10, '''
    İlk 20 əməliyyatı mühasibatlığa göndərmək lazımdır: CSV (ayırıcı `;`) və JSON formatında. Yazdıqdan sonra faylı geri oxuyub yoxla.
''', [
    'İlk 20 sətri ilk20 dəyişəninə götür və ilk20.csv faylına yaz: ayırıcı ";", indeks yazılmasın.',
    'Faylı geri oxu (eyni ayırıcı ilə) → geri.',
    'ilk20-ni ilk20.json faylına yaz: orient="records", force_ascii=False.',
    'JSON faylını pd.read_json ilə oxu və sətir sayını tap → json_say.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    ilk20 = ...

    # CSV yaz

    geri = ...

    # JSON yaz

    json_say = ...
    print(geri.shape, json_say)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    ilk20 = df.head(20)

    ilk20.to_csv("ilk20.csv", sep=";", index=False)
    geri = pd.read_csv("ilk20.csv", sep=";")

    ilk20.to_json("ilk20.json", orient="records", force_ascii=False)
    json_say = len(pd.read_json("ilk20.json"))
    print(geri.shape, json_say)
''', T + '''
    import os as _os
    assert _os.path.exists("ilk20.csv"), "ilk20.csv faylı yaradılmayıb"
    _first = open("ilk20.csv", encoding="utf-8").readline()
    assert ";" in _first, "CSV-də ayırıcı ';' olmalıdır — sep=';'"
    assert not _first.startswith(";"), "İndeks fayla yazılıb — index=False əlavə et"
    assert isinstance(geri, _pd.DataFrame) and geri.shape == (20, _s.shape[1]), f"geri 20 sətir və {_s.shape[1]} sütun olmalıdır (Unnamed sütunu olmamalıdır), səndə: {getattr(geri, 'shape', None)}"
    assert _os.path.exists("ilk20.json"), "ilk20.json faylı yaradılmayıb"
    _j = open("ilk20.json", encoding="utf-8").read()
    assert _j.lstrip().startswith("[{"), "JSON orient='records' formatında olmalıdır: [{...}, {...}]"
    assert "\\\\u" not in _j, "Azərbaycan hərfləri kodlaşdırılıb — force_ascii=False əlavə et"
    assert json_say == 20, f"json_say 20 olmalıdır, sənin nəticən: {json_say!r}"
''', [
    'ilk20 = df.head(20); ilk20.to_csv("ilk20.csv", sep=";", index=False)',
    'Geri oxuyanda da ayırıcını göstər: pd.read_csv("ilk20.csv", sep=";")',
    'ilk20.to_json("ilk20.json", orient="records", force_ascii=False); json_say = len(pd.read_json("ilk20.json"))',
], dataset=S)

m.quiz('import-export-testi', 'Test: import və export', [
    classify(
        'Hər parametri uyğun funksiyaya yerləşdir.',
        [
            ('Oxuma (read_csv / read_excel)', ['usecols', 'nrows', 'skiprows', 'parse_dates', 'sheet_name=None']),
            ('Yazma (to_csv / to_excel / to_json)', ['index=False', 'startrow', 'orient="records"', 'force_ascii=False']),
        ],
        'usecols, nrows, skiprows, parse_dates oxunacaq hissəni seçir; index=False, startrow, orient, force_ascii isə faylın necə yazılacağını müəyyən edir.',
    ),
    single(
        'CSV-ni `index=False` olmadan yazıb geri oxuduqda hansı problem yaranır?',
        ['Fayl açılmır', '«Unnamed: 0» adlı artıq sütun yaranır', 'Bütün rəqəmlər mətnə çevrilir', 'Başlıqlar itir'],
        2,
        'İndeks də sütun kimi yazılır; geri oxuyanda adsız sütun «Unnamed: 0» görünür.',
    ),
    single(
        '`pd.read_excel("fayl.xlsx", sheet_name=None)` nə qaytarır?',
        ['Yalnız birinci vərəqi', 'Bütün vərəqləri {vərəq adı: DataFrame} dictionary-si kimi', 'Vərəq adlarının siyahısını', 'Xəta verir'],
        2,
        'sheet_name=None bütün vərəqləri oxuyur və dictionary qaytarır.',
    ),
])

# ───────────────────────────── 03 · EDA ─────────────────────────────
m = c.module('eda', 'Datanı tanımaq (EDA)',
             'Struktur, tiplər, boş dəyərlər, təsviri statistika, unikal dəyərlər və dublikatlar.')

m.lesson('eda-ders', 'İlk funksiyalarınız: datanı tanımaq', 9, '''
    Təhlilə başlamazdan əvvəl datanı **tanımaq** lazımdır: neçə sətir var, hansı sütunlar, tiplər düzgündürmü, boşluqlar, dublikatlar varmı? Buna **EDA** (Exploratory Data Analysis — kəşfiyyat təhlili) deyilir.

    > 📁 Bu fəsildə `satislar_xam.csv` ilə işləyirik — eyni satış datasının sistemdən gəldiyi kimi, **təmizlənməmiş** versiyası.

    ## Gün 3-ün «ilk funksiyaları»

    | Kod | Nə göstərir |
    | --- | --- |
    | `df.shape` | Neçə sətir və neçə sütun |
    | `df.columns.tolist()` | Sütun adları (siyahı) |
    | `df.dtypes` | Məlumat tipləri |
    | `df.info()` | Xülasə: sətir sayı, hər sütunda boş olmayan dəyər sayı, tiplər, yaddaş |
    | `df.isnull().sum()` | Hər sütunda itkin (boş) dəyərlərin sayı |
    | `(df.isnull().sum() / len(df)) * 100` | İtkin dəyərlərin faizi |
    | `df.describe(include="all")` | Təsviri statistika: say, orta, std, min, kvartillər, max (mətn sütunlarında: unikal, ən çox rast gələn) |
    | `df[col].nunique()` | Unikal dəyərlərin sayı |
    | `df[col].value_counts()` | Hər dəyərin neçə dəfə keçdiyi |
    | `df.duplicated().sum()` | Tam təkrarlanan sətirlərin sayı |

    ## isnull() necə işləyir?

    `df.isnull()` cədvəlin eyni ölçüdə **True/False** surətini qaytarır: boş xana — `True`. Python-da `True` = 1, `False` = 0 olduğu üçün `.sum()` hər sütundakı boşluqları sayır.

    ```python
    df.isnull().sum()
    ```

    ```text
    Transaction ID     0
    Date               0
    Sales Employee     9
    Unit Price         7
    Payment Method    14
    ...
    ```

    ## describe()

    ```python
    df.describe()                 # yalnız ədədi sütunlar
    df.describe(include="all")    # hamısı
    ```

    | Sətir | Mənası |
    | --- | --- |
    | `count` | Boş olmayan dəyərlərin sayı |
    | `mean` | Orta |
    | `std` | Standart kənarlaşma |
    | `min`, `max` | Ən kiçik, ən böyük |
    | `25%`, `50%`, `75%` | Kvartillər (`50%` — median) |

    ## value_counts() və nunique()

    ```python
    df["Payment Method"].value_counts()
    ```

    ```text
    Credit Card      528
    Debit Card       356
    Cash             230
    Mobile Wallet    144
    ```

    `value_counts()` nəticəni çoxdan aza sıralayır. `normalize=True` əlavə etsən, faizlər (paylar) qaytarır.

    > 💡 EDA-dan çıxan suallar təmizləmə planını verir: hansı sütunlarda boşluq var, dublikatları silməliyikmi, tiplər düzgündürmü? Təmizləməni sonrakı fəsillərdə edəcəyik.
''')

m.python('struktur', 'Datanın strukturu', 8, '''
    `satislar_xam.csv` faylını oxu və strukturunu öyrən (Gün 3 tapşırıqları 16–18).
''', [
    'Faylı df-ə oxu. Sətir və sütun sayını tap → setir, sutun.',
    'Sütun adlarını siyahı kimi qaytar → sutunlar.',
    'Məlumat tiplərini tap → tipler (df.dtypes).',
    'Yalnız ədədi sütunların adları → eded_sutunlari (select_dtypes("number")).',
], '''
    import pandas as pd

    df = ...
    setir, sutun = 0, 0
    sutunlar = ...
    tipler = ...
    eded_sutunlari = ...

    print(setir, sutun)
    print(tipler)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")
    setir, sutun = df.shape
    sutunlar = df.columns.tolist()
    tipler = df.dtypes
    eded_sutunlari = df.select_dtypes("number").columns.tolist()

    print(setir, sutun)
    print(tipler)
''', TX + '''
    assert (setir, sutun) == _x.shape, f"setir, sutun = {_x.shape} olmalıdır, sənin nəticən: {(setir, sutun)!r}"
    assert sutunlar == _x.columns.tolist(), "sutunlar = df.columns.tolist()"
    assert isinstance(tipler, _pd.Series) and tipler.equals(_x.dtypes), "tipler = df.dtypes"
    assert eded_sutunlari == _x.select_dtypes("number").columns.tolist(), f"eded_sutunlari {_x.select_dtypes('number').columns.tolist()} olmalıdır, sənin nəticən: {eded_sutunlari!r}"
''', [
    'df = pd.read_csv("satislar_xam.csv"); setir, sutun = df.shape',
    'tipler = df.dtypes',
    'eded_sutunlari = df.select_dtypes("number").columns.tolist()',
], dataset=X)

m.python('itkin-deyerler', 'İtkin dəyərləri yoxla', 10, '''
    Hansı sütunlarda boşluq var və nə qədər? (Gün 3 tapşırıqları 19–20)
''', [
    'Hər sütunda itkin dəyərlərin sayı → itkin (Series).',
    'Hər sütunda itkin dəyərlərin faizi, 2 onluq → itkin_faiz.',
    'Ən çox boşluq olan sütunun adı → en_cox_itkin.',
    'Bütün cədvəldə boşluqların ümumi sayı → cemi_itkin (int).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")

    itkin = ...
    itkin_faiz = ...
    en_cox_itkin = ...
    cemi_itkin = ...

    print(itkin_faiz)
    print(en_cox_itkin, cemi_itkin)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")

    itkin = df.isnull().sum()
    itkin_faiz = (df.isnull().sum() / len(df) * 100).round(2)
    en_cox_itkin = itkin.idxmax()
    cemi_itkin = int(itkin.sum())

    print(itkin_faiz)
    print(en_cox_itkin, cemi_itkin)
''', TX + '''
    _i = _x.isnull().sum()
    assert isinstance(itkin, _pd.Series) and itkin.to_dict() == _i.to_dict(), "itkin = df.isnull().sum()"
    _f = (_i / len(_x) * 100).round(2)
    assert isinstance(itkin_faiz, _pd.Series) and itkin_faiz.round(2).to_dict() == _f.to_dict(), f"itkin_faiz düzgün deyil. Gözlənilən (ilk 3): {_f.head(3).to_dict()}"
    assert en_cox_itkin == _i.idxmax(), f"en_cox_itkin {_i.idxmax()!r} olmalıdır, sənin nəticən: {en_cox_itkin!r}"
    assert cemi_itkin == int(_i.sum()), f"cemi_itkin {int(_i.sum())} olmalıdır, sənin nəticən: {cemi_itkin!r}"
''', [
    'itkin = df.isnull().sum()',
    'Faiz: (df.isnull().sum() / len(df) * 100).round(2)',
    'en_cox_itkin = itkin.idxmax(); cemi_itkin = int(itkin.sum())',
], dataset=X)

m.python('unikal-dublikat', 'Unikal dəyərlər, tezliklər və dublikatlar', 10, '''
    Gün 3 tapşırıqları 21–24: statistika, kateqoriyalar, ödəniş üsulları və təkrarlanan sətirlər.
''', [
    'Ədədi sütunların təsviri statistikası → statistika (describe()).',
    'Product Category sütununda unikal kateqoriyaların sayı → kateqoriya_sayi.',
    'Hər ödəniş üsulunun neçə dəfə istifadə olunduğu → odenis_sayi (value_counts).',
    'Tam təkrarlanan sətirlərin sayı → dublikat.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")

    statistika = ...
    kateqoriya_sayi = ...
    odenis_sayi = ...
    dublikat = ...

    print(kateqoriya_sayi, dublikat)
    odenis_sayi
''', '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")

    statistika = df.describe()
    kateqoriya_sayi = df["Product Category"].nunique()
    odenis_sayi = df["Payment Method"].value_counts()
    dublikat = df.duplicated().sum()

    print(kateqoriya_sayi, dublikat)
    odenis_sayi
''', TX + '''
    assert isinstance(statistika, _pd.DataFrame) and statistika.round(4).equals(_x.describe().round(4)), "statistika = df.describe()"
    assert kateqoriya_sayi == _x["Product Category"].nunique(), f"kateqoriya_sayi {_x['Product Category'].nunique()} olmalıdır, sənin nəticən: {kateqoriya_sayi!r}"
    _v = _x["Payment Method"].value_counts()
    assert isinstance(odenis_sayi, _pd.Series) and odenis_sayi.to_dict() == _v.to_dict(), f"odenis_sayi = df['Payment Method'].value_counts(). Gözlənilən: {_v.to_dict()}"
    assert dublikat == _x.duplicated().sum(), f"dublikat {_x.duplicated().sum()} olmalıdır, sənin nəticən: {dublikat!r}"
''', [
    'statistika = df.describe()',
    'kateqoriya_sayi = df["Product Category"].nunique()',
    'odenis_sayi = df["Payment Method"].value_counts(); dublikat = df.duplicated().sum()',
], dataset=X)

m.quiz('eda-testi', 'Test: datanı tanımaq', [
    classify(
        'Hər kodu nə qaytardığına görə qruplaşdır.',
        [
            ('Hər sütun üçün bir dəyər (Series)', ['df.isnull().sum()', 'df.dtypes', 'df["Region"].value_counts()']),
            ('Cədvəl (DataFrame)', ['df.describe()', 'df.isnull()', 'df.head()']),
            ('Tək ədəd', ['df["Region"].nunique()', 'df.duplicated().sum()', 'len(df)']),
        ],
        'isnull().sum(), dtypes və value_counts() Series; describe(), isnull() və head() DataFrame; nunique(), duplicated().sum() və len() isə tək ədəd qaytarır.',
    ),
    single(
        '`df.isnull().sum()` niyə boşluqları sayır?',
        [
            'isnull() boşluqları silir',
            'isnull() True/False cədvəli qaytarır, True = 1 olduğu üçün sum() True-ları sayır',
            'sum() yalnız boş xanaları toplayır',
            'Bu kod boşluqları saymır',
        ],
        2,
        'Boolean dəyərlər toplananda True 1, False 0 kimi sayılır.',
    ),
    single(
        '`describe()` nəticəsində `50%` sətri nəyi göstərir?',
        ['Orta dəyəri', 'Medianı', 'Dəyərlərin yarısının boş olduğunu', 'Maksimumun yarısını'],
        2,
        '50% kvartil — mediandır: dəyərlərin yarısı ondan kiçik, yarısı böyükdür.',
    ),
])

# ───────────────────────────── 04 · Seçim və filtrləmə ─────────────────────────────
m = c.module('filtrleme', 'Sütun və sətir seçimi, filtrləmə',
             'loc və iloc, müqayisə operatorları ilə filtrlər, & və |, isin, isnull, between və query.')

m.lesson('loc-iloc', 'Sütun və sətir seçimi: loc və iloc', 8, '''
    ## Sütunlar

    ```python
    df["Region"]                          # bir sütun → Series
    df[["Product Name", "Total Revenue"]] # bir neçə sütun → DataFrame
    ```

    ## loc — etiketlə

    `df.loc[sətirlər, sütunlar]` — sətir **indeksinin etiketi** və sütun **adı** ilə:

    ```python
    df.loc[10]                                  # indeksi 10 olan sətir
    df.loc[10:14, ["Date", "Total Revenue"]]    # 10-dan 14-ə qədər (14 DAXİL!)
    df.loc[:, "Region"]                         # bütün sətirlər, bir sütun
    ```

    ## iloc — mövqe ilə

    `df.iloc[sətirlər, sütunlar]` — sətir və sütunun **sıra nömrəsi** ilə (adi Python kəsməsi kimi):

    ```python
    df.iloc[0]          # birinci sətir
    df.iloc[-1]         # sonuncu sətir
    df.iloc[:3, :3]     # ilk 3 sətir, ilk 3 sütun (3 DAXİL DEYİL)
    ```

    | | `loc` | `iloc` |
    | --- | --- | --- |
    | Nə ilə | Etiket (indeks, sütun adı) | Mövqe (0, 1, 2…) |
    | Kəsmənin sonu | Daxildir | Daxil deyil |
    | Nümunə | `df.loc[0:4, "Region"]` → 5 sətir | `df.iloc[0:4, 2]` → 4 sətir |

    > 💡 Defolt indeks 0, 1, 2… olduğu üçün `loc` və `iloc` çox vaxt eyni görünür. Fərq filtrləmədən və ya sıralamadan sonra ortaya çıxır: indeks etiketləri qalır, mövqelər dəyişir.

    ## Tək xana

    ```python
    df.loc[0, "Product Name"]
    df.iloc[0, 5]
    df.at[0, "Product Name"]      # tək dəyər üçün sürətli variant
    ```
''')

m.lesson('filtrler', 'Filtrləmə: şərtlər, isin, query', 9, '''
    Python-da filtrləmə xüsusi funksiya ilə deyil, **müqayisə operatorları** ilə edilir. Şərt hər sətir üçün True/False qaytarır, DataFrame isə yalnız True olan sətirləri saxlayır.

    ```python
    df["Total Revenue"] > 2000          # True/False Series (maska)
    df[df["Total Revenue"] > 2000]      # yalnız True olan sətirlər
    ```

    ## Operatorlar

    | Operator | Nümunə |
    | --- | --- |
    | `==`, `!=` | `df[df["Region"] == "Bakı"]` |
    | `>`, `<`, `>=`, `<=` | `df[df["Units Sold"] > 5]` |
    | `isin([...])` | `df[df["Region"].isin(["Gəncə", "Şəki"])]` |
    | `isnull()`, `notnull()` | `df[df["Payment Method"].isnull()]` |
    | `between(a, b)` | `df[df["Unit Price"].between(100, 500)]` (a və b daxil) |

    ## Bir neçə şərt: `&`, `|`, `~`

    ```python
    df[(df["Region"] == "Bakı") & (df["Total Revenue"] > 1000)]       # VƏ
    df[(df["Region"] == "Gəncə") | (df["Region"] == "Şəki")]          # VƏ YA
    df[~(df["Payment Method"] == "Cash")]                             # DEYİL
    ```

    > ⚠️ Pandas-da `and` / `or` yox, `&` / `|` yazılır və **hər şərt mötərizədə olmalıdır**. Mötərizəsiz `df["A"] > 1 & df["B"] < 2` səhv nəticə və ya xəta verir.

    ## query() — oxunaqlı alternativ

    ```python
    df.query("`Units Sold` < 10 and Region == 'Bakı'")
    ```

    Adında boşluq olan sütunlar `` ` `` (backtick) arasında yazılır.

    ## Filtr + sütun seçimi

    ```python
    df[df["Product Category"] == "Electronics"]["Product Name"].unique()
    df.loc[df["Product Category"] == "Electronics", "Product Name"]    # eyni, loc ilə
    ```

    ## «Ən azı biri varmı?» — any() və all()

    ```python
    (df["Total Revenue"] > 2000).any()   # ən azı bir sətir? → True/False
    (df["Units Sold"] > 0).all()         # hamısı?
    ```
''')

m.python('secim', 'loc və iloc ilə seçim', 8, '''
    Datanın müxtəlif hissələrini seç.
''', [
    'Yalnız Product Name və Total Revenue sütunları → iki_sutun.',
    'İndeksi 10-dan 14-ə qədər olan sətirlərin Date, Region, Total Revenue sütunları → loc_hisse (loc ilə; 5 sətir).',
    'Sonuncu sətir → son_setir (iloc).',
    'İlk 3 sətir və ilk 3 sütun → kunc (iloc).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    iki_sutun = ...
    loc_hisse = ...
    son_setir = ...
    kunc = ...

    loc_hisse
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    iki_sutun = df[["Product Name", "Total Revenue"]]
    loc_hisse = df.loc[10:14, ["Date", "Region", "Total Revenue"]]
    son_setir = df.iloc[-1]
    kunc = df.iloc[:3, :3]

    loc_hisse
''', T + '''
    assert isinstance(iki_sutun, _pd.DataFrame) and list(iki_sutun.columns) == ["Product Name", "Total Revenue"] and len(iki_sutun) == len(_s), "iki_sutun = df[['Product Name', 'Total Revenue']]"
    assert isinstance(loc_hisse, _pd.DataFrame) and loc_hisse.equals(_s.loc[10:14, ["Date", "Region", "Total Revenue"]]), "loc_hisse = df.loc[10:14, ['Date', 'Region', 'Total Revenue']] — loc-da 14 daxildir (5 sətir)"
    assert isinstance(son_setir, _pd.Series) and son_setir.equals(_s.iloc[-1]), "son_setir = df.iloc[-1]"
    assert isinstance(kunc, _pd.DataFrame) and kunc.equals(_s.iloc[:3, :3]), "kunc = df.iloc[:3, :3]"
    assert ".loc[" in dacy.code and ".iloc[" in dacy.code, "loc və iloc-dan istifadə et"
''', [
    'İki sütun üçün iki cüt mötərizə: df[["Product Name", "Total Revenue"]]',
    'loc_hisse = df.loc[10:14, ["Date", "Region", "Total Revenue"]]',
    'son_setir = df.iloc[-1]; kunc = df.iloc[:3, :3]',
], dataset=S)

m.python('filtr', 'Şərtlə filtrləmə', 10, '''
    Gün 3 (13, 11), Gün 4 (10) və Gün 5 (7) tapşırıqları: şərtə uyğun sətirləri seç.
''', [
    'Product Category = "Electronics" olan məhsulların unikal adları → elektronika (sorted list).',
    'Units Sold 5-dən çox olan əməliyyatlar → cox_satis (DataFrame).',
    'Total Revenue sütununda 2000-dən böyük dəyər varmı? → var_mi (True/False).',
    'Total Revenue 500-dən çox olan unikal məhsulların adları → bahali_mehsullar (sorted list).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    elektronika = ...
    cox_satis = ...
    var_mi = ...
    bahali_mehsullar = ...

    print(elektronika)
    print(len(cox_satis), var_mi)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    elektronika = sorted(df[df["Product Category"] == "Electronics"]["Product Name"].unique())
    cox_satis = df[df["Units Sold"] > 5]
    var_mi = bool((df["Total Revenue"] > 2000).any())
    bahali_mehsullar = sorted(df[df["Total Revenue"] > 500]["Product Name"].unique())

    print(elektronika)
    print(len(cox_satis), var_mi)
''', T + '''
    _e = sorted(_s[_s["Product Category"] == "Electronics"]["Product Name"].unique())
    assert list(elektronika) == _e, f"elektronika {_e} olmalıdır, sənin nəticən: {elektronika!r}"
    _c = _s[_s["Units Sold"] > 5]
    assert isinstance(cox_satis, _pd.DataFrame) and cox_satis.equals(_c), f"cox_satis Units Sold > 5 olan {len(_c)} sətir olmalıdır"
    assert var_mi == bool((_s["Total Revenue"] > 2000).any()), "var_mi = (df['Total Revenue'] > 2000).any()"
    _b = sorted(_s[_s["Total Revenue"] > 500]["Product Name"].unique())
    assert list(bahali_mehsullar) == _b, f"bahali_mehsullar {len(_b)} məhsul olmalıdır: {_b}"
''', [
    'df[df["Product Category"] == "Electronics"]["Product Name"].unique() — sonra sorted()',
    'cox_satis = df[df["Units Sold"] > 5]',
    'var_mi = (df["Total Revenue"] > 2000).any() — bool() ilə adi True/False et.',
], dataset=S)

m.python('coxlu-sert', 'Bir neçə şərt: &, |, isin, between, query', 10, '''
    Mürəkkəb filtrlər: bir neçə şərti birləşdir.
''', [
    'Bakı regionunda, Credit Card ilə və gəliri 1000 ₼-dan çox olan əməliyyatlar → baki_kart.',
    'Gəncə və ya Şəki regionundakı əməliyyatlar → gence_seki (isin ilə).',
    'Units Sold 10-dan az olan əməliyyatlar → az_satis (query ilə).',
    'Unit Price 100 ilə 500 arasında (daxil) olan əməliyyatlar → orta_qiymet (between ilə).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    baki_kart = ...
    gence_seki = ...
    az_satis = ...
    orta_qiymet = ...

    print(len(baki_kart), len(gence_seki), len(az_satis), len(orta_qiymet))
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    baki_kart = df[(df["Region"] == "Bakı") & (df["Payment Method"] == "Credit Card") & (df["Total Revenue"] > 1000)]
    gence_seki = df[df["Region"].isin(["Gəncə", "Şəki"])]
    az_satis = df.query("`Units Sold` < 10")
    orta_qiymet = df[df["Unit Price"].between(100, 500)]

    print(len(baki_kart), len(gence_seki), len(az_satis), len(orta_qiymet))
''', T + '''
    _a = _s[(_s["Region"] == "Bakı") & (_s["Payment Method"] == "Credit Card") & (_s["Total Revenue"] > 1000)]
    assert isinstance(baki_kart, _pd.DataFrame) and baki_kart.equals(_a), f"baki_kart {len(_a)} sətir olmalıdır (üç şərt & ilə, hər biri mötərizədə)"
    _g = _s[_s["Region"].isin(["Gəncə", "Şəki"])]
    assert isinstance(gence_seki, _pd.DataFrame) and gence_seki.equals(_g), f"gence_seki {len(_g)} sətir olmalıdır"
    _z = _s[_s["Units Sold"] < 10]
    assert isinstance(az_satis, _pd.DataFrame) and az_satis.equals(_z), f"az_satis {len(_z)} sətir olmalıdır"
    _o = _s[_s["Unit Price"].between(100, 500)]
    assert isinstance(orta_qiymet, _pd.DataFrame) and orta_qiymet.equals(_o), f"orta_qiymet {len(_o)} sətir olmalıdır"
    for _w in (".isin(", ".query(", ".between("):
        assert _w in dacy.code, f"{_w[1:-1]}() metodundan istifadə et"
''', [
    'Hər şərt mötərizədə: (df["Region"] == "Bakı") & (df["Payment Method"] == "Credit Card") & (...)',
    'df[df["Region"].isin(["Gəncə", "Şəki"])]',
    'df.query("`Units Sold` < 10") — boşluqlu ad backtick arasında; df[df["Unit Price"].between(100, 500)]',
], dataset=S)

m.quiz('filtrleme-testi', 'Test: seçim və filtrləmə', [
    single(
        'Defolt indeksli df-də `df.loc[0:4]` neçə sətir qaytarır?',
        ['4', '5', '3', '0'],
        2,
        'loc etiketlə işləyir və kəsmənin sonu daxildir: 0, 1, 2, 3, 4.',
    ),
    single(
        'Hansı yazılış **düzgündür**?',
        [
            'df[df["Region"] == "Bakı" and df["Units Sold"] > 5]',
            'df[(df["Region"] == "Bakı") & (df["Units Sold"] > 5)]',
            'df[df["Region"] == "Bakı" & df["Units Sold"] > 5]',
            'df.filter(Region == "Bakı", Units Sold > 5)',
        ],
        2,
        'Pandas-da & istifadə olunur və hər şərt mötərizədə olmalıdır.',
    ),
    classify(
        'Hər tapşırıq üçün uyğun aləti seç.',
        [
            ('isin()', ['Region Gəncə, Şəki və ya Lənkəran olanlar']),
            ('between()', ['Qiyməti 100 ilə 500 ₼ arasında olanlar']),
            ('isnull()', ['Ödəniş üsulu yazılmamış əməliyyatlar']),
            ('~ (DEYİL)', ['Nağd ödənişdən başqa bütün əməliyyatlar']),
        ],
        'isin — siyahıdakı dəyərlərdən biri; between — aralıq; isnull — boş dəyərlər; ~ — şərtin əksi.',
    ),
])

# ───────────────────────────── 05 · Sıralama və dublikatlar ─────────────────────────────
m = c.module('siralama', 'Sıralama və təkrarların silinməsi',
             'sort_values (bir və bir neçə sütun), nlargest, idxmax, drop_duplicates və onun parametrləri.')

m.lesson('siralama-ders', 'Sıralama və dublikatlar', 8, '''
    ## sort_values

    ```python
    df.sort_values(by="Total Revenue", ascending=True)     # artan
    df.sort_values(by="Total Revenue", ascending=False)    # azalan

    # əvvəlcə Region (A→Z), sonra hər regionun içində Total Revenue (çoxdan aza)
    df.sort_values(by=["Region", "Total Revenue"], ascending=[True, False])
    ```

    Sıralama indeksi **dəyişmir** — sətirlər öz etiketləri ilə yerini dəyişir. Təzə 0, 1, 2… indeks lazımdırsa: `.reset_index(drop=True)`.

    ## Ən böyük / ən kiçik

    ```python
    df.nlargest(3, "Total Revenue")     # ən böyük 3 sətir
    df.nsmallest(5, "Unit Price")       # ən kiçik 5
    df.loc[df["Total Revenue"].idxmax()]   # ən böyük gəlirli sətrin özü
    ```

    ## Təkrarlar: duplicated və drop_duplicates

    ```python
    df.duplicated().sum()              # tam təkrarlanan sətirlərin sayı
    df.drop_duplicates()               # təkrarları silinmiş yeni DataFrame
    ```

    `drop_duplicates()` parametrləri:

    | Parametr | Defolt | Mənası |
    | --- | --- | --- |
    | `subset` | `None` (bütün sütunlar) | Hansı sütunlara görə təkrar sayılsın: `subset=["Transaction ID"]` |
    | `keep` | `"first"` | Hansı saxlansın: `"first"` — ilki, `"last"` — sonuncusu, `False` — heç biri |
    | `inplace` | `False` | `True` — orijinal DataFrame dəyişir, yeni yaradılmır |
    | `ignore_index` | `False` | `True` — yeni indeks 0-dan başlayır |

    ```python
    df.drop_duplicates(subset=["Product Name"])        # hər məhsuldan bir sətir
    df.drop_duplicates(subset=["Transaction ID"], keep="last")
    ```

    ## «Hər məhsuldan ən bahalısı» texnikası

    Sırala və sonra hər qrupun birincisini saxla:

    ```python
    (df.sort_values("Unit Price", ascending=False)
       .drop_duplicates("Product Name")
       .head(3))
    ```

    > 💡 Mötərizə içində metodları sətir-sətir yazmaq (method chaining) uzun əməliyyatları oxunaqlı edir.
''')

m.python('sort', 'Ən gəlirli əməliyyatlar', 10, '''
    Gün 3 (29) və Gün 4 (5, 6) tapşırıqları: sıralama və ən böyük dəyərlər.
''', [
    'Total Revenue-yə görə azalan sırala və ilk 3 əməliyyatın məhsul adlarını siyahı kimi götür → top3.',
    'Satışları tarixə görə artan sırala və ilk 5 əməliyyatı götür → ilk5.',
    'Total Revenue-yə görə ən bahalı əməliyyatın sətri → en_baha (Series, idxmax + loc).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    top3 = ...
    ilk5 = ...
    en_baha = ...

    print(top3)
    en_baha
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    top3 = df.sort_values("Total Revenue", ascending=False).head(3)["Product Name"].tolist()
    ilk5 = df.sort_values("Date").head(5)
    en_baha = df.loc[df["Total Revenue"].idxmax()]

    print(top3)
    en_baha
''', T + '''
    _t = _s.sort_values("Total Revenue", ascending=False).head(3)["Product Name"].tolist()
    assert top3 == _t, f"top3 {_t} olmalıdır, sənin nəticən: {top3!r}"
    _i5 = _s.sort_values("Date").head(5)
    assert isinstance(ilk5, _pd.DataFrame) and len(ilk5) == 5 and list(ilk5["Date"]) == list(_i5["Date"]), "ilk5 = df.sort_values('Date').head(5)"
    _eb = _s.loc[_s["Total Revenue"].idxmax()]
    assert isinstance(en_baha, _pd.Series) and en_baha.equals(_eb), "en_baha = df.loc[df['Total Revenue'].idxmax()]"
    assert "sort_values(" in dacy.code, "sort_values() istifadə et"
''', [
    'df.sort_values("Total Revenue", ascending=False).head(3)["Product Name"].tolist()',
    'Tarixlər YYYY-MM-DD formatında olduğu üçün mətn kimi də düzgün sıralanır: df.sort_values("Date").head(5)',
    'en_baha = df.loc[df["Total Revenue"].idxmax()]',
], dataset=S)

m.python('coxlu-siralama', 'Bir neçə sütuna görə sıralama', 10, '''
    Gün 4 (8): məhsulları qiymətə görə sırala və ən bahalı 3 məhsulu tap. Eyni məhsul çox satıldığı üçün əvvəlcə təkrarları atmaq lazımdır.
''', [
    'Əvvəlcə Region-a görə (A→Z), sonra hər regionun içində Total Revenue-yə görə (çoxdan aza) sırala → sirali.',
    'Unit Price-a görə azalan sırala, hər məhsuldan yalnız birinci sətri saxla və ilk 3 məhsulun adını götür → top3_qiymet.',
    'Ən aşağı Unit Price-a malik 5 sətir → en_ucuz5 (nsmallest).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    sirali = ...
    top3_qiymet = ...
    en_ucuz5 = ...

    print(top3_qiymet)
    sirali.head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    sirali = df.sort_values(["Region", "Total Revenue"], ascending=[True, False])
    top3_qiymet = (
        df.sort_values("Unit Price", ascending=False)
        .drop_duplicates("Product Name")
        .head(3)["Product Name"]
        .tolist()
    )
    en_ucuz5 = df.nsmallest(5, "Unit Price")

    print(top3_qiymet)
    sirali.head()
''', T + '''
    _sr = _s.sort_values(["Region", "Total Revenue"], ascending=[True, False])
    assert isinstance(sirali, _pd.DataFrame) and list(sirali.index) == list(_sr.index), "sirali = df.sort_values(['Region', 'Total Revenue'], ascending=[True, False])"
    _tq = _s.sort_values("Unit Price", ascending=False).drop_duplicates("Product Name").head(3)["Product Name"].tolist()
    assert top3_qiymet == _tq, f"top3_qiymet {_tq} olmalıdır, sənin nəticən: {top3_qiymet!r}"
    _u = _s.nsmallest(5, "Unit Price")
    assert isinstance(en_ucuz5, _pd.DataFrame) and list(en_ucuz5["Unit Price"]) == list(_u["Unit Price"]), "en_ucuz5 = df.nsmallest(5, 'Unit Price')"
''', [
    'ascending siyahı ola bilər: ascending=[True, False]',
    'Sırala → drop_duplicates("Product Name") → head(3) → ["Product Name"].tolist()',
    'en_ucuz5 = df.nsmallest(5, "Unit Price")',
], dataset=S)

m.python('dublikatlar', 'Təkrarlanan sətirlər', 10, '''
    Xam datada sistem xətası səbəbindən bəzi əməliyyatlar iki dəfə yazılıb (Gün 3: 24, 30).
''', [
    'satislar_xam.csv-də tam təkrarlanan sətirlərin sayı → dublikat_say.',
    'Təkrarları sil və indeksi yenidən 0-dan başlat → temiz (drop_duplicates + reset_index(drop=True)).',
    'Transaction ID-yə görə təkrarlanan ID-lərin sayı → id_tekrar.',
    'satislar.csv-də ən azı 2 dəfə satılan məhsulların sayı → tekrar_mehsul_sayi (value_counts ilə).',
], '''
    import pandas as pd

    xam = pd.read_csv("satislar_xam.csv")
    df = pd.read_csv("satislar.csv")

    dublikat_say = ...
    temiz = ...
    id_tekrar = ...
    tekrar_mehsul_sayi = ...

    print(dublikat_say, len(temiz), id_tekrar, tekrar_mehsul_sayi)
''', '''
    import pandas as pd

    xam = pd.read_csv("satislar_xam.csv")
    df = pd.read_csv("satislar.csv")

    dublikat_say = xam.duplicated().sum()
    temiz = xam.drop_duplicates().reset_index(drop=True)
    id_tekrar = xam["Transaction ID"].duplicated().sum()
    say = df["Product Name"].value_counts()
    tekrar_mehsul_sayi = (say >= 2).sum()

    print(dublikat_say, len(temiz), id_tekrar, tekrar_mehsul_sayi)
''', T + '''
    _x = _pd.read_csv("satislar_xam.csv")
''' + '''
    assert dublikat_say == _x.duplicated().sum(), f"dublikat_say {_x.duplicated().sum()} olmalıdır, sənin nəticən: {dublikat_say!r}"
    _t = _x.drop_duplicates().reset_index(drop=True)
    assert isinstance(temiz, _pd.DataFrame) and temiz.equals(_t), f"temiz {len(_t)} sətir olmalıdır və indeksi 0-dan başlamalıdır — reset_index(drop=True)"
    assert id_tekrar == _x["Transaction ID"].duplicated().sum(), f"id_tekrar {_x['Transaction ID'].duplicated().sum()} olmalıdır"
    _v = _s["Product Name"].value_counts()
    assert tekrar_mehsul_sayi == (_v >= 2).sum(), f"tekrar_mehsul_sayi {(_v >= 2).sum()} olmalıdır, sənin nəticən: {tekrar_mehsul_sayi!r}"
''', [
    'dublikat_say = xam.duplicated().sum()',
    'temiz = xam.drop_duplicates().reset_index(drop=True)',
    'id_tekrar = xam["Transaction ID"].duplicated().sum(); say = df["Product Name"].value_counts(); (say >= 2).sum()',
], dataset=[S, X])

m.quiz('siralama-testi', 'Test: sıralama və dublikatlar', [
    single(
        '`df.sort_values(["Region", "Total Revenue"], ascending=[True, False])` necə sıralayır?',
        [
            'Hər iki sütun üzrə azalan',
            'Region A→Z, hər regionun içində gəlir çoxdan aza',
            'Gəlir çoxdan aza, sonra Region A→Z',
            'Yalnız Region-a görə',
        ],
        2,
        'Siyahıdakı birinci sütun əsas, ikinci isə bərabər dəyərlər içində sıralamanı təyin edir.',
    ),
    single(
        '`drop_duplicates(subset=["Transaction ID"], keep=False)` nə edir?',
        [
            'Hər ID-dən ilk sətri saxlayır',
            'Hər ID-dən sonuncu sətri saxlayır',
            'Təkrarlanan ID-lərin bütün sətirlərini silir (heç birini saxlamır)',
            'Heç nəyi silmir',
        ],
        3,
        'keep=False — təkrarlanan qrupun heç bir sətri saxlanmır.',
    ),
    classify(
        'Hər əməliyyatın nəticəsi:',
        [
            ('Sətirlərin sırası dəyişir, sayı eyni qalır', ['sort_values()', 'sort_index()']),
            ('Sətirlərin sayı azala bilər', ['drop_duplicates()', 'nlargest(5, ...)', 'head(10)']),
        ],
        'Sıralama sətirləri yerdəyişir; drop_duplicates, nlargest və head isə sətirlərin bir hissəsini saxlayır.',
    ),
])


# ───────────────────────────── 06 · Sütunlar ─────────────────────────────
m = c.module('sutunlar', 'Sütun yaratmaq, adlandırmaq və silmək',
             'Yeni sütunlar, rename, columns.str.replace, drop/del, insert, assign və eval.')

m.lesson('sutunlar-ders', 'Sütunlarla iş', 9, '''
    ## Yeni sütun yaratmaq və dəyişmək

    `df["Sütun"] = dəyər/ifadə` — sütun yoxdursa yaradılır, varsa üzərinə yazılır:

    ```python
    df["Ümumi_Əməkhaqqı"] = df["Əməkhaqqı"] + df["Bonus"]
    df["Ümumi_Əməkhaqqı"] = df["Ümumi_Əməkhaqqı"] + 50      # mövcudu dəyiş
    df["Revenue Rounded"] = df["Total Revenue"].round()
    df["Name Length"] = df["Product Name"].str.len()
    ```

    Əməliyyat bütün sütuna birdən tətbiq olunur — dövr yazmağa ehtiyac yoxdur (buna **vektorlaşdırma** deyilir).

    ## Adlandırmaq

    ```python
    df.columns = ["a", "b", "c"]                                    # hamısını yenidən ver
    df = df.rename(columns={"Total Revenue": "Gelir"})              # seçilmişləri
    df.columns = df.columns.str.replace(" ", "_")                   # boşluq → alt xətt
    ```

    ## Silmək

    ```python
    df = df.drop("Filial", axis=1)               # və ya columns="Filial"
    df = df.drop(columns=["Filial", "Transaction ID"])
    del df["Filial"]                             # yerində silir
    ```

    > ⚠️ Əksər metodlar (`rename`, `drop`, `assign`) **yeni** DataFrame qaytarır — nəticəni dəyişənə yazmasan, dəyişiklik itir: `df = df.drop(...)`.

    ## insert — müəyyən yerə sütun

    ```python
    df.insert(1, "Il", df["Date"].str[:4])      # 1-ci mövqeyə (ikinci sütun)
    ```

    `insert` df-i **yerində** dəyişir və heç nə qaytarmır.

    ## assign — yeni DataFrame ilə

    ```python
    df_yeni = df.assign(EDV=df["Total Revenue"] * 0.18)
    ```

    Orijinal `df` dəyişmir — zəncirli yazılışda rahatdır.

    ## eval — sütun ifadəsi sətir kimi

    ```python
    df["Hesab"] = df.eval("`Units Sold` * `Unit Price`")
    ```

    Python-un `eval()` funksiyasından fərqli olaraq `df.eval()` yalnız sütunlarla hesablama aparır və təhlükəsizdir. Boşluqlu adlar `` ` `` arasında yazılır.
''')

m.python('adlandirma', 'Sütun adlarını düzəlt', 8, '''
    Gün 4 (15): sütun adlarındakı boşluqlar kodda narahatlıq yaradır. Adları səliqəyə sal.
''', [
    'df-in surətində (alt) bütün sütun adlarındakı boşluqları alt xətlə əvəz et: "Product Name" → "Product_Name".',
    '"Total Revenue" → "Gelir", "Units Sold" → "Say" adlandır → ad (rename ilə).',
    'Transaction ID və Filial sütunlarını sil → qisa (drop ilə).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    alt = df.copy()
    # alt.columns = ...

    ad = ...
    qisa = ...

    print(alt.columns.tolist())
    print(ad.columns.tolist())
    print(qisa.shape)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    alt = df.copy()
    alt.columns = alt.columns.str.replace(" ", "_")

    ad = df.rename(columns={"Total Revenue": "Gelir", "Units Sold": "Say"})
    qisa = df.drop(columns=["Transaction ID", "Filial"])

    print(alt.columns.tolist())
    print(ad.columns.tolist())
    print(qisa.shape)
''', T + '''
    assert alt.columns.tolist() == [c.replace(" ", "_") for c in _s.columns], f"alt-ın sütunları boşluqsuz olmalıdır, səndə: {alt.columns.tolist()}"
    _a = _s.rename(columns={"Total Revenue": "Gelir", "Units Sold": "Say"})
    assert isinstance(ad, _pd.DataFrame) and ad.columns.tolist() == _a.columns.tolist(), f"ad-ın sütunları: {_a.columns.tolist()}"
    assert isinstance(qisa, _pd.DataFrame) and qisa.columns.tolist() == [c for c in _s.columns if c not in ("Transaction ID", "Filial")], "qisa = df.drop(columns=['Transaction ID', 'Filial'])"
    assert df.columns.tolist() == _s.columns.tolist(), "Orijinal df dəyişməməlidir — rename/drop nəticəsini yeni dəyişənə yaz"
''', [
    'alt.columns = alt.columns.str.replace(" ", "_")',
    'df.rename(columns={"Total Revenue": "Gelir", "Units Sold": "Say"})',
    'df.drop(columns=["Transaction ID", "Filial"])',
], dataset=S)

m.python('yeni-sutunlar', 'Hesablanmış sütunlar', 10, '''
    Gün 3 tapşırıqları 3, 6, 7, 8: mövcud sütunlardan yeni sütunlar yarat.
''', [
    'Total Revenue-ni tam ədədə yuvarlaqlaşdıraraq "Revenue Rounded" sütunu yarat (round()).',
    'Hər məhsul adının uzunluğu — "Name Length" (str.len()).',
    'Məhsul adlarını böyük hərflərlə — "Product Upper" (str.upper()).',
    'Vahid qiymətin kvadratı — "Price Squared".',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    # df["Revenue Rounded"] = ...

    df[["Product Name", "Total Revenue"]].head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    df["Revenue Rounded"] = df["Total Revenue"].round()
    df["Name Length"] = df["Product Name"].str.len()
    df["Product Upper"] = df["Product Name"].str.upper()
    df["Price Squared"] = df["Unit Price"] ** 2

    df[["Product Name", "Name Length", "Product Upper", "Revenue Rounded", "Price Squared"]].head()
''', T + '''
    for _c in ("Revenue Rounded", "Name Length", "Product Upper", "Price Squared"):
        assert _c in df.columns, f"df-də '{_c}' sütunu yoxdur"
    assert df["Revenue Rounded"].equals(_s["Total Revenue"].round()), "Revenue Rounded = df['Total Revenue'].round()"
    assert df["Name Length"].equals(_s["Product Name"].str.len()), "Name Length = df['Product Name'].str.len()"
    assert df["Product Upper"].equals(_s["Product Name"].str.upper()), "Product Upper = df['Product Name'].str.upper()"
    assert (df["Price Squared"] - _s["Unit Price"] ** 2).abs().max() < 1e-6, "Price Squared = df['Unit Price'] ** 2"
''', [
    'df["Revenue Rounded"] = df["Total Revenue"].round()',
    'Mətn metodları .str ilə: df["Product Name"].str.len(), .str.upper()',
    'df["Price Squared"] = df["Unit Price"] ** 2',
], dataset=S)

m.python('eval-assign-insert', 'eval, assign və insert', 10, '''
    Gün 5 (8): Total Revenue sütununu `Units Sold × Unit Price` kimi `eval()` ilə yenidən hesabla və mövcud dəyərlərlə müqayisə et.
''', [
    'df.eval ilə "Hesab" sütunu yarat: `Units Sold` * `Unit Price`.',
    'Hesab (2 onluq) Total Revenue ilə hər sətirdə eynidirmi? → eynidir (True/False).',
    'assign ilə 18% ƏDV sütunu "EDV" olan yeni DataFrame → edvli (df dəyişməsin).',
    'insert ilə 1-ci mövqeyə ilin özünü ("2023"/"2024") "Il" sütunu kimi əlavə et (Date-in ilk 4 simvolu).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    df["Hesab"] = ...
    eynidir = ...
    edvli = ...
    # insert

    df.head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    df["Hesab"] = df.eval("`Units Sold` * `Unit Price`")
    eynidir = bool((df["Hesab"].round(2) == df["Total Revenue"].round(2)).all())
    edvli = df.assign(EDV=df["Total Revenue"] * 0.18)
    df.insert(1, "Il", df["Date"].str[:4])

    df.head()
''', T + '''
    assert "Hesab" in df.columns and (df["Hesab"] - _s["Units Sold"] * _s["Unit Price"]).abs().max() < 1e-6, "Hesab = df.eval('`Units Sold` * `Unit Price`')"
    _e = bool(((_s["Units Sold"] * _s["Unit Price"]).round(2) == _s["Total Revenue"].round(2)).all())
    assert eynidir == _e, f"eynidir {_e} olmalıdır"
    assert isinstance(edvli, _pd.DataFrame) and "EDV" in edvli.columns, "edvli = df.assign(EDV=df['Total Revenue'] * 0.18)"
    assert (edvli["EDV"] - _s["Total Revenue"] * 0.18).abs().max() < 1e-6, "EDV = Total Revenue × 0.18"
    assert "EDV" not in df.columns, "assign df-i dəyişməməlidir"
    assert df.columns[1] == "Il" and df["Il"].equals(_s["Date"].str[:4]), "df.insert(1, 'Il', df['Date'].str[:4])"
    assert ".eval(" in dacy.code and ".assign(" in dacy.code and ".insert(" in dacy.code, "eval, assign və insert istifadə et"
''', [
    'df.eval("`Units Sold` * `Unit Price`") — boşluqlu adlar backtick arasında.',
    'eynidir = bool((df["Hesab"].round(2) == df["Total Revenue"].round(2)).all())',
    'df.insert(1, "Il", df["Date"].str[:4]) — insert heç nə qaytarmır, df-i dəyişir.',
], dataset=S)

m.quiz('sutunlar-testi', 'Test: sütunlar', [
    classify(
        'Metod orijinal DataFrame-i dəyişir, yoxsa yenisini qaytarır? (defolt parametrlərlə)',
        [
            ('Yerində dəyişir', ['df.insert(1, "Il", ...)', 'del df["Filial"]', 'df["Yeni"] = ...']),
            ('Yeni DataFrame qaytarır', ['df.rename(columns=...)', 'df.drop(columns=...)', 'df.assign(EDV=...)']),
        ],
        'insert, del və sütuna mənimsətmə df-i yerində dəyişir. rename, drop, assign isə yeni DataFrame qaytarır — nəticəni dəyişənə yazmaq lazımdır.',
    ),
    single(
        '`df.drop("Filial", axis=1)` yazıb nəticəni heç yerə yazmadıq. Sonra `df.columns`-da Filial varmı?',
        ['Xeyr, silinib', 'Bəli, df dəyişməyib', 'Xəta verir', 'Yalnız indeks silinib'],
        2,
        'drop yeni DataFrame qaytarır; df = df.drop(...) yazmaq lazımdır.',
    ),
    single(
        '`df.eval("`Units Sold` * `Unit Price`")` Python-un `eval()`-indən nə ilə fərqlənir?',
        [
            'Heç nə ilə',
            'Yalnız DataFrame sütunları ilə hesablama aparır və ixtiyari kod icra etmir',
            'Yalnız mətn sütunları ilə işləyir',
            'Nəticəni fayla yazır',
        ],
        2,
        'df.eval sütun ifadələri üçündür; Python-un eval-i isə istənilən kodu icra edə bilər.',
    ),
])

# ───────────────────────────── 07 · apply və şərtlər ─────────────────────────────
m = c.module('apply', 'apply, lambda, map və şərtli sütunlar',
             'Sütuna funksiya tətbiq etmək, np.where və np.select ilə «IF», map və replace.')

m.lesson('apply-ders', '«IF» DataFrame-də: apply, np.where, map', 9, '''
    Excel-də `=IF(D2>1000; "Yüksək"; "Aşağı")` yazırıq. Pandas-da bunun bir neçə yolu var.

    ## np.where — iki variant

    ```python
    import numpy as np
    df["Revenue Class"] = np.where(df["Total Revenue"] > 1000, "High Revenue", "Low Revenue")
    ```

    `np.where(şərt, doğrudursa, yanlışdırsa)` — bütün sütun üzrə bir dəfəyə, sürətli.

    ## np.select — çox variant

    ```python
    sertler = [df["Total Revenue"] >= 2000, df["Total Revenue"] >= 500]
    deyerler = ["Yüksək", "Orta"]
    df["Kateqoriya"] = np.select(sertler, deyerler, default="Aşağı")
    ```

    Şərtlər sıra ilə yoxlanılır — birinci doğru olan qalib gəlir.

    ## apply + funksiya

    ```python
    def qiymetlendir(ball):
        if ball >= 90:
            return "Mükəmməl"
        elif ball >= 75:
            return "Yaxşı"
        elif ball >= 60:
            return "Kafi"
        return "Uğursuz"

    df["Qiymət"] = df["Ballar"].apply(qiymetlendir)
    df["Kateqoriya"] = df["Yaş"].apply(lambda x: "Yetkin" if x > 30 else "Gənc")
    ```

    `apply` funksiyanı hər dəyərə ayrıca tətbiq edir — istənilən məntiqi yazmaq olar.

    ## Sətir üzrə apply: axis=1

    ```python
    df["Yer"] = df.apply(lambda r: f"{r['Region']} - {r['Filial']}", axis=1)
    ```

    `axis=1` — funksiya bütöv **sətri** alır və onun bir neçə sütunundan istifadə edir.

    ## map — dəyərləri çevir

    ```python
    df["A"] = df["A"].map(lambda x: x + 2)
    az = {"Electronics": "Elektronika", "Clothing": "Geyim"}
    df["Kateqoriya AZ"] = df["Product Category"].map(az)   # lüğətdə olmayan → NaN
    ```

    ## replace — konkret dəyəri əvəz et

    ```python
    df["Payment Method"] = df["Payment Method"].replace("Credit Card", "Visa Card")
    ```

    | Alət | Nə vaxt |
    | --- | --- |
    | `np.where` | İki variantlı şərt — ən sürətli |
    | `np.select` | Bir neçə şərt |
    | `apply(funksiya)` | Mürəkkəb məntiq, öz funksiyan |
    | `apply(..., axis=1)` | Bir neçə sütundan istifadə |
    | `map(dict)` | Dəyərləri lüğətə görə çevirmək |
    | `replace` | Konkret dəyərləri əvəz etmək |

    > 💡 Böyük datada `np.where`/vektor əməliyyatları `apply`-dan dəfələrlə sürətlidir — çünki `apply` hər sətir üçün Python funksiyası çağırır.
''')

m.python('np-where', 'np.where ilə şərtli sütun', 10, '''
    Gün 3 (12) və Gün 5 (10): şərtə görə etiketlər.
''', [
    'Total Revenue 1000-dən böyükdürsə "High Revenue", əks halda "Low Revenue" — "Revenue Class" sütunu (np.where).',
    'df.eval ilə Units Sold < 5 şərtini hesabla və np.where ilə "Low Sales" / "High Sales" — "Sales Category" sütunu.',
    '"High Revenue" əməliyyatlarının sayı → high_say.',
], '''
    import pandas as pd
    import numpy as np

    df = pd.read_csv("satislar.csv")

    # df["Revenue Class"] = ...
    # df["Sales Category"] = ...
    high_say = ...

    print(high_say)
''', '''
    import pandas as pd
    import numpy as np

    df = pd.read_csv("satislar.csv")

    df["Revenue Class"] = np.where(df["Total Revenue"] > 1000, "High Revenue", "Low Revenue")
    df["Sales Category"] = np.where(df.eval("`Units Sold` < 5"), "Low Sales", "High Sales")
    high_say = (df["Revenue Class"] == "High Revenue").sum()

    print(high_say)
''', T + '''
    assert "Revenue Class" in df.columns and list(df["Revenue Class"]) == list(_np.where(_s["Total Revenue"] > 1000, "High Revenue", "Low Revenue")), "Revenue Class düzgün deyil"
    assert "Sales Category" in df.columns and list(df["Sales Category"]) == list(_np.where(_s["Units Sold"] < 5, "Low Sales", "High Sales")), "Sales Category düzgün deyil"
    assert high_say == (_s["Total Revenue"] > 1000).sum(), f"high_say {(_s['Total Revenue'] > 1000).sum()} olmalıdır"
    assert "np.where(" in dacy.code and ".eval(" in dacy.code, "np.where və df.eval istifadə et"
''', [
    'np.where(df["Total Revenue"] > 1000, "High Revenue", "Low Revenue")',
    'np.where(df.eval("`Units Sold` < 5"), "Low Sales", "High Sales")',
    'high_say = (df["Revenue Class"] == "High Revenue").sum()',
], dataset=S)

m.python('apply-funksiya', 'apply ilə öz funksiyan', 10, '''
    Gün 5 (1): Total Revenue-yə əsasən «Kateqoriya» sütunu. Sərhədlər: **2000 ₼ və yuxarı — Yüksək**, **500–2000 — Orta**, **500-dən az — Aşağı**.
''', [
    'kateqoriya(gelir) funksiyasını yaz və apply ilə "Kateqoriya" sütunu yarat.',
    'axis=1 ilə "Yer" sütunu: "Bakı - Nizami" formatında (Region - Filial).',
    'Hər kateqoriyanın sayı → say (value_counts).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")


    def kateqoriya(gelir):
        ...


    # df["Kateqoriya"] = ...
    # df["Yer"] = ...
    say = ...
    print(say)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")


    def kateqoriya(gelir):
        if gelir >= 2000:
            return "Yüksək"
        elif gelir >= 500:
            return "Orta"
        return "Aşağı"


    df["Kateqoriya"] = df["Total Revenue"].apply(kateqoriya)
    df["Yer"] = df.apply(lambda r: f"{r['Region']} - {r['Filial']}", axis=1)
    say = df["Kateqoriya"].value_counts()
    print(say)
''', T + '''
    _k = _np.select([_s["Total Revenue"] >= 2000, _s["Total Revenue"] >= 500], ["Yüksək", "Orta"], default="Aşağı")
    assert "Kateqoriya" in df.columns and list(df["Kateqoriya"]) == list(_k), "Kateqoriya düzgün deyil — sərhədləri yoxla (>= 2000, >= 500)"
    assert kateqoriya(2000) == "Yüksək" and kateqoriya(1999.99) == "Orta" and kateqoriya(499) == "Aşağı", "kateqoriya() funksiyası sərhədlərdə səhvdir"
    assert "Yer" in df.columns and list(df["Yer"]) == list(_s["Region"] + " - " + _s["Filial"]), "Yer 'Region - Filial' formatında olmalıdır"
    assert isinstance(say, _pd.Series) and say.to_dict() == _pd.Series(_k).value_counts().to_dict(), "say = df['Kateqoriya'].value_counts()"
    assert ".apply(" in dacy.code and "axis=1" in dacy.code, "apply və axis=1 istifadə et"
''', [
    'if gelir >= 2000: return "Yüksək" / elif gelir >= 500: return "Orta" / return "Aşağı"',
    'df["Kateqoriya"] = df["Total Revenue"].apply(kateqoriya)',
    'df.apply(lambda r: f"{r[\'Region\']} - {r[\'Filial\']}", axis=1)',
], dataset=S)

m.python('map-replace', 'map və replace', 8, '''
    Gün 5 (9) və Gün 3 (9): dəyərləri çevir və əvəz et.
''', [
    'Region sütununu map ilə böyük hərflərə çevir.',
    'Payment Method-da "Credit Card" dəyərlərini "Visa Card" ilə əvəz et (replace).',
    'az lüğəti ilə "Kateqoriya AZ" sütunu yarat (map).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    az = {"Electronics": "Elektronika", "Clothing": "Geyim", "Sports": "İdman",
          "Home Appliances": "Məişət texnikası", "Beauty": "Kosmetika"}

    # df["Region"] = ...
    # df["Payment Method"] = ...
    # df["Kateqoriya AZ"] = ...

    df[["Region", "Payment Method", "Kateqoriya AZ"]].head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    az = {"Electronics": "Elektronika", "Clothing": "Geyim", "Sports": "İdman",
          "Home Appliances": "Məişət texnikası", "Beauty": "Kosmetika"}

    df["Region"] = df["Region"].map(lambda x: x.upper())
    df["Payment Method"] = df["Payment Method"].replace("Credit Card", "Visa Card")
    df["Kateqoriya AZ"] = df["Product Category"].map(az)

    df[["Region", "Payment Method", "Kateqoriya AZ"]].head()
''', T + '''
    assert list(df["Region"]) == [r.upper() for r in _s["Region"]], "Region böyük hərflərlə olmalıdır"
    assert "Credit Card" not in set(df["Payment Method"]) and (df["Payment Method"] == "Visa Card").sum() == (_s["Payment Method"] == "Credit Card").sum(), "Credit Card → Visa Card əvəz olunmalıdır"
    assert "Kateqoriya AZ" in df.columns and df["Kateqoriya AZ"].notnull().all() and df.loc[0, "Kateqoriya AZ"] == az[_s.loc[0, "Product Category"]], "Kateqoriya AZ = df['Product Category'].map(az)"
    assert ".map(" in dacy.code and ".replace(" in dacy.code, "map və replace istifadə et"
''', [
    'df["Region"].map(lambda x: x.upper())',
    'df["Payment Method"].replace("Credit Card", "Visa Card")',
    'df["Product Category"].map(az)',
], dataset=S)

m.quiz('apply-testi', 'Test: apply və şərtlər', [
    classify(
        'Hər tapşırıq üçün ən uyğun aləti seç.',
        [
            ('np.where', ['Gəlir > 1000 → "High", əks halda "Low"']),
            ('np.select', ['Üç səviyyə: Yüksək / Orta / Aşağı (bir neçə şərt)']),
            ('map(lüğət)', ['İngiliscə kateqoriya adlarını Azərbaycancaya çevirmək']),
            ('apply(..., axis=1)', ['Region və Filial sütunlarını bir mətndə birləşdirmək']),
        ],
        'İki variant — np.where; çox şərt — np.select; lüğətlə çevirmə — map; bir neçə sütundan istifadə — apply(axis=1).',
    ),
    single(
        '`df["K"].map({"a": 1, "b": 2})` — sütunda "c" dəyəri varsa nəticə nə olur?',
        ['"c" olduğu kimi qalır', 'NaN olur', 'Xəta verir', '0 olur'],
        2,
        'map lüğətdə olmayan dəyərlər üçün NaN qaytarır. Dəyərləri saxlamaq üçün replace istifadə olunur.',
    ),
    single(
        '`apply` niyə böyük datada `np.where`-dən yavaşdır?',
        [
            'apply hər dəyər üçün ayrıca Python funksiyası çağırır',
            'apply datanı diskə yazır',
            'np.where daha az dəqiqdir',
            'Fərq yoxdur',
        ],
        1,
        'np.where bütün sütunu bir dəfəyə (vektor) emal edir.',
    ),
])

# ───────────────────────────── 08 · groupby ─────────────────────────────
m = c.module('groupby', 'Qruplaşdırma və aqreqasiya',
             'groupby ilə qrup üzrə cəm, orta, say; bir neçə açar, agg, hər qrupun lideri.')

m.lesson('groupby-ders', 'groupby: böl, hesabla, birləşdir', 9, '''
    «Hər region üzrə gəlir», «hər məhsulun orta satışı», «hər işçinin satış sayı» — bu suallar **qruplaşdırma** tələb edir. Excel-də pivot table, SQL-də `GROUP BY`, pandas-da `groupby`.

    ## Böl → hesabla → birləşdir

    ```python
    df.groupby("Region")["Total Revenue"].sum()
    ```

    1. **Böl:** sətirlər Region dəyərinə görə qruplara bölünür.
    2. **Hesabla:** hər qrupda Total Revenue cəmlənir.
    3. **Birləşdir:** nəticə — indeksi region olan Series.

    ## Aqreqasiya funksiyaları

    | Funksiya | Nə hesablayır |
    | --- | --- |
    | `sum()` | Cəm |
    | `mean()` | Orta |
    | `count()` | Boş olmayan dəyərlərin sayı |
    | `size()` | Qrupdakı sətirlərin sayı |
    | `min()`, `max()` | Ən kiçik, ən böyük |
    | `nunique()` | Unikal dəyərlərin sayı |
    | `agg([...])` | Bir neçə funksiya birdən |

    ```python
    df.groupby("Region")["Total Revenue"].agg(["sum", "mean", "count"])
    ```

    ## Bir neçə açar

    ```python
    df.groupby(["Region", "Payment Method"])["Total Revenue"].sum()
    ```

    Nəticənin indeksi iki səviyyəlidir (MultiIndex). Adi cədvəl lazımdırsa — `.reset_index()`.

    ## Adlandırılmış aqreqasiya

    ```python
    df.groupby("Product Name").agg(
        orta_say=("Units Sold", "mean"),
        orta_qiymet=("Unit Price", "mean"),
        emeliyyat=("Transaction ID", "count"),
    )
    ```

    Format: `yeni_ad=("sütun", "funksiya")` — nəticə sütunlarının adlarını özün seçirsən.

    ## Nəticə ilə işləmək

    ```python
    gelir = df.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
    gelir.idxmax()        # ən çox gəlir gətirən region
    gelir.head(3)         # ilk 3
    ```
''')

m.lesson('groupby-lider', 'Hər qrupun lideri və digər texnikalar', 7, '''
    ## «Hər regionda ən çox gəlir gətirən məhsul»

    Bu, iki addımlı sualdır: əvvəlcə region × məhsul üzrə cəm, sonra hər regionda maksimum.

    ```python
    pg = df.groupby(["Region", "Product Name"])["Total Revenue"].sum().reset_index()
    liderler = pg.loc[pg.groupby("Region")["Total Revenue"].idxmax()]
    ```

    `pg.groupby("Region")["Total Revenue"].idxmax()` hər regionun ən böyük sətrinin **indeksini** qaytarır, `loc` isə həmin sətirləri götürür.

    Alternativ — sırala və hər qrupun birincisini saxla:

    ```python
    pg.sort_values("Total Revenue", ascending=False).drop_duplicates("Region")
    ```

    ## Qrupda neçə fərqli dəyər?

    ```python
    df.groupby("Sales Employee")["Product Name"].nunique()   # hər işçi neçə fərqli məhsul satıb
    ```

    ## transform — qrup nəticəsini hər sətrə qaytar

    ```python
    df["Region Payı"] = df["Total Revenue"] / df.groupby("Region")["Total Revenue"].transform("sum")
    ```

    `transform` nəticəni qrupun hər sətrinə yayır — «əməliyyat regionun gəlirinin neçə faizidir?» kimi suallar üçün.

    ## Lüğət kimi nəticə

    ```python
    dict(zip(liderler["Region"], liderler["Product Name"]))
    # {"Bakı": "iPhone 15", "Gəncə": ...}
    ```
''')

m.python('groupby-esas', 'Region, kateqoriya və ödəniş üzrə', 10, '''
    Gün 4 (1–3) və Gün 3 (25, 27).
''', [
    'Hər region üzrə Total Revenue cəmi, çoxdan aza sıralı → region_gelir.',
    'Ən çox gəlir gətirən region → en_cox_region.',
    'Hər Product Category üzrə satılan ümumi Units Sold → kateqoriya_say.',
    'Hər Payment Method üzrə əməliyyat sayı → odenis_say (size()).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    region_gelir = ...
    en_cox_region = ...
    kateqoriya_say = ...
    odenis_say = ...

    print(en_cox_region)
    region_gelir
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    region_gelir = df.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
    en_cox_region = region_gelir.idxmax()
    kateqoriya_say = df.groupby("Product Category")["Units Sold"].sum()
    odenis_say = df.groupby("Payment Method").size()

    print(en_cox_region)
    region_gelir
''', T + '''
    _r = _s.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
    assert isinstance(region_gelir, _pd.Series) and list(region_gelir.index) == list(_r.index), f"region_gelir çoxdan aza sıralanmalıdır: {list(_r.index)}"
    assert (region_gelir - _r).abs().max() < 0.01, "region_gelir dəyərləri düzgün deyil"
    assert en_cox_region == _r.idxmax(), f"en_cox_region {_r.idxmax()!r} olmalıdır"
    assert kateqoriya_say.to_dict() == _s.groupby("Product Category")["Units Sold"].sum().to_dict(), "kateqoriya_say düzgün deyil"
    assert odenis_say.to_dict() == _s.groupby("Payment Method").size().to_dict(), "odenis_say düzgün deyil"
    assert "groupby(" in dacy.code, "groupby istifadə et"
''', [
    'df.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)',
    'en_cox_region = region_gelir.idxmax()',
    'df.groupby("Payment Method").size()',
], dataset=S)

m.python('groupby-coxlu', 'Bir neçə açar və agg', 10, '''
    Gün 4 (4) və Gün 3 (28): kombinasiyalar üzrə qruplaşdırma.
''', [
    'Filial və Sales Employee kombinasiyası üzrə ümumi gəlir → filial_isci.',
    'Region və Payment Method üzrə: Satis (Units Sold cəmi) və Gelir (Total Revenue cəmi) sütunları olan cədvəl → region_odenis (agg, adlandırılmış).',
    'region_odenis-dən Bakı + Credit Card sətrinin gəliri (2 onluq) → baki_kart_gelir.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    filial_isci = ...
    region_odenis = ...
    baki_kart_gelir = ...

    print(baki_kart_gelir)
    region_odenis.head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    filial_isci = df.groupby(["Filial", "Sales Employee"])["Total Revenue"].sum()
    region_odenis = df.groupby(["Region", "Payment Method"]).agg(
        Satis=("Units Sold", "sum"),
        Gelir=("Total Revenue", "sum"),
    )
    baki_kart_gelir = round(region_odenis.loc[("Bakı", "Credit Card"), "Gelir"], 2)

    print(baki_kart_gelir)
    region_odenis.head()
''', T + '''
    _f = _s.groupby(["Filial", "Sales Employee"])["Total Revenue"].sum()
    assert isinstance(filial_isci, _pd.Series) and (filial_isci - _f).abs().max() < 0.01 and len(filial_isci) == len(_f), "filial_isci = df.groupby(['Filial', 'Sales Employee'])['Total Revenue'].sum()"
    assert isinstance(region_odenis, _pd.DataFrame) and {"Satis", "Gelir"} <= set(region_odenis.columns), "region_odenis-də Satis və Gelir sütunları olmalıdır"
    _g = _s.groupby(["Region", "Payment Method"])["Total Revenue"].sum()
    assert (region_odenis["Gelir"] - _g).abs().max() < 0.01, "Gelir dəyərləri düzgün deyil"
    assert (region_odenis["Satis"] - _s.groupby(["Region", "Payment Method"])["Units Sold"].sum()).abs().max() == 0, "Satis dəyərləri düzgün deyil"
    assert baki_kart_gelir == round(_g.loc[("Bakı", "Credit Card")], 2), f"baki_kart_gelir {round(_g.loc[('Bakı', 'Credit Card')], 2)} olmalıdır"
''', [
    'df.groupby(["Filial", "Sales Employee"])["Total Revenue"].sum()',
    '.agg(Satis=("Units Sold", "sum"), Gelir=("Total Revenue", "sum"))',
    'MultiIndex-də sətir tuple ilə: region_odenis.loc[("Bakı", "Credit Card"), "Gelir"]',
], dataset=S)

m.python('groupby-mehsul', 'Məhsullar üzrə adlandırılmış aqreqasiya', 10, '''
    Gün 4 (7, 13, 14) və Gün 3 (26).
''', [
    'Hər Product Name üçün: orta_say (Units Sold ortası), orta_qiymet (Unit Price ortası), emeliyyat (say) — 2 onluq → mehsul.',
    'Hər Payment Method-un gətirdiyi orta gəlir, 2 onluq → odenis_orta.',
    'Ən çox ədəd satılan məhsul → en_cox_satilan və onun satılan ədədi → en_cox_say.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    mehsul = ...
    odenis_orta = ...
    en_cox_satilan = ...
    en_cox_say = ...

    print(en_cox_satilan, en_cox_say)
    mehsul.head()
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    mehsul = df.groupby("Product Name").agg(
        orta_say=("Units Sold", "mean"),
        orta_qiymet=("Unit Price", "mean"),
        emeliyyat=("Transaction ID", "count"),
    ).round(2)
    odenis_orta = df.groupby("Payment Method")["Total Revenue"].mean().round(2)
    say = df.groupby("Product Name")["Units Sold"].sum()
    en_cox_satilan = say.idxmax()
    en_cox_say = say.max()

    print(en_cox_satilan, en_cox_say)
    mehsul.head()
''', T + '''
    _m = _s.groupby("Product Name").agg(orta_say=("Units Sold", "mean"), orta_qiymet=("Unit Price", "mean"), emeliyyat=("Transaction ID", "count")).round(2)
    assert isinstance(mehsul, _pd.DataFrame) and {"orta_say", "orta_qiymet", "emeliyyat"} <= set(mehsul.columns), "mehsul-da orta_say, orta_qiymet, emeliyyat sütunları olmalıdır"
    assert (mehsul[["orta_say", "orta_qiymet"]].round(2) - _m[["orta_say", "orta_qiymet"]]).abs().max().max() < 0.011, "orta dəyərlər düzgün deyil"
    assert mehsul["emeliyyat"].to_dict() == _m["emeliyyat"].to_dict(), "emeliyyat sayı düzgün deyil"
    _o = _s.groupby("Payment Method")["Total Revenue"].mean().round(2)
    assert (odenis_orta - _o).abs().max() < 0.011, "odenis_orta düzgün deyil"
    _say = _s.groupby("Product Name")["Units Sold"].sum()
    assert en_cox_satilan == _say.idxmax() and en_cox_say == _say.max(), f"en çox satılan: {_say.idxmax()} ({_say.max()} ədəd)"
''', [
    '.agg(orta_say=("Units Sold", "mean"), orta_qiymet=("Unit Price", "mean"), emeliyyat=("Transaction ID", "count")).round(2)',
    'df.groupby("Payment Method")["Total Revenue"].mean().round(2)',
    'say = df.groupby("Product Name")["Units Sold"].sum(); say.idxmax(), say.max()',
], dataset=S)

m.python('groupby-lider-tapsiriq', 'Hər qrupun lideri', 12, '''
    Gün 3 (15), Gün 6 (1) və Gün 4 (11, 12): hər qrupda ən yaxşısı.
''', [
    'Hər regionda ən çox gəlir gətirən məhsul → region_lider (dict: {region: məhsul}).',
    'Hər filialda ən çox gəlir gətirən kateqoriya → filial_lider (dict).',
    'Hər satıcının satdığı fərqli məhsulların sayı → isci_cesid (nunique).',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    region_lider = ...
    filial_lider = ...
    isci_cesid = ...

    print(region_lider)
    print(filial_lider)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    pg = df.groupby(["Region", "Product Name"])["Total Revenue"].sum().reset_index()
    top = pg.loc[pg.groupby("Region")["Total Revenue"].idxmax()]
    region_lider = dict(zip(top["Region"], top["Product Name"]))

    fk = df.groupby(["Filial", "Product Category"])["Total Revenue"].sum().reset_index()
    top2 = fk.loc[fk.groupby("Filial")["Total Revenue"].idxmax()]
    filial_lider = dict(zip(top2["Filial"], top2["Product Category"]))

    isci_cesid = df.groupby("Sales Employee")["Product Name"].nunique()

    print(region_lider)
    print(filial_lider)
''', T + '''
    _pg = _s.groupby(["Region", "Product Name"])["Total Revenue"].sum().reset_index()
    _t = _pg.loc[_pg.groupby("Region")["Total Revenue"].idxmax()]
    _rl = dict(zip(_t["Region"], _t["Product Name"]))
    assert region_lider == _rl, f"region_lider {_rl} olmalıdır, sənin nəticən: {region_lider!r}"
    _fk = _s.groupby(["Filial", "Product Category"])["Total Revenue"].sum().reset_index()
    _t2 = _fk.loc[_fk.groupby("Filial")["Total Revenue"].idxmax()]
    _fl = dict(zip(_t2["Filial"], _t2["Product Category"]))
    assert filial_lider == _fl, f"filial_lider {_fl} olmalıdır"
    assert isci_cesid.to_dict() == _s.groupby("Sales Employee")["Product Name"].nunique().to_dict(), "isci_cesid = df.groupby('Sales Employee')['Product Name'].nunique()"
''', [
    'Əvvəl region × məhsul cəmi: df.groupby(["Region", "Product Name"])["Total Revenue"].sum().reset_index()',
    'Hər regionun maksimumu: pg.loc[pg.groupby("Region")["Total Revenue"].idxmax()]',
    'dict(zip(top["Region"], top["Product Name"]))',
], dataset=S)

m.quiz('groupby-testi', 'Test: qruplaşdırma', [
    single(
        '`df.groupby("Region")["Total Revenue"].sum()` nəyi qaytarır?',
        ['Bir ədəd — ümumi gəlir', 'İndeksi region olan Series — hər regionun gəliri', 'Yalnız Bakının gəliri', 'Sıralanmış DataFrame'],
        2,
        'Hər qrup üçün bir dəyər — indeksi qrup açarları olan Series.',
    ),
    classify(
        'count() və size() fərqi:',
        [
            ('count()', ['Boş (NaN) dəyərləri saymır', 'Hər sütun üçün ayrıca say verir']),
            ('size()', ['Qrupdakı bütün sətirləri sayır (boşlar daxil)', 'Hər qrup üçün bir ədəd qaytarır']),
        ],
        'count yalnız boş olmayan dəyərləri sayır; size qrupun sətir sayını verir.',
    ),
    single(
        'Adlandırılmış aqreqasiyada `orta=("Units Sold", "mean")` nə deməkdir?',
        [
            '"orta" sütununu silmək',
            'Units Sold-un ortasını "orta" adlı sütunda hesablamaq',
            'Units Sold-u "mean" adlandırmaq',
            'Qrupları ortaya görə sıralamaq',
        ],
        2,
        'yeni_ad=("sütun", "funksiya") formatıdır.',
    ),
    single(
        '«Hər regionda ən çox satılan məhsul» üçün hansı yanaşma düzgündür?',
        [
            'df.groupby("Region")["Product Name"].max()',
            'Əvvəl region × məhsul üzrə cəm, sonra hər regionda idxmax',
            'df["Product Name"].value_counts().head(1)',
            'df.sort_values("Region").head()',
        ],
        2,
        'max() mətndə əlifba sırası ilə sonuncunu verir. Düzgün yol — əvvəl cəmləmək, sonra hər qrupda maksimumu tapmaq.',
    ),
])

# ───────────────────────────── 09 · cut və qcut ─────────────────────────────
m = c.module('cut-qcut', 'Kateqoriyalara ayırma: cut və qcut',
             'Rəqəmsal sütunu aralıqlara (bin) bölmək: sabit sərhədlər (cut) və bərabər paylar (qcut).')

m.lesson('cut-qcut-ders', 'Bin və label: cut və qcut', 7, '''
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
''')

m.python('cut-tapsiriq', 'Qiymət səviyyələri (cut)', 8, '''
    Məhsulları qiymət səviyyələrinə böl: **0–100 Ucuz, 100–500 Orta, 500–1500 Baha, 1500+ Premium** (sağ sərhəd daxil — defolt).
''', [
    'pd.cut ilə "Qiymət qrupu" sütunu: bins=[0, 100, 500, 1500, float("inf")], labels=["Ucuz", "Orta", "Baha", "Premium"].',
    'Hər qrupda neçə əməliyyat var → qrup_say (value_counts).',
    'Premium qrupun ümumi gəliri, 2 onluq → premium_gelir.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    # df["Qiymət qrupu"] = ...
    qrup_say = ...
    premium_gelir = ...

    print(qrup_say)
    print(premium_gelir)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    df["Qiymət qrupu"] = pd.cut(df["Unit Price"], bins=[0, 100, 500, 1500, float("inf")],
                                labels=["Ucuz", "Orta", "Baha", "Premium"])
    qrup_say = df["Qiymət qrupu"].value_counts()
    premium_gelir = round(df[df["Qiymət qrupu"] == "Premium"]["Total Revenue"].sum(), 2)

    print(qrup_say)
    print(premium_gelir)
''', T + '''
    _q = _pd.cut(_s["Unit Price"], bins=[0, 100, 500, 1500, float("inf")], labels=["Ucuz", "Orta", "Baha", "Premium"])
    assert "Qiymət qrupu" in df.columns and list(df["Qiymət qrupu"].astype(str)) == list(_q.astype(str)), "Qiymət qrupu düzgün deyil — bins və labels-i yoxla"
    assert {str(k): v for k, v in qrup_say.to_dict().items()} == {str(k): v for k, v in _q.value_counts().to_dict().items()}, "qrup_say = df['Qiymət qrupu'].value_counts()"
    assert premium_gelir == round(_s[_q == "Premium"]["Total Revenue"].sum(), 2), "premium_gelir düzgün deyil"
    assert "pd.cut(" in dacy.code, "pd.cut istifadə et"
''', [
    'pd.cut(df["Unit Price"], bins=[0, 100, 500, 1500, float("inf")], labels=["Ucuz", "Orta", "Baha", "Premium"])',
    'qrup_say = df["Qiymət qrupu"].value_counts()',
    'df[df["Qiymət qrupu"] == "Premium"]["Total Revenue"].sum()',
], dataset=S)

m.python('qcut-tapsiriq', 'Gəliri 4 bərabər hissəyə böl (qcut)', 8, '''
    Gün 5 (2): Total Revenue-ni 4 bərabər hissəyə ayır və «Q_Bin» sütunu yarat.
''', [
    'pd.qcut ilə "Q_Bin": q=4, labels=["Aşağı", "Orta", "Yaxşı", "Mükəmməl"].',
    'Hər Q_Bin üzrə orta gəlir, 2 onluq → orta_bin (groupby, observed=True).',
    'Mükəmməl qrupun alt sərhədi (gəlirin 75% kvantili), 2 onluq → sərhəd75 → serhed75.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    # df["Q_Bin"] = ...
    orta_bin = ...
    serhed75 = ...

    print(orta_bin)
    print(serhed75)
''', '''
    import pandas as pd

    df = pd.read_csv("satislar.csv")

    df["Q_Bin"] = pd.qcut(df["Total Revenue"], q=4, labels=["Aşağı", "Orta", "Yaxşı", "Mükəmməl"])
    orta_bin = df.groupby("Q_Bin", observed=True)["Total Revenue"].mean().round(2)
    serhed75 = round(df["Total Revenue"].quantile(0.75), 2)

    print(orta_bin)
    print(serhed75)
''', T + '''
    _q = _pd.qcut(_s["Total Revenue"], q=4, labels=["Aşağı", "Orta", "Yaxşı", "Mükəmməl"])
    assert "Q_Bin" in df.columns and list(df["Q_Bin"].astype(str)) == list(_q.astype(str)), "Q_Bin düzgün deyil"
    _o = _s.groupby(_q, observed=True)["Total Revenue"].mean().round(2)
    assert {str(k): v for k, v in orta_bin.to_dict().items()} == {str(k): v for k, v in _o.to_dict().items()}, "orta_bin düzgün deyil"
    assert serhed75 == round(_s["Total Revenue"].quantile(0.75), 2), "serhed75 = round(df['Total Revenue'].quantile(0.75), 2)"
    assert "pd.qcut(" in dacy.code, "pd.qcut istifadə et"
''', [
    'pd.qcut(df["Total Revenue"], q=4, labels=["Aşağı", "Orta", "Yaxşı", "Mükəmməl"])',
    'df.groupby("Q_Bin", observed=True)["Total Revenue"].mean().round(2)',
    'df["Total Revenue"].quantile(0.75)',
], dataset=S)

m.quiz('cut-qcut-testi', 'Test: cut və qcut', [
    classify(
        'Hər tapşırıq üçün cut, yoxsa qcut?',
        [
            ('pd.cut', ['Yaşı 0–18, 18–35, 35+ qruplarına bölmək', 'Qiyməti 0–100, 100–500, 500+ ₼ səviyyələrinə bölmək']),
            ('pd.qcut', ['Müştəriləri xərcə görə 4 bərabər qrupa bölmək', '«Ən yaxşı 10%» satıcıları seçmək']),
        ],
        'Sərhədlər məlumdursa — cut; bərabər sayda qruplar lazımdırsa — qcut.',
    ),
    single(
        '`pd.cut(x, bins=[0, 18, 35], right=False)` 18 yaşı hansı qrupa salır?',
        ['[0, 18)', '[18, 35)', 'Heç birinə', 'Hər ikisinə'],
        2,
        'right=False — sol sərhəd daxildir, sağ yox: 18 ikinci aralığa düşür.',
    ),
])

# ───────────────────────────── 10 · Boş dəyərlər və tiplər ─────────────────────────────
m = c.module('itkin', 'Boş dəyərlər və məlumat tipləri',
             'fillna, dropna, ffill/bfill, astype, to_numeric və xam datanın təmizlənməsi.')

m.lesson('itkin-ders', 'Boş dəyərləri doldurmaq və tipləri düzəltmək', 9, '''
    ## Boş dəyərləri tapmaq

    ```python
    df.isnull().sum()               # sütunlar üzrə
    df[df["Şəhər"].isnull()]        # boş olan sətirlər
    ```

    ## fillna — doldurmaq

    ```python
    df["Ad"] = df["Ad"].fillna("Bilinmir")              # sabit dəyər
    df["Bonus"] = df["Bonus"].fillna(0)
    df["Yaş"] = df["Yaş"].fillna(df["Yaş"].mean())       # orta ilə
    df["Yaş"] = df["Yaş"].fillna(df["Yaş"].median())     # median ilə (kənar dəyərlərə dayanıqlı)
    df["Şəhər"] = df["Şəhər"].ffill()                    # əvvəlki dəyərlə (forward fill)
    df["Şəhər"] = df["Şəhər"].bfill()                    # sonrakı dəyərlə (backward fill)
    df["Şəhər"] = df["Şəhər"].fillna(df["Ad"])           # başqa sütunla
    ```

    > 📝 Köhnə yazılış `fillna(method="ffill")` artıq tövsiyə olunmur — `ffill()` / `bfill()` istifadə et.

    ## dropna — silmək

    ```python
    df.dropna()                          # ən azı bir boşluğu olan sətirləri sil
    df.dropna(subset=["Payment Method"]) # yalnız bu sütun boşdursa
    df.dropna(how="all")                 # bütün dəyərləri boş olan sətirləri
    ```

    **Nə vaxt doldurmalı, nə vaxt silməli?** Boşluq azdırsa və təsadüfidirsə — silmək olar. Çoxdursa və ya məlumat vacibdirsə — məntiqli dəyərlə doldur və bunu qeyd et.

    ## Tiplər: dtypes, astype, to_numeric

    ```python
    df["Age"] = df["Age"].astype(int)
    df["Mebleg"] = pd.to_numeric(df["Mebleg"], errors="coerce")   # çevrilməyən → NaN
    df["Date"] = pd.to_datetime(df["Date"])
    ```

    ## Mətnin təmizlənməsi

    ```python
    df["Region"] = df["Region"].str.strip()          # kənar boşluqlar
    df["Region"] = df["Region"].str.lower().map(lugat)   # vahid yazılış
    ```

    ⚠️ **İ/ı problemi:** Python-da `"BAKI".lower()` → `"baki"` (nöqtəli i), `"Sumqayıt".title()` isə qaydasında görünsə də `"SUMQAYIT".title()` → `"Sumqayit"` olur. Azərbaycan dilindəki ı/İ hərfləri ingilis qaydaları ilə çevrilir. Buna görə səliqəsiz yazılışları **lüğətlə** düzgün forma uyğunlaşdırmaq daha etibarlıdır.

    ## 0 — həmişə «sıfır» deyil

    Sistem xətası səbəbindən gəlir 0 yazıla bilər. Belə dəyərləri tapıb düzgün hesabla əvəz etmək lazımdır:

    ```python
    sehv = df["Total Revenue"] == 0
    df.loc[sehv, "Total Revenue"] = df.loc[sehv, "Units Sold"] * df.loc[sehv, "Unit Price"]
    ```
''')

m.python('fillna-tapsiriq', 'İşçilər cədvəlində boşluqlar', 10, '''
    `isciler.csv` — kiçik HR cədvəli: bəzi bonuslar, yaşlar və şəhərlər yazılmayıb.
''', [
    'Bonus boşluqlarını 0 ilə doldur.',
    'Yaş boşluqlarını yaşların ortası ilə (tam ədədə yuvarlaqlaşdırılmış) doldur.',
    'Şəhər boşluqlarını "Bilinmir" ilə doldur.',
    '"Ümumi" sütunu = Əməkhaqqı + Bonus; cədvəldə qalan boşluqların sayı → qalan (0 olmalıdır).',
], '''
    import pandas as pd

    df = pd.read_csv("isciler.csv")
    print(df.isnull().sum())

    # doldur

    qalan = ...
    df
''', '''
    import pandas as pd

    df = pd.read_csv("isciler.csv")
    print(df.isnull().sum())

    df["Bonus"] = df["Bonus"].fillna(0)
    df["Yaş"] = df["Yaş"].fillna(round(df["Yaş"].mean()))
    df["Şəhər"] = df["Şəhər"].fillna("Bilinmir")
    df["Ümumi"] = df["Əməkhaqqı"] + df["Bonus"]

    qalan = int(df.isnull().sum().sum())
    df
''', '''
    import pandas as _pd
    _i = _pd.read_csv("isciler.csv")
    assert df["Bonus"].isnull().sum() == 0 and (df["Bonus"] == _i["Bonus"].fillna(0)).all(), "Bonus boşluqları 0 ilə doldurulmalıdır"
    _y = round(_i["Yaş"].mean())
    assert (df["Yaş"] == _i["Yaş"].fillna(_y)).all(), f"Yaş boşluqları {_y} (orta, yuvarlaqlaşdırılmış) ilə doldurulmalıdır"
    assert (df["Şəhər"] == _i["Şəhər"].fillna("Bilinmir")).all(), "Şəhər boşluqları 'Bilinmir' olmalıdır"
    assert "Ümumi" in df.columns and (df["Ümumi"] == _i["Əməkhaqqı"] + _i["Bonus"].fillna(0)).all(), "Ümumi = Əməkhaqqı + Bonus (doldurulmuş)"
    assert qalan == 0, f"qalan 0 olmalıdır, sənin nəticən: {qalan!r}"
''', [
    'df["Bonus"] = df["Bonus"].fillna(0)',
    'df["Yaş"].fillna(round(df["Yaş"].mean()))',
    'qalan = int(df.isnull().sum().sum()) — iki dəfə sum: sütunlar, sonra cəmi.',
], dataset='datasets/isciler.csv')

m.python('xam-temizle', 'Xam satış datasını təmizlə', 15, '''
    Gün 6 (4) və EDA fəslində tapılan problemlər: `satislar_xam.csv`-ni analiz üçün hazırla. Addımları ardıcıl et.

    Region yazılışları səliqəsizdir (`bakı`, `BAKI`, ` Bakı `). İ/ı problemi səbəbindən `title()` etibarlı deyil — starter-dəki **lüğətdən** istifadə et.
''', [
    'Tam dublikatları sil.',
    'Region: kənar boşluqları sil, kiçik hərfə çevir və duzgun lüğəti ilə map et; Product Name-dən kənar boşluqları sil.',
    'Payment Method boşluqlarını "Unknown" ilə doldur.',
    'Unit Price boşluqlarını Total Revenue / Units Sold (2 onluq) ilə doldur.',
    'Total Revenue 0 olan sətirlərin sayını sifir_say-a yaz, sonra onları Units Sold × Unit Price (2 onluq) ilə əvəz et. İndeksi sıfırla → temiz.',
], '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")
    duzgun = {"bakı": "Bakı", "baki": "Bakı", "gəncə": "Gəncə", "sumqayıt": "Sumqayıt",
              "sumqayit": "Sumqayıt", "lənkəran": "Lənkəran", "şəki": "Şəki"}

    sifir_say = ...
    temiz = ...

    print(sifir_say, len(temiz))
''', '''
    import pandas as pd

    df = pd.read_csv("satislar_xam.csv")
    duzgun = {"bakı": "Bakı", "baki": "Bakı", "gəncə": "Gəncə", "sumqayıt": "Sumqayıt",
              "sumqayit": "Sumqayıt", "lənkəran": "Lənkəran", "şəki": "Şəki"}

    df = df.drop_duplicates()
    df["Region"] = df["Region"].str.strip().str.lower().map(duzgun)
    df["Product Name"] = df["Product Name"].str.strip()
    df["Payment Method"] = df["Payment Method"].fillna("Unknown")
    df["Unit Price"] = df["Unit Price"].fillna((df["Total Revenue"] / df["Units Sold"]).round(2))
    sifir = df["Total Revenue"] == 0
    sifir_say = int(sifir.sum())
    df.loc[sifir, "Total Revenue"] = (df.loc[sifir, "Units Sold"] * df.loc[sifir, "Unit Price"]).round(2)
    temiz = df.reset_index(drop=True)

    print(sifir_say, len(temiz))
''', TX + '''
    _d = _x.drop_duplicates()
    assert isinstance(temiz, _pd.DataFrame) and len(temiz) == len(_d), f"temiz {len(_d)} sətir olmalıdır (dublikatlar silinməlidir)"
    assert list(temiz.index) == list(range(len(temiz))), "İndeksi sıfırla: reset_index(drop=True)"
    assert set(temiz["Region"]) == {"Bakı", "Gəncə", "Sumqayıt", "Lənkəran", "Şəki"}, f"Region-da yalnız 5 düzgün ad olmalıdır, səndə: {sorted(map(str, set(temiz['Region'])))}"
    assert not temiz["Product Name"].str.startswith(" ").any(), "Product Name-dən boşluqları sil (str.strip())"
    assert temiz["Payment Method"].isnull().sum() == 0 and (temiz["Payment Method"] == "Unknown").sum() == _d["Payment Method"].isnull().sum(), "Payment Method boşluqları 'Unknown' olmalıdır"
    assert temiz["Unit Price"].isnull().sum() == 0, "Unit Price-da boşluq qalmamalıdır"
    assert sifir_say == int((_d["Total Revenue"] == 0).sum()), f"sifir_say {int((_d['Total Revenue'] == 0).sum())} olmalıdır"
    assert (temiz["Total Revenue"] == 0).sum() == 0, "0 gəlirlər yenidən hesablanmalıdır"
    _bad = (temiz["Total Revenue"] - (temiz["Units Sold"] * temiz["Unit Price"]).round(2)).abs() > 0.05
    assert _bad.sum() == 0, "Total Revenue = Units Sold × Unit Price olmalıdır (düzəldilən sətirlərdə)"
''', [
    'df = df.drop_duplicates(); df["Region"] = df["Region"].str.strip().str.lower().map(duzgun)',
    'df["Unit Price"] = df["Unit Price"].fillna((df["Total Revenue"] / df["Units Sold"]).round(2))',
    'sifir = df["Total Revenue"] == 0; df.loc[sifir, "Total Revenue"] = (df.loc[sifir, "Units Sold"] * df.loc[sifir, "Unit Price"]).round(2)',
], dataset=X)

m.quiz('itkin-testi', 'Test: boş dəyərlər və tiplər', [
    classify(
        'Hər yanaşmanı nəticəsinə görə qruplaşdır.',
        [
            ('Sətirlər silinir', ['df.dropna()', 'df.dropna(subset=["Payment Method"])']),
            ('Boşluqlar doldurulur', ['df["Bonus"].fillna(0)', 'df["Şəhər"].ffill()', 'df["Yaş"].fillna(df["Yaş"].median())']),
        ],
        'dropna sətirləri atır, fillna/ffill/bfill isə boşluqları dəyərlə doldurur.',
    ),
    single(
        '`pd.to_numeric(s, errors="coerce")` çevrilə bilməyən dəyərlərlə nə edir?',
        ['Xəta verir', 'NaN edir', '0 edir', 'Olduğu kimi saxlayır'],
        2,
        'coerce — çevrilməyən dəyərlər NaN olur, sonra onları ayrıca araşdırmaq olar.',
    ),
    single(
        'Niyə `"SUMQAYIT".title()` nəticəsi "Sumqayıt" deyil?',
        [
            'title() yalnız ilk hərfi dəyişir',
            'Python I hərfini ingilis qaydası ilə kiçik i-yə çevirir, ı-ya yox',
            'title() Azərbaycan hərflərini silir',
            'Nəticə "Sumqayıt"-dır',
        ],
        2,
        'Python-un hərf çevirməsi dildən asılı deyil: I → i. Buna görə lüğətlə uyğunlaşdırmaq daha etibarlıdır.',
    ),
])

print(c.root, c.modules, 'modules', c.steps, 'steps (part 2)')
