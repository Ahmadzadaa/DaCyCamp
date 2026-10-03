"""Python Basics — Python4Business Gün 1–2 (mövcud 7 fəsil, mövzu adları ilə) + yeni fəsillər (Gün 3, 5, 6 materialları)."""
import os
import re
import shutil

from common import Course, classify, multiple, single

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'src_p4b')
DATA = os.path.join(HERE, 'datasets')

c = Course(
    'python-basics',
    {
        '_comment': (
            'Python Basics — Python4Business proqramının əsasları (Gün 1–2 slaydları və tapşırıqları + Gün 3, 5, 6-nın\n'
            'Python mövzuları: sətirlər, lambda/map/filter/reduce, regex, paketlər). Python addımları brauzerdə (Pyodide)\n'
            'işləyir; `pnpm --filter @dacy/web check:python` həll/starter yoxlamasını edir.'
        ),
        'track': 'data-analytics',
        'title': 'Python Basics',
        'level': 'beginner',
        'description': (
            'Python-a sıfırdan başlanğıc — biznes və data analitikası üçün. İş mühiti, məlumat tipləri və strukturları, '
            'şərtlər, funksiyalar, dövrlər, xətaların idarəsi, sətirlər və regex, comprehension və lambda, '
            'standart kitabxana, fayllarla iş və mini layihə. Hər mövzu qısa nəzəriyyə, test və brauzerdə '
            'işləyən praktik tapşırıqlarla.'
        ),
        'sequential': True,
        'estimated_hours': 12,
        'published': True,
        'topics': ['python'],
    },
)

# ── mövcud 7 fəsil (Gün 1–2): qovluq açarları və başlıqlar mövzuya görə ──
RENAME = [
    ('01-g1-giris', '01-giris', 'Python-a giriş və iş mühiti'),
    ('02-g1-tipler', '02-tipler', 'Əsas məlumat tipləri'),
    ('03-g1-strukturlar', '03-strukturlar', 'Məlumat strukturları'),
    ('04-g2-sertler-funksiyalar', '04-sertler-funksiyalar', 'Şərtlər, funksiyalar və modullar'),
    ('05-g2-dovrler', '05-dovrler', 'Dövrlər: for, while, break, continue, pass'),
    ('06-g2-jupyter', '06-jupyter', 'Jupyter: iş direktoriyası, Markdown və ixrac'),
    ('07-g2-xetalar', '07-xetalar', 'Xətaların idarəsi (exceptions)'),
]
shutil.copytree(os.path.join(SRC, 'images'), os.path.join(c.root, 'images'))
for old, new, title in RENAME:
    dst = os.path.join(c.root, 'modules', new)
    shutil.copytree(os.path.join(SRC, 'modules', old), dst)
    p = os.path.join(dst, 'module.yaml')
    s = open(p).read()
    s = re.sub(r"^title: .*$", f"title: '{title}'", s, count=1, flags=re.M)
    open(p, 'w').write(s)
    c.modules += 1
# kurs davam edir — 7-ci fəslin «yekun testi» aralıq test olur
p = os.path.join(c.root, 'modules', '07-xetalar', '03-yekun-testi.yaml')
s = open(p).read().replace("title: 'Yekun test: Gün 1–2'", "title: 'Test: xətalar və 1–7-ci fəsillərin icmalı'")
open(p, 'w').write(s)
os.rename(p, p.replace('03-yekun-testi', '03-icmal-testi'))
# «Kurs haqqında» dərsində kursun yeni adı
p = os.path.join(c.root, 'modules', '01-giris', '01-kurs-haqqinda.md')
s = open(p).read()
s = s.replace(
    '**Python4Business** — biznes və data analitikası üçün Python kursudur.',
    '**Python Basics** — Python4Business proqramının ilk kursudur: biznes və data analitikası üçün Python-un əsasları.',
)
open(p, 'w').write(s)

os.makedirs(os.path.join(c.root, 'datasets'))
for f in ['reyler.txt', 'satis_yanvar.csv']:
    shutil.copy(os.path.join(DATA, f), os.path.join(c.root, 'datasets', f))

# ───────────────────────────── 08 · Sətirlər dərindən ─────────────────────────────
m = c.module('setirler', 'Sətirlər dərindən: indeks, kəsmə, metodlar və f-string',
             'Sətrin simvollarına indekslə müraciət, kəsmə (slicing), əsas metodlar və f-string ilə formatlama.')

m.lesson('indeks-kesme', 'İndeks və kəsmə (slicing)', 7, '''
    Sətir (string) simvolların **sıralı** ardıcıllığıdır. Hər simvolun öz yeri — **indeksi** var və sayma **0-dan** başlayır.

    ```text
     T   e   c   h   N   a   r
     0   1   2   3   4   5   6      ← müsbət indeks
    -7  -6  -5  -4  -3  -2  -1      ← mənfi indeks (sondan)
    ```

    ```python
    ad = "TechNar"
    print(ad[0])    # T  — ilk simvol
    print(ad[4])    # N
    print(ad[-1])   # r  — son simvol
    print(len(ad))  # 7
    ```

    ## Kəsmə: `[başlanğıc:son:addım]`

    Kəsmə sətrin bir hissəsini götürür. **Son indeks daxil deyil.**

    | Yazılış | Nəticə | İzah |
    | --- | --- | --- |
    | `ad[0:4]` | `'Tech'` | 0, 1, 2, 3 |
    | `ad[:4]` | `'Tech'` | başlanğıc buraxılıbsa — əvvəldən |
    | `ad[4:]` | `'Nar'` | son buraxılıbsa — sona qədər |
    | `ad[-3:]` | `'Nar'` | son 3 simvol |
    | `ad[::2]` | `'TcNr'` | hər ikinci simvol |
    | `ad[::-1]` | `'raNhceT'` | tərsinə |

    ## Real nümunə: məhsul kodu

    TechNar anbarında hər məhsulun kodu belədir: `TEC-1001-BAKU-2024` — kateqoriya, nömrə, şəhər, il.

    ```python
    kod = "TEC-1001-BAKU-2024"
    kateqoriya = kod[:3]     # 'TEC'
    nomre = kod[4:8]         # '1001'
    il = kod[-4:]            # '2024'
    ```

    > 💡 Kodların formatı sabit olanda kəsmə çox rahatdır. Format dəyişkəndirsə (məs. hissələrin uzunluğu fərqlidir), `split("-")` daha etibarlıdır — növbəti dərsdə.

    ## Sətirlər dəyişməzdir (immutable)

    Sətrin bir simvolunu yerində dəyişmək olmur:

    ```python
    ad[0] = "M"   # TypeError: 'str' object does not support item assignment
    ```

    Bunun əvəzinə **yeni sətir** yaradılır: `"M" + ad[1:]` → `'MechNar'`. Sətir metodları da (`upper()`, `replace()`...) həmişə yeni sətir qaytarır, orijinalı dəyişmir.
''')

m.lesson('setir-metodlari', 'Sətir metodları və f-string', 8, '''
    Sətirlərlə ən çox görülən işlər — təmizləmək, axtarmaq, bölmək və formatlamaq — hazır **metodlarla** edilir.

    ## Əsas metodlar

    | Metod | Nə edir | Nümunə → nəticə |
    | --- | --- | --- |
    | `upper()` / `lower()` | Böyük / kiçik hərflər | `"Bakı".upper()` → `'BAKI'` |
    | `title()` | Hər sözün ilk hərfi böyük | `"aysel məmmədova".title()` → `'Aysel Məmmədova'` |
    | `strip()` | Kənar boşluqları silir | `"  salam  ".strip()` → `'salam'` |
    | `replace(a, b)` | `a`-nı `b` ilə əvəz edir | `"Credit Card".replace("Credit", "Visa")` → `'Visa Card'` |
    | `split(ayırıcı)` | Siyahıya bölür | `"a-b-c".split("-")` → `['a', 'b', 'c']` |
    | `ayırıcı.join(siyahı)` | Siyahını birləşdirir | `", ".join(["a", "b"])` → `'a, b'` |
    | `find(alt)` | İlk yerin indeksi (yoxdursa −1) | `"TechNar".find("Nar")` → `4` |
    | `count(alt)` | Neçə dəfə keçir | `"banana".count("a")` → `3` |
    | `startswith()` / `endswith()` | Belə başlayır / bitir? | `"iPhone 15".startswith("iPhone")` → `True` |
    | `isdigit()` | Yalnız rəqəmlərdir? | `"2024".isdigit()` → `True` |

    Metodları **zəncirləmək** olar — hər biri yeni sətir qaytarır:

    ```python
    musteri = "   aYSEL məmmədova  "
    print(musteri.strip().title())   # Aysel Məmmədova
    ```

    ## f-string ilə formatlama

    `f"..."` sətrinin içində `{}` mötərizələrinə dəyişən və ifadə yazılır. İki nöqtədən sonra **format** göstərilir:

    | Yazılış | Nəticə | Mənası |
    | --- | --- | --- |
    | `f"{2399:.2f}"` | `2399.00` | 2 onluq rəqəm |
    | `f"{1690500.5:,.2f}"` | `1,690,500.50` | minliklər ayrılır |
    | `f"{0.256:.1%}"` | `25.6%` | faiz |
    | `f"{'Bakı':>8}"` | `'    Bakı'` | sağa düzləndir (8 simvol) |
    | `f"{7:03d}"` | `007` | sıfırlarla doldur |

    ```python
    mehsul, say, qiymet = "AirPods Pro 2", 2, 599
    print(f"{mehsul} x{say} = {say * qiymet:.2f} ₼")
    # AirPods Pro 2 x2 = 1198.00 ₼
    ```

    ## Xüsusi simvollar

    - `\\n` — yeni sətir, `\\t` — tab.
    - Sətrin içində dırnaq: `"Levi's 501"` (fərqli dırnaq növü) və ya `'Levi\\'s 501'`.
''')

m.python('indeks-kesme-tapsiriq', 'Məhsul kodunu hissələrə ayır', 8, '''
    TechNar anbarında hər məhsulun kodu sabit formatdadır: **kateqoriya (3) – nömrə (4) – şəhər – il (4)**.

    Kodu indeks və kəsmə ilə hissələrə ayır. `split()` istifadə etmə — bu tapşırıq kəsməni məşq etmək üçündür.
''', [
    'kod-un ilk 3 simvolunu kateqoriya dəyişəninə yaz.',
    'Son 4 simvolu (il) il dəyişəninə yaz.',
    'Nömrə hissəsini ("1001") nomre dəyişəninə yaz.',
    'Kodu tərsinə çevir (terse) və dörd dəyəri ayrı-ayrı ekrana yazdır.',
], '''
    kod = "TEC-1001-BAKU-2024"

    kateqoriya = ...
    il = ...
    nomre = ...
    terse = ...

    print(kateqoriya)
    print(il)
    print(nomre)
    print(terse)
''', '''
    kod = "TEC-1001-BAKU-2024"

    kateqoriya = kod[:3]
    il = kod[-4:]
    nomre = kod[4:8]
    terse = kod[::-1]

    print(kateqoriya)
    print(il)
    print(nomre)
    print(terse)
''', '''
    assert kateqoriya == "TEC", f'kateqoriya "TEC" olmalıdır, sənin nəticən: {kateqoriya!r}'
    assert il == "2024", f'il "2024" olmalıdır, sənin nəticən: {il!r}'
    assert nomre == "1001", f'nomre "1001" olmalıdır (indeks 4-dən 8-ə qədər), sənin nəticən: {nomre!r}'
    assert terse == kod[::-1], f"terse kodun tərsi olmalıdır: {kod[::-1]!r}, sənin nəticən: {terse!r}"
    assert "split(" not in dacy.code, "Bu tapşırıqda split() yox, kəsmə ([a:b]) istifadə et"
    assert "[" in dacy.code and ":" in dacy.code, "Kəsmədən istifadə et: kod[a:b]"
    for _v in ("TEC", "2024", "1001", kod[::-1]):
        assert _v in dacy.lines, f"Ekranda {_v} görünmür — print() ilə yazdır"
''', [
    'İlk 3 simvol: kod[:3]. Son 4 simvol: kod[-4:].',
    '"TEC-" 4 simvoldur, ona görə nömrə indeks 4-dən başlayır və 4 simvoldur: kod[4:8].',
    'Tərsinə çevirmək üçün addım −1 olur: kod[::-1].',
])

