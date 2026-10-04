"""Python & SQL — Python4Business Gün 9 (verilənlər bazasına qoşulma, SQL sorğularının Python ilə icrası), sqlite3 ilə."""
import os
import shutil

from common import Course, classify, multiple, single

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'datasets')

c = Course(
    'python-sql',
    {
        '_comment': (
            'Python & SQL — Python4Business Gün 9: Python-dan verilənlər bazasına qoşulma və SQL sorğuları.\n'
            'Praktika brauzerdə işləyən sqlite3 ilə; MySQL/PostgreSQL bağlantısı nəzəri hissədədir.'
        ),
        'track': 'data-analytics',
        'title': 'Python & SQL: Working with Databases',
        'level': 'intermediate',
        'description': (
            'Python-dan verilənlər bazası ilə işləmək: bağlantı, kursor, sorğular, parametrli sorğular və SQL '
            'injection-dan qorunma, pandas ilə to_sql və read_sql, JOIN, GROUP BY, HAVING və tarix funksiyaları. '
            'Praktika brauzerdə işləyən SQLite bazası üzərində, sonda mini data bazası layihəsi.'
        ),
        'sequential': True,
        'estimated_hours': 6,
        'published': True,
        'topics': ['python', 'sql'],
    },
)
os.makedirs(os.path.join(c.root, 'datasets'))
for f in ['satislar.csv', 'musteriler.csv', 'sifarisler_qisa.csv', 'sifarisler.csv']:
    shutil.copy(os.path.join(DATA, f), os.path.join(c.root, 'datasets', f))
S = 'datasets/satislar.csv'
O = 'datasets/sifarisler.csv'
MS = ['datasets/musteriler.csv', 'datasets/sifarisler_qisa.csv']

P = '''
    import pandas as _pd
    import numpy as _np
'''

# ───────────────────────────── 01 · Giriş ─────────────────────────────
m = c.module('giris', 'Python-dan verilənlər bazasına qoşulma',
             'Niyə baza, sürücülər (driver), bağlantı, kursor, sorğu və təhlükəsizlik.')

m.lesson('niye-baza', 'Python və verilənlər bazaları', 8, '''
    Şirkətlərin datası adətən CSV-də deyil, **verilənlər bazasında** (MySQL, PostgreSQL, SQL Server, Oracle) yaşayır. Analitik datanı ya SQL alətində sorğulayır, ya da **Python-dan bazaya qoşulub** nəticəni birbaşa pandas-a götürür — sonra təmizləyir, təhlil edir, qrafik çəkir və hesabatı avtomatlaşdırır.

    ## Hər bağlantının eyni addımları

    ```text
    1. Sürücünü (driver) import et     →  import mysql.connector
    2. Bağlantı aç                      →  connection = ...connect(host, database, user, password)
    3. Kursor yarat                     →  cursor = connection.cursor()
    4. Sorğunu icra et                  →  cursor.execute("SELECT ...")
    5. Nəticəni götür                   →  rows = cursor.fetchall()
    6. Bağla                            →  cursor.close(); connection.close()
    ```

    ## Gün 9 nümunəsi: MySQL

    ```python
    # !pip install mysql-connector-python
    import os
    import mysql.connector

    connection = mysql.connector.connect(
        host="localhost",                       # serverin ünvanı
        database="satis_db",                    # bazanın adı
        user=os.environ["DB_USER"],             # istifadəçi
        password=os.environ["DB_PASSWORD"],     # parol — koda yazılmır!
    )
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM orders LIMIT 10;")
    for row in cursor.fetchall():
        print(row)
    cursor.close()
    connection.close()
    ```

    ## Sürücülər

    | Baza | Python paketi |
    | --- | --- |
    | SQLite | `sqlite3` — Python ilə birlikdə gəlir |
    | MySQL / MariaDB | `mysql-connector-python`, `PyMySQL` |
    | PostgreSQL | `psycopg2` / `psycopg` |
    | SQL Server | `pyodbc` |
    | Hamısı üçün ümumi qat | `SQLAlchemy` (pandas ilə ən rahat) |

    Slaydlardakı **RODBC** R dilinin paketidir; Python-da onun analoqu `pyodbc` və yuxarıdakı sürücülərdir.

    ## Bu kursda: SQLite

    **SQLite** — server tələb etməyən, bütün bazanı bir faylda (və ya yaddaşda) saxlayan kiçik verilənlər bazasıdır. Python-da hazırdır və DaCy-də brauzerdə işləyir. SQL dili MySQL/PostgreSQL ilə demək olar ki, eynidir — burada öyrəndiklərin real serverlərdə də keçərlidir.

    ```python
    import sqlite3
    con = sqlite3.connect(":memory:")     # yaddaşda müvəqqəti baza
    # con = sqlite3.connect("satis.db")   # faylda
    ```

    ## 🔒 Təhlükəsizlik

    - Parol və istifadəçi adı **mühit dəyişənlərində** saxlanılır, koda yazılmır.
    - Analitikə adətən yalnız **oxuma** hüququ verilir (ən az imtiyaz prinsipi).
    - İstifadəçidən gələn dəyərlər sorğuya **parametr** kimi ötürülür — SQL injection-dan qorunmaq üçün (növbəti fəsildə).
''')

