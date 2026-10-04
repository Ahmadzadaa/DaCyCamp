"""Python Capstone — Python4Business Gün 9 (Qiymətləndirilən): sifarisler.csv üzərində tam satış təhlili layihəsi."""
import os
import shutil

from common import Course, classify, multiple, single

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'datasets')

c = Course(
    'python-capstone',
    {
        '_comment': (
            'Python Capstone — Python4Business Gün 9 qiymətləndirilən tapşırıqları (15 sual) layihə formatında.\n'
            'Bütün tapşırıqlar eyni dataset (sifarisler.csv) üzərindədir; ardıcıl açılır.'
        ),
        'track': 'data-analytics',
        'title': 'Python Capstone: Sales Analytics Project',
        'level': 'intermediate',
        'description': (
            'Öyrəndiklərini real layihədə birləşdir: 5 ölkədə fəaliyyət göstərən onlayn mağazanın 2 illik sifarişləri '
            'üzərində tam təhlil — data yoxlaması, çatdırılma müddəti, mənfəət və korrelyasiya, ölkə/şəhər/seqment '
            'müqayisəsi, məhsul təhlili, top müştərilər, RFM seqmentasiyası və yekun dashboard. Python4Business '
            'Gün 9 qiymətləndirilən tapşırıqlarının hamısı burada addım-addım həll olunur.'
        ),
        'sequential': True,
        'estimated_hours': 7,
        'published': True,
        'topics': ['python'],
    },
)
os.makedirs(os.path.join(c.root, 'datasets'))
shutil.copy(os.path.join(DATA, 'sifarisler.csv'), os.path.join(c.root, 'datasets', 'sifarisler.csv'))
O = 'datasets/sifarisler.csv'