m.python('setir-metodlari-tapsiriq', 'Müştəri məlumatlarını təmizlə', 10, '''
    CRM sistemindən gələn məlumatlar səliqəsizdir: artıq boşluqlar, qarışıq böyük-kiçik hərflər. Sətir metodları ilə onları təmizlə.
''', [
    'musteri sətrindən kənar boşluqları sil və hər sözü böyük hərflə başlat → ad_temiz ("Aysel Məmmədova").',
    'email-i kiçik hərflərə çevir → email_kicik.',
    'Kiçik hərfli e-poçtu "@" işarəsinə görə böl və domeni götür → domen ("gmail.com").',
    'mesaj sətrində "Sifariş" sözünün neçə dəfə keçdiyini say → say.',
    'mesaj "Sifariş" sözü ilə başlayırmı? → baslayir (True/False). Beş dəyəri ekrana yazdır.',
], '''
    musteri = "   aYSEL məmmədova   "
    email = "Aysel.Mammadova@Gmail.COM"
    mesaj = "Sifariş çatdırıldı. Sifariş nömrəsi: 1045. Sifariş üçün təşəkkürlər!"

    ad_temiz = ...
    email_kicik = ...
    domen = ...
    say = ...
    baslayir = ...

    print(ad_temiz)
    print(email_kicik)
    print(domen)
    print(say)
    print(baslayir)
''', '''
    musteri = "   aYSEL məmmədova   "
    email = "Aysel.Mammadova@Gmail.COM"
    mesaj = "Sifariş çatdırıldı. Sifariş nömrəsi: 1045. Sifariş üçün təşəkkürlər!"

    ad_temiz = musteri.strip().title()
    email_kicik = email.lower()
    domen = email_kicik.split("@")[1]
    say = mesaj.count("Sifariş")
    baslayir = mesaj.startswith("Sifariş")

    print(ad_temiz)
    print(email_kicik)
    print(domen)
    print(say)
    print(baslayir)
''', '''
    assert ad_temiz == "Aysel Məmmədova", f'ad_temiz "Aysel Məmmədova" olmalıdır, sənin nəticən: {ad_temiz!r}'
    assert email_kicik == "aysel.mammadova@gmail.com", f"email_kicik kiçik hərflərlə olmalıdır, sənin nəticən: {email_kicik!r}"
    assert domen == "gmail.com", f'domen "gmail.com" olmalıdır, sənin nəticən: {domen!r}'
    assert say == 3, f"say 3 olmalıdır, sənin nəticən: {say!r}"
    assert baslayir is True, f"baslayir True olmalıdır, sənin nəticən: {baslayir!r}"
    assert ".strip()" in dacy.code and ".title()" in dacy.code, "strip() və title() metodlarından istifadə et"
    assert ".split(" in dacy.code and ".count(" in dacy.code, "split() və count() metodlarından istifadə et"
    for _v in ("Aysel Məmmədova", "aysel.mammadova@gmail.com", "gmail.com", "3", "True"):
        assert _v in dacy.lines, f"Ekranda {_v} görünmür"
''', [
    'Metodları zəncirlə: musteri.strip().title()',
    'domen = email_kicik.split("@")[1] — split siyahı qaytarır, [1] ikinci hissədir.',
    'say = mesaj.count("Sifariş"); baslayir = mesaj.startswith("Sifariş")',
])

m.python('f-string-qebz', 'f-string ilə satış qəbzi', 10, '''
    Kassada çap olunan qəbzi f-string ilə formatla. Məbləğlər həmişə **2 onluq rəqəmlə** göstərilməlidir.

    Hər məhsul üçün sətir belə olmalıdır:

    ```text
    iPhone 15 x1 = 2399.00 ₼
    ```

    Sonda cəmi və ƏDV (18%) sətirləri:

    ```text
    Cəmi: 3716.70 ₼
    ƏDV (18%): 669.01 ₼
    ```
''', [
    'for dövrü ilə hər məhsul üçün "ad xsay = məbləğ ₼" sətrini yazdır (məbləğ = say × qiymət).',
    'Bütün məbləğlərin cəmini cemi dəyişənində topla və "Cəmi: ... ₼" yazdır.',
    'Cəminin 18%-ni edv dəyişəninə yaz və "ƏDV (18%): ... ₼" yazdır.',
], '''
    sebet = [
        ("iPhone 15", 1, 2399.0),
        ("AirPods Pro 2", 2, 599.0),
        ("Zara Basic T-Shirt", 3, 39.9),
    ]

    cemi = 0
    for ad, say, qiymet in sebet:
        mebleg = say * qiymet
        # sətri f-string ilə yazdır

    edv = ...
''', '''
    sebet = [
        ("iPhone 15", 1, 2399.0),
        ("AirPods Pro 2", 2, 599.0),
        ("Zara Basic T-Shirt", 3, 39.9),
    ]

    cemi = 0
    for ad, say, qiymet in sebet:
        mebleg = say * qiymet
        cemi += mebleg
        print(f"{ad} x{say} = {mebleg:.2f} ₼")

    print(f"Cəmi: {cemi:.2f} ₼")
    edv = cemi * 0.18
    print(f"ƏDV (18%): {edv:.2f} ₼")
''', '''
    assert abs(cemi - 3716.7) < 0.01, f"cemi 3716.70 olmalıdır, sənin nəticən: {cemi!r}"
    assert abs(edv - 3716.7 * 0.18) < 0.01, f"edv cəminin 18%-i olmalıdır (669.01), sənin nəticən: {edv!r}"
    for _v in ("iPhone 15 x1 = 2399.00 ₼", "AirPods Pro 2 x2 = 1198.00 ₼", "Zara Basic T-Shirt x3 = 119.70 ₼",
               "Cəmi: 3716.70 ₼", "ƏDV (18%): 669.01 ₼"):
        assert _v in dacy.lines, f"Ekranda bu sətir görünmür: {_v}"
    assert 'f"' in dacy.code or "f'" in dacy.code, "f-string-dən istifadə et"
''', [
    'Dövrün içində: cemi += mebleg və print(f"{ad} x{say} = {mebleg:.2f} ₼")',
    ':.2f formatı ədədi 2 onluq rəqəmlə göstərir: 119.7 → 119.70',
    'ƏDV: edv = cemi * 0.18, sonra print(f"ƏDV (18%): {edv:.2f} ₼")',
])

m.quiz('setirler-testi', 'Test: sətirlər', [
    classify(
        'Hər sətir metodunu qaytardığı nəticənin tipinə görə qruplaşdır.',
        [
            ('Yeni sətir (str)', ['"abc".upper()', '"  x ".strip()', '"a-b".replace("-", "+")']),
            ('Siyahı (list)', ['"a,b,c".split(",")']),
            ('Ədəd (int)', ['"banana".count("a")', '"TechNar".find("Nar")', 'len("Bakı")']),
            ('Boolean (bool)', ['"2024".isdigit()', '"iPhone 15".startswith("iPhone")']),
        ],
        'Təmizləmə və əvəzetmə metodları yeni sətir, split() siyahı, count()/find()/len() ədəd, is…/starts…/ends… metodları isə True/False qaytarır.',
    ),
    single(
        '`s = "Python"` olduqda `s[1:4]` nəyə bərabərdir?',
        ["'Pyt'", "'yth'", "'ytho'", "'Pyth'"],
        2,
        'Kəsmə indeks 1-dən başlayır və 4-cü indeks daxil deyil: y(1), t(2), h(3).',
    ),
    single(
        '`ad = "Bakı"` olduqda `ad[0] = "b"` əmri nə edir?',
        ["Sətri 'bakı' edir", 'TypeError verir — sətirlər dəyişməzdir', 'Heç nə etmir', "Sətrin sonuna 'b' əlavə edir"],
        2,
        'Sətirlər dəyişməzdir (immutable). Yeni sətir yaratmaq lazımdır: "b" + ad[1:].',
    ),
    single(
        '`f"{0.256:.1%}"` nə yazdırır?',
        ['0.256', '25.6%', '0.3%', '26%'],
        2,
        ':.1% formatı ədədi 100-ə vurub bir onluqla faiz kimi göstərir.',
    ),
])

# ───────────────────────────── 09 · Funksional alətlər ─────────────────────────────
m = c.module('funksional', 'Comprehension, lambda, map, filter və reduce',
             'Siyahıları qısa yazılışla yaratmaq, sıralama açarı, lambda funksiyaları, map/filter/reduce və eval.')

m.lesson('comprehension', 'List comprehension və sıralama', 8, '''
    Data ilə işləyəndə tez-tez bir siyahıdan başqa siyahı yaradırıq: qiymətlərə ƏDV əlavə etmək, bahalı məhsulları seçmək... Bunu `for` dövrü ilə də etmək olar, amma Python-da daha qısa və oxunaqlı yol var — **comprehension**.

    ## List comprehension

    ```python
    qiymetler = [2399, 549, 39, 899]

    # for dövrü ilə
    edv_li = []
    for q in qiymetler:
        edv_li.append(q * 1.18)

    # list comprehension ilə — eyni nəticə, bir sətirdə
    edv_li = [q * 1.18 for q in qiymetler]
    ```

    Quruluş: **`[ifadə for element in siyahı]`**.

    ## Şərtlə seçmək

    ```python
    bahali = [q for q in qiymetler if q > 500]   # [2399, 549, 899]
    ```

    Quruluş: **`[ifadə for element in siyahı if şərt]`**.

    ## Dictionary və set comprehension

    ```python
    mehsullar = ["iPhone 15", "Redmi Note 13"]
    qiymetler = [2399, 549]

    cedvel = {m: q for m, q in zip(mehsullar, qiymetler)}
    # {'iPhone 15': 2399, 'Redmi Note 13': 549}

    seherler = {s.strip().title() for s in ["bakı", " Bakı", "gəncə"]}
    # {'Bakı', 'Gəncə'} — set təkrarları atır
    ```

    `zip()` iki siyahını cüt-cüt birləşdirir: `("iPhone 15", 2399)`, `("Redmi Note 13", 549)`.

    ## Sıralama: `sorted()` və `key`

    ```python
    sorted([3, 1, 2])                 # [1, 2, 3]
    sorted([3, 1, 2], reverse=True)   # [3, 2, 1]
    ```

    Mürəkkəb elementləri sıralamaq üçün **`key`** — hər elementdən sıralama dəyərini çıxaran funksiya:

    ```python
    mehsullar = [("iPhone 15", 2399), ("T-Shirt", 39), ("Dyson V15", 1499)]
    sorted(mehsullar, key=lambda m: m[1])
    # [('T-Shirt', 39), ('Dyson V15', 1499), ('iPhone 15', 2399)]

    max(mehsullar, key=lambda m: m[1])   # ('iPhone 15', 2399)
    ```

    > 💡 `lambda m: m[1]` — «elementi götür, onun ikinci hissəsini (qiyməti) qaytar» deməkdir. Növbəti dərsdə lambda-nı ətraflı öyrənəcəyik.
''')