m.quiz('giris-testi', 'Test: bağlantı', [
    classify(
        'Addımları sıraya düz: hansı bağlantı mərhələsinə aiddir?',
        [
            ('Hazırlıq', ['import sqlite3', 'con = sqlite3.connect(...)']),
            ('İş', ['cur = con.cursor()', 'cur.execute("SELECT ...")', 'cur.fetchall()']),
            ('Bitmə', ['con.commit() (dəyişiklik olubsa)', 'con.close()']),
        ],
        'Əvvəl sürücü və bağlantı, sonra kursor, icra və nəticə, sonda yadda saxlama və bağlama.',
    ),
    single('PostgreSQL-ə qoşulmaq üçün hansı paket istifadə olunur?', ['mysql-connector-python', 'psycopg2', 'sqlite3', 'openpyxl'], 2, 'psycopg2/psycopg — PostgreSQL sürücüsü.'),
    single('Bazanın parolu harada saxlanmalıdır?', ['Kodda dəyişən kimi', 'Mühit dəyişənində və ya gizli konfiqurasiyada', 'Notebook-un ilk hüceyrəsində', 'SQL sorğusunun şərhində'], 2, 'Parol heç vaxt koda yazılmır.'),
])

# ───────────────────────────── 02 · sqlite3 əsasları ─────────────────────────────
m = c.module('sqlite3', 'sqlite3: cədvəl, əlavə və sorğu',
             'CREATE TABLE, INSERT və executemany, SELECT, fetchall/fetchone, commit və parametrli sorğular.')

m.lesson('sqlite3-ders', 'sqlite3 ilə ilk baza', 9, '''
    ```python
    import sqlite3

    con = sqlite3.connect(":memory:")
    cur = con.cursor()

    cur.execute("""
        CREATE TABLE mehsullar (
            id INTEGER PRIMARY KEY,
            ad TEXT NOT NULL,
            kateqoriya TEXT,
            qiymet REAL
        )
    """)

    cur.execute("INSERT INTO mehsullar (ad, kateqoriya, qiymet) VALUES (?, ?, ?)",
                ("iPhone 15", "Electronics", 2399))

    data = [("AirPods Pro 2", "Electronics", 599), ("Yoga Mat Pro", "Sports", 59)]
    cur.executemany("INSERT INTO mehsullar (ad, kateqoriya, qiymet) VALUES (?, ?, ?)", data)
    con.commit()            # dəyişiklikləri yadda saxla

    cur.execute("SELECT ad, qiymet FROM mehsullar WHERE qiymet > 500 ORDER BY qiymet DESC")
    print(cur.fetchall())   # [('iPhone 15', 2399.0), ('AirPods Pro 2', 599.0)]
    ```

    | Metod | Nə edir |
    | --- | --- |
    | `execute(sql, parametrlər)` | Bir sorğu |
    | `executemany(sql, siyahı)` | Eyni sorğunu çox sətir üçün |
    | `fetchall()` | Bütün nəticə sətirləri (tuple-ların siyahısı) |
    | `fetchone()` | Növbəti bir sətir |
    | `commit()` | INSERT/UPDATE/DELETE-i yadda saxla |

    ## Parametrli sorğular və SQL injection

    ❌ **Heç vaxt belə etmə:**

    ```python
    seher = input("Şəhər: ")
    cur.execute(f"SELECT * FROM musteriler WHERE seher = '{seher}'")
    ```

    İstifadəçi `' OR '1'='1` yazsa, sorğu bütün müştəriləri qaytarar; daha pis hallarda cədvəli silə bilər. Buna **SQL injection** deyilir.

    ✅ **Belə et** — dəyər ayrıca, parametr kimi:

    ```python
    cur.execute("SELECT * FROM musteriler WHERE seher = ?", (seher,))
    ```

    Sürücü dəyəri təhlükəsiz şəkildə ötürür — o, heç vaxt SQL kodu kimi icra olunmur. (sqlite3-də yer tutucu `?`, MySQL/psycopg2-də `%s`.)

    > ⚠️ Tək parametr də tuple olmalıdır: `(seher,)` — vergül vacibdir.
''')

m.python('ilk-cedvel', 'Cədvəl yarat, doldur, sorğula', 10, '''
    Yaddaşda baza yarat və TechNar-ın bir neçə məhsulunu əlavə et.
''', [
    'sqlite3.connect(":memory:") → con; cur = con.cursor().',
    'mehsullar cədvəli: id INTEGER PRIMARY KEY, ad TEXT, kateqoriya TEXT, qiymet REAL.',
    'mehsul_siyahisi-ni executemany ilə əlavə et və commit et.',
    'Cədvəldəki sətirlərin sayı (SELECT COUNT(*)) → say; Electronics məhsullarının adları qiymətə görə azalan → elektronika (list).',
], '''
    import sqlite3

    mehsul_siyahisi = [
        ("iPhone 15", "Electronics", 2399), ("AirPods Pro 2", "Electronics", 599),
        ("Nike Air Force 1", "Sports", 249), ("Yoga Mat Pro", "Sports", 59),
        ("Dyson V15", "Home Appliances", 1499), ("Zara Basic T-Shirt", "Clothing", 39),
    ]

    con = ...
    cur = ...

    say = ...
    elektronika = ...
    print(say, elektronika)
''', '''
    import sqlite3

    mehsul_siyahisi = [
        ("iPhone 15", "Electronics", 2399), ("AirPods Pro 2", "Electronics", 599),
        ("Nike Air Force 1", "Sports", 249), ("Yoga Mat Pro", "Sports", 59),
        ("Dyson V15", "Home Appliances", 1499), ("Zara Basic T-Shirt", "Clothing", 39),
    ]

    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    cur.execute("CREATE TABLE mehsullar (id INTEGER PRIMARY KEY, ad TEXT, kateqoriya TEXT, qiymet REAL)")
    cur.executemany("INSERT INTO mehsullar (ad, kateqoriya, qiymet) VALUES (?, ?, ?)", mehsul_siyahisi)
    con.commit()

    say = cur.execute("SELECT COUNT(*) FROM mehsullar").fetchone()[0]
    rows = cur.execute(
        "SELECT ad FROM mehsullar WHERE kateqoriya = 'Electronics' ORDER BY qiymet DESC"
    ).fetchall()
    elektronika = [r[0] for r in rows]
    print(say, elektronika)
''', '''
    import sqlite3 as _sq
    assert isinstance(con, _sq.Connection), "con = sqlite3.connect(':memory:')"
    _cols = [r[1] for r in con.execute("PRAGMA table_info(mehsullar)").fetchall()]
    assert _cols == ["id", "ad", "kateqoriya", "qiymet"], f"mehsullar cədvəlinin sütunları: id, ad, kateqoriya, qiymet. Səndə: {_cols}"
    assert con.execute("SELECT COUNT(*) FROM mehsullar").fetchone()[0] == 6, "6 məhsul əlavə olunmalıdır (executemany)"
    assert say == 6, f"say 6 olmalıdır, sənin nəticən: {say!r}"
    assert elektronika == ["iPhone 15", "AirPods Pro 2"], f"elektronika ['iPhone 15', 'AirPods Pro 2'] olmalıdır, sənin nəticən: {elektronika!r}"
    assert "executemany(" in dacy.code, "executemany istifadə et"
''', [
    'cur.execute("CREATE TABLE mehsullar (id INTEGER PRIMARY KEY, ad TEXT, kateqoriya TEXT, qiymet REAL)")',
    'cur.executemany("INSERT INTO mehsullar (ad, kateqoriya, qiymet) VALUES (?, ?, ?)", mehsul_siyahisi); con.commit()',
    'say = cur.execute("SELECT COUNT(*) FROM mehsullar").fetchone()[0]',
])