P = '''
    import pandas as _pd
    import numpy as _np
    _o = _pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])
'''
FIND = P + '''
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
# RFM — testlərdə və həllərdə eyni qayda
RFM_REF = '''
    _ref = _o["OrderDate"].max() + _pd.Timedelta(days=1)
    _r = _o.groupby("CustomerID").agg(
        Recency=("OrderDate", lambda s: (_ref - s.max()).days),
        Frequency=("OrderID", "nunique"),
        Monetary=("Sales", "sum"),
    )
    _r["R"] = _pd.qcut(_r["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)
    _r["F"] = _pd.qcut(_r["Frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    _r["M"] = _pd.qcut(_r["Monetary"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    def _seg(row):
        if row["R"] >= 3 and row["F"] >= 3:
            return "Çempion"
        if row["F"] >= 3:
            return "Risk altında"
        if row["R"] >= 3:
            return "Perspektivli"
        return "Yuxuda"
    _r["Seqment"] = _r.apply(_seg, axis=1)
'''

DICT = '''
    > 📁 **`sifarisler.csv`** — 1582 sətir, hər sətir bir sifarişin **bir məhsul sətridir** (bir `OrderID`-də bir neçə məhsul ola bilər).

    | Sütun | Məna | Nümunə |
    |---|---|---|
    | `OrderID` | Sifariş nömrəsi | ORD-50001 |
    | `OrderDate`, `ShipDate` | Sifariş və göndərmə tarixi | 2023-01-02 |
    | `ShipMode` | Çatdırılma növü | Standard Class, Second Class, First Class, Same Day |
    | `CustomerID`, `CustomerName` | Müştəri kodu və adı | C-1050, Nurlan Əliyev |
    | `CustomerSegment` | Müştəri tipi | Consumer, Corporate, Small Business |
    | `Country`, `City` | Ölkə və şəhər | Azerbaijan, Baku |
    | `ProductID`, `ProductName`, `Category` | Məhsul | TEC-1004, Lenovo ThinkPad E14, Technology |
    | `Sales`, `Quantity`, `Discount`, `Profit` | Satış (məbləğ), say, endirim, mənfəət | 2265.0, 2, 0, 270.28 |
'''

# ───────────────────────────── 01 · Layihəyə giriş ─────────────────────────────
m = c.module('giris', 'Layihəyə giriş: biznes sualları və data',
             'Müştəri tapşırığı, dataset lüğəti, analitik iş axını və suallara uyğun alətlər.')

m.lesson('layihe-brifi', 'Layihə brifi: «DaCy Store» satış təhlili', 10, '''
    Sən «DaCy Store» onlayn mağazasının data analitikisən. Mağaza 2023–2024-cü illərdə **Azərbaycan, Türkiyə, Gürcüstan, Qazaxıstan və Özbəkistanda** ofis ləvazimatı, mebel və texnologiya satıb. Rəhbərlik növbəti ilin büdcəsini planlaşdırır və səndən **15 suala** cavab gözləyir — bunlar Python4Business kursunun Gün 9 qiymətləndirilən tapşırıqlarıdır.

    ## Rəhbərliyin sualları (5 blok)

    | Blok | Suallar |
    |---|---|
    | 🚚 **Əməliyyat** | Sifarişdən göndərməyə neçə gün keçir? Hansı `ShipMode` nə qədər satış gətirir? Orta say və satış? |
    | 💰 **Mənfəət** | `Sales` və `Profit` arasında əlaqə varmı? Kateqoriyaların orta satış və mənfəəti? |
    | 🌍 **Coğrafiya** | Ən mənfəətli 2 ölkə? Ən mənfəətli şəhərlər? Seqmentlər üzrə satış? |
    | 📦 **Məhsul** | Hansı məhsul daha çox gəlir gətirir? Hər kateqoriyanın lider məhsulu? Vizual müqayisə. |
    | 👥 **Müştəri** | Ən dəyərli müştəri kimdir? Müştəriləri seqmentlərə ayır. Top müştərilər haradandır və nə alırlar? |

    ## Kursun quruluşu

    Hər fəsil bir bloka cavab verir. Tapşırıqlar **eyni dataset** üzərindədir və ardıcıl açılır — əvvəlki addımda öyrəndiyin üsulu növbətidə istifadə edəcəksən. Sonda bütün nəticələri **bir dashboard**-da birləşdirib yekun testdən keçəcəksən.

    > 💡 Real layihədə ən çox vaxt data yoxlamasına gedir. Ona görə də birinci tapşırıq heç bir «gözəl» nəticə vermir — amma sonrakı bütün nəticələrin düzgünlüyü ondan asılıdır.

    ## Dataset lüğəti
''' + DICT + '''
    ## Analitik iş axını

    ```text
    1. Sual        → biznes nə bilmək istəyir?   («ən dəyərli müştəri»)
    2. Metrika     → necə ölçək?                 (Sales cəmi, CustomerID üzrə)
    3. Hazırlıq    → tiplər, tarixlər, yeni sütunlar
    4. Hesablama   → groupby / agg / pivot / corr
    5. Yoxlama     → nəticə məntiqlidirmi? cəmlər tutur?
    6. Təqdimat    → cədvəl + qrafik + 1 cümləlik nəticə
    ```
''')

m.lesson('aletler', 'Hər suala uyğun alət', 8, '''
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
''')

m.quiz('giris-testi', 'Test: sual → alət', [
    classify(
        'Hər sualı uyğun pandas alətinə yerləşdir.',
        [
            ('groupby + sum/mean', ['ShipMode üzrə ümumi Sales', 'Kateqoriyalar üzrə orta Profit']),
            ('corr()', ['Sales ilə Profit arasındakı əlaqə', 'Discount artdıqca Profit azalırmı?']),
            ('crosstab / pivot_table', ['Hər ölkə üzrə hər seqmentdə müştəri sayı', 'Şəhər × kateqoriya satış cədvəli']),
            ('.dt.days', ['Sifarişdən göndərməyə keçən gün', 'Müştərinin son alışından keçən gün']),
        ],
        'Aqreqasiya — groupby; əlaqə — corr; iki ölçülü say — crosstab; tarix fərqi — Timedelta.dt.days.',
    ),
    single('Müştəri sayını hansı sütunla saymaq düzgündür?', ['CustomerName', 'CustomerID', 'City', 'OrderID'], 2,
           'Adlar təkrarlana bilər; ID unikaldır.'),
    single('Bir sifarişdə 3 məhsul varsa, `sifarisler.csv`-də neçə sətir olur?', ['1', '3', '0', 'Məhsul sayından asılı deyil'], 2,
           'Hər məhsul sətri ayrıca sətirdir; sifariş sayı üçün OrderID.nunique().'),
    single('`OrderDate` mətn kimi oxunubsa, `ShipDate - OrderDate` nə edər?', ['Gün sayını qaytarar', 'TypeError verər', 'NaN qaytarar', 'Tarixləri birləşdirər'], 2,
           'Mətnləri çıxmaq olmur — əvvəl parse_dates və ya pd.to_datetime.'),
])

# ───────────────────────────── 02 · Data yoxlaması və əməliyyat ─────────────────────────────
m = c.module('emeliyyat', 'Data yoxlaması və çatdırılma',
             'Datanı tanı, tarixləri çevir, çatdırılma müddəti və ShipMode təhlili (Gün 9: 3, 4, 10).')

m.lesson('yoxlama', 'Datanı tanımaq: 5 dəqiqəlik yoxlama siyahısı', 8, '''
    Hər yeni datasetdə ilk iş — onu tanımaqdır. Bu 6 sətir səni saatlarla yanlış nəticədən qoruyur:

    ```python
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    df.shape                      # (1582, 16) — neçə sətir, neçə sütun?
    df.dtypes                     # tarixlər datetime64-dürmü?
    df.isna().sum().sum()         # boş xana varmı?
    df["OrderDate"].agg(["min", "max"])   # hansı dövrü əhatə edir?
    df["OrderID"].nunique()       # neçə sifariş (sətir yox!)?
    df["CustomerID"].nunique()    # neçə müştəri?
    ```

    ## Gizli problem: təkrarlanan adlar

    ```python
    df.groupby("CustomerName")["CustomerID"].nunique().sort_values(ascending=False).head()
    ```

    Əgər bir adın arxasında birdən çox ID varsa — deməli fərqli insanlar eyni adı daşıyır. Adla qruplaşdırsan, onların alışları **birləşəcək** və «saxta» super-müştəri yaranacaq.

    ## Tarix fərqi

    İki `datetime` sütununun fərqi `Timedelta`-dır; gün sayı üçün `.dt.days`:

    ```python
    df["ShipDays"] = (df["ShipDate"] - df["OrderDate"]).dt.days
    df["ShipDays"].describe()
    ```

    ## Bir neçə metrika birdən: named aggregation

    ```python
    df.groupby("ShipMode").agg(
        ort_gun=("ShipDays", "mean"),
        satis=("Sales", "sum"),
        ort_say=("Quantity", "mean"),
    ).sort_values("ort_gun")
    ```

    Nəticə cədvəlinin sütun adlarını özün seçirsən — hesabat üçün hazır cədvəl.
''')

m.python('ilk-baxis', 'Datanı tanı: ölçü, dövr, sifariş və müştəri sayı', 10, '''
    Layihənin ilk addımı — datanı yoxlamaq. Rəhbərliyə göndəriləcək «data pasportu»nu hazırla.
''', [
    'sifarisler.csv-ni OrderDate və ShipDate tarix kimi oxunmaqla df-ə yüklə.',
    'Sətir sayı → setir, boş xanaların ümumi sayı → bos.',
    'Dövr: ilk və son sifariş tarixi → ilk_tarix, son_tarix (Timestamp).',
    'Unikal sifariş sayı → sifaris_sayi, unikal müştəri (CustomerID) sayı → musteri_sayi.',
    'Birdən çox CustomerID-yə aid olan adların sayı → tekrar_ad.',
], '''
    import pandas as pd

    df = ...

    setir = ...
    bos = ...
    ilk_tarix = ...
    son_tarix = ...
    sifaris_sayi = ...
    musteri_sayi = ...
    tekrar_ad = ...

    print(setir, bos, ilk_tarix.date(), son_tarix.date())
    print("Sifariş:", sifaris_sayi, "| Müştəri:", musteri_sayi, "| Təkrar ad:", tekrar_ad)
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    setir = len(df)
    bos = int(df.isna().sum().sum())
    ilk_tarix = df["OrderDate"].min()
    son_tarix = df["OrderDate"].max()
    sifaris_sayi = df["OrderID"].nunique()
    musteri_sayi = df["CustomerID"].nunique()
    ad_id = df.groupby("CustomerName")["CustomerID"].nunique()
    tekrar_ad = int((ad_id > 1).sum())

    print(setir, bos, ilk_tarix.date(), son_tarix.date())
    print("Sifariş:", sifaris_sayi, "| Müştəri:", musteri_sayi, "| Təkrar ad:", tekrar_ad)
''', P + '''
    assert isinstance(df, _pd.DataFrame) and _pd.api.types.is_datetime64_any_dtype(df["OrderDate"]) and _pd.api.types.is_datetime64_any_dtype(df["ShipDate"]), "OrderDate və ShipDate tarix (datetime64) olmalıdır — parse_dates"
    assert setir == len(_o), f"setir {len(_o)} olmalıdır"
    assert bos == 0, "bos 0 olmalıdır (isna().sum().sum())"
    assert ilk_tarix == _o["OrderDate"].min() and son_tarix == _o["OrderDate"].max(), "ilk_tarix/son_tarix — OrderDate-in min və max-ı"
    assert sifaris_sayi == _o["OrderID"].nunique(), f"sifaris_sayi {_o['OrderID'].nunique()} olmalıdır — sətir sayı yox, unikal OrderID"
    assert musteri_sayi == _o["CustomerID"].nunique(), f"musteri_sayi {_o['CustomerID'].nunique()} olmalıdır — CustomerID.nunique()"
    _t = int((_o.groupby("CustomerName")["CustomerID"].nunique() > 1).sum())
    assert tekrar_ad == _t, f"tekrar_ad {_t} olmalıdır: groupby('CustomerName')['CustomerID'].nunique() > 1"
''', [
    'pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])',
    'Boş xanalar: df.isna().sum().sum(); unikal say: df["OrderID"].nunique()',
    'ad_id = df.groupby("CustomerName")["CustomerID"].nunique(); tekrar_ad = (ad_id > 1).sum()',
], dataset=O)

m.python('catdirilma', 'Çatdırılma müddəti və ShipMode təhlili', 12, '''
    Gün 9-un 3-cü, 4-cü və 10-cu sualları: göndərmə müddəti, ShipMode üzrə satış, orta say və satış.
''', [
    'ShipDays sütunu yarat: ShipDate − OrderDate (gün, tam ədəd).',
    'Orta çatdırılma müddəti (2 rəqəm yuvarlaqlaşdırılmış) → orta_gun.',
    'ShipMode üzrə xülasə → mode_xulase: sütunlar satis (Sales cəmi), ort_say (Quantity ortası), ort_satis (Sales ortası), ort_gun (ShipDays ortası); satis-ə görə azalan.',
    'Ən çox satış gətirən ShipMode → lider_mode; ən sürətli (ort_gun ən kiçik) ShipMode → en_suretli.',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    df["ShipDays"] = ...
    orta_gun = ...

    mode_xulase = ...
    lider_mode = ...
    en_suretli = ...

    print("Orta:", orta_gun, "gün | Lider:", lider_mode, "| Ən sürətli:", en_suretli)
    mode_xulase
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    df["ShipDays"] = (df["ShipDate"] - df["OrderDate"]).dt.days
    orta_gun = round(df["ShipDays"].mean(), 2)

    mode_xulase = (
        df.groupby("ShipMode")
        .agg(
            satis=("Sales", "sum"),
            ort_say=("Quantity", "mean"),
            ort_satis=("Sales", "mean"),
            ort_gun=("ShipDays", "mean"),
        )
        .sort_values("satis", ascending=False)
    )
    lider_mode = mode_xulase["satis"].idxmax()
    en_suretli = mode_xulase["ort_gun"].idxmin()

    print("Orta:", orta_gun, "gün | Lider:", lider_mode, "| Ən sürətli:", en_suretli)
    mode_xulase
''', P + '''
    _o["ShipDays"] = (_o["ShipDate"] - _o["OrderDate"]).dt.days
    assert "ShipDays" in df.columns and list(df["ShipDays"]) == list(_o["ShipDays"]), "ShipDays = (ShipDate - OrderDate).dt.days"
    assert orta_gun == round(_o["ShipDays"].mean(), 2), f"orta_gun {round(_o['ShipDays'].mean(), 2)} olmalıdır"
    _g = _o.groupby("ShipMode").agg(satis=("Sales", "sum"), ort_say=("Quantity", "mean"), ort_satis=("Sales", "mean"), ort_gun=("ShipDays", "mean")).sort_values("satis", ascending=False)
    assert isinstance(mode_xulase, _pd.DataFrame) and list(mode_xulase.columns) == ["satis", "ort_say", "ort_satis", "ort_gun"], "mode_xulase sütunları: satis, ort_say, ort_satis, ort_gun (bu sırada)"
    assert list(mode_xulase.index) == list(_g.index), f"mode_xulase satis-ə görə azalan olmalıdır: {list(_g.index)}"
    assert _np.allclose(mode_xulase.values, _g.values), "mode_xulase dəyərləri düzgün deyil"
    assert lider_mode == _g["satis"].idxmax(), f"lider_mode {_g['satis'].idxmax()} olmalıdır"
    assert en_suretli == _g["ort_gun"].idxmin(), f"en_suretli {_g['ort_gun'].idxmin()} olmalıdır"
''', [
    'df["ShipDays"] = (df["ShipDate"] - df["OrderDate"]).dt.days',
    'df.groupby("ShipMode").agg(satis=("Sales", "sum"), ort_say=("Quantity", "mean"), ort_satis=("Sales", "mean"), ort_gun=("ShipDays", "mean"))',
    'lider_mode = mode_xulase["satis"].idxmax(); en_suretli = mode_xulase["ort_gun"].idxmin()',
], dataset=O)

m.quiz('emeliyyat-testi', 'Test: yoxlama və çatdırılma', [
    single('`(df["ShipDate"] - df["OrderDate"])` nəticəsinin tipi nədir?', ['int', 'Timedelta (timedelta64)', 'datetime64', 'str'], 2,
           'Tarixlərin fərqi Timedelta-dır; gün sayı üçün .dt.days.'),
    single('Standard Class ən çox satış gətirir. Bu, onun ən yaxşı çatdırılma növü olduğunu göstərirmi?',
           ['Bəli, satış həmişə keyfiyyət deməkdir', 'Yox — sadəcə ən çox istifadə olunan (defolt, ucuz) növdür; sürət və qiymətlə birlikdə qiymətləndirilməlidir', 'Bəli, çünki ən sürətlidir', 'Yox, çünki Same Day ən çox satır'], 2,
           'Böyük cəm çox vaxt böyük say deməkdir. Ortalamalara və müddətə də bax.'),
    multiple('Named aggregation (`agg(ad=("sütun", "funksiya"))`) haqqında hansılar doğrudur?',
             ['Nəticə sütunlarının adını özün verirsən', 'Bir neçə sütun üzrə fərqli funksiyalar tətbiq edə bilərsən', 'Yalnız sum işləyir', 'Nəticə DataFrame olur'],
             [1, 2, 4], 'agg istənilən aqreqasiya funksiyasını qəbul edir: sum, mean, nunique, lambda...'),
])

# ───────────────────────────── 03 · Mənfəət və coğrafiya ─────────────────────────────
m = c.module('menfeet-cografiya', 'Mənfəət, korrelyasiya və coğrafiya',
             'Sales ~ Profit əlaqəsi, kateqoriya ortalamaları, top ölkələr, şəhərlər və seqmentlər (Gün 9: 1, 2, 5, 7, 8).')

m.lesson('korelyasiya', 'Korrelyasiya, marja və «top N»', 10, '''
    ## Korrelyasiya: əlaqənin gücü

    Pearson korrelyasiyası −1 ilə +1 arasındadır:

    | r | Şərh |
    |---|---|
    | 0.7 … 1.0 | güclü müsbət əlaqə |
    | 0.3 … 0.7 | orta müsbət |
    | 0 … 0.3 | zəif müsbət |
    | ≈ 0 | xətti əlaqə yoxdur |
    | < 0 | biri artdıqca digəri azalır |

    ```python
    df["Sales"].corr(df["Profit"])           # iki sütun
    df[["Sales", "Profit", "Discount"]].corr()   # matris
    ```

    > ⚠️ Korrelyasiya **səbəb deyil**. Həm də çox satış həmişə çox mənfəət demək deyil — endirim və maya dəyəri mənfəəti «yeyə» bilər. Ona görə analitiklər **mənfəət marjasına** baxır.

    ## Mənfəət marjası

    ```python
    marja = df["Profit"].sum() / df["Sales"].sum() * 100   # faizlə
    ```

    Qrup üzrə marja = qrupun mənfəət cəmi / qrupun satış cəmi. **Sətir marjalarının ortalaması deyil!** (Kiçik sətirlər nəticəni təhrif edir.)

    ```python
    k = df.groupby("Category")[["Sales", "Profit"]].sum()
    k["Marja"] = k["Profit"] / k["Sales"] * 100
    ```

    ## Top N və sıralama

    ```python
    olke = df.groupby("Country")["Profit"].sum().sort_values(ascending=False)
    olke.head(2)                 # top 2
    olke.nlargest(2)             # eyni nəticə
    olke.rank(ascending=False)   # hər ölkənin yeri: 1, 2, 3...
    ```

    ## Pay (%)

    ```python
    seg = df.groupby("CustomerSegment")["Sales"].sum()
    (seg / seg.sum() * 100).round(1)
    ```
''')

m.python('korelyasiya-kateqoriya', 'Sales ~ Profit əlaqəsi və kateqoriyalar', 12, '''
    Gün 9-un 1-ci və 2-ci sualları: korrelyasiya və kateqoriyaların ortalama göstəriciləri, üstəlik marja.
''', [
    'Sales və Profit arasındakı korrelyasiya (3 rəqəm) → korr.',
    'Korrelyasiyanın gücünü cədvələ əsasən mətnlə yaz: "zəif", "orta" və ya "güclü" → guc.',
    'Kateqoriyalar üzrə orta Sales və orta Profit → kat_orta (sütunlar: Sales, Profit; Profit-ə görə azalan).',
    'Kateqoriyalar üzrə marja % = Profit cəmi / Sales cəmi × 100, 1 rəqəm → marja (Series, azalan).',
    'Ən yüksək marjalı kateqoriya → en_marjali.',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    korr = ...
    guc = ...

    kat_orta = ...
    marja = ...
    en_marjali = ...

    print("r =", korr, "→", guc, "| Ən marjalı:", en_marjali)
    print(marja)
    kat_orta
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    korr = round(df["Sales"].corr(df["Profit"]), 3)
    if abs(korr) >= 0.7:
        guc = "güclü"
    elif abs(korr) >= 0.3:
        guc = "orta"
    else:
        guc = "zəif"

    kat_orta = df.groupby("Category")[["Sales", "Profit"]].mean().sort_values("Profit", ascending=False)
    cem = df.groupby("Category")[["Sales", "Profit"]].sum()
    marja = (cem["Profit"] / cem["Sales"] * 100).round(1).sort_values(ascending=False)
    en_marjali = marja.idxmax()

    print("r =", korr, "→", guc, "| Ən marjalı:", en_marjali)
    print(marja)
    kat_orta
''', P + '''
    _k = round(_o["Sales"].corr(_o["Profit"]), 3)
    assert korr == _k, f"korr {_k} olmalıdır: round(df['Sales'].corr(df['Profit']), 3)"
    _gc = "güclü" if abs(_k) >= 0.7 else ("orta" if abs(_k) >= 0.3 else "zəif")
    assert guc == _gc, f"r = {_k} üçün guc «{_gc}» olmalıdır (0.3-dən kiçik — zəif, 0.3–0.7 — orta, 0.7+ — güclü)"
    _m = _o.groupby("Category")[["Sales", "Profit"]].mean().sort_values("Profit", ascending=False)
    assert isinstance(kat_orta, _pd.DataFrame) and list(kat_orta.columns) == ["Sales", "Profit"], "kat_orta sütunları: Sales, Profit"
    assert list(kat_orta.index) == list(_m.index) and _np.allclose(kat_orta.values, _m.values), "kat_orta: orta (mean) dəyərlər, Profit-ə görə azalan"
    _c = _o.groupby("Category")[["Sales", "Profit"]].sum()
    _mj = (_c["Profit"] / _c["Sales"] * 100).round(1).sort_values(ascending=False)
    assert isinstance(marja, _pd.Series) and list(marja.index) == list(_mj.index) and _np.allclose(marja.values, _mj.values), f"marja düzgün deyil (cəmlərin nisbəti, sətir marjalarının ortası yox): {_mj.to_dict()}"
    assert en_marjali == _mj.idxmax(), f"en_marjali {_mj.idxmax()} olmalıdır"
''', [
    'korr = round(df["Sales"].corr(df["Profit"]), 3); guc üçün if/elif/else və abs(korr)',
    'df.groupby("Category")[["Sales", "Profit"]].mean().sort_values("Profit", ascending=False)',
    'cem = df.groupby("Category")[["Sales", "Profit"]].sum(); marja = (cem["Profit"] / cem["Sales"] * 100).round(1)',
], dataset=O)

m.python('olke-seher-seqment', 'Top ölkələr, mənfəətli şəhərlər və seqmentlər', 12, '''
    Gün 9-un 5-ci, 7-ci və 8-ci sualları: coğrafiya və müştəri seqmenti üzrə mənzərə.
''', [
    'Ölkələr üzrə Profit cəmi, azalan → olke_profit (Series); top 2 ölkənin adları (siyahı) → top2_olke.',
    'Şəhərlər üzrə Profit cəmi, ən yüksək 5 şəhər (azalan) → top5_seher (Series).',
    'CustomerSegment üzrə Sales cəmi, azalan → seqment_satis (Series).',
    'Hər seqmentin satışdakı payı %, 1 rəqəm → seqment_pay (Series, eyni sırada).',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    olke_profit = ...
    top2_olke = ...
    top5_seher = ...
    seqment_satis = ...
    seqment_pay = ...

    print("Top 2:", top2_olke)
    print(top5_seher)
    seqment_pay
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    olke_profit = df.groupby("Country")["Profit"].sum().sort_values(ascending=False)
    top2_olke = olke_profit.head(2).index.tolist()
    top5_seher = df.groupby("City")["Profit"].sum().nlargest(5)
    seqment_satis = df.groupby("CustomerSegment")["Sales"].sum().sort_values(ascending=False)
    seqment_pay = (seqment_satis / seqment_satis.sum() * 100).round(1)

    print("Top 2:", top2_olke)
    print(top5_seher)
    seqment_pay
''', P + '''
    _op = _o.groupby("Country")["Profit"].sum().sort_values(ascending=False)
    assert isinstance(olke_profit, _pd.Series) and list(olke_profit.index) == list(_op.index) and _np.allclose(olke_profit.values, _op.values), "olke_profit: ölkələr üzrə Profit cəmi, azalan"
    assert top2_olke == list(_op.index[:2]), f"top2_olke {list(_op.index[:2])} olmalıdır (siyahı)"
    _cs = _o.groupby("City")["Profit"].sum().nlargest(5)
    assert isinstance(top5_seher, _pd.Series) and list(top5_seher.index) == list(_cs.index) and _np.allclose(top5_seher.values, _cs.values), f"top5_seher: {list(_cs.index)}"
    _ss = _o.groupby("CustomerSegment")["Sales"].sum().sort_values(ascending=False)
    assert isinstance(seqment_satis, _pd.Series) and list(seqment_satis.index) == list(_ss.index) and _np.allclose(seqment_satis.values, _ss.values), "seqment_satis: seqmentlər üzrə Sales cəmi, azalan"
    _sp = (_ss / _ss.sum() * 100).round(1)
    assert list(seqment_pay.index) == list(_sp.index) and _np.allclose(seqment_pay.values, _sp.values), f"seqment_pay: {_sp.to_dict()}"
''', [
    'olke_profit.head(2).index.tolist()',
    'df.groupby("City")["Profit"].sum().nlargest(5)',
    'seqment_pay = (seqment_satis / seqment_satis.sum() * 100).round(1)',
], dataset=O)

m.quiz('menfeet-testi', 'Test: mənfəət və coğrafiya', [
    single('r(Sales, Profit) ≈ 0.28 çıxdı. Ən düzgün şərh hansıdır?',
           ['Satış artdıqca mənfəət həmişə artır', 'Zəif müsbət əlaqə: böyük satışlar mənfəətə zəmanət vermir (endirim, maya dəyəri)', 'Heç bir əlaqə yoxdur', 'Satış mənfəəti azaldır'], 2,
           '0.28 zəif müsbətdir. Bu, mənfəətin endirim və məhsul qarışığından da asılı olduğunu göstərir.'),
    single('Kateqoriya marjasını necə hesablamaq düzgündür?',
           ['Hər sətrin Profit/Sales nisbətinin ortalaması', 'Kateqoriyanın Profit cəmi / Sales cəmi', 'Profit-in ortalaması / Sales-in maksimumu', 'Sales cəmi / Profit cəmi'], 2,
           'Sətir marjalarının ortası kiçik sifarişlərə həddən artıq çəki verir.'),
    classify(
        'Hansı ifadə nə qaytarır?',
        [
            ('Series (dəyərlər)', ['s.nlargest(2)', 's.sort_values().head(2)']),
            ('Bir etiket (ad)', ['s.idxmax()', 's.idxmin()']),
            ('Etiketlər siyahısı', ['s.head(2).index.tolist()', 'list(s.nlargest(3).index)']),
        ],
        'nlargest/head Series qaytarır; idxmax bir etiket; .index.tolist() — adlar siyahısı.',
    ),
])

# ───────────────────────────── 04 · Məhsul təhlili ─────────────────────────────
m = c.module('mehsullar', 'Məhsul təhlili və vizual müqayisə',
             'ProductID üzrə gəlir və mənfəət, kateqoriya liderləri, ProductName qrafikləri (Gün 9: 6, 9, 12).')

m.lesson('mehsul-lideri', 'Gəlir lideri ≠ mənfəət lideri', 8, '''
    «Hansı məhsul daha çox gəlir gətirir?» sualının iki cavabı ola bilər: **satış (Sales)** lideri və **mənfəət (Profit)** lideri. Bahalı noutbuk çox satış gətirir, amma endirimlə satılırsa mənfəəti az ola bilər; ucuz kağız isə yüksək marjalıdır.

    ```python
    mehsul = df.groupby(["ProductID", "ProductName"])[["Sales", "Profit"]].sum()
    mehsul["Sales"].idxmax()     # ('TEC-1004', 'Lenovo ThinkPad E14') — tuple!
    ```

    > 💡 İki sütunla qruplaşdıranda indeks `MultiIndex` olur və `idxmax()` **tuple** qaytarır. Yalnız ID lazımdırsa — `ProductID` üzrə qruplaşdır və adı ayrıca götür.

    ## Hər qrupun lideri

    **1-ci yol — sort + drop_duplicates:**

    ```python
    p = df.groupby(["Category", "ProductName"])["Sales"].sum().reset_index()
    p.sort_values("Sales", ascending=False).drop_duplicates("Category")
    ```

    **2-ci yol — idxmax:**

    ```python
    s = df.groupby(["Category", "ProductName"])["Sales"].sum()
    s.loc[s.groupby(level="Category").idxmax()]
    ```

    ## Vizual müqayisə

    Məhsul adları uzundur — **üfüqi** sütun qrafiki (`barh`) oxunaqlıdır. İki göstərici yan-yana:

    ```python
    import matplotlib.pyplot as plt

    t = df.groupby("ProductName")[["Sales", "Profit"]].sum().sort_values("Sales")
    ax = t.plot(kind="barh", figsize=(9, 6), title="Məhsullar: Sales və Profit")
    ax.set_xlabel("AZN")
    plt.tight_layout()
    plt.show()
    ```

    Marja ilə satışın əlaqəsini **scatter** daha yaxşı göstərir: sağ yuxarı küncdə həm çox satılan, həm mənfəətli məhsullar olur.
''')

m.python('mehsul-muqayise', 'Məhsullar: satış lideri, mənfəət lideri, kateqoriya liderləri', 12, '''
    Gün 9-un 6-cı və 12-ci sualları: ProductID üzrə Sales və Profit müqayisəsi və hər kateqoriyanın top məhsulu.
''', [
    'ProductID üzrə xülasə → mehsul (DataFrame, indeks ProductID): ProductName (ilk dəyər), Sales cəmi, Profit cəmi, Marja % (1 rəqəm); Sales-ə görə azalan.',
    'Ən çox satış gətirən məhsulun ProductID-si → satis_lideri; ən çox mənfəət gətirənin → menfeet_lideri.',
    'Hər Category üçün Sales-ə görə top ProductID → kat_lider_satis (dict: kateqoriya → ProductID).',
    'Hər Category üçün Profit-ə görə top ProductID → kat_lider_menfeet (dict).',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    mehsul = ...
    satis_lideri = ...
    menfeet_lideri = ...
    kat_lider_satis = ...
    kat_lider_menfeet = ...

    print("Satış lideri:", satis_lideri, "| Mənfəət lideri:", menfeet_lideri)
    print(kat_lider_satis)
    print(kat_lider_menfeet)
    mehsul.head()
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    mehsul = (
        df.groupby("ProductID")
        .agg(ProductName=("ProductName", "first"), Sales=("Sales", "sum"), Profit=("Profit", "sum"))
        .sort_values("Sales", ascending=False)
    )
    mehsul["Marja"] = (mehsul["Profit"] / mehsul["Sales"] * 100).round(1)
    satis_lideri = mehsul["Sales"].idxmax()
    menfeet_lideri = mehsul["Profit"].idxmax()

    kp = df.groupby(["Category", "ProductID"])[["Sales", "Profit"]].sum().reset_index()
    kat_lider_satis = dict(kp.sort_values("Sales", ascending=False).drop_duplicates("Category")[["Category", "ProductID"]].values)
    kat_lider_menfeet = dict(kp.sort_values("Profit", ascending=False).drop_duplicates("Category")[["Category", "ProductID"]].values)

    print("Satış lideri:", satis_lideri, "| Mənfəət lideri:", menfeet_lideri)
    print(kat_lider_satis)
    print(kat_lider_menfeet)
    mehsul.head()
''', P + '''
    _m = _o.groupby("ProductID").agg(ProductName=("ProductName", "first"), Sales=("Sales", "sum"), Profit=("Profit", "sum")).sort_values("Sales", ascending=False)
    _m["Marja"] = (_m["Profit"] / _m["Sales"] * 100).round(1)
    assert isinstance(mehsul, _pd.DataFrame) and list(mehsul.columns) == ["ProductName", "Sales", "Profit", "Marja"], "mehsul sütunları: ProductName, Sales, Profit, Marja"
    assert list(mehsul.index) == list(_m.index), "mehsul: indeks ProductID, Sales-ə görə azalan"
    assert _np.allclose(mehsul[["Sales", "Profit", "Marja"]].values, _m[["Sales", "Profit", "Marja"]].values) and list(mehsul["ProductName"]) == list(_m["ProductName"]), "mehsul dəyərləri düzgün deyil"
    assert satis_lideri == _m["Sales"].idxmax(), f"satis_lideri {_m['Sales'].idxmax()} olmalıdır"
    assert menfeet_lideri == _m["Profit"].idxmax(), f"menfeet_lideri {_m['Profit'].idxmax()} olmalıdır"
    _kp = _o.groupby(["Category", "ProductID"])[["Sales", "Profit"]].sum()
    _ks = {k: v for k, v in _kp["Sales"].groupby(level=0).idxmax().map(lambda t: t[1]).items()}
    _km = {k: v for k, v in _kp["Profit"].groupby(level=0).idxmax().map(lambda t: t[1]).items()}
    assert isinstance(kat_lider_satis, dict) and {str(k): str(v) for k, v in kat_lider_satis.items()} == _ks, f"kat_lider_satis {_ks} olmalıdır"
    assert isinstance(kat_lider_menfeet, dict) and {str(k): str(v) for k, v in kat_lider_menfeet.items()} == _km, f"kat_lider_menfeet {_km} olmalıdır"
''', [
    'agg(ProductName=("ProductName", "first"), Sales=("Sales", "sum"), Profit=("Profit", "sum"))',
    'Marja: mehsul["Profit"] / mehsul["Sales"] * 100, sonra .round(1)',
    'kp = df.groupby(["Category", "ProductID"])[["Sales", "Profit"]].sum().reset_index(); kp.sort_values("Sales", ascending=False).drop_duplicates("Category")',
    'dict(cədvəl[["Category", "ProductID"]].values) — iki sütundan lüğət',
], dataset=O)

m.python('mehsul-qrafik', 'ProductName üzrə Sales və Profit qrafikləri', 12, '''
    Gün 9-un 9-cu sualı: məhsulların satış və mənfəətini vizual müqayisə et. İki qrafik bir şəkildə (1×2).
''', [
    'ProductName üzrə Sales və Profit cəmi, Sales-ə görə artan → t (DataFrame).',
    'fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6)).',
    'ax1: t-ni üfüqi sütun qrafiki (barh) kimi çək, başlıq "Məhsullar: Sales və Profit", x oxu "AZN".',
    'ax2: scatter — x = Sales, y = Profit (hər nöqtə bir məhsul), başlıq "Satış və mənfəət", oxlar "Sales" və "Profit".',
    'Ən mənfəətli məhsulun adını ax2-də annotate ilə göstər (istəyə bağlı).',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    t = ...

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    # ax1 — barh

    # ax2 — scatter

    plt.tight_layout()
    plt.show()
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    t = df.groupby("ProductName")[["Sales", "Profit"]].sum().sort_values("Sales")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    t.plot(kind="barh", ax=ax1, title="Məhsullar: Sales və Profit")
    ax1.set_xlabel("AZN")
    ax1.set_ylabel("")

    ax2.scatter(t["Sales"], t["Profit"], s=60, color="teal")
    ax2.set_title("Satış və mənfəət")
    ax2.set_xlabel("Sales")
    ax2.set_ylabel("Profit")
    lider = t["Profit"].idxmax()
    ax2.annotate(lider, (t.loc[lider, "Sales"], t.loc[lider, "Profit"]), xytext=(5, 5), textcoords="offset points")

    plt.tight_layout()
    plt.show()
''', FIND + '''
    _t = _o.groupby("ProductName")[["Sales", "Profit"]].sum().sort_values("Sales")
    assert isinstance(t, _pd.DataFrame) and list(t.columns) == ["Sales", "Profit"] and list(t.index) == list(_t.index) and _np.allclose(t.values, _t.values), "t: ProductName üzrə Sales və Profit cəmi, Sales-ə görə artan"
    _a = _ax("Məhsullar: Sales və Profit")
    _bars = [p for p in _a.patches if p.get_width() != 0 or p.get_height() != 0]
    assert len(_bars) == 2 * len(_t), f"barh qrafikində {2 * len(_t)} sütun olmalıdır (hər məhsul üçün Sales və Profit)"
    assert _a.get_xlabel() == "AZN", "ax1 x oxu: AZN"
    _w = sorted(round(p.get_width(), 2) for p in _bars)
    assert _np.allclose(_w, sorted(_np.round(list(_t["Sales"]) + list(_t["Profit"]), 2)), atol=0.01), "barh — sütun uzunluqları Sales və Profit cəmləri olmalıdır (kind='barh')"
    _s = _ax("Satış və mənfəət")
    assert _s.collections, "ax2-də scatter olmalıdır"
    _xy = _s.collections[0].get_offsets()
    assert len(_xy) == len(_t), f"scatter-də {len(_t)} nöqtə olmalıdır (hər məhsul bir nöqtə)"
    assert _np.allclose(sorted(_xy[:, 0]), sorted(_t["Sales"])), "scatter x = Sales"
    assert _s.get_xlabel() == "Sales" and _s.get_ylabel() == "Profit", "ax2 oxları: Sales və Profit"
''', [
    't.plot(kind="barh", ax=ax1, title="Məhsullar: Sales və Profit"); ax1.set_xlabel("AZN")',
    'ax2.scatter(t["Sales"], t["Profit"]); ax2.set_title("Satış və mənfəət")',
    'ax2.annotate(ad, (x, y), xytext=(5, 5), textcoords="offset points")',
], dataset=O)

m.quiz('mehsul-testi', 'Test: məhsul təhlili', [
    single('`df.groupby(["Category", "ProductID"])["Sales"].sum().idxmax()` nə qaytarır?',
           ['ProductID', '("Category", "ProductID") tuple-ı', 'Ən böyük Sales dəyəri', 'DataFrame'], 2,
           'MultiIndex olanda idxmax tuple qaytarır.'),
    single('Uzun məhsul adları olan 15 məhsulu müqayisə etmək üçün ən oxunaqlı qrafik?',
           ['Pie', 'Üfüqi sütun qrafiki (barh)', 'Xətt qrafiki', 'Histogram'], 2,
           'barh-da adlar y oxunda rahat oxunur; xətt qrafiki zaman üçündür.'),
    classify(
        'Məhsulu qrafikdəki yerinə görə təsnif et (scatter: x = Sales, y = Profit).',
        [
            ('Ulduz ⭐', ['Sağ yuxarı: çox satış, çox mənfəət']),
            ('Diqqət ⚠️', ['Sağ aşağı: çox satış, az mənfəət']),
            ('Niş 💎', ['Sol yuxarı: az satış, yüksək mənfəət']),
            ('Sual altında ❓', ['Sol aşağı: az satış, az mənfəət']),
        ],
        '«Diqqət» məhsulları adətən endirim və qiymət siyasətinin yoxlanmasını tələb edir.',
    ),
])

# ───────────────────────────── 05 · Müştəri təhlili ─────────────────────────────
m = c.module('musteriler', 'Müştəri təhlili və RFM seqmentasiyası',
             'Top müştəri, RFM, ölkə/şəhər × seqment, top müştərilərin məhsulları (Gün 9: 11, 13, 14, 15).')

m.lesson('top-musteri', 'Ən dəyərli müştəri: adla yox, ID ilə', 8, '''
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
''')

m.python('en-deyerli-musteri', 'Ən çox gəlir gətirən müştəri və onun profili', 10, '''
    Gün 9-un 11-ci sualı: ən çox gəlir gətirən müştərini tap və ona aid məlumatları göstər — tələyə düşmədən.
''', [
    'CustomerID üzrə Sales cəmi → musteri_satis (Series, azalan).',
    'Ən çox satış gətirən müştərinin ID-si → top_id.',
    'Onun profili → profil (dict) açarları: "ad", "seqment", "olke", "seher", "sifaris" (unikal sifariş sayı), "satis" (2 rəqəm), "menfeet" (2 rəqəm), "sevimli_kateqoriya" (Sales-ə görə).',
    'Bu müştərinin bütün sətirləri, OrderDate-ə görə → tarixce (DataFrame).',
    'Adla qruplaşdıranda birinci çıxan ad → adla_lider (tələni gör!).',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    musteri_satis = ...
    top_id = ...

    sec = df[df["CustomerID"] == top_id]
    profil = {
        "ad": ...,
    }
    tarixce = ...
    adla_lider = ...

    print(top_id, profil)
    print("Adla qruplaşdırsaq:", adla_lider, "— amma bu ad", df[df["CustomerName"] == adla_lider]["CustomerID"].nunique(), "müştəriyə aiddir")
    tarixce.head()
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    musteri_satis = df.groupby("CustomerID")["Sales"].sum().sort_values(ascending=False)
    top_id = musteri_satis.idxmax()

    sec = df[df["CustomerID"] == top_id]
    profil = {
        "ad": sec["CustomerName"].iloc[0],
        "seqment": sec["CustomerSegment"].iloc[0],
        "olke": sec["Country"].iloc[0],
        "seher": sec["City"].iloc[0],
        "sifaris": sec["OrderID"].nunique(),
        "satis": round(sec["Sales"].sum(), 2),
        "menfeet": round(sec["Profit"].sum(), 2),
        "sevimli_kateqoriya": sec.groupby("Category")["Sales"].sum().idxmax(),
    }
    tarixce = sec.sort_values("OrderDate")
    adla_lider = df.groupby("CustomerName")["Sales"].sum().idxmax()

    print(top_id, profil)
    print("Adla qruplaşdırsaq:", adla_lider, "— amma bu ad", df[df["CustomerName"] == adla_lider]["CustomerID"].nunique(), "müştəriyə aiddir")
    tarixce.head()
''', P + '''
    _ms = _o.groupby("CustomerID")["Sales"].sum().sort_values(ascending=False)
    assert isinstance(musteri_satis, _pd.Series) and list(musteri_satis.index[:10]) == list(_ms.index[:10]) and _np.allclose(musteri_satis.values, _ms.values), "musteri_satis: CustomerID üzrə Sales cəmi, azalan"
    _id = _ms.idxmax()
    assert top_id == _id, f"top_id {_id} olmalıdır — CustomerName ilə yox, CustomerID ilə qruplaşdır"
    _s = _o[_o["CustomerID"] == _id]
    _p = {"ad": _s["CustomerName"].iloc[0], "seqment": _s["CustomerSegment"].iloc[0], "olke": _s["Country"].iloc[0], "seher": _s["City"].iloc[0], "sifaris": _s["OrderID"].nunique(), "satis": round(_s["Sales"].sum(), 2), "menfeet": round(_s["Profit"].sum(), 2), "sevimli_kateqoriya": _s.groupby("Category")["Sales"].sum().idxmax()}
    assert isinstance(profil, dict) and set(profil) == set(_p), f"profil açarları: {list(_p)}"
    for _k, _v in _p.items():
        _u = profil[_k]
        assert (abs(float(_u) - float(_v)) < 0.01) if isinstance(_v, (int, float)) and not isinstance(_v, bool) else str(_u) == str(_v), f"profil['{_k}'] {_v!r} olmalıdır, səndə: {_u!r}"
    assert isinstance(tarixce, _pd.DataFrame) and len(tarixce) == len(_s) and tarixce["OrderDate"].is_monotonic_increasing, f"tarixce: bu müştərinin {len(_s)} sətri, OrderDate-ə görə"
    _al = _o.groupby("CustomerName")["Sales"].sum().idxmax()
    assert adla_lider == _al, f"adla_lider {_al} olmalıdır"
''', [
    'musteri_satis = df.groupby("CustomerID")["Sales"].sum().sort_values(ascending=False); top_id = musteri_satis.idxmax()',
    'Profil: sec["CustomerName"].iloc[0], sec["OrderID"].nunique(), round(sec["Sales"].sum(), 2)',
    'sevimli_kateqoriya: sec.groupby("Category")["Sales"].sum().idxmax()',
], dataset=O)

m.lesson('rfm', 'Müştəri seqmentasiyası: RFM', 10, '''
    Gün 9-un 13-cü sualı: «müştəriləri seqmentə ayırın». Marketinqdə ən çox istifadə olunan sadə və güclü üsul — **RFM**:

    | Hərf | Metrika | Sual | Hesablama |
    |---|---|---|---|
    | **R** — Recency | Son alışdan keçən gün | Nə vaxt alıb? | `(ref_tarix - son_OrderDate).days` |
    | **F** — Frequency | Sifariş sayı | Nə qədər tez-tez? | `OrderID.nunique()` |
    | **M** — Monetary | Ümumi xərc | Nə qədər xərcləyib? | `Sales.sum()` |

    `ref_tarix` = datasetdəki son tarix + 1 gün (təhlil «bu gün» aparılır kimi).

    ```python
    ref = df["OrderDate"].max() + pd.Timedelta(days=1)
    rfm = df.groupby("CustomerID").agg(
        Recency=("OrderDate", lambda s: (ref - s.max()).days),
        Frequency=("OrderID", "nunique"),
        Monetary=("Sales", "sum"),
    )
    ```

    ## Ballar: kvartillər (1–4)

    `pd.qcut` müştəriləri bərabər sayda 4 qrupa bölür. Bərabər dəyərlər qrup sərhədini pozmasın deyə əvvəl `rank(method="first")`:

    ```python
    rfm["R"] = pd.qcut(rfm["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)   # az gün = yaxşı → 4
    rfm["F"] = pd.qcut(rfm["Frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    rfm["M"] = pd.qcut(rfm["Monetary"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    ```

    > ⚠️ Recency-də **kiçik** dəyər yaxşıdır, ona görə etiketlər tərsinədir: `[4, 3, 2, 1]`.

    ## Seqmentlər: R × F matrisi

    | | F ≥ 3 (tez-tez alır) | F ≤ 2 (az alır) |
    |---|---|---|
    | **R ≥ 3** (yaxınlarda alıb) | 🏆 **Çempion** — mükafatlandır | 🌱 **Perspektivli** — sadiq et |
    | **R ≤ 2** (çoxdandır gəlmir) | ⚠️ **Risk altında** — geri qaytar! | 😴 **Yuxuda** — ucuz kampaniya |

    ```python
    def seqment(row):
        if row["R"] >= 3 and row["F"] >= 3:
            return "Çempion"
        if row["F"] >= 3:
            return "Risk altında"
        if row["R"] >= 3:
            return "Perspektivli"
        return "Yuxuda"

    rfm["Seqment"] = rfm.apply(seqment, axis=1)
    ```

    «Risk altında» qrupu ən qiymətlisidir: əvvəllər tez-tez alıb, amma son vaxtlar yoxdur — onları itirmək bahadır.
''')

m.python('rfm-seqment', 'RFM: müştəriləri seqmentlərə ayır', 15, '''
    Gün 9-un 13-cü sualı: hər müştəri üçün R, F, M hesabla, bal ver və seqmentə ayır (dərsdəki qaydalarla).
''', [
    'ref = son OrderDate + 1 gün; CustomerID üzrə Recency, Frequency, Monetary → rfm (bu sütun adları ilə).',
    'R, F, M balları (1–4, int): qcut + rank(method="first"); Recency üçün etiketlər [4, 3, 2, 1].',
    'Seqment sütunu: Çempion / Risk altında / Perspektivli / Yuxuda (R × F qaydası).',
    'Hər seqmentdə müştəri sayı → seqment_say (Series, value_counts).',
    'Seqmentlər üzrə orta Recency, Frequency, Monetary → seqment_profil (DataFrame, Monetary-ə görə azalan).',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    ref = ...
    rfm = ...

    # R, F, M ballari

    def seqment(row):
        ...

    rfm["Seqment"] = ...

    seqment_say = ...
    seqment_profil = ...

    print(seqment_say)
    seqment_profil
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    ref = df["OrderDate"].max() + pd.Timedelta(days=1)
    rfm = df.groupby("CustomerID").agg(
        Recency=("OrderDate", lambda s: (ref - s.max()).days),
        Frequency=("OrderID", "nunique"),
        Monetary=("Sales", "sum"),
    )

    rfm["R"] = pd.qcut(rfm["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)
    rfm["F"] = pd.qcut(rfm["Frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    rfm["M"] = pd.qcut(rfm["Monetary"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)

    def seqment(row):
        if row["R"] >= 3 and row["F"] >= 3:
            return "Çempion"
        if row["F"] >= 3:
            return "Risk altında"
        if row["R"] >= 3:
            return "Perspektivli"
        return "Yuxuda"

    rfm["Seqment"] = rfm.apply(seqment, axis=1)

    seqment_say = rfm["Seqment"].value_counts()
    seqment_profil = (
        rfm.groupby("Seqment")[["Recency", "Frequency", "Monetary"]].mean().sort_values("Monetary", ascending=False)
    )

    print(seqment_say)
    seqment_profil
''', P + RFM_REF + '''
    assert isinstance(rfm, _pd.DataFrame) and len(rfm) == len(_r), f"rfm-də {len(_r)} müştəri (CustomerID) olmalıdır"
    for _c in ["Recency", "Frequency", "Monetary"]:
        assert _c in rfm.columns, f"rfm-də {_c} sütunu yoxdur"
    _x = rfm.loc[_r.index]
    assert (_x["Recency"].values == _r["Recency"].values).all(), "Recency = (ref - son OrderDate).days, ref = son tarix + 1 gün"
    assert (_x["Frequency"].values == _r["Frequency"].values).all(), "Frequency = OrderID.nunique() (sətir sayı yox)"
    assert _np.allclose(_x["Monetary"].values, _r["Monetary"].values), "Monetary = Sales cəmi"
    for _c in ["R", "F", "M"]:
        assert _c in rfm.columns and (_x[_c].astype(int).values == _r[_c].values).all(), f"{_c} balları düzgün deyil — qcut(rank(method='first'), 4, labels=...)" + (" (Recency üçün [4, 3, 2, 1])" if _c == "R" else "")
    assert "Seqment" in rfm.columns and (_x["Seqment"].values == _r["Seqment"].values).all(), "Seqment qaydası: R≥3 və F≥3 → Çempion; F≥3 → Risk altında; R≥3 → Perspektivli; qalan → Yuxuda"
    _vc = _r["Seqment"].value_counts()
    assert isinstance(seqment_say, _pd.Series) and seqment_say.to_dict() == _vc.to_dict(), f"seqment_say {_vc.to_dict()} olmalıdır"
    _sp = _r.groupby("Seqment")[["Recency", "Frequency", "Monetary"]].mean().sort_values("Monetary", ascending=False)
    assert isinstance(seqment_profil, _pd.DataFrame) and list(seqment_profil.index) == list(_sp.index) and _np.allclose(seqment_profil[["Recency", "Frequency", "Monetary"]].values, _sp.values), "seqment_profil: orta Recency, Frequency, Monetary, Monetary-ə görə azalan"
''', [
    'Recency=("OrderDate", lambda s: (ref - s.max()).days)',
    'rfm["R"] = pd.qcut(rfm["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)',
    'rfm["Seqment"] = rfm.apply(seqment, axis=1); seqment_say = rfm["Seqment"].value_counts()',
], dataset=O)

m.python('cografiya-top-mehsul', 'Top müştərilər haradandır və nə alırlar?', 15, '''
    Gün 9-un 14-cü və 15-ci sualları. «Top müştəri» = RFM-də «Çempion» seqmenti (RFM-i əvvəlki tapşırıqdakı kimi qur).
''', [
    'RFM və Seqment sütununu qur (əvvəlki tapşırığın kodu); hər müştərinin Country və City-sini əlavə et → rfm.',
    'Ölkə × seqment müştəri sayı cədvəli → olke_seqment (pd.crosstab: sətirlər Country, sütunlar Seqment).',
    'Çempionların ən çox olduğu ölkə → top_olke; şəhər → top_seher.',
    'Çempion müştərilərin sifariş sətirləri → top_df; ən çox alınan (Quantity cəmi) 5 məhsul → top_mehsullar (Series, ProductName).',
    'Çempionların kateqoriyalar üzrə Sales payı %, 1 rəqəm → top_kateqoriya (Series, azalan).',
], '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    # 1) RFM + Seqment (əvvəlki tapşırıq)
    rfm = ...

    # 2) coğrafiya
    olke_seqment = ...
    top_olke = ...
    top_seher = ...

    # 3) çempionlar nə alır?
    top_df = ...
    top_mehsullar = ...
    top_kateqoriya = ...

    print(top_olke, top_seher)
    print(top_mehsullar)
    print(top_kateqoriya)
    olke_seqment
''', '''
    import pandas as pd

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    # 1) RFM + Seqment
    ref = df["OrderDate"].max() + pd.Timedelta(days=1)
    rfm = df.groupby("CustomerID").agg(
        Recency=("OrderDate", lambda s: (ref - s.max()).days),
        Frequency=("OrderID", "nunique"),
        Monetary=("Sales", "sum"),
        Country=("Country", "first"),
        City=("City", "first"),
    )
    rfm["R"] = pd.qcut(rfm["Recency"].rank(method="first"), 4, labels=[4, 3, 2, 1]).astype(int)
    rfm["F"] = pd.qcut(rfm["Frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)
    rfm["M"] = pd.qcut(rfm["Monetary"].rank(method="first"), 4, labels=[1, 2, 3, 4]).astype(int)

    def seqment(row):
        if row["R"] >= 3 and row["F"] >= 3:
            return "Çempion"
        if row["F"] >= 3:
            return "Risk altında"
        if row["R"] >= 3:
            return "Perspektivli"
        return "Yuxuda"

    rfm["Seqment"] = rfm.apply(seqment, axis=1)

    # 2) coğrafiya
    olke_seqment = pd.crosstab(rfm["Country"], rfm["Seqment"])
    cemp = rfm[rfm["Seqment"] == "Çempion"]
    top_olke = cemp["Country"].value_counts().idxmax()
    top_seher = cemp["City"].value_counts().idxmax()

    # 3) çempionlar nə alır?
    top_df = df[df["CustomerID"].isin(cemp.index)]
    top_mehsullar = top_df.groupby("ProductName")["Quantity"].sum().nlargest(5)
    kat = top_df.groupby("Category")["Sales"].sum()
    top_kateqoriya = (kat / kat.sum() * 100).round(1).sort_values(ascending=False)

    print(top_olke, top_seher)
    print(top_mehsullar)
    print(top_kateqoriya)
    olke_seqment
''', P + RFM_REF + '''
    _geo = _o.groupby("CustomerID")[["Country", "City"]].first()
    _r = _r.join(_geo)
    assert isinstance(rfm, _pd.DataFrame) and {"Seqment", "Country", "City"} <= set(rfm.columns), "rfm-də Seqment, Country, City sütunları olmalıdır"
    assert (rfm.loc[_r.index, "Seqment"].values == _r["Seqment"].values).all(), "Seqment əvvəlki tapşırıqdakı qaydalarla hesablanmalıdır"
    _ct = _pd.crosstab(_r["Country"], _r["Seqment"])
    assert isinstance(olke_seqment, _pd.DataFrame) and olke_seqment.shape == _ct.shape and (olke_seqment.loc[_ct.index, _ct.columns].values == _ct.values).all(), "olke_seqment = pd.crosstab(rfm['Country'], rfm['Seqment'])"
    _c = _r[_r["Seqment"] == "Çempion"]
    assert top_olke == _c["Country"].value_counts().idxmax(), f"top_olke {_c['Country'].value_counts().idxmax()} olmalıdır"
    assert top_seher == _c["City"].value_counts().idxmax(), f"top_seher {_c['City'].value_counts().idxmax()} olmalıdır"
    _td = _o[_o["CustomerID"].isin(_c.index)]
    assert isinstance(top_df, _pd.DataFrame) and len(top_df) == len(_td), f"top_df-də çempionların {len(_td)} sətri olmalıdır (isin)"
    _tm = _td.groupby("ProductName")["Quantity"].sum().nlargest(5)
    assert isinstance(top_mehsullar, _pd.Series) and list(top_mehsullar.values) == list(_tm.values) and set(top_mehsullar.index) == set(_tm.index), f"top_mehsullar: {_tm.to_dict()}"
    _k = _td.groupby("Category")["Sales"].sum()
    _kp = (_k / _k.sum() * 100).round(1).sort_values(ascending=False)
    assert isinstance(top_kateqoriya, _pd.Series) and list(top_kateqoriya.index) == list(_kp.index) and _np.allclose(top_kateqoriya.values, _kp.values), f"top_kateqoriya: {_kp.to_dict()}"
''', [
    'agg-a əlavə et: Country=("Country", "first"), City=("City", "first")',
    'olke_seqment = pd.crosstab(rfm["Country"], rfm["Seqment"]); cemp = rfm[rfm["Seqment"] == "Çempion"]',
    'top_df = df[df["CustomerID"].isin(cemp.index)]; top_df.groupby("ProductName")["Quantity"].sum().nlargest(5)',
], dataset=O)

m.quiz('musteri-testi', 'Test: müştəri təhlili', [
    single('Adla qruplaşdıranda «Zaur Quliyeva» birinci çıxdı, ID ilə — C-1099. Səbəb?',
           ['Hesablama xətası', 'Eyni adlı 4 fərqli müştərinin alışları adla qruplaşdırmada birləşib', 'C-1099 sifarişləri ləğv edilib', 'CustomerID mətndir'], 2,
           'Hesablama ID ilə, göstərmə adla.'),
    classify(
        'Müştərini RFM seqmentinə yerləşdir.',
        [
            ('Çempion', ['R=4, F=4: dünən aldı, ildə 15 sifariş', 'R=3, F=3']),
            ('Risk altında', ['R=1, F=4: əvvəllər tez-tez alırdı, 8 aydır yoxdur']),
            ('Perspektivli', ['R=4, F=1: ilk alışını keçən həftə edib']),
            ('Yuxuda', ['R=1, F=1: bir dəfə alıb, çoxdan']),
        ],
        'R × F matrisi: yaxınlıq və tezlik.',
    ),
    single('Recency balı üçün qcut etiketləri niyə `[4, 3, 2, 1]`-dir?',
           ['Səhvdir, [1, 2, 3, 4] olmalıdır', 'Az gün keçməsi yaxşıdır, ona görə ən kiçik Recency ən yüksək balı alır', 'qcut yalnız tərs sıra qəbul edir', 'Recency mənfi ədəddir'], 2,
           'F və M-də çox yaxşıdır, R-də az.'),
    single('`rank(method="first")` qcut-dan əvvəl niyə lazımdır?',
           ['Sürət üçün', 'Bərabər dəyərlər çox olanda qcut sərhədləri təkrarlanır və xəta verir; rank hər müştəriyə unikal yer verir', 'Dəyərləri yuvarlaqlaşdırır', 'NaN-ları silir'], 2,
           'Məsələn, Frequency-də çox müştərinin 7 sifarişi ola bilər — «Bin edges must be unique».'),
])

# ───────────────────────────── 06 · Yekun ─────────────────────────────
m = c.module('yekun', 'Yekun: dashboard və hesabat',
             'Nəticələri bir dashboard-da birləşdir, rəhbərlik üçün tövsiyələr və yekun test.')

m.lesson('hesabat', 'Nəticələri təqdim etmək', 8, '''
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
''')

m.python('dashboard', 'Yekun dashboard (2 × 2)', 15, '''
    Layihənin son addımı: əsas nəticələri bir şəkildə birləşdir.
''', [
    'fig, axes = plt.subplots(2, 2, figsize=(14, 9)); fig.suptitle("DaCy Store — 2023–2024 satış təhlili").',
    'axes[0, 0]: aylıq Sales (resample("ME").sum()), xətt qrafiki, başlıq "Aylıq satış".',
    'axes[0, 1]: ölkələr üzrə Profit cəmi, azalan, sütun (bar), başlıq "Ölkələr üzrə mənfəət".',
    'axes[1, 0]: kateqoriya marjası % (Profit cəmi / Sales cəmi × 100), barh, başlıq "Kateqoriya marjası, %".',
    'axes[1, 1]: ShipMode üzrə Sales payı, pie (autopct="%1.0f%%"), başlıq "ShipMode üzrə satış".',
    'Ümumi göstəricilər: umumi_satis, umumi_menfeet (2 rəqəm), umumi_marja (% , 1 rəqəm).',
], '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    umumi_satis = ...
    umumi_menfeet = ...
    umumi_marja = ...

    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    fig.suptitle("DaCy Store — 2023–2024 satış təhlili", fontsize=16)

    # 4 qrafik

    plt.tight_layout()
    plt.show()
    print(f"Satış: {umumi_satis} AZN | Mənfəət: {umumi_menfeet} AZN | Marja: {umumi_marja}%")
''', '''
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv("sifarisler.csv", parse_dates=["OrderDate", "ShipDate"])

    umumi_satis = round(df["Sales"].sum(), 2)
    umumi_menfeet = round(df["Profit"].sum(), 2)
    umumi_marja = round(umumi_menfeet / umumi_satis * 100, 1)

    ayliq = df.set_index("OrderDate")["Sales"].resample("ME").sum()
    olke = df.groupby("Country")["Profit"].sum().sort_values(ascending=False)
    k = df.groupby("Category")[["Sales", "Profit"]].sum()
    marja = (k["Profit"] / k["Sales"] * 100).sort_values()
    mode = df.groupby("ShipMode")["Sales"].sum()

    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    fig.suptitle("DaCy Store — 2023–2024 satış təhlili", fontsize=16)

    ayliq.plot(ax=axes[0, 0], title="Aylıq satış")
    olke.plot(kind="bar", ax=axes[0, 1], title="Ölkələr üzrə mənfəət", color="seagreen")
    marja.plot(kind="barh", ax=axes[1, 0], title="Kateqoriya marjası, %", color="orange")
    mode.plot(kind="pie", ax=axes[1, 1], title="ShipMode üzrə satış", autopct="%1.0f%%")
    axes[1, 1].set_ylabel("")

    plt.tight_layout()
    plt.show()
    print(f"Satış: {umumi_satis} AZN | Mənfəət: {umumi_menfeet} AZN | Marja: {umumi_marja}%")
''', FIND + '''
    assert umumi_satis == round(_o["Sales"].sum(), 2) and umumi_menfeet == round(_o["Profit"].sum(), 2), "umumi_satis / umumi_menfeet — Sales və Profit cəmləri, 2 rəqəm"
    assert umumi_marja == round(round(_o["Profit"].sum(), 2) / round(_o["Sales"].sum(), 2) * 100, 1), "umumi_marja = mənfəət / satış × 100, 1 rəqəm"
    _figs = [_plt.figure(n) for n in _plt.get_fignums()]
    assert any(f._suptitle is not None and f._suptitle.get_text() == "DaCy Store — 2023–2024 satış təhlili" for f in _figs), "fig.suptitle('DaCy Store — 2023–2024 satış təhlili') ver"
    _a = _ax("Aylıq satış")
    _ay = _o.set_index("OrderDate")["Sales"].resample("ME").sum()
    assert _a.lines and len(_a.lines[0].get_ydata()) == len(_ay) and _np.allclose(_a.lines[0].get_ydata(), _ay.values), f"«Aylıq satış» — {len(_ay)} aylıq nöqtə (resample('ME').sum())"
    _b = _ax("Ölkələr üzrə mənfəət")
    _op = _o.groupby("Country")["Profit"].sum().sort_values(ascending=False)
    assert _np.allclose([p.get_height() for p in _b.patches], _op.values), "«Ölkələr üzrə mənfəət» — azalan sırada bar qrafiki"
    _m = _ax("Kateqoriya marjası, %")
    _k = _o.groupby("Category")[["Sales", "Profit"]].sum()
    _mj = _k["Profit"] / _k["Sales"] * 100
    assert _np.allclose(sorted(p.get_width() for p in _m.patches), sorted(_mj.values), atol=0.06), "«Kateqoriya marjası, %» — barh, dəyərlər Profit cəmi / Sales cəmi × 100"
    _p = _ax("ShipMode üzrə satış")
    assert len(_p.patches) == _o["ShipMode"].nunique() and any("%" in t.get_text() for t in _p.texts), "«ShipMode üzrə satış» — pie, autopct ilə faizlər"
''', [
    'ayliq = df.set_index("OrderDate")["Sales"].resample("ME").sum(); ayliq.plot(ax=axes[0, 0], title="Aylıq satış")',
    'olke.plot(kind="bar", ax=axes[0, 1], title="Ölkələr üzrə mənfəət")',
    'mode.plot(kind="pie", ax=axes[1, 1], title="ShipMode üzrə satış", autopct="%1.0f%%")',
], dataset=O)

m.quiz('yekun-test', 'Yekun test: Sales Analytics', [
    single('Bir sifarişdə neçə məhsul olduğunu nəzərə alaraq sifariş sayını necə tapırsan?',
           ['len(df)', 'df["OrderID"].nunique()', 'df["OrderID"].count()', 'df["Quantity"].sum()'], 2,
           'count və len sətirləri sayır.'),
    single('Ölkə üzrə mənfəəti azalan sırada göstərən ifadə?',
           ['df.groupby("Country")["Profit"].sum().sort_values(ascending=False)', 'df.sort_values("Profit").groupby("Country")', 'df["Country"].value_counts()', 'df.pivot("Country", "Profit")'], 1,
           'value_counts sətir sayıdır, mənfəət deyil.'),
    multiple('Hansılar «Risk altında» seqmenti üçün düzgün addımlardır?',
             ['Fərdi geri qaytarma təklifi göndərmək', 'Onları bazadan silmək', 'Niyə getdiklərini soruşmaq (sorğu)', 'Çempionlarla eyni VIP kampaniyaya salmaq'],
             [1, 3], 'Risk altındakılar — əvvəlki dəyərli müştərilər; onları geri qaytarmaq yeni müştəri tapmaqdan ucuzdur.'),
    classify(
        'Gün 9 sualını həll edən koda uyğunlaşdır.',
        [
            ('Çatdırılma müddəti', ['(df["ShipDate"] - df["OrderDate"]).dt.days']),
            ('Korrelyasiya', ['df["Sales"].corr(df["Profit"])']),
            ('Top 2 ölkə', ['df.groupby("Country")["Profit"].sum().nlargest(2)']),
            ('Ölkə × seqment say', ['pd.crosstab(rfm["Country"], rfm["Seqment"])']),
        ],
        'Bu 4 sətir layihənin skeletidir.',
    ),
    single('Kateqoriya üzrə satış lideri ilə mənfəət lideri fərqli məhsullardır. Bu nə deməkdir?',
           ['Data səhvdir', 'Çox satılan məhsul aşağı marjalıdır — qiymət/endirim siyasətinə baxmaq lazımdır', 'Mənfəət hesablanmayıb', 'Fərq yoxdur'], 2,
           'Satış həcmi və mənfəətlilik fərqli şeylərdir.'),
    single('Dashboard-da hər qrafikin başlığı ideal halda nə olmalıdır?',
           ['Sütunun adı', 'Qrafikin göstərdiyi əsas nəticə (məsələn, «Mənfəətin yarıdan çoxu iki ölkədən gəlir»)', 'Boş', 'Faylın adı'], 2,
           'Oxucu başlığı oxuyub nəticəni bilməlidir.'),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