m.lesson('lambda-map-filter-reduce', 'lambda, map, filter, reduce və eval', 8, '''
    ## lambda — adsız, qısa funksiya

    ```python
    def kvadrat(x):
        return x ** 2

    kvadrat = lambda x: x ** 2    # eyni funksiya, bir sətirdə
    ```

    `lambda arqumentlər: ifadə` — adətən bir dəfə, başqa funksiyanın içində istifadə olunan kiçik funksiyalar üçündür: `sorted(..., key=lambda ...)`, `map()`, `filter()`, sonra pandas-da `apply()`.

    ## map — hər elementə funksiya tətbiq et

    ```python
    satislar = [120.5, 89.9, 300.0]
    endirimli = list(map(lambda x: x * 0.9, satislar))
    # [108.45, 80.91, 270.0]
    ```

    `map()` «tənbəl» obyekt qaytarır — nəticəni görmək üçün `list()` ilə siyahıya çeviririk.

    ## filter — şərtə uyğun elementləri saxla

    ```python
    boyuk = list(filter(lambda x: x > 100, satislar))   # [120.5, 300.0]
    ```

    ## reduce — ardıcıllığı tək dəyərə «yığ»

    `reduce` `functools` modulundadır. Funksiyanı ilk iki elementə, sonra nəticəyə və növbəti elementə tətbiq edir:

    ```python
    from functools import reduce

    cem = reduce(lambda x, y: x + y, [1, 2, 3, 4, 5])
    # ((((1 + 2) + 3) + 4) + 5) = 15
    ```

    | Alət | Giriş | Nəticə |
    | --- | --- | --- |
    | `map(f, siyahı)` | n element | n element (çevrilmiş) |
    | `filter(f, siyahı)` | n element | ≤ n element (seçilmiş) |
    | `reduce(f, siyahı)` | n element | 1 dəyər |

    > 📝 Comprehension çox vaxt `map`/`filter`-dən daha oxunaqlıdır: `[x * 0.9 for x in satislar]`. Hər iki yazılışı tanımaq vacibdir — başqalarının kodunda ikisi də olur.

    ## eval — sətri Python ifadəsi kimi icra etmək

    ```python
    eval("5 + 10")      # 15
    x = 10
    eval("x * 2")       # 20
    ```

    ⚠️ **Təhlükəsizlik:** `eval()` istifadəçidən və ya internetdən gələn mətni **heç vaxt** icra etməməlidir — həmin mətn istənilən Python kodu ola bilər (faylları silmək, məlumat oğurlamaq). Pandas-da isə `df.eval("A + B")` təhlükəsiz, sütunlarla hesablama üçün nəzərdə tutulmuş başqa alətdir — onu Pandas kursunda görəcəyik.
''')

m.python('comprehension-tapsiriq', 'List və dictionary comprehension', 10, '''
    TechNar-ın qiymət siyahısı ilə işləyirik. Hər bəndi **comprehension** ilə yaz (`for` dövrü ilə `append` yox).
''', [
    'Hər qiymətə 18% ƏDV əlavə et və 2 onluğa yuvarlaqlaşdır → edv_li (list comprehension, round(..., 2)).',
    'Yalnız 500 ₼-dan baha olan qiymətləri seç → bahali.',
    'mehsullar və qiymetler siyahılarından {məhsul: qiymət} dictionary-si yarat → qiymet_cedveli (zip ilə).',
], '''
    mehsullar = ["iPhone 15", "Redmi Note 13", "T-Shirt", "Apple Watch", "Nivea", "Air Fryer", "Dyson V15"]
    qiymetler = [2399, 549, 39, 899, 12, 329, 1499]

    edv_li = ...
    bahali = ...
    qiymet_cedveli = ...

    print(edv_li)
    print(bahali)
    print(qiymet_cedveli)
''', '''
    mehsullar = ["iPhone 15", "Redmi Note 13", "T-Shirt", "Apple Watch", "Nivea", "Air Fryer", "Dyson V15"]
    qiymetler = [2399, 549, 39, 899, 12, 329, 1499]

    edv_li = [round(q * 1.18, 2) for q in qiymetler]
    bahali = [q for q in qiymetler if q > 500]
    qiymet_cedveli = {m: q for m, q in zip(mehsullar, qiymetler)}

    print(edv_li)
    print(bahali)
    print(qiymet_cedveli)
''', '''
    import re as _re
    _exp = [round(q * 1.18, 2) for q in qiymetler]
    assert edv_li == _exp, f"edv_li {_exp} olmalıdır, sənin nəticən: {edv_li!r}"
    assert bahali == [2399, 549, 899, 1499], f"bahali [2399, 549, 899, 1499] olmalıdır, sənin nəticən: {bahali!r}"
    assert qiymet_cedveli == dict(zip(mehsullar, qiymetler)), f"qiymet_cedveli düzgün deyil: {qiymet_cedveli!r}"
    assert len(_re.findall(r"[\\[{][^\\]}]*\\bfor\\b[^\\]}]*\\bin\\b", dacy.code)) >= 3, "Hər üç bəndi comprehension ilə yaz: [... for ... in ...] və {... for ... in ...}"
    assert ".append(" not in dacy.code, "append() əvəzinə comprehension istifadə et"
''', [
    'edv_li = [round(q * 1.18, 2) for q in qiymetler]',
    'Şərt sona yazılır: [q for q in qiymetler if q > 500]',
    'Dictionary: {m: q for m, q in zip(mehsullar, qiymetler)}',
])

m.python('sorted-lambda', 'Sıralama, max və lambda', 10, '''
    Hər məhsul `(ad, qiymət, satış sayı)` şəklində tuple-dır. `sorted()` və `max()` funksiyalarına `key=lambda ...` verərək sıralama meyarını özün seç.
''', [
    'Məhsulları qiymətə görə ucuzdan bahaya sırala → ucuzdan (tuple-ların siyahısı).',
    'Satış sayına görə çoxdan aza sırala və ilk 3 məhsulun yalnız adlarını götür → top3.',
    'Ən çox gəlir (qiymət × say) gətirən məhsulun adını tap → lider (max + key).',
], '''
    mehsullar = [
        ("iPhone 15", 2399, 38),
        ("Redmi Note 13", 549, 120),
        ("AirPods Pro 2", 599, 95),
        ("Dyson V15", 1499, 12),
        ("Zara T-Shirt", 39, 310),
    ]

    ucuzdan = ...
    top3 = ...
    lider = ...

    print(ucuzdan)
    print(top3)
    print(lider)
''', '''
    mehsullar = [
        ("iPhone 15", 2399, 38),
        ("Redmi Note 13", 549, 120),
        ("AirPods Pro 2", 599, 95),
        ("Dyson V15", 1499, 12),
        ("Zara T-Shirt", 39, 310),
    ]

    ucuzdan = sorted(mehsullar, key=lambda m: m[1])
    top3 = [m[0] for m in sorted(mehsullar, key=lambda m: m[2], reverse=True)[:3]]
    lider = max(mehsullar, key=lambda m: m[1] * m[2])[0]

    print(ucuzdan)
    print(top3)
    print(lider)
''', '''
    assert ucuzdan == sorted(mehsullar, key=lambda m: m[1]), f"ucuzdan qiymətə görə artan sırada olmalıdır, sənin nəticən: {ucuzdan!r}"
    assert top3 == ["Zara T-Shirt", "Redmi Note 13", "AirPods Pro 2"], f"top3 ['Zara T-Shirt', 'Redmi Note 13', 'AirPods Pro 2'] olmalıdır, sənin nəticən: {top3!r}"
    assert lider == "iPhone 15", f'lider "iPhone 15" olmalıdır (2399 × 38 = 91162 ₼), sənin nəticən: {lider!r}'
    assert "lambda" in dacy.code and "key=" in dacy.code, "sorted()/max() funksiyalarına key=lambda ... ver"
''', [
    'ucuzdan = sorted(mehsullar, key=lambda m: m[1]) — m[1] qiymətdir.',
    'Çoxdan aza: sorted(..., key=lambda m: m[2], reverse=True)[:3], sonra adları comprehension ilə götür.',
    'lider = max(mehsullar, key=lambda m: m[1] * m[2])[0] — [0] adı verir.',
])

m.python('map-filter-reduce', 'map, filter və reduce', 10, '''
    Gün ərzindəki satış məbləğləri üzərində üç əməliyyatı funksional alətlərlə et.
''', [
    'map ilə hər satışı 10% endirimlə hesabla və 2 onluğa yuvarlaqlaşdır → endirimli (list).',
    'filter ilə 100 ₼-dan böyük satışları seç → boyuk (list).',
    'reduce ilə bütün satışların cəmini hesabla və 2 onluğa yuvarlaqlaşdır → cem.',
], '''
    from functools import reduce

    satislar = [120.5, 89.9, 300.0, 45.25, 610.0, 15.0]

    endirimli = ...
    boyuk = ...
    cem = ...

    print(endirimli)
    print(boyuk)
    print(cem)
''', '''
    from functools import reduce

    satislar = [120.5, 89.9, 300.0, 45.25, 610.0, 15.0]

    endirimli = list(map(lambda x: round(x * 0.9, 2), satislar))
    boyuk = list(filter(lambda x: x > 100, satislar))
    cem = round(reduce(lambda x, y: x + y, satislar), 2)

    print(endirimli)
    print(boyuk)
    print(cem)
''', '''
    _exp = [round(x * 0.9, 2) for x in satislar]
    assert isinstance(endirimli, list), "endirimli siyahı olmalıdır — map() nəticəsini list() ilə çevir"
    assert endirimli == _exp, f"endirimli {_exp} olmalıdır, sənin nəticən: {endirimli!r}"
    assert boyuk == [120.5, 300.0, 610.0], f"boyuk [120.5, 300.0, 610.0] olmalıdır, sənin nəticən: {boyuk!r}"
    assert cem == 1180.65, f"cem 1180.65 olmalıdır, sənin nəticən: {cem!r}"
    for _f in ("map(", "filter(", "reduce("):
        assert _f in dacy.code, f"{_f[:-1]}() funksiyasından istifadə et"
''', [
    'endirimli = list(map(lambda x: round(x * 0.9, 2), satislar))',
    'boyuk = list(filter(lambda x: x > 100, satislar))',
    'cem = round(reduce(lambda x, y: x + y, satislar), 2)',
])

m.quiz('funksional-testi', 'Test: comprehension və funksional alətlər', [
    classify(
        'Hər təsviri uyğun alətə yerləşdir.',
        [
            ('map', ['Hər qiymətə ƏDV əlavə etmək', 'Hər adı böyük hərflərə çevirmək']),
            ('filter', ['Yalnız 100 ₼-dan böyük satışları saxlamaq', 'Boş sətirləri atmaq']),
            ('reduce', ['Bütün satışların cəmini tək ədədə yığmaq', 'Siyahıdakı ədədlərin hasilini tapmaq']),
        ],
        'map hər elementi çevirir (say dəyişmir), filter şərtə uyğun olanları saxlayır, reduce bütün elementləri bir dəyərə yığır.',
    ),
    single(
        '`[x * 2 for x in [1, 2, 3] if x != 2]` nəyə bərabərdir?',
        ['[2, 4, 6]', '[2, 6]', '[1, 3]', '[4]'],
        2,
        'Şərt 2-ni atır: 1 → 2, 3 → 6.',
    ),
    single(
        '`sorted(mehsullar, key=lambda m: m[1], reverse=True)` nə edir? (m = (ad, qiymət))',
        [
            'Məhsulları ada görə əlifba sırası ilə düzür',
            'Məhsulları qiymətə görə bahadan ucuza düzür',
            'Məhsulları qiymətə görə ucuzdan bahaya düzür',
            'Yalnız ən bahalı məhsulu qaytarır',
        ],
        2,
        'key=lambda m: m[1] — qiymətə görə; reverse=True — azalan sıra.',
    ),
    single(
        'Saytın axtarış sahəsinə yazılan mətni `eval()` ilə icra etmək niyə təhlükəlidir?',
        [
            'eval() çox yavaş işləyir',
            'İstifadəçi istənilən Python kodu yaza və icra etdirə bilər',
            'eval() yalnız ədədlərlə işləyir',
            'Təhlükəli deyil',
        ],
        2,
        'eval() mətni kod kimi icra edir. Kənardan gələn mətn heç vaxt eval() ilə işlədilməməlidir.',
    ),
])