m.python('parametrli', 'Parametrli sorğu: SQL injection-dan qorun', 10, '''
    Axtarış funksiyası yaz: istifadəçi kateqoriya və maksimum qiymət daxil edir. Dəyərləri sorğuya **parametr** kimi ötür — f-string ilə yox.
''', [
    'axtar(con, kateqoriya, max_qiymet) funksiyası: həmin kateqoriyada qiyməti max_qiymet-dən çox olmayan məhsulların adlarını (əlifba sırası) qaytarsın.',
    'Yer tutucu ? istifadə et: cur.execute(sql, (kateqoriya, max_qiymet)).',
    'Hücum cəhdi: axtar(con, "Sports\' OR \'1\'=\'1", 10000) boş siyahı qaytarmalıdır → hucum.',
], '''
    import sqlite3

    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE mehsullar (ad TEXT, kateqoriya TEXT, qiymet REAL)")
    con.executemany("INSERT INTO mehsullar VALUES (?, ?, ?)", [
        ("iPhone 15", "Electronics", 2399), ("AirPods Pro 2", "Electronics", 599),
        ("Nike Air Force 1", "Sports", 249), ("Yoga Mat Pro", "Sports", 59),
        ("Puma RS-X", "Sports", 199),
    ])


    def axtar(con, kateqoriya, max_qiymet):
        ...


    print(axtar(con, "Sports", 200))
    hucum = ...
''', '''
    import sqlite3

    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE mehsullar (ad TEXT, kateqoriya TEXT, qiymet REAL)")
    con.executemany("INSERT INTO mehsullar VALUES (?, ?, ?)", [
        ("iPhone 15", "Electronics", 2399), ("AirPods Pro 2", "Electronics", 599),
        ("Nike Air Force 1", "Sports", 249), ("Yoga Mat Pro", "Sports", 59),
        ("Puma RS-X", "Sports", 199),
    ])


    def axtar(con, kateqoriya, max_qiymet):
        cur = con.execute(
            "SELECT ad FROM mehsullar WHERE kateqoriya = ? AND qiymet <= ? ORDER BY ad",
            (kateqoriya, max_qiymet),
        )
        return [r[0] for r in cur.fetchall()]


    print(axtar(con, "Sports", 200))
    hucum = axtar(con, "Sports' OR '1'='1", 10000)
''', '''
    assert axtar(con, "Sports", 200) == ["Puma RS-X", "Yoga Mat Pro"], f"axtar(con, 'Sports', 200) ['Puma RS-X', 'Yoga Mat Pro'] olmalıdır, səndə: {axtar(con, 'Sports', 200)!r}"
    assert axtar(con, "Electronics", 3000) == ["AirPods Pro 2", "iPhone 15"], "Electronics, 3000 — iki məhsul (əlifba sırası)"
    assert hucum == [], f"Hücum cəhdi boş siyahı qaytarmalıdır — parametr istifadə et, f-string yox. Səndə: {hucum!r}"
    _src = dacy.code.split("def axtar")[1].split("print(")[0]
    assert "?" in _src and "f\\"" not in _src and "f'" not in _src and ".format(" not in _src, "Sorğuda ? yer tutucularından istifadə et, f-string/format yox"
''', [
    'SQL: "SELECT ad FROM mehsullar WHERE kateqoriya = ? AND qiymet <= ? ORDER BY ad"',
    'con.execute(sql, (kateqoriya, max_qiymet)) — dəyərlər tuple-da',
    '[r[0] for r in cur.fetchall()]',
])

m.quiz('sqlite3-testi', 'Test: sqlite3 və təhlükəsizlik', [
    single('INSERT-dən sonra `commit()` unudulsa (fayl bazasında) nə olur?', ['Heç nə', 'Dəyişikliklər yadda saxlanmaya bilər', 'Xəta verir', 'Cədvəl silinir'], 2, 'commit dəyişiklikləri bazaya yazır.'),
    classify(
        'Hansı yazılış təhlükəsizdir?',
        [
            ('Təhlükəsiz ✅', ['cur.execute("... WHERE seher = ?", (seher,))', 'cur.executemany("INSERT ... VALUES (?, ?)", siyahi)']),
            ('Təhlükəli 🚩', ['cur.execute(f"... WHERE seher = \'{seher}\'")', 'cur.execute("... WHERE ad = \'" + ad + "\'")']),
        ],
        'Parametrlər sürücü tərəfindən təhlükəsiz ötürülür; sətir birləşdirmə SQL injection-a yol açır.',
    ),
    single('`fetchone()` nə qaytarır?', ['Bütün sətirləri', 'Növbəti bir sətri (tuple) və ya None', 'Sətir sayını', 'Sütun adlarını'], 2, 'fetchone — bir sətir.'),
])