# ───────────────────────────── 10 · Regular expressions ─────────────────────────────
m = c.module('regex', 'Regular expressions (re modulu)',
             'Mətndə nümunə (pattern) axtarmaq, tapmaq, əvəz etmək və bölmək: re.search, findall, sub, split.')

m.lesson('regex-giris', 'Regex nədir? re modulunun əsas funksiyaları', 8, '''
    Müştəri rəylərindən bütün telefon nömrələrini, sifariş qeydlərindən bütün kodları və ya e-poçt ünvanlarını çıxarmaq lazımdır. `find()` və `split()` bir konkret sözü tapır, amma «+994 ilə başlayan istənilən nömrə» kimi **nümunəni** tapa bilmir. Bunun üçün **regular expressions** (regex, mütəmadi ifadələr) var.

    Python-da regex `re` modulu ilə işləyir:

    ```python
    import re
    ```

    ## Dörd əsas funksiya

    | Funksiya | Nə edir | Qaytarır |
    | --- | --- | --- |
    | `re.search(nümunə, mətn)` | İlk uyğunluğu tapır | `Match` obyekti və ya `None` |
    | `re.findall(nümunə, mətn)` | Bütün uyğunluqları tapır | Siyahı |
    | `re.sub(nümunə, yeni, mətn)` | Uyğunluqları əvəz edir | Yeni sətir |
    | `re.split(nümunə, mətn)` | Uyğunluqlara görə bölür | Siyahı |

    ```python
    metn = "Salam dünya! Salam hamıya!"

    m = re.search(r"dünya", metn)
    if m:
        print(m.group())                 # dünya

    re.findall(r"Salam", metn)           # ['Salam', 'Salam']
    re.sub(r"dünya", "planet", metn)     # 'Salam planet! Salam hamıya!'
    re.split(r",", "Salam,dünya,hamıya") # ['Salam', 'dünya', 'hamıya']
    ```

    ## Niyə `r"..."`?

    Nümunələrdə tərs xətt (`\\`) çox olur: `\\d` — rəqəm, `\\s` — boşluq. Adi sətirdə `\\` xüsusi mənalıdır (`\\n` — yeni sətir), ona görə nümunələri **raw string** — `r"..."` kimi yazırıq: `r"\\d+"`.

    ## Match obyekti

    `re.search()` uyğunluq tapanda `Match` obyekti qaytarır:

    ```python
    m = re.search(r"\\d+", "Sifariş 1045 çatdırıldı")
    m.group()    # '1045'  — tapılan mətn
    m.start()    # 8       — başladığı indeks
    ```

    Tapmayanda `None` qaytarır — buna görə nəticəni əvvəlcə `if m:` ilə yoxlayırıq.
''')

m.lesson('regex-sintaksis', 'Regex sintaksisi: simvollar, saylar, qruplar', 9, '''
    ## Simvol sinifləri

    | Nümunə | Uyğun gəlir |
    | --- | --- |
    | `.` | İstənilən bir simvol (yeni sətirdən başqa) |
    | `\\d` | Rəqəm (0–9) |
    | `\\w` | Hərf, rəqəm və ya `_` |
    | `\\s` | Boşluq simvolu (boşluq, tab, yeni sətir) |
    | `[abc]` | `a`, `b` və ya `c` |
    | `[A-Z]` | Böyük latın hərfi |
    | `[^0-9]` | Rəqəm **olmayan** simvol |

    ## Say göstəriciləri (quantifiers)

    | Nümunə | Mənası |
    | --- | --- |
    | `*` | 0 və ya daha çox |
    | `+` | 1 və ya daha çox |
    | `?` | 0 və ya 1 |
    | `{n}` | Dəqiq n dəfə |
    | `{n,m}` | n-dən m-ə qədər |

    ## Mövqe və seçim

    | Nümunə | Mənası |
    | --- | --- |
    | `^` | Sətrin əvvəli |
    | `$` | Sətrin sonu |
    | `a\\|b` | `a` və ya `b` |
    | `\\.` | Nöqtənin özü (xüsusi simvolu adi simvol etmək üçün `\\`) |

    ## Qruplar `( )`

    Mötərizə nümunənin bir hissəsini **ayırır**. `findall` qrup olanda yalnız qrupun içini qaytarır:

    ```python
    metn = "Sifariş #A-10234 və #B-20871"
    re.findall(r"#[A-Z]-\\d+", metn)     # ['#A-10234', '#B-20871']
    re.findall(r"#([A-Z]-\\d+)", metn)   # ['A-10234', 'B-20871']  — # olmadan
    ```

    ## Real nümunələr

    ```python
    # Azərbaycan mobil nömrəsi: +994 50 123 45 67
    r"\\+994 \\d{2} \\d{3} \\d{2} \\d{2}"

    # e-poçt (sadələşdirilmiş): ad@domen.zona
    r"[\\w.+-]+@[\\w-]+\\.[\\w.]+"

    # tarix: 2024-12-02
    r"\\d{4}-\\d{2}-\\d{2}"
    ```

    > 💡 Regex-i addım-addım qur: əvvəl sadə nümunə (`\\d+`), sonra dəqiqləşdir (`\\d{4}-\\d{2}`). Mürəkkəb nümunəni bir dəfəyə yazmağa çalışma.

    > ⚠️ `+` və `*` «acgözdür» — mümkün qədər çox simvol tutur. `<.*>` nümunəsi `<a><b>` mətnində bütün `<a><b>`-ni tutur; yalnız `<a>` lazımdırsa, `<.*?>` yaz.
''')

m.python('regex-axtaris', 'Sifariş kodlarını tap: findall və search', 10, '''
    Sifariş qeydlərində kodlar `#A-10234` formatındadır: `#`, seriya hərfi, tire və rəqəmlər. `re` modulu ilə onları çıxar.
''', [
    'Bütün sifariş kodlarını # işarəsi olmadan tap → kodlar (["A-10234", ...]). Qrupdan istifadə et.',
    'A seriyalı kodların sayını regex ilə tap → a_say.',
    're.search ilə "gündə" sözündən əvvəlki ədədi tap və int-ə çevir → gun.',
], '''
    import re

    metn = "Sifariş #A-10234 2 gündə çatdı. Sifariş #B-20871 natamam gəldi. Qaytarma: #A-10301."

    kodlar = ...
    a_say = ...
    gun = ...

    print(kodlar)
    print(a_say)
    print(gun)
''', '''
    import re

    metn = "Sifariş #A-10234 2 gündə çatdı. Sifariş #B-20871 natamam gəldi. Qaytarma: #A-10301."

    kodlar = re.findall(r"#([A-Z]-\\d+)", metn)
    a_say = len(re.findall(r"#A-\\d+", metn))
    gun = int(re.search(r"(\\d+) gündə", metn).group(1))

    print(kodlar)
    print(a_say)
    print(gun)
''', '''
    assert kodlar == ["A-10234", "B-20871", "A-10301"], f"kodlar ['A-10234', 'B-20871', 'A-10301'] olmalıdır, sənin nəticən: {kodlar!r}"
    assert a_say == 2, f"a_say 2 olmalıdır, sənin nəticən: {a_say!r}"
    assert gun == 2 and isinstance(gun, int), f"gun tam ədəd 2 olmalıdır, sənin nəticən: {gun!r}"
    assert "re.findall(" in dacy.code and "re.search(" in dacy.code, "re.findall() və re.search() funksiyalarından istifadə et"
''', [
    'Qrup # işarəsini nəticədən çıxarır: re.findall(r"#([A-Z]-\\d+)", metn)',
    'A seriyası: re.findall(r"#A-\\d+", metn) — siyahının uzunluğu len() ilə.',
    'gun = int(re.search(r"(\\d+) gündə", metn).group(1)) — group(1) birinci qrupdur.',
])

m.python('telefon-email', 'Rəylərdən e-poçt və telefon çıxar', 10, '''
    Müştəri rəylərində əlaqə məlumatları var. Marketinq komandası onları ayrıca siyahıda istəyir.

    - Mobil nömrə formatı: `+994 50 123 45 67`
    - E-poçt: `ad@domen.zona`
''', [
    'Bütün e-poçt ünvanlarını tap → emailler.',
    '+994 ilə başlayan bütün mobil nömrələri tap → nomreler (ofis nömrəsi 012... daxil olmamalıdır).',
    'E-poçtların domenlərini tap ("gmail.com", "technar.az") → domenler.',
], '''
    import re

    metn = """Əlaqə: aysel.m@gmail.com, zəng: +994 50 123 45 67
    Dəstək: help@technar.az, mobil: +994 55 987 65 43, ofis: 012 555 12 34"""

    emailler = ...
    nomreler = ...
    domenler = ...

    print(emailler)
    print(nomreler)
    print(domenler)
''', '''
    import re

    metn = """Əlaqə: aysel.m@gmail.com, zəng: +994 50 123 45 67
    Dəstək: help@technar.az, mobil: +994 55 987 65 43, ofis: 012 555 12 34"""

    emailler = re.findall(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", metn)
    nomreler = re.findall(r"\\+994 \\d{2} \\d{3} \\d{2} \\d{2}", metn)
    domenler = re.findall(r"@([\\w.-]+)", metn)

    print(emailler)
    print(nomreler)
    print(domenler)
''', '''
    assert emailler == ["aysel.m@gmail.com", "help@technar.az"], f"emailler ['aysel.m@gmail.com', 'help@technar.az'] olmalıdır, sənin nəticən: {emailler!r}"
    assert nomreler == ["+994 50 123 45 67", "+994 55 987 65 43"], f"nomreler yalnız iki mobil nömrə olmalıdır, sənin nəticən: {nomreler!r}"
    assert domenler == ["gmail.com", "technar.az"], f"domenler ['gmail.com', 'technar.az'] olmalıdır, sənin nəticən: {domenler!r}"
    assert dacy.code.count("re.findall(") >= 3, "Hər üç bənddə re.findall() istifadə et"
''', [
    '+ işarəsi regex-də xüsusidir — onu \\+ kimi yaz: r"\\+994 \\d{2} \\d{3} \\d{2} \\d{2}"',
    'E-poçt: r"[\\w.+-]+@[\\w-]+\\.[\\w.]+" — @-dan əvvəl hərf/rəqəm/nöqtə, sonra domen.',
    'Domen üçün @-dan sonrakı hissəni qrupa al: r"@([\\w.-]+)"',
])

m.python('metn-temizleme', 'Mətni təmizlə: sub və split', 10, '''
    Skan edilmiş qiymət etiketindən gələn mətn səliqəsizdir, kateqoriyalar isə fərqli ayırıcılarla yazılıb. `re.sub` və `re.split` ilə səliqəyə sal.
''', [
    'xam mətnində ardıcıl boşluqları tək boşluqla əvəz et və kənar boşluqları sil → temiz.',
    'xam mətnindəki bütün ədədləri tap və int siyahısına çevir → ededler ([2399, 10]).',
    'setir-i vergül, nöqtəli vergül və | ayırıcılarına görə böl, hər hissənin boşluqlarını sil → hisseler.',
], '''
    import re

    xam = "  Qiymət:   2399 AZN!!!   Endirim:  10%   "
    setir = "Electronics, Clothing;Sports | Beauty"

    temiz = ...
    ededler = ...
    hisseler = ...

    print(temiz)
    print(ededler)
    print(hisseler)
''', '''
    import re

    xam = "  Qiymət:   2399 AZN!!!   Endirim:  10%   "
    setir = "Electronics, Clothing;Sports | Beauty"

    temiz = re.sub(r"\\s+", " ", xam).strip()
    ededler = [int(x) for x in re.findall(r"\\d+", xam)]
    hisseler = [h.strip() for h in re.split(r"[,;|]", setir)]

    print(temiz)
    print(ededler)
    print(hisseler)
''', '''
    assert temiz == "Qiymət: 2399 AZN!!! Endirim: 10%", f"temiz 'Qiymət: 2399 AZN!!! Endirim: 10%' olmalıdır, sənin nəticən: {temiz!r}"
    assert ededler == [2399, 10], f"ededler [2399, 10] (tam ədədlər) olmalıdır, sənin nəticən: {ededler!r}"
    assert hisseler == ["Electronics", "Clothing", "Sports", "Beauty"], f"hisseler düzgün deyil: {hisseler!r}"
    assert "re.sub(" in dacy.code and "re.split(" in dacy.code, "re.sub() və re.split() funksiyalarından istifadə et"
''', [
    '\\s+ bir və ya daha çox boşluqdur: re.sub(r"\\s+", " ", xam).strip()',
    'Ədədlər: re.findall(r"\\d+", xam) sətirlər qaytarır — int() ilə çevir.',
    'Bir neçə ayırıcı üçün simvol sinfi: re.split(r"[,;|]", setir)',
])

m.quiz('regex-testi', 'Test: regex', [
    classify(
        'Hər funksiyanı qaytardığı nəticəyə görə qruplaşdır.',
        [
            ('Match obyekti və ya None', ['re.search()', 're.match()']),
            ('Siyahı', ['re.findall()', 're.split()']),
            ('Yeni sətir', ['re.sub()']),
        ],
        'search/match ilk uyğunluğun Match obyektini (və ya None), findall və split siyahı, sub isə əvəzlənmiş yeni sətir qaytarır.',
    ),
    single(
        '`re.findall(r"\\d+", "A1B22C333")` nə qaytarır?',
        ["['1', '2', '2', '3', '3', '3']", "['1', '22', '333']", "[1, 22, 333]", "'122333'"],
        2,
        '\\d+ bir və ya daha çox ardıcıl rəqəmi bir uyğunluq kimi tutur; findall sətirlər siyahısı qaytarır.',
    ),
    single(
        'Hansı nümunə **yalnız** `+994 50 123 45 67` formatlı nömrəni tapır?',
        [r'r"\d+"', r'r"+994 \d{2} \d{3} \d{2} \d{2}"', r'r"\+994 \d{2} \d{3} \d{2} \d{2}"', r'r"994.*"'],
        3,
        '+ xüsusi simvoldur (1 və ya daha çox), ona görə \\+ kimi yazılır. \\d{n} dəqiq n rəqəm deməkdir.',
    ),
    single(
        '`^` simvolu regex-də nə deməkdir?',
        ['Sətrin sonu', 'Sətrin əvvəli', 'İstənilən simvol', 'Qüvvət'],
        2,
        '^ sətrin əvvəlini, $ sonunu bildirir. Kvadrat mötərizə içində ([^0-9]) isə «inkar» deməkdir.',
    ),
])

# ───────────────────────────── 11 · Paketlər və standart kitabxana ─────────────────────────────
m = c.module('kitabxanalar', 'Paketlər, pip və standart kitabxana',
             'Modul, paket və kitabxana; PyPI və pip; import yazılışları; math, statistics, datetime, collections.')

m.lesson('paketler-pip', 'Modul, paket, kitabxana; PyPI və pip', 8, '''
    Python-un gücü təkcə dilin özündə deyil — milyonlarla proqramçının yazdığı hazır **paketlərdədir**. Data analitikası üçün pandas, qrafiklər üçün matplotlib, maşın öyrənməsi üçün scikit-learn — hamısı paketdir.

    ## Anlayışlar

    | Anlayış | Nədir | Nümunə |
    | --- | --- | --- |
    | **Modul** | Bir `.py` faylı | `hesablama.py`, `math` |
    | **Paket** | Modulları birləşdirən qovluq | `pandas`, `matplotlib` |
    | **Kitabxana** | Bir və ya bir neçə paketdən ibarət hazır alətlər toplusu (gündəlik danışıqda «paket» ilə eyni mənada) | pandas kitabxanası |
    | **Standart kitabxana** | Python ilə birlikdə gələn modullar — quraşdırmaq lazım deyil | `math`, `datetime`, `random`, `json`, `csv` |

    ## PyPI və pip

    **PyPI** (Python Package Index, pypi.org) — Python paketlərinin mərkəzi anbarıdır: yüz minlərlə paket, mütəmadi yenilənir. Paketlər **pip** aləti ilə quraşdırılır:

    ```bash
    pip install pandas          # terminalda
    !pip install pandas         # Jupyter / Colab hüceyrəsində
    ```

    Paket bir dəfə quraşdırılır, amma hər yeni sessiyada (notebook-u yenidən açanda) **import** edilməlidir.

    > 💻 DaCy-də pandas, numpy, matplotlib kimi paketlər brauzerdə avtomatik yüklənir — `import` yazmaq kifayətdir. seaborn kimi bəziləri ilk istifadədə internetdən quraşdırılır (bir neçə saniyə).

    ## import yazılışları

    ```python
    import math                     # math.sqrt(16)
    import pandas as pd             # ləqəb (alias): pd.read_csv(...)
    from math import sqrt, ceil     # birbaşa: sqrt(16)
    from datetime import date       # date(2024, 12, 2)
    ```

    Data dünyasında qəbul olunmuş ləqəblər:

    | Paket | Ləqəb |
    | --- | --- |
    | pandas | `pd` |
    | numpy | `np` |
    | matplotlib.pyplot | `plt` |
    | seaborn | `sns` |

    > ⚠️ `from paket import *` yazılışından qaç — hansı adın haradan gəldiyi bilinmir və adlar toqquşa bilər.

    ## Funksiya haqqında məlumat

    - Jupyter-də funksiyanın adından sonra mötərizənin içində **Shift + Tab** — arqumentləri göstərir.
    - `help(funksiya)` — sənədləşməni çap edir.
''')

m.lesson('standart-kitabxana', 'Standart kitabxana: math, statistics, datetime, collections', 9, '''
    Quraşdırmadan istifadə olunan ən faydalı modullar.

    ## math — riyazi funksiyalar

    ```python
    import math
    math.sqrt(16)      # 4.0
    math.ceil(4.2)     # 5   — yuxarı yuvarlaqlaşdırma
    math.floor(4.8)    # 4   — aşağı
    math.pi            # 3.14159...
    ```

    ## statistics — sadə statistika

    ```python
    import statistics as st
    satis = [42, 38, 51, 47, 38]
    st.mean(satis)     # 43.2  — orta
    st.median(satis)   # 42    — median
    st.mode(satis)     # 38    — ən çox təkrarlanan
    st.stdev(satis)    # standart kənarlaşma
    ```

    ## datetime — tarix və vaxt

    ```python
    from datetime import date, datetime, timedelta

    sifaris = date(2024, 11, 25)
    catdi = date(2024, 12, 2)
    (catdi - sifaris).days            # 7 — iki tarix arasındakı fərq (timedelta)
    sifaris + timedelta(days=14)      # date(2024, 12, 9)
    sifaris.strftime("%d.%m.%Y")      # '25.11.2024'
    sifaris.strftime("%A")            # 'Monday' — həftənin günü
    datetime.strptime("02.12.2024", "%d.%m.%Y").date()   # sətirdən tarixə
    ```

    | Kod | Mənası | Nümunə |
    | --- | --- | --- |
    | `%Y` | İl (4 rəqəm) | 2024 |
    | `%m` | Ay (01–12) | 12 |
    | `%d` | Gün (01–31) | 02 |
    | `%A` | Həftənin günü | Monday |
    | `%B` | Ayın adı | December |
    | `%H:%M` | Saat:dəqiqə | 14:05 |

    ## collections.Counter — saymaq

    ```python
    from collections import Counter
    odenisler = ["Kart", "Nağd", "Kart", "Mobil", "Kart"]
    say = Counter(odenisler)   # Counter({'Kart': 3, 'Nağd': 1, 'Mobil': 1})
    say["Kart"]                # 3
    say.most_common(1)         # [('Kart', 3)]
    ```

    ## Digər faydalı modullar

    - `random` — təsadüfi ədədlər və seçim (`random.choice`, `random.seed`);
    - `json` və `csv` — fayl formatları (növbəti fəsildə);
    - `os`, `pathlib` — fayllar və qovluqlar.
''')

m.python('statistics-math', 'Gündəlik sifarişlərin statistikası', 10, '''
    TechNar-ın Gəncə filialında son 9 gündə qəbul olunan sifarişlərin sayı verilib. `statistics` və `math` modulları ilə xülasə hazırla.
''', [
    'Orta gündəlik sifariş sayını tap və 2 onluğa yuvarlaqlaşdır → orta.',
    'Median və modanı tap → mediana, moda.',
    'Standart kənarlaşmanı (stdev) tap və 2 onluğa yuvarlaqlaşdır → std.',
    'Həftəlik planı (orta × 7) yuxarı yuvarlaqlaşdır (math.ceil) → plan.',
], '''
    import statistics
    import math

    gunluk = [42, 38, 51, 47, 38, 60, 44, 38, 55]

    orta = ...
    mediana = ...
    moda = ...
    std = ...
    plan = ...

    print(orta, mediana, moda, std, plan)
''', '''
    import statistics
    import math

    gunluk = [42, 38, 51, 47, 38, 60, 44, 38, 55]

    orta = round(statistics.mean(gunluk), 2)
    mediana = statistics.median(gunluk)
    moda = statistics.mode(gunluk)
    std = round(statistics.stdev(gunluk), 2)
    plan = math.ceil(statistics.mean(gunluk) * 7)

    print(orta, mediana, moda, std, plan)
''', '''
    import statistics as _st, math as _m
    assert orta == 45.89, f"orta 45.89 olmalıdır, sənin nəticən: {orta!r}"
    assert mediana == 44, f"mediana 44 olmalıdır, sənin nəticən: {mediana!r}"
    assert moda == 38, f"moda 38 olmalıdır, sənin nəticən: {moda!r}"
    assert std == round(_st.stdev(gunluk), 2), f"std {round(_st.stdev(gunluk), 2)} olmalıdır, sənin nəticən: {std!r}"
    assert plan == 322, f"plan 322 olmalıdır (45.89 × 7 = 321.2 → yuxarı 322), sənin nəticən: {plan!r}"
    assert "statistics." in dacy.code and "math.ceil(" in dacy.code, "statistics funksiyalarından və math.ceil()-dən istifadə et"
''', [
    'statistics.mean(), statistics.median(), statistics.mode(), statistics.stdev()',
    'round(x, 2) — 2 onluq rəqəm.',
    'plan = math.ceil(statistics.mean(gunluk) * 7) — yuvarlaqlaşdırılmamış ortadan hesabla.',
])