# ───────────────────────────── 03 · pandas + SQL ─────────────────────────────
m = c.module('pandas-sql', 'pandas və SQL: to_sql, read_sql, JOIN',
             'DataFrame-i bazaya yazmaq, SQL nəticəsini DataFrame kimi oxumaq, SQL JOIN və pd.merge müqayisəsi.')

m.lesson('pandas-sql-ders', 'pandas ilə baza: to_sql və read_sql_query', 8, '''
    Cursor ilə tuple-larla işləmək əvəzinə nəticəni birbaşa **DataFrame** kimi almaq daha rahatdır.

    ```python
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    df = pd.read_csv("satislar.csv")

    df.to_sql("satislar", con, index=False, if_exists="replace")   # DataFrame → cədvəl

    netice = pd.read_sql_query("""
        SELECT Region, SUM("Total Revenue") AS gelir
        FROM satislar
        GROUP BY Region
        ORDER BY gelir DESC
    """, con)
    ```

    - `if_exists="replace"` — cədvəl varsa əvəz et; `"append"` — sonuna əlavə et; `"fail"` — xəta.
    - Boşluqlu sütun adları SQL-də **qoşa dırnaqda** yazılır: `"Total Revenue"`.
    - Parametrlər: `pd.read_sql_query("... WHERE Region = ?", con, params=("Bakı",))`.

    Real serverlərdə (MySQL, PostgreSQL) pandas **SQLAlchemy** «engine» ilə işləyir:

    ```python
    from sqlalchemy import create_engine
    engine = create_engine(os.environ["DATABASE_URL"])
    df = pd.read_sql_query("SELECT * FROM orders", engine)
    ```

    ## SQL JOIN və pd.merge

    ```sql
    SELECT s.SifarişID, m.Ad, s.Məbləğ
    FROM sifarisler s
    JOIN musteriler m ON m.MüştəriID = s.MüştəriID
    ```

    ```python
    pd.merge(sifarisler, musteriler, on="MüştəriID")   # eyni nəticə
    ```

    | SQL | pandas |
    | --- | --- |
    | `JOIN` / `INNER JOIN` | `how="inner"` |
    | `LEFT JOIN` | `how="left"` |
    | `WHERE` | `df[şərt]` |
    | `GROUP BY` + `SUM` | `groupby(...).sum()` |
    | `ORDER BY ... DESC` | `sort_values(ascending=False)` |
    | `LIMIT 5` | `head(5)` |

    > 💡 Qayda: datanı bazadan **lazım olduğu qədər** götür. Milyonlarla sətri pandas-a çəkib orada filtrləmək əvəzinə `WHERE` və `GROUP BY`-ı bazada et — daha sürətli və yaddaşa qənaətlidir.
''')

m.python('to-sql', 'CSV-ni bazaya yaz və SQL ilə sorğula', 10, '''
    satislar.csv-ni SQLite bazasına köçür və regionlar üzrə gəliri SQL ilə hesabla, sonra nəticəni pandas ilə müqayisə et.
''', [
    'con = sqlite3.connect(":memory:"); df-i "satislar" cədvəli kimi yaz (to_sql, index=False).',
    'SQL ilə regionlar üzrə gəlir (Region, gelir), gəlirə görə azalan → sql_netice (read_sql_query).',
    'Eyni nəticəni pandas ilə hesabla və iki nəticənin eyni olub-olmadığını yoxla → eynidir (True/False).',
    'Bakı regionunun əməliyyat sayını parametrli sorğu ilə tap (params=("Bakı",)) → baki_say.',
], '''
    import sqlite3
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    con = ...

    sql_netice = ...
    eynidir = ...
    baki_say = ...

    print(eynidir, baki_say)
    sql_netice
''', '''
    import sqlite3
    import pandas as pd

    df = pd.read_csv("satislar.csv")
    con = sqlite3.connect(":memory:")
    df.to_sql("satislar", con, index=False)

    sql_netice = pd.read_sql_query("""
        SELECT Region, SUM("Total Revenue") AS gelir
        FROM satislar
        GROUP BY Region
        ORDER BY gelir DESC
    """, con)
    pd_netice = df.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
    eynidir = bool(list(sql_netice["Region"]) == list(pd_netice.index)
                   and ((sql_netice["gelir"].values - pd_netice.values) ** 2).sum() < 1e-6)
    baki_say = pd.read_sql_query("SELECT COUNT(*) AS n FROM satislar WHERE Region = ?", con,
                                 params=("Bakı",))["n"][0]

    print(eynidir, baki_say)
    sql_netice
''', P + '''
    _s = _pd.read_csv("satislar.csv")
    _n = con.execute("SELECT COUNT(*) FROM satislar").fetchone()[0]
    assert _n == len(_s), f"satislar cədvəlində {len(_s)} sətir olmalıdır (to_sql)"
    _g = _s.groupby("Region")["Total Revenue"].sum().sort_values(ascending=False)
    assert isinstance(sql_netice, _pd.DataFrame) and list(sql_netice.columns) == ["Region", "gelir"], "sql_netice sütunları: Region, gelir"
    assert list(sql_netice["Region"]) == list(_g.index) and _np.allclose(sql_netice["gelir"], _g.values), "sql_netice regionlar üzrə gəlir, azalan sırada olmalıdır"
    assert eynidir is True, "eynidir True olmalıdır"
    assert baki_say == (_s["Region"] == "Bakı").sum(), f"baki_say {(_s['Region'] == 'Bakı').sum()} olmalıdır"
    assert "params=" in dacy.code and "read_sql_query(" in dacy.code, "read_sql_query və params istifadə et"
''', [
    'df.to_sql("satislar", con, index=False)',
    'SQL-də boşluqlu sütun qoşa dırnaqda: SUM("Total Revenue") AS gelir ... GROUP BY Region ORDER BY gelir DESC',
    'pd.read_sql_query("SELECT COUNT(*) AS n FROM satislar WHERE Region = ?", con, params=("Bakı",))["n"][0]',
], dataset=S)