m.python('datetime-tapsiriq', 'Çatdırılma və qaytarma tarixləri', 10, '''
    Müştəri sifarişi 25 noyabr 2024-də verib, məhsul 2 dekabrda çatdırılıb. Qaytarma müddəti çatdırılmadan sonra **14 gündür**.
''', [
    'Çatdırılma neçə gün çəkdi → gun (tam ədəd).',
    'Sifariş həftənin hansı günü verilib (strftime("%A")) → hefte_gunu.',
    'Qaytarma müddətinin son günü → qaytarma (date obyekti).',
    'Çatdırılma tarixini "02.12.2024" formatında yaz → formatli.',
], '''
    from datetime import date, timedelta

    sifaris = date(2024, 11, 25)
    catdirilma = date(2024, 12, 2)

    gun = ...
    hefte_gunu = ...
    qaytarma = ...
    formatli = ...

    print(gun, hefte_gunu, qaytarma, formatli)
''', '''
    from datetime import date, timedelta

    sifaris = date(2024, 11, 25)
    catdirilma = date(2024, 12, 2)

    gun = (catdirilma - sifaris).days
    hefte_gunu = sifaris.strftime("%A")
    qaytarma = catdirilma + timedelta(days=14)
    formatli = catdirilma.strftime("%d.%m.%Y")

    print(gun, hefte_gunu, qaytarma, formatli)
''', '''
    from datetime import date as _date
    assert gun == 7, f"gun 7 olmalıdır, sənin nəticən: {gun!r}"
    assert hefte_gunu == "Monday", f'hefte_gunu "Monday" olmalıdır, sənin nəticən: {hefte_gunu!r}'
    assert qaytarma == _date(2024, 12, 16), f"qaytarma 2024-12-16 olmalıdır, sənin nəticən: {qaytarma!r}"
    assert formatli == "02.12.2024", f'formatli "02.12.2024" olmalıdır, sənin nəticən: {formatli!r}'
    assert "timedelta(" in dacy.code and "strftime(" in dacy.code, "timedelta və strftime-dan istifadə et"
''', [
    'İki tarixin fərqi timedelta-dır: (catdirilma - sifaris).days',
    'sifaris.strftime("%A") həftənin gününü ingiliscə verir.',
    'qaytarma = catdirilma + timedelta(days=14); formatli = catdirilma.strftime("%d.%m.%Y")',
])

m.python('counter-tapsiriq', 'Counter ilə saymaq', 8, '''
    Kassa qeydlərində ödəniş üsulları və müştəri rəylərinin sözləri var. `collections.Counter` ilə ən çox təkrarlananları tap.
''', [
    'Hər ödəniş üsulunun sayını hesabla → say (Counter).',
    'Ən çox istifadə olunan ödəniş üsulunun adını tap → en_cox.',
    'rey mətnini sözlərə böl və ən çox təkrarlanan 3 sözü tap → top3 (most_common).',
], '''
    from collections import Counter

    odenisler = ["Kart", "Nağd", "Kart", "Mobil", "Kart", "Nağd", "Kart", "Mobil", "Kart"]
    rey = "çatdırılma sürətli idi çatdırılma ucuz idi qiymət ucuz çatdırılma pulsuz"

    say = ...
    en_cox = ...
    top3 = ...

    print(say)
    print(en_cox)
    print(top3)
''', '''
    from collections import Counter

    odenisler = ["Kart", "Nağd", "Kart", "Mobil", "Kart", "Nağd", "Kart", "Mobil", "Kart"]
    rey = "çatdırılma sürətli idi çatdırılma ucuz idi qiymət ucuz çatdırılma pulsuz"

    say = Counter(odenisler)
    en_cox = say.most_common(1)[0][0]
    top3 = Counter(rey.split()).most_common(3)

    print(say)
    print(en_cox)
    print(top3)
''', '''
    from collections import Counter as _C
    assert isinstance(say, _C) and say == _C(odenisler), f"say Counter(odenisler) olmalıdır, sənin nəticən: {say!r}"
    assert en_cox == "Kart", f'en_cox "Kart" olmalıdır, sənin nəticən: {en_cox!r}'
    assert top3 == [("çatdırılma", 3), ("idi", 2), ("ucuz", 2)], f"top3 düzgün deyil: {top3!r}"
    assert "most_common(" in dacy.code, "most_common() metodundan istifadə et"
''', [
    'say = Counter(odenisler)',
    'most_common(1) [("Kart", 5)] qaytarır — adı almaq üçün [0][0].',
    'top3 = Counter(rey.split()).most_common(3)',
])

m.quiz('kitabxanalar-testi', 'Test: paketlər və standart kitabxana', [
    classify(
        'Hansı modullar Python ilə birlikdə gəlir, hansıları pip ilə quraşdırmaq lazımdır?',
        [
            ('Standart kitabxana (quraşdırma lazım deyil)', ['math', 'datetime', 'statistics', 'json', 'collections']),
            ('PyPI paketi (pip install)', ['pandas', 'numpy', 'matplotlib', 'seaborn', 'openpyxl']),
        ],
        'math, datetime, statistics, json, collections Python-un özü ilə gəlir. pandas, numpy, matplotlib, seaborn, openpyxl PyPI-dan quraşdırılan paketlərdir.',
    ),
    single(
        '`import pandas as pd` yazılışında `pd` nədir?',
        ['Ayrı bir paket', 'pandas üçün ləqəb (alias)', 'Python-un daxili funksiyası', 'Fayl adı'],
        2,
        'as ilə paketə qısa ad verilir; sonra pd.read_csv() kimi istifadə olunur.',
    ),
    single(
        '`(date(2024, 3, 10) - date(2024, 3, 1)).days` nəyə bərabərdir?',
        ['10', '9', '11', 'Xəta verir'],
        2,
        'İki tarixin fərqi timedelta-dır; .days 9 gün qaytarır.',
    ),
    single(
        'Jupyter hüceyrəsində `!pip install seaborn` nə edir?',
        [
            'seaborn-u cari notebook-a import edir',
            'seaborn paketini PyPI-dan endirib quraşdırır',
            'seaborn-u silir',
            'Xəta verir — pip yalnız terminalda işləyir',
        ],
        2,
        '! işarəsi hüceyrədə terminal əmri işlədir. Quraşdırmadan sonra yenə import seaborn yazmaq lazımdır.',
    ),
])

# ───────────────────────────── 12 · Fayllar ─────────────────────────────
m = c.module('fayllar', 'Fayllarla iş: mətn, CSV və JSON',
             'open() və with, oxuma və yazma rejimləri, csv modulu, json modulu.')

m.lesson('fayllar-ders', 'Faylları oxumaq və yazmaq', 8, '''
    Data çox vaxt fayllarda gəlir: mətn, CSV cədvəlləri, JSON. Python faylları `open()` funksiyası ilə açır.

    ## with open(...)

    ```python
    with open("reyler.txt", encoding="utf-8") as f:
        metn = f.read()
    ```

    `with` bloku bitəndə fayl **avtomatik bağlanır** — hətta xəta baş versə belə. Faylla işləməyin tövsiyə olunan yolu budur.

    > 🔤 `encoding="utf-8"` Azərbaycan hərflərinin (ə, ş, ç, ğ, ö, ü, ı) düzgün oxunması üçün vacibdir.

    ## Rejimlər

    | Rejim | Mənası |
    | --- | --- |
    | `"r"` | Oxumaq (defolt) |
    | `"w"` | Yazmaq — fayl varsa **içindəkini silir** |
    | `"a"` | Sonuna əlavə etmək |
    | `"rb"` / `"wb"` | İkili (binary) — şəkil, Excel |

    ## Oxuma üsulları

    ```python
    with open("reyler.txt", encoding="utf-8") as f:
        hamisi = f.read()          # bütün mətn bir sətirdə

    with open("reyler.txt", encoding="utf-8") as f:
        setirler = f.readlines()   # sətirlərin siyahısı ("\\n" ilə)

    with open("reyler.txt", encoding="utf-8") as f:
        for setir in f:            # sətir-sətir — böyük fayllar üçün ən yaxşısı
            print(setir.strip())
    ```

    ## Yazmaq

    ```python
    with open("hesabat.txt", "w", encoding="utf-8") as f:
        f.write("Yanvar hesabatı\\n")
        f.write(f"Sifariş sayı: {152}\\n")
    ```

    `write()` sətrin sonuna `\\n` əlavə etmir — yeni sətri özün yazmalısan.

    > 💻 DaCy-də fayllar brauzerin daxilindəki virtual fayl sistemində saxlanılır. Tapşırığa əlavə olunmuş datasetlər (məs. `reyler.txt`) iş qovluğunda hazırdır — sadəcə adı ilə aç.
''')

m.lesson('csv-json', 'CSV və JSON formatları', 8, '''
    ## CSV — vergüllə ayrılmış cədvəl

    ```text
    Transaction ID,Date,Region,Product Name,Total Revenue
    100002,2024-01-01,Bakı,iPhone 15,2399
    ```

    `csv` modulu sətirləri düzgün bölür — hətta xanaların içində vergül olsa belə (`"Levi's 501, Blue"`).

    ```python
    import csv

    with open("satis_yanvar.csv", encoding="utf-8") as f:
        for setir in csv.DictReader(f):
            print(setir["Region"], setir["Total Revenue"])
    ```

    - `csv.reader` — hər sətri **siyahı** kimi verir.
    - `csv.DictReader` — hər sətri başlıqlarla **dictionary** kimi verir (`setir["Region"]`) — daha oxunaqlıdır.
    - ⚠️ Dəyərlər həmişə **sətir** kimi gəlir: `float(setir["Total Revenue"])` ilə ədədə çevir.

    Yazmaq üçün `csv.writer` və ya `csv.DictWriter`:

    ```python
    with open("xulase.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Region", "Gəlir"])
        w.writerow(["Bakı", 48210.5])
    ```

    ## JSON — API-lərin və konfiqurasiyanın dili

    JSON Python-un dictionary və siyahılarına çox oxşayır:

    ```python
    import json

    hesabat = {"ay": "Yanvar", "sifaris": 152, "top": ["iPhone 15", "AirPods Pro 2"]}

    s = json.dumps(hesabat, ensure_ascii=False)       # dict → JSON sətri
    geri = json.loads(s)                             # JSON sətri → dict

    with open("hesabat.json", "w", encoding="utf-8") as f:
        json.dump(hesabat, f, ensure_ascii=False, indent=2)   # fayla
    with open("hesabat.json", encoding="utf-8") as f:
        oxunan = json.load(f)                                 # fayldan
    ```

    `ensure_ascii=False` Azərbaycan hərflərini `\\u0259` kimi kodlaşdırmadan, olduğu kimi yazır.

    > 💡 Böyük cədvəllərlə işləmək üçün `csv` modulu əvəzinə **pandas** daha güclüdür: `pd.read_csv("satis_yanvar.csv")`. Bunu növbəti kursda öyrənəcəyik — amma pandas da arxa planda eyni prinsiplərlə işləyir.
''')

m.python('metn-fayli', 'Rəylər faylını oxu', 10, '''
    `reyler.txt` faylında hər sətirdə bir müştəri rəyi var. Faylı oxu və təhlil et.
''', [
    'Faylı with open(..., encoding="utf-8") ilə aç, boş olmayan sətirləri kənar boşluqlarsız reyler siyahısına yığ.',
    'Rəylərin sayını tap → say.',
    'İçində "çatdırılma" sözü keçən rəylərin sayını tap (böyük-kiçik hərf fərq etməsin) → catdirilma_say.',
    'Ən uzun rəyin mətnini tap → en_uzun.',
], '''
    reyler = []
    # faylı oxu

    say = ...
    catdirilma_say = ...
    en_uzun = ...

    print(say, catdirilma_say)
    print(en_uzun)
''', '''
    reyler = []
    with open("reyler.txt", encoding="utf-8") as f:
        for setir in f:
            if setir.strip():
                reyler.append(setir.strip())

    say = len(reyler)
    catdirilma_say = sum(1 for r in reyler if "çatdırılma" in r.lower())
    en_uzun = max(reyler, key=len)

    print(say, catdirilma_say)
    print(en_uzun)
''', '''
    _r = [s.strip() for s in open("reyler.txt", encoding="utf-8") if s.strip()]
    assert reyler == _r, "reyler faylın boş olmayan sətirləri (strip edilmiş) olmalıdır"
    assert say == len(_r), f"say {len(_r)} olmalıdır, sənin nəticən: {say!r}"
    _c = sum(1 for x in _r if "çatdırılma" in x.lower())
    assert catdirilma_say == _c, f"catdirilma_say {_c} olmalıdır (lower() ilə yoxla — 'Çatdırılma' da sayılır), sənin nəticən: {catdirilma_say!r}"
    assert en_uzun == max(_r, key=len), "en_uzun ən uzun rəy olmalıdır — max(reyler, key=len)"
    assert "with open(" in dacy.code, "Faylı with open(...) ilə aç"
''', [
    'with open("reyler.txt", encoding="utf-8") as f: for setir in f: ...',
    'Kiçik hərfə çevirib yoxla: "çatdırılma" in r.lower()',
    'en_uzun = max(reyler, key=len)',
], dataset='datasets/reyler.txt')

m.python('csv-dictreader', 'CSV-ni csv.DictReader ilə oxu', 12, '''
    `satis_yanvar.csv` — TechNar-ın 2024-cü il yanvar satışları. pandas-sız, yalnız `csv` modulu ilə xülasə hazırla.

    Xatırla: DictReader dəyərləri **sətir** kimi verir — məbləğləri `float()` ilə çevir.
''', [
    'Faylı csv.DictReader ilə oxu və bütün sətirləri setirler siyahısına yığ.',
    'Əməliyyat sayını tap → say.',
    'Ümumi gəliri (Total Revenue cəmi) 2 onluğa yuvarlaqlaşdır → cem.',
    'Regionlar üzrə gəlir dictionary-si qur: {region: cəm (2 onluq)} → region_gelir.',
], '''
    import csv

    setirler = []
    # faylı oxu

    say = ...
    cem = ...
    region_gelir = {}

    print(say, cem)
    print(region_gelir)
''', '''
    import csv

    with open("satis_yanvar.csv", encoding="utf-8") as f:
        setirler = list(csv.DictReader(f))

    say = len(setirler)
    cem = round(sum(float(s["Total Revenue"]) for s in setirler), 2)
    region_gelir = {}
    for s in setirler:
        region_gelir[s["Region"]] = region_gelir.get(s["Region"], 0) + float(s["Total Revenue"])
    region_gelir = {r: round(v, 2) for r, v in region_gelir.items()}

    print(say, cem)
    print(region_gelir)
''', '''
    import csv as _csv
    _rows = list(_csv.DictReader(open("satis_yanvar.csv", encoding="utf-8")))
    assert say == len(_rows), f"say {len(_rows)} olmalıdır, sənin nəticən: {say!r}"
    _cem = round(sum(float(x["Total Revenue"]) for x in _rows), 2)
    assert cem == _cem, f"cem {_cem} olmalıdır, sənin nəticən: {cem!r}"
    _rg = {}
    for x in _rows:
        _rg[x["Region"]] = _rg.get(x["Region"], 0) + float(x["Total Revenue"])
    _rg = {k: round(v, 2) for k, v in _rg.items()}
    assert region_gelir == _rg, f"region_gelir {_rg} olmalıdır, sənin nəticən: {region_gelir!r}"
    assert "DictReader(" in dacy.code, "csv.DictReader-dən istifadə et"
''', [
    'with open("satis_yanvar.csv", encoding="utf-8") as f: setirler = list(csv.DictReader(f))',
    'cem = round(sum(float(s["Total Revenue"]) for s in setirler), 2)',
    'region_gelir[r] = region_gelir.get(r, 0) + məbləğ — get() açar yoxdursa 0 qaytarır.',
], dataset='datasets/satis_yanvar.csv')

m.python('json-yaz-oxu', 'JSON faylı yaz və oxu', 8, '''
    Aylıq hesabatı başqa sistemə ötürmək üçün JSON formatında saxla, sonra yoxlamaq üçün geri oxu.
''', [
    'hesabat dictionary-sini hesabat.json faylına yaz (json.dump, indent=2, ensure_ascii=False).',
    'Faylı yenidən oxu → oxunan (json.load).',
    'hesabat-ı JSON sətrinə çevir → json_str (json.dumps, ensure_ascii=False).',
], '''
    import json

    hesabat = {"ay": "Yanvar", "sifaris": 152, "gelir": 48210.5, "top_mehsul": "iPhone 15", "seherler": ["Bakı", "Gəncə"]}

    # 1. fayla yaz

    # 2. geri oxu
    oxunan = ...

    json_str = ...
    print(oxunan)
    print(json_str)
''', '''
    import json

    hesabat = {"ay": "Yanvar", "sifaris": 152, "gelir": 48210.5, "top_mehsul": "iPhone 15", "seherler": ["Bakı", "Gəncə"]}

    with open("hesabat.json", "w", encoding="utf-8") as f:
        json.dump(hesabat, f, indent=2, ensure_ascii=False)

    with open("hesabat.json", encoding="utf-8") as f:
        oxunan = json.load(f)

    json_str = json.dumps(hesabat, ensure_ascii=False)
    print(oxunan)
    print(json_str)
''', '''
    import json as _j, os as _os
    assert _os.path.exists("hesabat.json"), "hesabat.json faylı yaradılmayıb — json.dump(hesabat, f, ...) istifadə et"
    _txt = open("hesabat.json", encoding="utf-8").read()
    assert _j.loads(_txt) == hesabat, "Fayldakı JSON hesabat ilə eyni olmalıdır"
    assert "Gəncə" in _txt, "Faylda Azərbaycan hərfləri kodlaşdırılıb — ensure_ascii=False əlavə et"
    assert oxunan == hesabat, "oxunan fayldan json.load ilə oxunmuş dictionary olmalıdır"
    assert isinstance(json_str, str) and _j.loads(json_str) == hesabat and "Bakı" in json_str, "json_str = json.dumps(hesabat, ensure_ascii=False)"
    assert "json.load(" in dacy.code, "Faylı json.load() ilə oxu"
''', [
    'with open("hesabat.json", "w", encoding="utf-8") as f: json.dump(hesabat, f, indent=2, ensure_ascii=False)',
    'Oxumaq: with open("hesabat.json", encoding="utf-8") as f: oxunan = json.load(f)',
    'json_str = json.dumps(hesabat, ensure_ascii=False)',
])

m.quiz('fayllar-testi', 'Test: fayllar', [
    single(
        '`open("hesabat.txt", "w")` fayl artıq varsa nə edir?',
        ['Sonuna əlavə edir', 'İçindəkini silib yenidən yazır', 'Xəta verir', 'Faylı yalnız oxumaq üçün açır'],
        2,
        '"w" rejimi faylı sıfırlayır. Sona əlavə etmək üçün "a" rejimi lazımdır.',
    ),
    single(
        '`with open(...) as f:` yazılışının əsas üstünlüyü nədir?',
        [
            'Faylı daha sürətli oxuyur',
            'Blok bitəndə (xəta olsa belə) faylı avtomatik bağlayır',
            'Faylı şifrələyir',
            'Yalnız CSV faylları üçün işləyir',
        ],
        2,
        'with konteksti faylın bağlanmasını zəmanət altına alır.',
    ),
    single(
        '`csv.DictReader` ilə oxunan `setir["Units Sold"]` dəyərinin tipi nədir?',
        ['int', 'float', 'str', 'list'],
        3,
        'csv modulu hər dəyəri sətir kimi verir — hesablama üçün int()/float() ilə çevirmək lazımdır.',
    ),
    classify(
        'Hər funksiyanı etdiyi işə görə qruplaşdır.',
        [
            ('Python obyektini JSON-a çevirir', ['json.dumps()', 'json.dump()']),
            ('JSON-u Python obyektinə çevirir', ['json.loads()', 'json.load()']),
        ],
        'dump/dumps — Python → JSON (dump fayla, dumps sətrə); load/loads — JSON → Python (load fayldan, loads sətirdən).',
    ),
])

# ───────────────────────────── 13 · Mini layihə və yekun test ─────────────────────────────
m = c.module('layihe', 'Mini layihə: satış hesabatı və yekun test',
             'Öyrəndiklərini birləşdir: funksiyalar, dictionary-lər, dövrlər və f-string ilə satış hesabatı.')

m.lesson('layihe-izah', 'Mini layihə: TechNar-ın yanvar hesabatı', 5, '''
    Kursun sonunda öyrəndiklərini real tapşırıqda birləşdirək. TechNar-ın satış meneceri hər ayın əvvəlində qısa hesabat istəyir:

    - ümumi gəlir;
    - kateqoriyalar üzrə gəlir (çoxdan aza);
    - ən çox satılan məhsul (ədədə görə).

    Satışlar dictionary-lərin siyahısı kimi verilir:

    ```python
    satislar = [
        {"mehsul": "iPhone 15", "kateqoriya": "Electronics", "say": 2, "qiymet": 2399.0},
        {"mehsul": "Zara Basic T-Shirt", "kateqoriya": "Clothing", "say": 6, "qiymet": 39.9},
        ...
    ]
    ```

    ## Niyə funksiyalar?

    Hesabat hər ay təkrarlanır — yalnız data dəyişir. Hesablamaları **funksiyalara** yığsaq, fevral datasını eyni funksiyalara verib dərhal yeni hesabat alarıq. Buna görə testlər funksiyalarını **başqa data ilə də** yoxlayacaq: funksiya konkret rəqəmlərə yox, ona verilən arqumentə əsaslanmalıdır.

    ## Plan

    1. `umumi_gelir(satislar)` — say × qiymət cəmi.
    2. `kateqoriya_uzre(satislar)` — `{kateqoriya: gəlir}` dictionary-si.
    3. `en_cox_satilan(satislar)` — eyni məhsul bir neçə dəfə ola bilər: əvvəl məhsullar üzrə ədədləri topla, sonra maksimumu tap.
    4. `hesabat(satislar)` — hamısını f-string ilə səliqəli mətnə çevir.

    > 💡 Kiçik addımlarla irəlilə: hər funksiyanı yazdıqdan sonra **İşə sal** ilə nəticəsini çap edib yoxla.
''')

DATA_JAN = '''
    satislar = [
        {"mehsul": "iPhone 15", "kateqoriya": "Electronics", "say": 2, "qiymet": 2399.0},
        {"mehsul": "Zara Basic T-Shirt", "kateqoriya": "Clothing", "say": 6, "qiymet": 39.9},
        {"mehsul": "AirPods Pro 2", "kateqoriya": "Electronics", "say": 3, "qiymet": 599.0},
        {"mehsul": "Nike Air Force 1", "kateqoriya": "Sports", "say": 2, "qiymet": 249.0},
        {"mehsul": "Zara Basic T-Shirt", "kateqoriya": "Clothing", "say": 8, "qiymet": 39.9},
        {"mehsul": "Philips Air Fryer XL", "kateqoriya": "Home Appliances", "say": 1, "qiymet": 329.0},
        {"mehsul": "Yoga Mat Pro", "kateqoriya": "Sports", "say": 5, "qiymet": 59.0},
        {"mehsul": "iPhone 15", "kateqoriya": "Electronics", "say": 1, "qiymet": 2399.0},
        {"mehsul": "Nivea Soft 200ml", "kateqoriya": "Beauty", "say": 10, "qiymet": 12.0},
        {"mehsul": "H&M Hoodie", "kateqoriya": "Clothing", "say": 3, "qiymet": 69.0},
    ]
'''
HIDDEN = '''
    _fevral = [
        {"mehsul": "Dyson V15", "kateqoriya": "Home Appliances", "say": 2, "qiymet": 1499.0},
        {"mehsul": "Puma RS-X", "kateqoriya": "Sports", "say": 4, "qiymet": 199.0},
        {"mehsul": "Puma RS-X", "kateqoriya": "Sports", "say": 3, "qiymet": 199.0},
        {"mehsul": "Nivea Soft 200ml", "kateqoriya": "Beauty", "say": 6, "qiymet": 12.0},
    ]
'''