m.python('sql-join', 'SQL JOIN və pd.merge', 10, '''
    Müştərilər və sifarişlər cədvəllərini bazaya yaz və SQL JOIN ilə birləşdir.
''', [
    'musteriler.csv → "musteriler", sifarisler_qisa.csv → "sifarisler" cədvəlləri.',
    'SQL INNER JOIN: hər müştərinin adı və ümumi xərci (Ad, xerc), xərcə görə azalan → xerc_sql.',
    'SQL LEFT JOIN ilə sifarişi olmayan müştərilərin adları (əlifba sırası) → sifarissiz.',
], '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("musteriler.csv").to_sql("musteriler", con, index=False)
    pd.read_csv("sifarisler_qisa.csv").to_sql("sifarisler", con, index=False)

    xerc_sql = ...
    sifarissiz = ...

    print(sifarissiz)
    xerc_sql
''', '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("musteriler.csv").to_sql("musteriler", con, index=False)
    pd.read_csv("sifarisler_qisa.csv").to_sql("sifarisler", con, index=False)

    xerc_sql = pd.read_sql_query("""
        SELECT m.Ad, SUM(s.Məbləğ) AS xerc
        FROM sifarisler s
        JOIN musteriler m ON m.MüştəriID = s.MüştəriID
        GROUP BY m.Ad
        ORDER BY xerc DESC
    """, con)
    sifarissiz = pd.read_sql_query("""
        SELECT m.Ad
        FROM musteriler m
        LEFT JOIN sifarisler s ON s.MüştəriID = m.MüştəriID
        WHERE s.SifarişID IS NULL
        ORDER BY m.Ad
    """, con)["Ad"].tolist()

    print(sifarissiz)
    xerc_sql
''', P + '''
    _m = _pd.read_csv("musteriler.csv"); _o = _pd.read_csv("sifarisler_qisa.csv")
    _x = _pd.merge(_o, _m, on="MüştəriID").groupby("Ad")["Məbləğ"].sum().sort_values(ascending=False)
    assert isinstance(xerc_sql, _pd.DataFrame) and list(xerc_sql.columns) == ["Ad", "xerc"], "xerc_sql sütunları: Ad, xerc"
    assert list(xerc_sql["xerc"]) == list(_x.values) and set(xerc_sql["Ad"]) == set(_x.index), f"xerc_sql düzgün deyil: {_x.to_dict()}"
    assert sifarissiz == ["Nigar", "Rauf", "Tural"], f"sifarissiz ['Nigar', 'Rauf', 'Tural'] olmalıdır, səndə: {sifarissiz!r}"
    assert "JOIN" in dacy.code.upper(), "SQL JOIN istifadə et"
''', [
    'FROM sifarisler s JOIN musteriler m ON m.MüştəriID = s.MüştəriID GROUP BY m.Ad ORDER BY xerc DESC',
    'LEFT JOIN-də sifarişi olmayanların s.SifarişID-si NULL olur: WHERE s.SifarişID IS NULL',
    'pd.read_sql_query(sql, con)["Ad"].tolist()',
], dataset=MS)

m.quiz('pandas-sql-testi', 'Test: pandas və SQL', [
    classify(
        'SQL ifadəsinin pandas qarşılığı:',
        [
            ('df[şərt]', ['WHERE Region = \'Bakı\'']),
            ('groupby(...).sum()', ['GROUP BY Region + SUM(...)']),
            ('sort_values(ascending=False)', ['ORDER BY gelir DESC']),
            ('head(5)', ['LIMIT 5']),
        ],
        'SQL və pandas eyni əməliyyatları fərqli sintaksislə edir.',
    ),
    single('`df.to_sql("t", con, if_exists="append")` nə edir?', ['Cədvəli silir', 'Sətirləri mövcud cədvəlin sonuna əlavə edir', 'Xəta verir', 'Cədvəli əvəz edir'], 2, 'append — əlavə, replace — əvəz, fail — xəta.'),
    single('Milyon sətirlik bazadan yalnız Bakı satışlarının cəmi lazımdır. Ən yaxşı yol?', ['Hamısını pandas-a çəkib filtrləmək', 'WHERE və SUM-u SQL sorğusunda etmək', 'CSV-yə ixrac edib Excel-də hesablamaq', 'Hər sətri ayrıca fetchone ilə oxumaq'], 2, 'Filtr və aqreqasiyanı bazada etmək sürətli və qənaətlidir.'),
])

# ───────────────────────────── 04 · Aqreqasiya ─────────────────────────────
m = c.module('aqreqasiya', 'SQL ilə təhlil: GROUP BY, HAVING, tarixlər',
             'Aqreqat funksiyalar, HAVING, ORDER BY və LIMIT, strftime ilə aylıq təhlil.')