m.python('layihe-funksiyalar', 'Layihə 1: hesablama funksiyaları', 15, '''
    Üç funksiya yaz. Hər biri **arqument kimi aldığı** siyahı ilə işləməlidir — testlər onları başqa ayın datası ilə də çağıracaq.

    Gəlir = `say × qiymet`. Bütün məbləğləri 2 onluğa yuvarlaqlaşdır.
''', [
    'umumi_gelir(satislar) — bütün satışların gəlirlərinin cəmini qaytarır (round 2).',
    'kateqoriya_uzre(satislar) — {kateqoriya: gəlir} dictionary-si qaytarır (round 2).',
    'en_cox_satilan(satislar) — ən çox ədəd satılan məhsulun adını qaytarır (eyni məhsulun ədədləri toplanır).',
], DATA_JAN + '''

    def umumi_gelir(satislar):
        ...


    def kateqoriya_uzre(satislar):
        ...


    def en_cox_satilan(satislar):
        ...


    print(umumi_gelir(satislar))
    print(kateqoriya_uzre(satislar))
    print(en_cox_satilan(satislar))
''', DATA_JAN + '''

    def umumi_gelir(satislar):
        return round(sum(s["say"] * s["qiymet"] for s in satislar), 2)


    def kateqoriya_uzre(satislar):
        netice = {}
        for s in satislar:
            netice[s["kateqoriya"]] = netice.get(s["kateqoriya"], 0) + s["say"] * s["qiymet"]
        return {k: round(v, 2) for k, v in netice.items()}


    def en_cox_satilan(satislar):
        sayi = {}
        for s in satislar:
            sayi[s["mehsul"]] = sayi.get(s["mehsul"], 0) + s["say"]
        return max(sayi, key=sayi.get)


    print(umumi_gelir(satislar))
    print(kateqoriya_uzre(satislar))
    print(en_cox_satilan(satislar))
''', HIDDEN + '''
    assert umumi_gelir(satislar) == 11001.6, f"umumi_gelir(satislar) 11001.6 olmalıdır, sənin nəticən: {umumi_gelir(satislar)!r}"
    assert umumi_gelir(_fevral) == 4463.0, "umumi_gelir başqa datada da işləməlidir — konkret rəqəm yox, arqumenti istifadə et"
    _k = {"Electronics": 8994.0, "Clothing": 765.6, "Sports": 793.0, "Home Appliances": 329.0, "Beauty": 120.0}
    assert kateqoriya_uzre(satislar) == _k, f"kateqoriya_uzre(satislar) {_k} olmalıdır, sənin nəticən: {kateqoriya_uzre(satislar)!r}"
    assert kateqoriya_uzre(_fevral) == {"Home Appliances": 2998.0, "Sports": 1393.0, "Beauty": 72.0}, "kateqoriya_uzre başqa datada da işləməlidir"
    assert en_cox_satilan(satislar) == "Zara Basic T-Shirt", f'en_cox_satilan "Zara Basic T-Shirt" olmalıdır (6 + 8 = 14 ədəd), sənin nəticən: {en_cox_satilan(satislar)!r}'
    assert en_cox_satilan(_fevral) == "Puma RS-X", "en_cox_satilan eyni məhsulun ədədlərini toplamalıdır (4 + 3 = 7 > 6)"
''', [
    'umumi_gelir: return round(sum(s["say"] * s["qiymet"] for s in satislar), 2)',
    'kateqoriya_uzre: boş dict, dövrdə netice[k] = netice.get(k, 0) + gəlir; sonda dəyərləri round et.',
    'en_cox_satilan: əvvəl {məhsul: ədəd} topla, sonra max(sayi, key=sayi.get).',
], xp=60)

m.python('layihe-hesabat', 'Layihə 2: hesabat mətni', 15, '''
    İndi hesablamaları səliqəli mətnə çevir. `hesabat(satislar, ay)` funksiyası **sətir qaytarmalıdır** (çap etməməlidir), sonra onu `print()` ilə yazdır.

    Gözlənilən format (yanvar üçün):

    ```text
    TechNar · Yanvar hesabatı
    Ümumi gəlir: 11,001.60 ₼
    - Electronics: 8,994.00 ₼
    - Sports: 793.00 ₼
    - Clothing: 765.60 ₼
    - Home Appliances: 329.00 ₼
    - Beauty: 120.00 ₼
    Ən çox satılan: Zara Basic T-Shirt
    ```

    Kateqoriyalar **gəlirə görə çoxdan aza** sıralanır. Məbləğlər minlik ayırıcısı ilə: `f"{x:,.2f}"`. Sətirləri `"\\n".join(...)` ilə birləşdir.

    Əvvəlki tapşırığın funksiyaları burada hazırdır.
''', [
    'hesabat(satislar, ay) funksiyası yuxarıdakı formatda çoxsətirli mətn qaytarsın.',
    'Kateqoriyaları gəlirə görə azalan sırada yaz (sorted + key).',
    'Yanvar hesabatını print(hesabat(satislar, "Yanvar")) ilə ekrana yazdır.',
], DATA_JAN + '''

    def umumi_gelir(satislar):
        return round(sum(s["say"] * s["qiymet"] for s in satislar), 2)


    def kateqoriya_uzre(satislar):
        netice = {}
        for s in satislar:
            netice[s["kateqoriya"]] = netice.get(s["kateqoriya"], 0) + s["say"] * s["qiymet"]
        return {k: round(v, 2) for k, v in netice.items()}


    def en_cox_satilan(satislar):
        sayi = {}
        for s in satislar:
            sayi[s["mehsul"]] = sayi.get(s["mehsul"], 0) + s["say"]
        return max(sayi, key=sayi.get)


    def hesabat(satislar, ay):
        setirler = [f"TechNar · {ay} hesabatı"]
        # davam et
        return "\\n".join(setirler)
''', DATA_JAN + '''

    def umumi_gelir(satislar):
        return round(sum(s["say"] * s["qiymet"] for s in satislar), 2)


    def kateqoriya_uzre(satislar):
        netice = {}
        for s in satislar:
            netice[s["kateqoriya"]] = netice.get(s["kateqoriya"], 0) + s["say"] * s["qiymet"]
        return {k: round(v, 2) for k, v in netice.items()}


    def en_cox_satilan(satislar):
        sayi = {}
        for s in satislar:
            sayi[s["mehsul"]] = sayi.get(s["mehsul"], 0) + s["say"]
        return max(sayi, key=sayi.get)


    def hesabat(satislar, ay):
        setirler = [f"TechNar · {ay} hesabatı"]
        setirler.append(f"Ümumi gəlir: {umumi_gelir(satislar):,.2f} ₼")
        kat = kateqoriya_uzre(satislar)
        for k, v in sorted(kat.items(), key=lambda x: x[1], reverse=True):
            setirler.append(f"- {k}: {v:,.2f} ₼")
        setirler.append(f"Ən çox satılan: {en_cox_satilan(satislar)}")
        return "\\n".join(setirler)


    print(hesabat(satislar, "Yanvar"))
''', HIDDEN + '''
    _exp = """TechNar · Yanvar hesabatı
    Ümumi gəlir: 11,001.60 ₼
    - Electronics: 8,994.00 ₼
    - Sports: 793.00 ₼
    - Clothing: 765.60 ₼
    - Home Appliances: 329.00 ₼
    - Beauty: 120.00 ₼
    Ən çox satılan: Zara Basic T-Shirt"""
    _got = hesabat(satislar, "Yanvar")
    assert isinstance(_got, str), "hesabat() sətir qaytarmalıdır (return), print etməməlidir"
    _gl, _el = _got.strip().splitlines(), _exp.splitlines()
    for _i, (_g, _e) in enumerate(zip(_gl, _el), 1):
        assert _g.strip() == _e.strip(), f"{_i}-ci sətir fərqlidir.\\nGözlənilən: {_e}\\nSənin:      {_g}"
    assert len(_gl) == len(_el), f"Hesabatda {len(_el)} sətir olmalıdır, səndə {len(_gl)}"
    _f = hesabat(_fevral, "Fevral").splitlines()
    assert _f[0] == "TechNar · Fevral hesabatı" and _f[1] == "Ümumi gəlir: 4,463.00 ₼", "hesabat başqa ay və data üçün də işləməlidir"
    assert _f[2] == "- Home Appliances: 2,998.00 ₼", "Kateqoriyalar gəlirə görə azalan sırada olmalıdır"
    assert "TechNar · Yanvar hesabatı" in dacy.lines, "Yanvar hesabatını print() ilə ekrana yazdır"
''', [
    'Ümumi gəlir sətri: f"Ümumi gəlir: {umumi_gelir(satislar):,.2f} ₼"',
    'Kateqoriyalar: for k, v in sorted(kat.items(), key=lambda x: x[1], reverse=True): ...',
    'Sonda: setirler.append(f"Ən çox satılan: {en_cox_satilan(satislar)}") və return "\\n".join(setirler)',
], xp=60)

m.quiz('yekun-test', 'Yekun test: Python Basics', [
    single('`type(7 / 2)` nə qaytarır?', ['int', 'float', 'str', 'bool'], 2,
           '/ operatoru həmişə float qaytarır: 7 / 2 = 3.5. Tam bölmə üçün // istifadə olunur.'),
    classify(
        'Hər xüsusiyyəti uyğun məlumat strukturuna yerləşdir.',
        [
            ('list', ['Sıralı və dəyişdirilə bilən: [1, 2, 3]']),
            ('tuple', ['Sıralı, amma dəyişdirilə bilməyən: (1, 2, 3)']),
            ('dict', ['Açar–dəyər cütləri: {"ad": "Aysel"}']),
            ('set', ['Təkrarsız elementlər: {1, 2, 3}']),
        ],
        'list dəyişkən və sıralıdır, tuple dəyişməzdir, dict açar–dəyər saxlayır, set təkrarları atır.',
    ),
    single('`sum(range(1, 5))` nəyə bərabərdir?', ['15', '10', '5', '14'], 2,
           'range(1, 5) → 1, 2, 3, 4 (5 daxil deyil). Cəm 10.'),
    single('`try` blokunda xəta baş verəndə hansı blok işləyir?', ['else', 'except', 'finally yox, yalnız else', 'Heç biri'], 2,
           'Xəta olduqda except, olmadıqda else işləyir; finally isə hər iki halda.'),
    single('`"Python"[::-1]` nə qaytarır?', ["'Python'", "'nohtyP'", "'P'", "'n'"], 2, 'Addım −1 sətri tərsinə çevirir.'),
    single('`[x for x in [5, 12, 8, 20] if x > 10]` nəyə bərabərdir?', ['[12, 20]', '[5, 8]', '[True, False]', '[12, 8, 20]'], 1,
           'Şərt yalnız 10-dan böyükləri saxlayır.'),
    single('`re.findall(r"#(\\d+)", "#12 və #345")` nə qaytarır?', ["['#12', '#345']", "['12', '345']", "[12, 345]", "'12345'"], 2,
           'Qrup olduqda findall yalnız qrupun içini qaytarır; dəyərlər sətirdir.'),
    single('Faylın sonuna məlumat əlavə etmək üçün hansı rejim lazımdır?', ['"r"', '"w"', '"a"', '"x"'], 3,
           '"a" (append) mövcud məzmunu saxlayıb sona yazır.'),
    multiple(
        'Bunlardan hansılar **standart kitabxananın** modullarıdır? (Bir neçə cavab)',
        ['datetime', 'pandas', 'json', 'collections', 'seaborn'],
        [1, 3, 4],
        'datetime, json, collections Python ilə gəlir; pandas və seaborn PyPI paketləridir.',
    ),
    single(
        'Funksiya testlərdə başqa data ilə çağırılanda səhv nəticə verir. Ən çox ehtimal olunan səbəb?',
        [
            'Funksiya arqument əvəzinə qlobal dəyişəndən və ya sabit rəqəmlərdən istifadə edir',
            'Funksiyanın adı uzundur',
            'Funksiya return əvəzinə print istifadə edir — bu, həmişə düzgündür',
            'Python funksiyaları yalnız bir dəfə çağırmaq olar',
        ],
        1,
        'Funksiya yalnız ona verilən arqumentlərlə işləməlidir — onda istənilən data üçün düzgün nəticə verir.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'new steps')