m.lesson('aqreqasiya-ders', 'GROUP BY, HAVING və tarix funksiyaları', 8, '''
    ## Aqreqat funksiyalar

    `COUNT(*)`, `SUM(x)`, `AVG(x)`, `MIN(x)`, `MAX(x)`, `COUNT(DISTINCT x)`.

    ```sql
    SELECT "Product Category" AS kateqoriya,
           COUNT(*)            AS emeliyyat,
           SUM("Units Sold")   AS eded,
           ROUND(AVG("Total Revenue"), 2) AS orta_cek
    FROM satislar
    GROUP BY "Product Category"
    ORDER BY eded DESC;
    ```

    ## WHERE və HAVING

    - `WHERE` — qruplaşdırmadan **əvvəl** sətirləri filtrləyir.
    - `HAVING` — qruplaşdırmadan **sonra** qrupları filtrləyir.

    ```sql
    SELECT "Sales Employee", SUM("Total Revenue") AS gelir
    FROM satislar
    WHERE Region = 'Bakı'              -- yalnız Bakı əməliyyatları
    GROUP BY "Sales Employee"
    HAVING SUM("Total Revenue") > 150000   -- yalnız böyük nəticəli satıcılar
    ORDER BY gelir DESC;
    ```

    ## Sorğunun icra sırası

    ```text
    FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
    ```

    Buna görə `WHERE`-də aqreqat (`SUM`) istifadə etmək olmaz — o mərhələdə qruplar hələ yoxdur.

    ## Tarixlər (SQLite)

    SQLite-də tarix mətn kimi saxlanılır (`'2024-03-15'`), funksiyalar isə onu başa düşür:

    ```sql
    SELECT strftime('%Y-%m', Date) AS ay, SUM("Total Revenue") AS gelir
    FROM satislar
    WHERE strftime('%Y', Date) = '2024'
    GROUP BY ay
    ORDER BY ay;
    ```

    MySQL-də: `DATE_FORMAT(Date, '%Y-%m')`, PostgreSQL-də: `TO_CHAR(Date, 'YYYY-MM')` və ya `DATE_TRUNC('month', Date)`.
''')

m.python('top-mehsullar-sql', 'Top məhsullar və kateqoriya xülasəsi', 10, '''
    SQL sorğuları ilə əsas xülasələr.
''', [
    'Satılan ədədə görə top 5 məhsul: Product Name AS mehsul, SUM("Units Sold") AS eded → top5 (DataFrame, LIMIT 5).',
    'Kateqoriyalar üzrə: kateqoriya, emeliyyat (COUNT), eded (SUM Units Sold), orta_cek (ROUND(AVG, 2)), ədədə görə azalan → kateqoriya.',
], '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("satislar.csv").to_sql("satislar", con, index=False)

    top5 = ...
    kateqoriya = ...

    print(top5)
    kateqoriya
''', '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("satislar.csv").to_sql("satislar", con, index=False)

    top5 = pd.read_sql_query("""
        SELECT "Product Name" AS mehsul, SUM("Units Sold") AS eded
        FROM satislar
        GROUP BY "Product Name"
        ORDER BY eded DESC
        LIMIT 5
    """, con)
    kateqoriya = pd.read_sql_query("""
        SELECT "Product Category" AS kateqoriya,
               COUNT(*) AS emeliyyat,
               SUM("Units Sold") AS eded,
               ROUND(AVG("Total Revenue"), 2) AS orta_cek
        FROM satislar
        GROUP BY "Product Category"
        ORDER BY eded DESC
    """, con)

    print(top5)
    kateqoriya
''', P + '''
    _s = _pd.read_csv("satislar.csv")
    _t = _s.groupby("Product Name")["Units Sold"].sum().sort_values(ascending=False).head(5)
    assert isinstance(top5, _pd.DataFrame) and list(top5.columns) == ["mehsul", "eded"] and len(top5) == 5, "top5 — mehsul, eded sütunları, 5 sətir"
    assert list(top5["eded"]) == list(_t.values), f"top5 ədədləri: {list(_t.values)}"
    _k = _s.groupby("Product Category").agg(emeliyyat=("Units Sold", "size"), eded=("Units Sold", "sum"), orta_cek=("Total Revenue", "mean")).sort_values("eded", ascending=False)
    assert isinstance(kateqoriya, _pd.DataFrame) and list(kateqoriya.columns) == ["kateqoriya", "emeliyyat", "eded", "orta_cek"], "kateqoriya sütunları: kateqoriya, emeliyyat, eded, orta_cek"
    assert list(kateqoriya["kateqoriya"]) == list(_k.index) and list(kateqoriya["emeliyyat"]) == list(_k["emeliyyat"]), "kateqoriyalar ədədə görə azalan sırada olmalıdır"
    assert _np.allclose(kateqoriya["orta_cek"], _k["orta_cek"].round(2), atol=0.011), "orta_cek = ROUND(AVG(\\"Total Revenue\\"), 2)"
''', [
    'SELECT "Product Name" AS mehsul, SUM("Units Sold") AS eded FROM satislar GROUP BY "Product Name" ORDER BY eded DESC LIMIT 5',
    'COUNT(*) AS emeliyyat, SUM("Units Sold") AS eded, ROUND(AVG("Total Revenue"), 2) AS orta_cek',
    'pd.read_sql_query(sql, con)',
], dataset=S)

m.python('having-strftime', 'HAVING və aylıq təhlil', 10, '''
    Bakının güclü satıcıları və 2024-ün aylıq gəliri — SQL ilə.
''', [
    'Bakıda gəliri 150 000 ₼-dan çox olan satıcılar: "Sales Employee" AS satici, SUM gəlir AS gelir (2 onluq), gəlirə görə azalan → guclu (WHERE + HAVING).',
    '2024-ün aylar üzrə gəliri: strftime("%Y-%m", Date) AS ay, ROUND(SUM, 2) AS gelir, aya görə artan → ayliq_2024.',
], '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("satislar.csv").to_sql("satislar", con, index=False)

    guclu = ...
    ayliq_2024 = ...

    print(guclu)
    ayliq_2024
''', '''
    import sqlite3
    import pandas as pd

    con = sqlite3.connect(":memory:")
    pd.read_csv("satislar.csv").to_sql("satislar", con, index=False)

    guclu = pd.read_sql_query("""
        SELECT "Sales Employee" AS satici, ROUND(SUM("Total Revenue"), 2) AS gelir
        FROM satislar
        WHERE Region = 'Bakı'
        GROUP BY "Sales Employee"
        HAVING SUM("Total Revenue") > 150000
        ORDER BY gelir DESC
    """, con)
    ayliq_2024 = pd.read_sql_query("""
        SELECT strftime('%Y-%m', Date) AS ay, ROUND(SUM("Total Revenue"), 2) AS gelir
        FROM satislar
        WHERE strftime('%Y', Date) = '2024'
        GROUP BY ay
        ORDER BY ay
    """, con)

    print(guclu)
    ayliq_2024
''', P + '''
    _s = _pd.read_csv("satislar.csv")
    _g = _s[_s["Region"] == "Bakı"].groupby("Sales Employee")["Total Revenue"].sum()
    _g = _g[_g > 150000].sort_values(ascending=False).round(2)
    assert isinstance(guclu, _pd.DataFrame) and list(guclu.columns) == ["satici", "gelir"], "guclu sütunları: satici, gelir"
    assert list(guclu["satici"]) == list(_g.index) and _np.allclose(guclu["gelir"], _g.values), f"guclu: {_g.to_dict()}"
    _y = _s[_s["Date"].str[:4] == "2024"].groupby(_s["Date"].str[:7])["Total Revenue"].sum().round(2)
    assert isinstance(ayliq_2024, _pd.DataFrame) and list(ayliq_2024["ay"]) == list(_y.index), "ayliq_2024 — 2024-ün 12 ayı, artan sırada"
    assert _np.allclose(ayliq_2024["gelir"], _y.values), "ayliq_2024 gəlirləri düzgün deyil"
    assert "HAVING" in dacy.code.upper() and "STRFTIME" in dacy.code.upper(), "HAVING və strftime istifadə et"
''', [
    'WHERE Region = \'Bakı\' GROUP BY "Sales Employee" HAVING SUM("Total Revenue") > 150000 ORDER BY gelir DESC',
    'strftime(\'%Y-%m\', Date) AS ay ... WHERE strftime(\'%Y\', Date) = \'2024\' GROUP BY ay ORDER BY ay',
    'ROUND(SUM("Total Revenue"), 2) AS gelir',
], dataset=S)

m.quiz('aqreqasiya-testi', 'Test: GROUP BY və HAVING', [
    single('WHERE və HAVING fərqi:', ['Fərq yoxdur', 'WHERE sətirləri qruplaşdırmadan əvvəl, HAVING qrupları sonra filtrləyir', 'HAVING yalnız JOIN-də işləyir', 'WHERE yalnız rəqəmlərlə işləyir'], 2, 'Aqreqatla filtr — HAVING.'),
    single('Sorğunun icra sırası düzgün olan variant:', ['SELECT → FROM → WHERE → GROUP BY', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT', 'FROM → GROUP BY → WHERE → SELECT', 'WHERE → FROM → SELECT → HAVING'], 2, 'Buna görə WHERE-də SUM istifadə olunmur.'),
    classify(
        'Hər şərt harada yazılmalıdır?',
        [
            ('WHERE', ["Region = 'Bakı'", "strftime('%Y', Date) = '2024'"]),
            ('HAVING', ['SUM("Total Revenue") > 150000', 'COUNT(*) >= 10']),
        ],
        'Sətir şərtləri WHERE-də, aqreqat şərtləri HAVING-də.',
    ),
])

# ───────────────────────────── 05 · Layihə ─────────────────────────────
m = c.module('layihe', 'Mini layihə: sifarişlər bazası',
             'CSV-dən normallaşdırılmış baza qurmaq və biznes suallarına SQL ilə cavab vermək.')

m.lesson('layihe-izah', 'Layihə: CSV-dən verilənlər bazasına', 6, '''
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
''')

m.python('layihe-baza', 'Layihə: bazanı qur və suallara cavab ver', 15, '''
    sifarisler.csv-dən üç cədvəlli baza qur və biznes suallarına SQL JOIN ilə cavab ver.
''', [
    'musteriler (CustomerID, CustomerName, CustomerSegment, Country, City) və mehsullar (ProductID, ProductName, Category) cədvəllərini drop_duplicates ilə qur; sifarisler cədvəlinə yalnız OrderID, OrderDate, ShipDate, ShipMode, CustomerID, ProductID, Sales, Quantity, Discount, Profit sütunlarını yaz.',
    'Ölkələr üzrə mənfəət (Country, menfeet — 2 onluq), azalan → olke (JOIN musteriler).',
    'Kateqoriyalar üzrə satış və mənfəət (Category, satis, menfeet — 2 onluq) → kateqoriya (JOIN mehsullar).',
    'Ən çox satış (Sales cəmi) gətirən müştərinin adı → top_musteri.',
], '''
    import sqlite3
    import pandas as pd

    o = pd.read_csv("sifarisler.csv")
    con = sqlite3.connect(":memory:")

    # cədvəlləri qur

    olke = ...
    kateqoriya = ...
    top_musteri = ...

    print(top_musteri)
    olke
''', '''
    import sqlite3
    import pandas as pd

    o = pd.read_csv("sifarisler.csv")
    con = sqlite3.connect(":memory:")

    o[["CustomerID", "CustomerName", "CustomerSegment", "Country", "City"]].drop_duplicates().to_sql("musteriler", con, index=False)
    o[["ProductID", "ProductName", "Category"]].drop_duplicates().to_sql("mehsullar", con, index=False)
    o[["OrderID", "OrderDate", "ShipDate", "ShipMode", "CustomerID", "ProductID",
       "Sales", "Quantity", "Discount", "Profit"]].to_sql("sifarisler", con, index=False)

    olke = pd.read_sql_query("""
        SELECT m.Country, ROUND(SUM(s.Profit), 2) AS menfeet
        FROM sifarisler s JOIN musteriler m ON m.CustomerID = s.CustomerID
        GROUP BY m.Country
        ORDER BY menfeet DESC
    """, con)
    kateqoriya = pd.read_sql_query("""
        SELECT p.Category, ROUND(SUM(s.Sales), 2) AS satis, ROUND(SUM(s.Profit), 2) AS menfeet
        FROM sifarisler s JOIN mehsullar p ON p.ProductID = s.ProductID
        GROUP BY p.Category
    """, con)
    top_musteri = pd.read_sql_query("""
        SELECT m.CustomerName, SUM(s.Sales) AS satis
        FROM sifarisler s JOIN musteriler m ON m.CustomerID = s.CustomerID
        GROUP BY m.CustomerID
        ORDER BY satis DESC
        LIMIT 1
    """, con)["CustomerName"][0]

    print(top_musteri)
    olke
''', P + '''
    _o = _pd.read_csv("sifarisler.csv")
    _mc = [r[1] for r in con.execute("PRAGMA table_info(musteriler)").fetchall()]
    _pc = [r[1] for r in con.execute("PRAGMA table_info(mehsullar)").fetchall()]
    _sc = [r[1] for r in con.execute("PRAGMA table_info(sifarisler)").fetchall()]
    assert _mc == ["CustomerID", "CustomerName", "CustomerSegment", "Country", "City"], f"musteriler sütunları düzgün deyil: {_mc}"
    assert _pc == ["ProductID", "ProductName", "Category"], f"mehsullar sütunları düzgün deyil: {_pc}"
    assert "CustomerName" not in _sc and "Country" not in _sc and "ProductName" not in _sc, "sifarisler cədvəlində müştəri/məhsul adları təkrarlanmamalıdır (normallaşdırma)"
    assert con.execute("SELECT COUNT(*) FROM musteriler").fetchone()[0] == _o["CustomerID"].nunique(), "Hər müştəri musteriler-də bir dəfə olmalıdır (drop_duplicates)"
    _c = _o.groupby("Country")["Profit"].sum().sort_values(ascending=False).round(2)
    assert list(olke["Country"]) == list(_c.index) and _np.allclose(olke["menfeet"], _c.values), f"olke: {_c.to_dict()}"
    _k = _o.groupby("Category")[["Sales", "Profit"]].sum().round(2)
    _kk = kateqoriya.set_index("Category").sort_index()
    assert _np.allclose(_kk["satis"], _k["Sales"]) and _np.allclose(_kk["menfeet"], _k["Profit"]), "kateqoriya satış/mənfəət düzgün deyil"
    _t = _o.groupby(["CustomerID", "CustomerName"])["Sales"].sum().idxmax()[1]
    assert top_musteri == _t, f"top_musteri {_t!r} olmalıdır"
''', [
    'o[["CustomerID", "CustomerName", "CustomerSegment", "Country", "City"]].drop_duplicates().to_sql("musteriler", con, index=False)',
    'FROM sifarisler s JOIN musteriler m ON m.CustomerID = s.CustomerID GROUP BY m.Country',
    'Top müştəri: GROUP BY m.CustomerID ORDER BY satis DESC LIMIT 1',
], dataset=O, xp=70)

m.quiz('yekun-test', 'Yekun test: Python & SQL', [
    single('Python ilə gələn sqlite3 hansı bazaya qoşulur?', ['MySQL', 'SQLite (fayl və ya yaddaş)', 'Oracle', 'Hamısına'], 2, 'sqlite3 — SQLite sürücüsü.'),
    single('İstifadəçinin yazdığı şəhər adını sorğuya necə ötürmək lazımdır?', ['f-string ilə', 'Parametr kimi: execute("... = ?", (seher,))', 'Sətir birləşdirmə ilə', 'eval() ilə'], 2, 'Parametrlər SQL injection-dan qoruyur.'),
    single('`pd.read_sql_query(sql, con)` nə qaytarır?', ['Tuple-lar siyahısı', 'DataFrame', 'Kursor', 'JSON'], 2, 'Nəticə birbaşa DataFrame olur.'),
    classify(
        'Hər əməliyyat harada daha səmərəlidir?',
        [
            ('Bazada (SQL)', ['Milyon sətirdən filtr və cəm', 'İki böyük cədvəlin JOIN-i']),
            ('pandas-da', ['Kiçik nəticə üzərində qrafik çəkmək', 'Mürəkkəb mətn təmizləmə (regex)']),
        ],
        'Ağır filtr/aqreqasiya bazada, vizuallaşdırma və çevik emal pandas-da.',
    ),
    single('Aqreqat şərti (SUM > 1000) harada yazılır?', ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], 2, 'Qruplaşdırmadan sonrakı filtr — HAVING.'),
    single('Normallaşdırmanın faydası:', ['Sorğular JOIN-siz olur', 'Təkrarlanan məlumat bir yerdə saxlanılır, yenilənməsi asandır', 'Cədvəl sayı azalır', 'Parol lazım olmur'], 2, 'Təkrar data ayrıca cədvəldə.'),
    multiple(
        'Hansılar Python verilənlər bazası sürücüləridir? (Bir neçə cavab)',
        ['psycopg2', 'mysql-connector-python', 'seaborn', 'pyodbc'],
        [1, 2, 4],
        'seaborn qrafik kitabxanasıdır.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
