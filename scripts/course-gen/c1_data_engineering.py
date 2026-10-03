from common import Course, classify, multiple, single

c = Course(
    'what-is-data-engineering',
    {
        '_comment': (
            'What is Data Engineering? — giriş kursu (kodsuz).\n'
            'Hər dərs nəzəri addımdır: videonu admin paneldə dərsin «Video» sahəsinə yükləyin — mətnin üstündə görünür.\n'
            'Məşqlər yalnız sual-cavabdır: tək seçim, çox seçim və «qruplara ayır» (classify).'
        ),
        'track': 'data-engineering',
        'title': 'What is Data Engineering?',
        'level': 'beginner',
        'description': (
            'Data engineering-ə kodsuz, sadə dildə giriş: data haradan gəlir, harada saxlanılır, '
            'necə hərəkət edir və bütün bunları kim qurur. Data iş axını, data pipeline və ETL, '
            'SQL bazaları, data warehouse və data lake, data emalı, planlaşdırma, paralel hesablama və bulud. '
            'Hər dərsdən sonra real ssenarilərə əsaslanan məşqlər.'
        ),
        'sequential': True,
        'estimated_hours': 3,
        'published': True,
    },
)

# ───────────────────────────── Fəsil 1 ─────────────────────────────
m = c.module('giris', 'Data engineering-ə giriş', 'Data iş axını, data engineer-in rolu, Big Data və data pipeline anlayışı.')

m.lesson('xos-geldin', 'Kursa xoş gəldin', 4, '''
    Telefonda sifariş verəndə, kartla ödəniş edəndə və ya sevdiyin mahnını açanda arxa planda **data** yaranır. Bu datanın düzgün toplanması, etibarlı saxlanması və lazım olan adama vaxtında çatdırılması **data engineering**-in işidir.

    Bu kursda kod yazmayacağıq. Məqsəd böyük mənzərəni görməkdir: data haradan gəlir, harada yaşayır, necə hərəkət edir və bütün bunları kim qurur.

    ## Kurs boyu bizimlə olacaq şirkət: NarMarket 🍎

    **NarMarket** — uydurma onlayn ərzaq marketidir. Bakı, Gəncə və Sumqayıtda fəaliyyət göstərir:

    - mobil tətbiq və vebsayt — gündə təxminən **50 000 sifariş**;
    - 3 anbar və 400 kuryer;
    - kart ödənişləri, müştəri rəyləri, endirim kampaniyaları.

    Bu fəaliyyətin hər saniyəsi yeni data yaradır: kim nə aldı, nə qədər ödədi, kuryer harada idi, hansı məhsul anbarda bitdi. Kurs boyu NarMarket-in data komandası ilə birlikdə işləyəcəyik və hər yeni anlayışı onların real problemləri üzərində görəcəyik.

    ## Kursda nə öyrənəcəksən

    | Fəsil | Mövzu |
    | --- | --- |
    | 1. Giriş | Data iş axını, data engineer kimdir, Big Data, data pipeline və ETL |
    | 2. Saxlama | Data strukturları, SQL bazaları, data warehouse və data lake |
    | 3. Hərəkət və emal | Data emalı, planlaşdırma, paralel hesablama, bulud |
    | 4. Peşə | Alətlər, «bir gün data engineer kimi» və yekun test |

    ## Necə öyrənəcəksən

    1. **Dərs** — video və qısa mətn. Videonu izlə, sonra mətni oxu: vacib anlayışlar və cədvəllər burada toplanıb.
    2. **Məşq** — hər dərsdən sonra suallar gəlir. Bəzən düzgün cavabı seçəcəksən, bəzən elementləri düzgün qrupa sürüşdürəcəksən.
    3. **Səhv etmək olar** — cavabdan sonra izahı oxu və yenidən cəhd et. Hər cəhd öyrədir.

    > 💡 Dərsləri ardıcıl keç: hər fəsil əvvəlkinin üzərində qurulub. Sonda yekun test səni gözləyir.
''')

m.lesson('data-is-axini', 'Data iş axını (data workflow)', 6, '''
    Data öz-özünə dəyər yaratmır. Xam data — sadəcə rəqəmlər və qeydlərdir. Ondan qərar çıxarmaq üçün data bir neçə mərhələdən keçir. Buna **data iş axını** (data workflow) deyilir.

    ## Dörd mərhələ

    | # | Mərhələ | Nə baş verir | NarMarket-də nümunə |
    | --- | --- | --- | --- |
    | 1 | **Toplama və saxlama** (collection & storage) | Data müxtəlif mənbələrdən toplanır və saxlanılır | Tətbiqdən sifarişlər, ödəniş sistemindən əməliyyatlar, kuryerlərin GPS-i |
    | 2 | **Hazırlama** (preparation) | Data təmizlənir və istifadəyə hazır formaya salınır | Dublikat sifarişlər silinir, tarixlər vahid formata salınır |
    | 3 | **Kəşf və vizuallaşdırma** (exploration & visualization) | Datada trendlər axtarılır, qrafiklər və dashboard-lar qurulur | «Hansı məhsul ən çox satılır?» dashboard-u |
    | 4 | **Eksperiment və proqnoz** (experimentation & prediction) | Fərziyyələr yoxlanılır, gələcək proqnozlaşdırılır | Endirimin təsiri A/B testlə yoxlanılır, gələn həftənin sifariş sayı proqnozlaşdırılır |

    ## Data engineer harada dayanır?

    **Data engineer birinci mərhələdən məsuldur.** O, datanı toplayır, saxlayır və digər mərhələlər üçün **hazır və əlçatan** edir. Bəzən hazırlama mərhələsinin bir hissəsini də (avtomatik təmizləmə, formatlama) öz üzərinə götürür.

    Qalan mərhələlərdə əsasən **data analitiklər** və **data scientist-lər** işləyir. Lakin onların hamısı bir şeydən asılıdır: data engineer-in qurduğu təməldən. Data toplanmayıbsa, gec gəlirsə və ya səhvdirsə, ən yaxşı analitik də düzgün nəticə çıxara bilməz.

    > 🍽️ **Bənzətmə:** restoranı düşün. Data engineer — məhsulların tədarükü və anbardır: təzə məhsul vaxtında gəlməli, düzgün saxlanmalıdır. Aşpaz (analitik, data scientist) yemək bişirir, ofisiant (dashboard) onu müştəriyə təqdim edir. Tədarük pozulsa, mətbəx dayanır.

    ## NarMarket-də bir səhər

    Səhər 09:00-da satış direktoru dashboard-u açır və dünənki satışları görmək istəyir. Bunun mümkün olması üçün gecə ərzində:

    1. dünənki bütün sifarişlər tətbiqin bazasından toplanmalı,
    2. ödəniş sistemi ilə uzlaşdırılmalı,
    3. təmizlənib analitik bazaya yazılmalı idi.

    Bu zəncirin hər halqasını data engineer qurur və ona nəzarət edir. Direktor isə yalnız son nəticəni görür — hər şey qaydasındadırsa, data engineer-in işi «görünməz» qalır.

    ## Qısa xülasə

    - Data iş axını 4 mərhələdən ibarətdir: toplama və saxlama → hazırlama → kəşf və vizuallaşdırma → eksperiment və proqnoz.
    - Data engineer birinci mərhələnin sahibidir və bütün sonrakı işlərin təməlini qurur.
    - Analitiklər və data scientist-lər data engineer-in hazırladığı data ilə işləyir.
''')

m.quiz('kimin-isidir', 'Məşq: Bu kimin işidir?', [
    classify(
        '''
        NarMarket-in data komandasında görüləcək işlərin siyahısı hazırlanır. Hansı tapşırıqlar **data engineer**-in məsuliyyətinə düşür, hansılar başqa rolların işidir?

        Elementləri düzgün qrupa sürüşdür.
        ''',
        [
            ('Data engineer-in işi', [
                'Tətbiqdəki sifarişləri analitik bazaya avtomatik ötürən sistem qurmaq',
                'Müxtəlif mənbələrdən gələn datanı bir yerdə saxlamaq üçün baza qurmaq',
                'Datanın etibarlı saxlanmasını və əlçatan olmasını təmin etmək',
                'Gecəlik data yükləmələrinin vaxtında işləməsinə nəzarət etmək',
            ]),
            ('Data engineer-in işi deyil', [
                'Satış trendlərini göstərən dashboard dizayn etmək',
                'Endirim kampaniyasının təsirini A/B testlə yoxlamaq',
                'Gələn ayın sifariş sayını proqnozlaşdıran model qurmaq',
                'Rəhbərliyə rüblük nəticələri təqdim etmək',
            ]),
        ],
        'Data engineer datanı toplayır, saxlayır və əlçatan edir. Dashboard, A/B test, proqnoz modelləri və təqdimatlar analitik və data scientist-lərin işidir — amma onlar data engineer-in hazırladığı datadan istifadə edir.',
    ),
    single(
        '''
        Səhər analitik Aysel dashboard-u yeniləyə bilmir: dünənki sifarişlərin heç biri analitik bazaya düşməyib.

        Problem data iş axınının **hansı mərhələsindədir**?
        ''',
        ['Kəşf və vizuallaşdırma', 'Toplama və saxlama', 'Eksperiment və proqnoz', 'Problem yoxdur — dashboard köhnə datanı göstərə bilər'],
        2,
        'Data bazaya ümumiyyətlə çatmayıb — deməli, zəncir ilk mərhələdə, toplama və saxlamada qırılıb. Bu, data engineer-in araşdıracağı problemdir.',
    ),
])

m.lesson('data-engineer-kimdir', 'Data engineer kimdir?', 7, '''
    **Data engineer** datanı toplayan, saxlayan və emal edən sistemləri quran və onlara qulluq edən mütəxəssisdir. Onun əsas vəzifəsini bir cümlə ilə belə ifadə etmək olar:

    > Datanı **düzgün formada**, **düzgün insanlara**, **vaxtında** və **səmərəli** şəkildə çatdırmaq.

    ## Əsas vəzifələri

    - **Data pipeline-lar qurmaq** — datanı mənbələrdən götürüb lazım olan yerə avtomatik daşıyan sistemlər.
    - **Verilənlər bazalarını idarə etmək** — cədvəllərin strukturunu (sxemini) qurmaq, sürətli işləməsini təmin etmək.
    - **Data keyfiyyətinə nəzarət** — dublikatlar, boş dəyərlər, səhv formatlar vaxtında aşkarlanmalıdır.
    - **Miqyaslanma** — data həcmi 10 dəfə artanda da sistem dayanmamalıdır.
    - **Təhlükəsizlik və giriş hüquqları** — şəxsi məlumatlar qorunmalı, hər kəs yalnız ona lazım olan dataya çatmalıdır.

    ## Su təchizatı bənzətməsi 🚰

    Şəhərin su sistemini düşün. Su mənbələri (çaylar, su anbarları) — **data mənbələridir**: tətbiqlər, saytlar, sensorlar. Borular — **data pipeline-lardır**. Təmizləyici stansiya — **data emalıdır**. Evlərdəki kranlar isə analitiklərin dashboard-ları və hesabatlarıdır.

    Data engineer bu sistemin mühəndisi və santexnikidir: boruları layihələndirir, çəkir, sızma olanda təmir edir. Kranı açan adam boruları görmür — sadəcə təmiz suyun gəlməsini gözləyir.

    ## Data komandasında rollar

    | | Data engineer | Data analitik | Data scientist |
    | --- | --- | --- | --- |
    | **Əsas sual** | Data etibarlı və vaxtında çatırmı? | Nə baş verib və niyə? | Nə baş verəcək? |
    | **İşi** | Pipeline, baza, infrastruktur | Hesabat, dashboard, təhlil | Proqnoz modelləri, eksperimentlər |
    | **Alətlər** | SQL, Python, Spark, Airflow, bulud | Excel, SQL, Power BI, Tableau | Python, statistika, maşın öyrənməsi |
    | **NarMarket-də** | Sifarişləri hər gecə analitik bazaya yükləyir | «Hansı şəhərdə satış düşüb?» | «Gələn həftə neçə kuryer lazımdır?» |

    > 📌 Sorğulara görə data scientist-lər vaxtlarının çox hissəsini datanı **tapmağa və təmizləməyə** sərf edirlər. Yaxşı data engineer bu vaxtı kəskin azaldır — və data scientist əsl işinə, modellərə vaxt ayırır.

    ## Böyük data (Big Data) və 5V

    Data engineering-in əhəmiyyəti **Big Data** ilə birlikdə artdı. Big Data — ənənəvi üsullarla emal etmək çətin olan qədər böyük və mürəkkəb data deməkdir. Onu adətən **5V** ilə təsvir edirlər:

    | V | Mənası | NarMarket-də |
    | --- | --- | --- |
    | **Volume** (həcm) | Datanın miqdarı | İldə 18 milyon sifariş, milyardlarla tətbiq hadisəsi |
    | **Velocity** (sürət) | Datanın yaranma və emal sürəti | Kuryerlərin GPS-i hər 2 saniyədən bir yer göndərir |
    | **Variety** (müxtəliflik) | Datanın növləri | Cədvəllər, JSON hadisələr, foto, rəy mətnləri |
    | **Veracity** (etibarlılıq) | Datanın dəqiqliyi və keyfiyyəti | Səhv daxil edilmiş ünvanlar, dublikat qeydlər |
    | **Value** (dəyər) | Datadan əldə edilən fayda | Daha dəqiq proqnoz → daha az israf |

    ## Qısa xülasə

    - Data engineer datanı düzgün formada, düzgün insanlara, vaxtında çatdıran sistemləri qurur.
    - Analitik keçmişi izah edir, data scientist gələcəyi proqnozlaşdırır — hər ikisi data engineer-in təməlindən asılıdır.
    - Big Data 5V ilə təsvir olunur: həcm, sürət, müxtəliflik, etibarlılıq, dəyər.
''')

m.quiz('dogrusunu-de', 'Məşq: Doğrusunu de', [
    single(
        '''
        NarMarket-in data scientist-i Leyla müştərilərin hansı məhsulları **birlikdə** aldığını proqnozlaşdıran model qurmaq istəyir. Lakin sifariş datası 3 fərqli sistemdə, 3 fərqli formatda saxlanılır və hər dəfə əl ilə birləşdirilir.

        Bu problemi kim və necə həll etməlidir?
        ''',
        [
            'Data analitik — yeni dashboard hazırlamalıdır',
            'Data engineer — datanı bir yerdə, vahid formatda toplayan avtomatik pipeline qurmalıdır',
            'Leyla — modeli datasız qurmağa başlamalıdır',
            'Dizayner — tətbiqin interfeysini dəyişməlidir',
        ],
        2,
        'Datanın müxtəlif sistemlərdən toplanıb vahid formada əlçatan edilməsi data engineer-in əsas işidir. Bundan sonra Leyla vaxtını təmizləməyə yox, modelə sərf edə bilər.',
    ),
    single(
        'Hansı ifadə **doğrudur**?',
        [
            'Data engineer-lər əsasən maşın öyrənməsi modelləri qurur',
            'Data engineer-lər yalnız Excel cədvəlləri ilə işləyir',
            'Data engineer-lər datanı toplayıb saxlayır və onu analitik və data scientist-lər üçün əlçatan edir',
            'Data scientist-lər şirkətin bütün baza arxitekturasını qurur',
        ],
        3,
        'Data engineer datanın «təchizat zəncirini» qurur: toplama, saxlama, çatdırma. Modelləri isə əsasən data scientist-lər qurur.',
    ),
    single(
        '''
        NarMarket kuryerlərinin cihazları **hər 2 saniyədən bir** yer məlumatı göndərir və bu data dərhal emal olunmalıdır ki, müştəri kuryeri xəritədə görsün.

        Bu, Big Data-nın ən çox hansı «V»-si ilə bağlıdır?
        ''',
        ['Volume (həcm)', 'Variety (müxtəliflik)', 'Velocity (sürət)', 'Value (dəyər)'],
        3,
        'Datanın çox sürətlə yaranması və dərhal emal tələb etməsi Velocity-dir.',
    ),
])

m.lesson('data-pipeline', 'Data pipeline və ETL', 8, '''
    NarMarket-də data onlarla mənbədən gəlir: tətbiq, sayt, ödəniş sistemi, anbar proqramı, kuryer cihazları. Bunları hər gün əl ilə yığmaq həm yavaş, həm də səhvlərlə dolu olardı. Həll yolu — **data pipeline**.

    ## Data pipeline nədir?

    **Data pipeline** — datanı mənbələrdən götürüb, yol boyu emal edərək təyinat yerinə **avtomatik** çatdıran addımlar ardıcıllığıdır. Onu fabrikdəki konveyer lentinə bənzətmək olar: xammal bir tərəfdən daxil olur, hər stansiyada üzərində iş görülür, digər tərəfdən hazır məhsul çıxır.

    NarMarket-in sifariş pipeline-ı:

    ```text
    Mobil tətbiq ─┐
    Vebsayt ──────┼──► Toplama ──► Təmizləmə ──► Birləşdirmə ──► Data warehouse ──► Dashboard-lar
    Ödəniş sistemi┘                                                              └─► Proqnoz modelləri
    ```

    ## ETL: Extract, Transform, Load

    Pipeline-ların ən klassik forması **ETL**-dir:

    | Addım | Mənası | NarMarket-də |
    | --- | --- | --- |
    | **E — Extract** (çıxarma) | Datanı mənbədən oxumaq | Tətbiqin bazasından dünənki sifarişləri, ödəniş sistemindən əməliyyatları götürmək |
    | **T — Transform** (çevirmə) | Datanı təmizləmək, formatlamaq, birləşdirmək | Dublikatları silmək, tarixləri vahid formata salmaq, sifarişi ödənişlə birləşdirmək |
    | **L — Load** (yükləmə) | Hazır datanı təyinat yerinə yazmaq | Təmiz cədvəli data warehouse-a yazmaq |

    ### ETL və ELT

    Müasir bulud anbarları çox güclü olduğu üçün tez-tez **ELT** istifadə olunur: data əvvəlcə olduğu kimi anbara **yüklənir** (Load), sonra elə anbarın içində **çevrilir** (Transform). Üstünlüyü: xam data itmir, sonradan başqa cür emal etmək mümkündür.

    ## Batch və streaming

    | | Batch (paket) emal | Streaming (axın) emal |
    | --- | --- | --- |
    | **Necə işləyir** | Data toplanır və müəyyən vaxtda bir paket kimi emal olunur | Hər qeyd yarandığı anda emal olunur |
    | **Nə vaxt** | Gündəlik hesabatlar, gecəlik yükləmələr | Saxtakarlığın aşkarlanması, kuryerin canlı izlənməsi |
    | **Üstünlüyü** | Sadə və ucuz | Nəticə saniyələr içində hazırdır |

    ## Niyə avtomatlaşdırma?

    - **Sürət** — data hər gün eyni vaxtda hazır olur.
    - **Etibarlılıq** — insan yorulur və səhv edir, pipeline isə hər dəfə eyni addımları təkrarlayır.
    - **Nəzarət** — pipeline qırılanda data engineer dərhal xəbərdarlıq alır və problemi analitiklər görməmiş həll edir.

    ## Qısa xülasə

    - Data pipeline datanı mənbələrdən təyinat yerinə avtomatik daşıyan addımlar ardıcıllığıdır.
    - ETL: çıxar → çevir → yüklə. ELT-də çevirmə yükləmədən sonra, anbarın içində baş verir.
    - Batch — vaxtaşırı paketlərlə, streaming — real vaxtda.
''')

m.quiz('pipeline-qur', 'Məşq: Pipeline-ı qur', [
    classify(
        '''
        NarMarket-in gecəlik ETL pipeline-ında görülən işlər qarışıq düşüb. Hər tapşırığı ETL-in düzgün addımına yerləşdir.
        ''',
        [
            ('Extract (çıxarma)', [
                'Mobil tətbiqin bazasından dünənki sifarişləri oxumaq',
                'Ödəniş sisteminin API-sindən əməliyyatları götürmək',
            ]),
            ('Transform (çevirmə)', [
                'Tarixləri vahid formata salmaq: 03.10.2026 → 2026-10-03',
                'Eyni sifarişin iki dəfə yazılmış qeydini silmək',
                'Dollarla olan ödənişləri manata çevirmək',
            ]),
            ('Load (yükləmə)', [
                'Hazır cədvəli data warehouse-a yazmaq',
                'Təmizlənmiş datanı analitiklərin bazasına yükləmək',
            ]),
        ],
        'Extract — mənbədən oxumaq, Transform — təmizləmək və formatlamaq, Load — hazır datanı təyinat yerinə yazmaq.',
    ),
    single(
        'Hansı tapşırıq üçün **streaming** (real vaxt) pipeline lazımdır?',
        [
            'Aylıq maliyyə hesabatını hazırlamaq',
            'Keçən ilin satışlarını təhlil etmək',
            'Şübhəli kart əməliyyatını ödəniş anında bloklamaq',
            'Həftəlik ən çox satılan məhsulların siyahısı',
        ],
        3,
        'Saxtakarlıq ödəniş anında aşkarlanmalıdır — bir gün sonra gec olacaq. Qalan tapşırıqlar üçün batch emal kifayətdir.',
    ),
    single(
        '**ELT** yanaşmasında datanın çevrilməsi (Transform) harada baş verir?',
        [
            'Data mənbədən çıxarılmazdan əvvəl',
            'Data warehouse-a yükləndikdən sonra, anbarın daxilində',
            'Analitikin kompüterində, Excel-də',
            'ELT-də çevirmə addımı yoxdur',
        ],
        2,
        'ELT-də xam data əvvəlcə anbara yüklənir, sonra güclü bulud anbarının daxilində çevrilir.',
    ),
])

# ───────────────────────────── Fəsil 2 ─────────────────────────────
m = c.module('saxlama', 'Datanın saxlanması', 'Strukturlaşdırılmış və strukturlaşdırılmamış data, SQL bazaları, data warehouse və data lake.')

m.lesson('data-strukturlari', 'Data strukturları', 6, '''
    Hər data eyni deyil. Sifarişlər cədvəli, tətbiqdən gələn hadisə qeydi və müştərinin yüklədiyi foto — üçü də datadır, amma tamamilə fərqli saxlanılır və emal olunur. Data adətən üç qrupa bölünür.

    ## 1. Strukturlaşdırılmış data (structured)

    Sətir və sütunlardan ibarət, əvvəlcədən müəyyən olunmuş **sxemi** olan data. Hər sütunun adı və tipi var.

    | order_id | tarix | müştəri | məbləğ |
    | --- | --- | --- | --- |
    | 1045 | 2026-10-03 | Aysel M. | 42.50 |
    | 1046 | 2026-10-03 | Rauf H. | 18.20 |

    - Axtarmaq, filtrləmək, cəmləmək asandır.
    - **Relyasiyalı verilənlər bazalarında** (PostgreSQL, MySQL) saxlanılır və SQL ilə sorğulanır.
    - Nümunələr: sifarişlər, işçilərin maaş cədvəli, bank əməliyyatları.

    ## 2. Yarım-strukturlaşdırılmış data (semi-structured)

    Müəyyən strukturu var, amma sxem sərt deyil: hər qeydin sahələri fərqli ola bilər, iç-içə məlumat ola bilər. Ən populyar formatlar — **JSON** və **XML**.

    ```json
    {
      "event": "add_to_cart",
      "user_id": 8812,
      "time": "2026-10-03T09:15:22",
      "product": { "id": 301, "name": "Nar şirəsi", "price": 3.40 },
      "device": "iOS"
    }
    ```

    - Tətbiq və saytların hadisə qeydləri, API cavabları adətən belədir.
    - **NoSQL bazalarında** (məsələn, MongoDB) saxlanıla bilər.

    ## 3. Strukturlaşdırılmamış data (unstructured)

    Əvvəlcədən müəyyən modeli olmayan data: **mətn, foto, video, səs**, PDF sənədlər.

    - Dünyadakı datanın təxminən **80–90%-i** strukturlaşdırılmamışdır.
    - Saxlamaq asandır, amma axtarmaq və təhlil etmək çətindir.
    - Süni intellekt və maşın öyrənməsi bu datadan dəyər çıxarmağa kömək edir: rəylərin əhval-ruhiyyəsini təyin etmək, fotoda məhsulu tanımaq.

    ## Bir rəydə üç növ data

    NarMarket-də müştəri sifarişi qiymətləndirəndə:

    - **ulduz sayı** (4 ⭐) — strukturlaşdırılmış;
    - **tətbiqin göndərdiyi JSON qeyd** (vaxt, cihaz, sifariş nömrəsi) — yarım-strukturlaşdırılmış;
    - **şərh mətni** («Kuryer çox nəzakətli idi, amma çörək əzilmişdi») və **foto** — strukturlaşdırılmamış.

    | | Strukturlaşdırılmış | Yarım-strukturlaşdırılmış | Strukturlaşdırılmamış |
    | --- | --- | --- | --- |
    | **Forma** | Cədvəl | JSON, XML | Mətn, foto, video, səs |
    | **Sxem** | Sərt | Çevik | Yoxdur |
    | **Təhlil** | Asan | Orta | Çətin |
    | **Harada** | Relyasiyalı baza | NoSQL, data lake | Data lake, fayl anbarı |

    ## Qısa xülasə

    - Strukturlaşdırılmış data cədvəl şəklindədir və SQL ilə asan sorğulanır.
    - Yarım-strukturlaşdırılmış data (JSON, XML) çevik struktura malikdir.
    - Strukturlaşdırılmamış data (mətn, foto, video) dünyadakı datanın böyük əksəriyyətini təşkil edir.
''')

m.quiz('strukturlara-ayir', 'Məşq: Strukturlara ayır', [
    classify(
        'NarMarket-in data anbarına müxtəlif data gəlir. Hər birini düzgün qrupa yerləşdir.',
        [
            ('Strukturlaşdırılmış', [
                'Sifarişlər cədvəli: order_id, tarix, məbləğ',
                'Excel-də işçilərin maaş cədvəli',
            ]),
            ('Yarım-strukturlaşdırılmış', [
                'Tətbiqdən gələn JSON formatlı «səbətə əlavə et» hadisəsi',
                'XML formatında təchizatçının məhsul kataloqu',
            ]),
            ('Strukturlaşdırılmamış', [
                'Müştərinin sərbəst yazdığı rəy mətni',
                'Kuryerin çəkdiyi çatdırılma fotosu',
                'Zəng mərkəzinin səs yazısı',
            ]),
        ],
        'Cədvəllər sərt sxemə malikdir. JSON və XML çevik strukturludur. Mətn, foto və səsin isə əvvəlcədən müəyyən modeli yoxdur.',
    ),
    single(
        'Dünyadakı datanın təxminən nə qədəri **strukturlaşdırılmamışdır**?',
        ['10–20%', 'Təxminən yarısı', '80–90%', 'Demək olar ki, heç biri'],
        3,
        'Mətnlər, fotolar, videolar və səs yazıları datanın böyük əksəriyyətini — təxminən 80–90%-ni təşkil edir.',
    ),
])

m.lesson('sql-ve-bazalar', 'SQL və verilənlər bazaları', 7, '''
    **Verilənlər bazası** (database) — datanın nizamlı şəkildə saxlandığı və asanlıqla tapıla bildiyi sistemdir. Bazanı idarə edən proqrama **DBMS** (Database Management System) deyilir.

    ## Relyasiyalı bazalar

    Ən geniş yayılmış bazalar **relyasiyalıdır**: data cədvəllərdə saxlanılır, cədvəllər isə bir-biri ilə **açarlar** vasitəsilə əlaqələndirilir.

    **customers** (müştərilər):

    | customer_id | name | city |
    | --- | --- | --- |
    | 1 | Aysel | Bakı |
    | 2 | Rauf | Gəncə |

    **orders** (sifarişlər):

    | order_id | customer_id | amount |
    | --- | --- | --- |
    | 1045 | 1 | 42.50 |
    | 1046 | 2 | 18.20 |
    | 1047 | 1 | 9.90 |

    - **Sətir** (row) — bir qeyd, məsələn, bir sifariş.
    - **Sütun** (column) — bir xüsusiyyət, məsələn, məbləğ.
    - **Primary key** (əsas açar) — hər sətri unikal tanıdan sütun: `order_id`.
    - **Foreign key** (xarici açar) — başqa cədvələ istinad edən sütun: `orders.customer_id` → `customers.customer_id`. Beləliklə, 1045 və 1047 nömrəli sifarişlərin Ayselə aid olduğunu bilirik.

    ## SQL — datanın dili

    **SQL** (Structured Query Language) relyasiyalı bazalarla işləmək üçün standart dildir. 1970-ci illərdə yaranıb və bu gün də data ilə işləyən hər kəsin əsas alətidir. Sadə sorğu ingilis dilində cümlə kimi oxunur:

    ```sql
    SELECT name, city        -- hansı sütunlar
    FROM customers           -- hansı cədvəldən
    WHERE city = 'Bakı';     -- hansı şərtlə
    ```

    Nəticə: Bakıda yaşayan müştərilərin adı və şəhəri.

    ## SQL-dən kim istifadə edir?

    | Data engineer | Data analitik / data scientist |
    | --- | --- |
    | Cədvəllərin strukturunu (sxemini) yaradır | Datanı sorğulayır və filtrləyir |
    | Cədvəllər arasında əlaqələri təyin edir | Cəmləmə, orta, say hesablayır |
    | Yeni data mənbələrini qoşur, yükləmələri yazır | Hesabat və dashboard üçün data hazırlayır |

    ## Baza sxemi və «ulduz» sxemi

    **Sxem** (schema) bazadakı cədvəllərin, sütunların və onların əlaqələrinin planıdır — binanın layihəsi kimi. Analitik anbarlarda tez-tez **ulduz sxemi** (star schema) istifadə olunur:

    ```text
                   dim_customer
                        │
    dim_product ── fact_orders ── dim_date
                        │
                   dim_courier
    ```

    Mərkəzdə **fakt cədvəli** dayanır (hadisələr: hər sifariş, məbləğ). Ətrafında **ölçü cədvəlləri** (dimension) — müştəri, məhsul, tarix, kuryer haqqında təsviri məlumatlar. Bu quruluş «Hansı şəhərdə, hansı ayda, hansı məhsul nə qədər satılıb?» kimi sualları çox sürətli cavablandırmağa imkan verir.

    ## Populyar bazalar

    - **Relyasiyalı (SQL):** PostgreSQL, MySQL, Microsoft SQL Server, Oracle, SQLite.
    - **NoSQL:** MongoDB (sənədlər/JSON), Redis (açar-dəyər, çox sürətli), Cassandra (nəhəng həcmlər).

    ## Qısa xülasə

    - Relyasiyalı bazalar datanı açarlarla əlaqələnmiş cədvəllərdə saxlayır.
    - SQL bazalarla işləmək üçün standart dildir: data engineer sxem qurur, analitik sorğulayır.
    - Ulduz sxemində mərkəzdə fakt cədvəli, ətrafında ölçü cədvəlləri olur.
''')

m.quiz('sql-testi', 'Məşq: SQL və bazalar', [
    single(
        '''
        Bu sorğu nə qaytarır?

        ```sql
        SELECT name, city
        FROM customers
        WHERE city = 'Gəncə';
        ```
        ''',
        [
            'Bütün müştərilərin adını və şəhərini',
            'Gəncədə yaşayan müştərilərin adını və şəhərini',
            'Gəncədə verilən sifarişlərin sayını',
            'Gəncə adlı yeni cədvəl yaradır',
        ],
        2,
        'SELECT hansı sütunların, FROM hansı cədvəlin, WHERE isə hansı sətirlərin seçiləcəyini göstərir.',
    ),
    single(
        'Cədvəldə **hər sətri unikal tanıdan** sütun necə adlanır?',
        ['Foreign key', 'Primary key', 'Index', 'Schema'],
        2,
        'Primary key (əsas açar) hər sətir üçün unikaldır, məsələn order_id. Foreign key başqa cədvəlin əsas açarına istinad edir.',
    ),
    classify(
        'SQL-dən həm data engineer, həm də data analitik istifadə edir — amma fərqli məqsədlərlə. Tapşırıqları qruplara ayır.',
        [
            ('Adətən data engineer', [
                'Yeni cədvəlin strukturunu (sxemini) yaratmaq',
                'Cədvəllər arasında əlaqələri (foreign key) təyin etmək',
                'Yeni data mənbəyini bazaya qoşmaq',
            ]),
            ('Adətən data analitik', [
                'Ötən ayın ən çox satılan 10 məhsulunu tapmaq',
                'Şəhərlər üzrə orta sifariş məbləğini hesablamaq',
                'Hesabat üçün datanı filtrləmək',
            ]),
        ],
        'Data engineer bazanın quruluşunu yaradır və datanı içəri gətirir; analitik isə hazır datanı sorğulayıb suallara cavab axtarır.',
    ),
    single(
        '**Ulduz sxemində** (star schema) mərkəzdə hansı cədvəl dayanır?',
        [
            'Ölçü cədvəli — məsələn, müştərilər',
            'Fakt cədvəli — məsələn, sifarişlər və onların məbləğləri',
            'İstifadəçilərin parol cədvəli',
            'Ulduz sxemində mərkəz olmur',
        ],
        2,
        'Mərkəzdə hadisələri saxlayan fakt cədvəli, ətrafında isə təsviri məlumatları saxlayan ölçü cədvəlləri (müştəri, məhsul, tarix) olur.',
    ),
])

m.lesson('warehouse-lake', 'Data warehouse və data lake', 7, '''
    NarMarket-də hər gün həm səliqəli cədvəllər, həm də nəhəng həcmdə xam data (loglar, fotolar, JSON hadisələr) yaranır. Bunların hamısını eyni yerdə və eyni üsulla saxlamaq səmərəsizdir. Buna görə iki fərqli anbar növü var.

    ## Data lake (data gölü) 🏞️

    **Data lake** bütün xam datanı — strukturlaşdırılmış, yarım-strukturlaşdırılmış və strukturlaşdırılmamış — **olduğu kimi** saxlayır.

    - Çox böyük həcmlər (petabaytlar) və ucuz saxlama.
    - Data yazılanda sxem tələb olunmur — strukturu oxuyanda müəyyən edirlər (**schema-on-read**).
    - Əsasən data scientist-lər istifadə edir: kəşfiyyat, maşın öyrənməsi, yeni fikirlərin sınağı.
    - Nümunələr: Amazon S3, Azure Data Lake Storage, Google Cloud Storage üzərində qurulan göllər.

    ⚠️ **Risk:** nizam olmasa, göl **«data bataqlığına»** (data swamp) çevrilir — nə olduğu, haradan gəldiyi və etibarlı olub-olmadığı bilinməyən fayllar yığını.

    ## Data warehouse (data anbarı) 🏬

    **Data warehouse** təmizlənmiş, strukturlaşdırılmış və **analitika üçün optimallaşdırılmış** datanı saxlayır.

    - Data yazılmazdan əvvəl sxem müəyyən olunur (**schema-on-write**).
    - Oxuma sorğuları üçün çox sürətlidir: dashboard-lar, hesabatlar, biznes sualları.
    - Əsasən biznes analitikləri istifadə edir.
    - Nümunələr: Snowflake, Google BigQuery, Amazon Redshift.

    ## Bəs adi verilənlər bazası?

    Tətbiqin öz bazası (məsələn, NarMarket tətbiqinin PostgreSQL-i) **əməliyyatlar** üçündür: sifariş yaratmaq, statusu yeniləmək — hər saniyə minlərlə kiçik yazı. Analitik sorğular (məsələn, «son 3 ilin satışları») bu bazanı yavaşladar və müştərilər əziyyət çəkər. Buna görə data engineer datanı əməliyyat bazasından **ayrıca anbara** köçürür.

    | | Əməliyyat bazası | Data warehouse | Data lake |
    | --- | --- | --- | --- |
    | **Məqsəd** | Tətbiqin gündəlik işi | Analitika, hesabatlar | Xam datanın saxlanması, ML |
    | **Data** | Cari, strukturlaşdırılmış | Təmiz, strukturlaşdırılmış, tarixi | Hər növ, xam |
    | **Sxem** | Sərt | Yazanda (on-write) | Oxuyanda (on-read) |
    | **İstifadəçi** | Tətbiq | Analitiklər | Data scientist-lər |
    | **Xərc** | Orta | Daha baha | Ucuz |

    ## Data kataloqu

    **Data kataloqu** — datanın «kitabxana kartoçkası»dır: hər cədvəlin nə olduğu, mənbəyi, sahibi, nə vaxt yeniləndiyi və sütunların mənası. Kataloq data lake-in bataqlığa çevrilməsinin qarşısını alır və hər kəsə lazım olan datanı tapmağa kömək edir.

    ## Lakehouse

    Son illərdə hər iki dünyanın üstünlüklərini birləşdirən **lakehouse** yanaşması yayılıb: ucuz göl saxlaması üzərində anbar kimi sürətli və nizamlı sorğular (məsələn, Databricks, Delta Lake).

    ## NarMarket-də

    - Kuryer fotoları, tətbiq logları, xam JSON hadisələr → **data lake**.
    - Təmizlənmiş satış, müştəri və məhsul cədvəlləri → **data warehouse** → dashboard-lar.
    - Canlı sifarişlər → tətbiqin **əməliyyat bazası**.

    ## Qısa xülasə

    - Data lake hər növ xam datanı ucuz saxlayır; kataloqsuz bataqlığa çevrilə bilər.
    - Data warehouse təmiz, strukturlaşdırılmış datanı analitika üçün saxlayır.
    - Analitik sorğular tətbiqin əməliyyat bazasını yükləməməlidir — buna görə ayrıca anbar qurulur.
''')

m.quiz('gol-yoxsa-anbar', 'Məşq: Göl, yoxsa anbar?', [
    classify(
        'Hər xüsusiyyət data lake-ə, yoxsa data warehouse-a aiddir?',
        [
            ('Data lake', [
                'Bütün xam datanı (log, foto, JSON) olduğu kimi saxlayır',
                'Strukturlaşdırılmamış datanı da qəbul edir',
                'Ucuz saxlama ilə çox böyük həcm',
                'Data scientist-lərin kəşfiyyat və ML işləri üçün',
            ]),
            ('Data warehouse', [
                'Yalnız təmizlənmiş və strukturlaşdırılmış data',
                'Analitik sorğular və dashboard-lar üçün optimallaşdırılıb',
                'Data yazılmazdan əvvəl sxem müəyyən olunur',
                'Biznes analitiklərinin əsas iş yeri',
            ]),
        ],
        'Göl — xam, hər növ, ucuz və çevik; anbar — təmiz, strukturlaşdırılmış və sürətli analitika üçün.',
    ),
    single(
        'Data lake-də **kataloq** və nizam olmasa nə baş verir?',
        [
            'Data avtomatik təmizlənir',
            'Göl «data bataqlığına» çevrilir: nə olduğu və haradan gəldiyi bilinməyən fayllar yığılır',
            'Data warehouse-a çevrilir',
            'Heç nə — kataloq yalnız böyük şirkətlər üçündür',
        ],
        2,
        'Kataloq datanın mənbəyini, sahibini və mənasını izah edir. Onsuz göl tez bir zamanda istifadəyə yararsız bataqlığa çevrilir.',
    ),
    single(
        '''
        NarMarket-in rəhbərliyi hər səhər satış dashboard-una baxır. Data engineer dashboard-u birbaşa tətbiqin əməliyyat bazasına qoşmaq istəmir.

        Dashboard hansı mənbədən oxumalıdır və niyə?
        ''',
        [
            'Tətbiqin bazasından — orada data ən təzədir',
            'Data warehouse-dan — data təmizdir və ağır sorğular tətbiqi yavaşlatmır',
            'Data lake-dən — orada data ən çoxdur',
            'Analitikin kompüterindəki Excel faylından',
        ],
        2,
        'Analitik sorğular üçün data warehouse nəzərdə tutulub: data təmizdir, sorğular sürətlidir və müştərilərin istifadə etdiyi tətbiq yavaşlamır.',
    ),
])

# ───────────────────────────── Fəsil 3 ─────────────────────────────
m = c.module('emal', 'Datanın hərəkəti və emalı', 'Data emalı, planlaşdırma, batch və streaming, paralel hesablama və bulud.')

m.lesson('data-emali', 'Data emalı', 6, '''
    Mənbədən gələn data nadir hallarda istifadəyə hazır olur. **Data emalı** (data processing) — xam datanı mənalı və istifadəyə yararlı dataya çevirməkdir.

    ## Niyə emal edirik?

    - **Lazımsız datanı atmaq** — test sifarişləri, boş qeydlər.
    - **Yaddaşa qənaət** — hər saniyəlik GPS nöqtəsi əvəzinə marşrutun xülasəsi.
    - **Lazım olan formata salmaq** — tarix, valyuta, vahidlər.
    - **Sxemə uyğunlaşdırmaq** — data anbardakı cədvəlin strukturuna uyğun olmalıdır.
    - **Məxfilik** — şəxsi məlumatları gizlətmək (anonimləşdirmə, maskalama).
    - **Məhsuldarlıq** — hər dəfə əl ilə görülən işi avtomatlaşdırmaq.

    ## Tipik emal tapşırıqları

    | Tapşırıq | Nümunə |
    | --- | --- |
    | **Təmizləmə** | Dublikat sifarişləri silmək, səhv dəyərləri düzəltmək |
    | **Formatlama** | `03.10.2026` → `2026-10-03`, `"42,50"` → `42.50` |
    | **Cəmləmə** (aggregation) | Hər kateqoriya üzrə gündəlik satış cəmi |
    | **Birləşdirmə** (join) | Sifarişi ödəniş qeydi və müştəri məlumatı ilə birləşdirmək |
    | **Filtrləmə** | Yalnız tamamlanmış sifarişləri saxlamaq |
    | **Maskalama** | Kart nömrəsi: `4169 7380 1122 1234` → `4169 **** **** 1234` |
    | **Zənginləşdirmə** | Ünvandan rayonu təyin edib ayrıca sütuna yazmaq |

    ## Əvvəl və sonra

    Xam data:

    | sifariş | tarix | məbləğ | şəhər |
    | --- | --- | --- | --- |
    | 1045 | 03.10.2026 | 42,50 AZN | baku |
    | 1045 | 03.10.2026 | 42,50 AZN | baku |
    | 1046 | 2026-10-03 | $10.70 | Gəncə |

    Emaldan sonra:

    | sifariş | tarix | məbləğ_azn | şəhər |
    | --- | --- | --- | --- |
    | 1045 | 2026-10-03 | 42.50 | Bakı |
    | 1046 | 2026-10-03 | 18.19 | Gəncə |

    Dublikat silinib, tarixlər və şəhər adları vahid formaya salınıb, dollar manata çevrilib (1 USD = 1.70 AZN).

    ## Kim emal edir?

    Data engineer emal addımlarını **pipeline-ın içinə** qurur ki, hər gün avtomatik işləsin. Analitiklər və data scientist-lər də vaxtaşırı əlavə təmizləmə edir, amma əsas, təkrarlanan işi avtomatlaşdırmaq data engineer-in vəzifəsidir. Bu işdə **SQL**, **Python (pandas)**, **Apache Spark** və **dbt** kimi alətlərdən istifadə olunur.

    ## Qısa xülasə

    - Emal xam datanı istifadəyə yararlı formaya salır: təmizləmə, formatlama, cəmləmə, birləşdirmə, maskalama.
    - Emalın məqsədləri: keyfiyyət, qənaət, uyğunluq, məxfilik və avtomatlaşdırma.
    - Təkrarlanan emal pipeline-a qurulur və hər gün avtomatik işləyir.
''')

m.quiz('emal-yoxsa-yox', 'Məşq: Emal, yoxsa yox?', [
    classify(
        'Hansı işlər **data emalı** tapşırığıdır, hansılar başqa işlərdir?',
        [
            ('Data emalı tapşırığı', [
                'Kart nömrələrini maskalamaq: 4169 **** **** 1234',
                'Eyni sifarişin iki dəfə yazılmış qeydini silmək',
                'Gündəlik satışları kateqoriya üzrə cəmləmək',
                'Fərqli tarix formatlarını vahid formata salmaq',
                'İki sistemdən gələn müştəri datasını birləşdirmək',
            ]),
            ('Emal deyil (başqa iş)', [
                'Yeni server almaq üçün büdcəni təsdiqləmək',
                'Kuryerlərin iş qrafikini tərtib etmək',
                'Tətbiqin düymələrinin rəngini dəyişmək',
            ]),
        ],
        'Emal datanın özü üzərində aparılan dəyişikliklərdir: təmizləmə, formatlama, cəmləmə, birləşdirmə, maskalama.',
    ),
    single(
        'NarMarket müştəri datasını analitiklərə verməzdən əvvəl telefon nömrələrini gizlədir. Bu, emalın **hansı məqsədinə** xidmət edir?',
        ['Yaddaşa qənaət', 'Məxfilik — şəxsi məlumatların qorunması', 'Datanın sxemə uyğunlaşdırılması', 'Sürətin artırılması'],
        2,
        'Analitiklərə müştərinin telefon nömrəsi lazım deyil. Maskalama şəxsi məlumatları qoruyur və qanunvericiliyə uyğunluğu təmin edir.',
    ),
])

m.lesson('planlasdirma', 'Planlaşdırma (scheduling)', 7, '''
    Pipeline onlarla tapşırıqdan ibarətdir: çıxarma, təmizləmə, birləşdirmə, yükləmə... Onların **nə vaxt** və **hansı ardıcıllıqla** işə düşəcəyini planlaşdırma (scheduling) müəyyən edir. Planlaşdırma pipeline-ın bütün hissələrini bir-birinə bağlayan «yapışqandır».

    ## Üç işə salma üsulu

    | Üsul | Necə | Nümunə |
    | --- | --- | --- |
    | **Əl ilə** (manual) | İnsan düyməni basır | Data engineer xətanı düzəldib pipeline-ı yenidən başladır |
    | **Vaxta görə** (time-based) | Müəyyən vaxtda avtomatik | Hər gecə saat 02:00-da sifarişlər yüklənir |
    | **Hadisəyə görə** (sensor / event-based) | Müəyyən hadisə baş verəndə | Anbara yeni qaimə faylı düşən kimi emal başlayır |

    Real sistemlərdə üsullar birlikdə istifadə olunur.

    ## Asılılıqlar (dependencies)

    Tapşırıqların ardıcıllığı vacibdir: datanı çıxarmamış təmizləmək, təmizləməmiş cəmləmək olmaz. Planlaşdırıcı bu **asılılıqları** izləyir — əvvəlki addım uğurla bitməyincə növbəti başlamır.

    NarMarket-in gecəlik pipeline-ı:

    ```text
    01:00 sifarişləri çıxar ─┐
                             ├─► 01:30 təmizlə və birləşdir ─► 02:00 cəmlə ─► 02:30 dashboard-u yenilə
    01:00 ödənişləri çıxar ──┘
    ```

    Bu cür sxem **DAG** (Directed Acyclic Graph — istiqamətli, dövrsüz qraf) adlanır: oxlar ardıcıllığı göstərir və heç bir tapşırıq özünə qayıtmır. Əgər «ödənişləri çıxar» uğursuz olarsa, sonrakı addımlar gözləyir və data engineer xəbərdarlıq alır — beləliklə, dashboard natamam datanı göstərmir.

    ## Planlaşdırma alətləri

    - **Apache Airflow** — ən populyar alət; Airbnb-də yaradılıb, DAG-lar Python ilə yazılır.
    - **Prefect**, **Dagster**, **Luigi** — alternativlər.
    - Sadə hallarda **cron** — Linux-un vaxta görə işə salma aləti.

    ## Batch və streaming — yenidən

    - **Batch:** data qruplaşdırılır və planlaşdırılmış vaxtda emal olunur. Ucuz və sadədir; gündəlik hesabatlar üçün idealdır. Tez-tez gecə, sistemlər az yüklənəndə işləyir.
    - **Streaming:** hər qeyd dərhal emal olunur. Saxtakarlığın aşkarlanması, kuryerin canlı izlənməsi, anbar qalığının anlıq yenilənməsi üçün lazımdır. Bu iş üçün **Apache Kafka** kimi alətlər istifadə olunur.

    ## Qısa xülasə

    - Planlaşdırma tapşırıqları düzgün vaxtda və düzgün ardıcıllıqla işə salır.
    - Üç üsul: əl ilə, vaxta görə, hadisəyə görə.
    - Asılılıqlar DAG kimi təsvir olunur; Airflow ən populyar planlaşdırma alətidir.
''')

m.quiz('ne-vaxt-ise-dusur', 'Məşq: Nə vaxt işə düşür?', [
    classify(
        'NarMarket-in pipeline-larında tapşırıqlar müxtəlif üsullarla işə salınır. Hər birini düzgün qrupa yerləşdir.',
        [
            ('Əl ilə', [
                'Analitik düyməni basanda hesabat yenilənir',
                'Data engineer xətanı düzəldib pipeline-ı özü yenidən başladır',
            ]),
            ('Vaxta görə', [
                'Hər gecə saat 02:00-da sifarişlər yüklənir',
                'Hər bazar ertəsi səhər həftəlik hesabat hazırlanır',
            ]),
            ('Hadisəyə görə', [
                'Anbara yeni qaimə faylı düşən kimi emal başlayır',
                'Yeni müştəri qeydiyyatdan keçən kimi onun datası CRM-ə göndərilir',
            ]),
        ],
        'Əl ilə — insan başladır; vaxta görə — saat və təqvimə görə; hadisəyə görə — fayl gəlməsi, qeydiyyat kimi hadisə baş verəndə.',
    ),
    single(
        'Pipeline-da «cəmləmə» tapşırığı «çıxarma» tapşırığı bitməmiş işə düşsə nə olar?',
        [
            'Heç nə — ardıcıllığın əhəmiyyəti yoxdur',
            'Cəmləmə köhnə və ya natamam data üzərində işləyər və dashboard səhv rəqəm göstərər',
            'Pipeline daha sürətli işləyər',
            'Data avtomatik təmizlənər',
        ],
        2,
        'Buna görə asılılıqlar düzgün qurulmalıdır: növbəti addım yalnız əvvəlki uğurla bitəndən sonra başlamalıdır.',
    ),
    single(
        'Hansı vəziyyətdə **batch** emal tamamilə kifayətdir?',
        [
            'Şübhəli kart əməliyyatını dərhal bloklamaq',
            'Müştəriyə kuryerin yerini canlı göstərmək',
            'Rəhbərlik üçün dünənki satışların gündəlik hesabatı',
            'Anbar qalığını hər satışda anlıq yeniləmək',
        ],
        3,
        'Gündəlik hesabat üçün datanın gecə bir dəfə emal olunması kifayətdir. Digər hallarda nəticə saniyələr içində lazımdır — bu, streaming-dir.',
    ),
])

m.lesson('paralel-hesablama', 'Paralel hesablama', 6, '''
    NarMarket ildə 18 milyon sifariş qəbul edir. «Son 3 ilin bütün sifarişlərini məhsul üzrə təhlil et» kimi tapşırıq bir kompüterdə saatlarla çəkə bilər, hətta yaddaş çatmaya bilər. Həll yolu — **paralel hesablama** (parallel computing).

    ## Əsas ideya

    1. Böyük tapşırıq **kiçik alt tapşırıqlara** bölünür.
    2. Alt tapşırıqlar bir neçə **emal vahidində** (prosessor nüvəsində və ya kompüterdə) **eyni vaxtda** icra olunur.
    3. Nəticələr birləşdirilir.

    > 📝 **Bənzətmə:** müəllim 1000 imtahan vərəqini təkbaşına 10 günə yoxlayır. 10 müəllim vərəqləri bölüşsə, iş təxminən 1 günə bitər. Sonda hər kəs öz nəticəsini ümumi cədvələ yazır.

    ## Üstünlükləri

    - **Emal gücü** — eyni anda çoxlu prosessor işləyir, nəticə daha tez hazır olur.
    - **Yaddaş** — data bir neçə maşın arasında bölünür; heç bir maşının bütün datanı yaddaşda saxlaması lazım deyil.

    ## Riskləri və «gizli xərc» (overhead)

    Paralellik pulsuz deyil:

    - Tapşırığı bölmək, hissələri maşınlara göndərmək və nəticələri birləşdirmək **vaxt aparır**.
    - Maşınlar arasında **ünsiyyət** (kommunikasiya) xərci yaranır.
    - Kiçik tapşırıqlarda bu xərc qazancdan çox ola bilər — paralel versiya **daha yavaş** işləyər.
    - Bəzi tapşırıqlar ümumiyyətlə bölünmür: hər addım əvvəlkinin nəticəsindən asılıdırsa, onları eyni vaxtda icra etmək olmaz.

    > 📦 **Bənzətmə:** ev köçürəndə 4 dost işi sürətləndirir. 100 dost isə bir-birinə mane olar və onları idarə etməyə daha çox vaxt gedər.

    ## Alətlər

    - **Hadoop MapReduce** — paralel emalın ilk populyar çərçivəsi: «map» addımında data hissələrə bölünüb emal olunur, «reduce» addımında nəticələr birləşdirilir.
    - **Apache Spark** — bu gün ən geniş istifadə olunan alət; datanı yaddaşda saxladığı üçün MapReduce-dan xeyli sürətlidir.
    - Bir-biri ilə birlikdə işləyən kompüterlər qrupuna **klaster** deyilir.

    ## NarMarket-də

    İllik təhlil 12 hissəyə — aylar üzrə — bölünür. 12 maşının hər biri bir ayı emal edir, sonda nəticələr bir cədvəldə birləşir. Saatlarla çəkən iş dəqiqələrə enir.

    ## Qısa xülasə

    - Paralel hesablama böyük tapşırığı hissələrə bölüb eyni vaxtda bir neçə emal vahidində icra edir.
    - Üstünlükləri: daha çox emal gücü və bölünmüş yaddaş.
    - Bölmə və birləşdirmə xərci var — kiçik tapşırıqlarda paralellik sərfəli olmaya bilər.
''')

m.quiz('paralel-dogru-yanlis', 'Məşq: Paralel hesablama', [
    single(
        'Hansı ifadə paralel hesablama haqqında **doğrudur**?',
        [
            'Tapşırıq bir prosessorda daha sürətli işləsin deyə sıxışdırılır',
            'Böyük tapşırıq kiçik hissələrə bölünür və bir neçə emal vahidində eyni vaxtda icra olunur',
            'Paralel hesablama yalnız kiçik datada işləyir',
            'Bütün tapşırıqları paralel etmək həmişə mümkündür',
        ],
        2,
        'Paralel hesablamanın mahiyyəti budur: böl, eyni vaxtda icra et, nəticələri birləşdir.',
    ),
    single(
        '''
        Data engineer Murad **5 MB-lıq** kiçik faylı 100 kompüterə bölüb emal etdi. Nəticədə iş bir kompüterdəkindən də **yavaş** oldu.

        Niyə?
        ''',
        [
            'Kompüterlər köhnə idi',
            'Bölmə, göndərmə və nəticələri birləşdirmə xərci (overhead) tapşırığın özündən çox oldu',
            'Paralel hesablama ümumiyyətlə işləmir',
            'Fayl strukturlaşdırılmamış idi',
        ],
        2,
        'Kiçik tapşırıqlarda koordinasiya və ünsiyyət xərci qazancı üstələyir. Paralellik böyük həcmlərdə özünü doğruldur.',
    ),
    multiple(
        'Paralel hesablamanın **üstünlükləri** hansılardır? (Bir neçə cavab)',
        [
            'Daha çox emal gücü',
            'Yaddaşın bir neçə maşın arasında bölünməsi',
            'Maşınlar arasında heç bir ünsiyyət xərcinin olmaması',
            'İstənilən tapşırığın avtomatik sürətlənməsi',
        ],
        [1, 2],
        'Emal gücü və bölünmüş yaddaş əsas üstünlüklərdir. Ünsiyyət xərci isə həmişə var və hər tapşırıq sürətlənmir.',
    ),
])

m.lesson('bulud', 'Bulud hesablamaları (cloud computing)', 7, '''
    Datanı saxlamaq və emal etmək üçün serverlər lazımdır. Bu serverlər ya şirkətin öz binasında olur, ya da buludda icarəyə götürülür.

    ## Öz serverlərin (on-premise)

    Şirkət serverləri alır və öz server otağında saxlayır:

    - avadanlıq almaq, yer, elektrik, soyutma və təhlükəsizlik lazımdır;
    - serverlərə qulluq edən mütəxəssislər lazımdır;
    - güc **ən yüksək yüklənməyə** görə alınmalıdır — ilin qalan vaxtında isə resursların çoxu boş dayanır.

    ## Bulud (cloud)

    Bulud provayderindən resursları **lazım olduğu qədər** icarəyə götürmək:

    - **İstifadəyə görə ödəniş** — 20 serveri 2 saatlığa götür, yalnız 2 saat üçün ödə.
    - **Miqyaslanma** — yük artanda resursları bir neçə dəqiqəyə artır, azalanda azalt.
    - **Etibarlılıq** — data müxtəlif regionlarda surətlənir; bir data mərkəzində problem olsa, digəri işləyir.
    - **Hazır xidmətlər** — bazaları, anbarları, pipeline alətlərini özün qurmaq əvəzinə hazır, idarə olunan xidmət kimi istifadə edirsən.

    ## Böyük üçlük

    Bazarın böyük hissəsi üç provayderin əlindədir: **Amazon Web Services (AWS)**, **Microsoft Azure** və **Google Cloud**. Onların əsas xidmətləri:

    | Xidmət növü | AWS | Azure | Google Cloud |
    | --- | --- | --- | --- |
    | **Saxlama** (fayllar, data lake) | S3 | Blob Storage | Cloud Storage |
    | **Hesablama** (virtual serverlər) | EC2 | Virtual Machines | Compute Engine |
    | **Verilənlər bazası** | RDS | Azure SQL Database | Cloud SQL |
    | **Data warehouse** | Redshift | Synapse Analytics | BigQuery |

    ## Multicloud

    Bəzi şirkətlər bir neçə provayderdən birlikdə istifadə edir — **multicloud**.

    - ✅ Bir provayderdən asılılıq azalır (vendor lock-in), qiymətləri müqayisə etmək olur, bəzi ölkələrin datanın yerləşməsi tələblərinə uyğunlaşmaq asanlaşır.
    - ❌ Fərqli xidmətləri birlikdə idarə etmək mürəkkəbdir, komandadan daha çox bilik tələb olunur, təhlükəsizliyi hər yerdə eyni səviyyədə saxlamaq çətinləşir.

    ## Nəyə diqqət etməli?

    - **Xərc nəzarəti** — unudulmuş, boş işləyən server hər saat pul yandırır.
    - **Məxfilik və qanunvericilik** — bəzi datalar (məsələn, bank və tibbi data) müəyyən ölkənin ərazisində saxlanmalıdır.
    - **Təhlükəsizlik** — buludda səhv konfiqurasiya (məsələn, hamıya açıq qalan fayl anbarı) ən çox rast gəlinən data sızması səbəblərindəndir.

    ## NarMarket-də

    «Qara Cümə» günü trafik adi günə nisbətən 5 dəfə artır. Öz serverləri ilə NarMarket bütün il ərzində 5 qat güc saxlamalı olardı. Buludda isə həmin gün resurslar avtomatik artırılır, ertəsi gün azaldılır — ödəniş yalnız istifadə olunan güc üçündür.

    ## Qısa xülasə

    - On-premise — öz serverlərin: tam nəzarət, amma böyük xərc və boş qalan güc.
    - Bulud — resursları lazım olduğu qədər icarəyə götürmək: çevik, miqyaslanan, istifadəyə görə ödəniş.
    - Əsas xidmətlər: saxlama, hesablama, verilənlər bazası; böyük üçlük — AWS, Azure, Google Cloud.
''')

m.quiz('bulud-xidmetleri', 'Məşq: Bulud xidmətləri', [
    classify(
        'NarMarket-in buludda gördüyü işləri və xidmətləri düzgün xidmət növünə yerləşdir.',
        [
            ('Saxlama (storage)', [
                'Kuryer fotolarını və log fayllarını saxlamaq',
                'AWS S3',
                'Google Cloud Storage',
            ]),
            ('Hesablama (compute)', [
                'Gecəlik emal üçün 20 serveri 2 saatlığa icarəyə götürmək',
                'AWS EC2',
            ]),
            ('Verilənlər bazası (database)', [
                'Sifarişlər üçün idarə olunan PostgreSQL bazası',
                'Azure SQL Database',
            ]),
        ],
        'Saxlama — fayllar və data lake; hesablama — virtual serverlər və emal gücü; verilənlər bazası — idarə olunan SQL bazaları.',
    ),
    single(
        '''
        NarMarket-də «Qara Cümə» günü trafik 5 dəfə artır, ilin qalan günlərində isə normal olur.

        Hansı yanaşma daha sərfəlidir?
        ''',
        [
            'Bütün il üçün 5 qat güclü öz serverlərini almaq',
            'Buludda lazım olanda resursları artırıb, sonra azaltmaq',
            '«Qara Cümə» günü saytı bağlamaq',
            'Sifarişləri bir gün sonra emal etmək',
        ],
        2,
        'Buludun əsas üstünlüyü miqyaslanma və istifadəyə görə ödənişdir: güc yalnız lazım olan gün artırılır.',
    ),
    single(
        '**Multicloud** yanaşmasının əsas çatışmazlığı hansıdır?',
        [
            'Bir provayderdən asılılığın artması',
            'Fərqli provayderlərin xidmətlərini birlikdə idarə etməyin mürəkkəbliyi',
            'Buludun öz serverlərindən həmişə baha olması',
            'Datanın ümumiyyətlə saxlanıla bilməməsi',
        ],
        2,
        'Multicloud asılılığı azaldır, amma müxtəlif sistemləri, alətləri və təhlükəsizlik qaydalarını birlikdə idarə etmək çətinləşir.',
    ),
])

# ───────────────────────────── Fəsil 4 ─────────────────────────────
m = c.module('pese', 'Data engineer peşəsi', 'Alət dəsti, öyrənmə yolu, bir iş günü və yekun test.')

m.lesson('aletler', 'Data engineer-in alət dəsti', 6, '''
    Data engineering alətlərinin siyahısı uzundur və daim yenilənir. Hamısını birdən öyrənmək lazım deyil — vacib olan hər alətin **hansı problemi həll etdiyini** başa düşməkdir.

    ## Alətlər xəritəsi

    | Kateqoriya | Nə üçün | Alətlər |
    | --- | --- | --- |
    | **Proqramlaşdırma** | Pipeline və emal kodu | SQL, Python; böyük sistemlərdə Scala, Java |
    | **Verilənlər bazaları** | Əməliyyat datası | PostgreSQL, MySQL, MongoDB |
    | **Data warehouse** | Analitik data | Snowflake, BigQuery, Redshift |
    | **Emal** | Böyük datanın çevrilməsi | Apache Spark, dbt, pandas |
    | **Streaming** | Real vaxt datası | Apache Kafka |
    | **Planlaşdırma** | Pipeline-ların idarəsi | Apache Airflow, Prefect, Dagster |
    | **İnfrastruktur** | Mühit və yerləşdirmə | Linux, Git, Docker, Kubernetes, Terraform |
    | **Bulud** | Hər şeyin işlədiyi yer | AWS, Azure, Google Cloud |

    ## Haradan başlamalı? Öyrənmə yolu 🧭

    1. **SQL və verilənlər bazaları** — data engineer-in ana dili. Cədvəllər, sorğular, birləşdirmələr (JOIN), sxem dizaynı.
    2. **Python** — datanı oxumaq, çevirmək, avtomatlaşdırmaq.
    3. **Linux və Git** — serverlərdə işləmək və kodu versiyalamaq.
    4. **Data modelləşdirmə və anbarlar** — ulduz sxemi, warehouse, ELT, dbt.
    5. **Planlaşdırma və böyük data** — Airflow, Spark.
    6. **Bulud və konteynerlər** — bir bulud provayderini dərindən, Docker.

    > 💡 DaCy-də SQL və Python kursları bu yolun ilk iki addımı üçün yaxşı başlanğıcdır.

    ## Texniki olmayan bacarıqlar

    - **Ünsiyyət** — analitiklərin və biznesin nə istədiyini başa düşmək, texniki şeyləri sadə dillə izah etmək.
    - **Diqqət və məsuliyyət** — bir səhv sütun yüzlərlə hesabatı yanlış edə bilər.
    - **Problem həll etmə** — gecə yarısı qırılan pipeline-ın səbəbini sakit şəkildə tapmaq.
    - **Sənədləşdirmə** — sənin qurduğun sistemi başqaları da başa düşməlidir.

    ## Karyera yolu

    **Junior data engineer → Data engineer → Senior → Lead / Data architect.** Yaxın rollar:

    - **Analytics engineer** — data engineering ilə analitikanın kəsişməsi; əsasən SQL və dbt ilə anbardakı modelləri qurur.
    - **ML engineer** — maşın öyrənməsi modellərini real sistemlərə çıxarır.
    - **Data architect** — şirkətin bütün data sisteminin böyük planını qurur.

    ## Qısa xülasə

    - Alətləri kateqoriyalar üzrə düşün: proqramlaşdırma, bazalar, anbarlar, emal, streaming, planlaşdırma, infrastruktur, bulud.
    - Başlanğıc üçün ən vacib iki bacarıq: SQL və Python.
    - Texniki bacarıqlar qədər ünsiyyət və məsuliyyət də vacibdir.
''')

m.lesson('bir-gun', 'Bir gün data engineer kimi', 6, '''
    Tanış ol: **Nigar**, NarMarket-in data engineer-i. Gəlin onun bir iş gününə baxaq.

    ## 08:45 — Səhər xəbərdarlığı 🚨

    Nigar telefonunda Airflow-dan bildiriş görür: gecəlik pipeline-ın **«ödənişləri yüklə»** addımı uğursuz olub. Asılı addımlar gözləyir, satış dashboard-u yenilənməyib. Direktor saat 10:00-da hesabata baxacaq.

    ## 09:00 — Araşdırma

    Nigar xəta jurnalını (log) açır: ödəniş provayderi xəbərdarlıq etmədən tarix formatını `03.10.2026`-dan `2026/10/03`-ə dəyişib və çevirmə addımı bu formatı tanımır. Nigar:

    1. çevirmə qaydasını yeni formata uyğunlaşdırır;
    2. gələcəkdə belə dəyişikliyi dərhal tutan **yoxlama** (data quality test) əlavə edir;
    3. pipeline-ı əl ilə yenidən başladır.

    09:40-da dashboard yenilənir. Nigar analitiklərə qısa mesaj yazır: nə baş verdi, nə düzəldi, data artıq düzgündür.

    ## 11:00 — Görüş: real vaxt dashboard-u

    Marketinq komandası kampaniya zamanı satışları **canlı** görmək istəyir. Gecəlik batch pipeline buna uyğun deyil. Nigar sifariş hadisələrini **Kafka** vasitəsilə ötürən streaming həll təklif edir, tələbləri dəqiqləşdirir: hansı göstəricilər, nə qədər gecikmə məqbuldur, büdcə nə qədərdir.

    ## 14:00 — Data keyfiyyəti

    Analitik Aysel müştəri sayının şişirdildiyini bildirir. Nigar araşdırır: bəzi müştərilər həm tətbiqdən, həm saytdan qeydiyyatdan keçib və iki dəfə sayılır. O, müştəriləri telefon nömrəsinə görə birləşdirən emal addımı və **unikallıq yoxlaması** əlavə edir.

    ## 16:00 — Xərc nəzarəti 💸

    Aylıq bulud hesabına baxarkən Nigar keçən həftə test üçün qaldırılmış və unudulmuş Spark klasterini görür — hər saat pul xərcləyir. Klasteri söndürür və bundan sonra test klasterlərinin avtomatik sönməsi qaydasını qurur.

    ## 17:00 — Sənədləşdirmə

    Gün sonunda Nigar yeni yoxlamaları və müştəri birləşdirmə qaydasını **data kataloqunda** təsvir edir ki, komandada hər kəs nəyin necə işlədiyini bilsin.

    ## Bu gündən nə öyrəndik?

    - Data engineer-in işinin böyük hissəsi **etibarlılıqdır**: problemi analitiklər görməmiş tapıb həll etmək.
    - Hər xəta yeni **avtomatik yoxlama** üçün fürsətdir.
    - Texniki iş qədər **ünsiyyət** vacibdir: nə baş verdiyini izah etmək, tələbləri dəqiqləşdirmək.
    - Xərc və sənədləşdirmə də işin bir hissəsidir.
''')

m.quiz('nigarin-gunu', 'Məşq: Nigarın günü', [
    single(
        'Ödəniş provayderi tarix formatını xəbərsiz dəyişdi və gecəlik pipeline dayandı. Nigarın **ilk addımı** nə olmalıdır?',
        [
            'Dashboard-u söndürüb heç kimə xəbər verməmək',
            'Xəta jurnalını (log) araşdırıb səbəbi tapmaq, düzəltmək və pipeline-ı yenidən işə salmaq',
            'Ödəniş provayderi ilə müqaviləni ləğv etmək',
            'Bütün pipeline-ı silib sıfırdan yazmaq',
        ],
        2,
        'Əvvəlcə səbəb tapılır və düzəldilir, sonra pipeline yenidən işə salınır və analitiklərə məlumat verilir. Ən yaxşı halda belə dəyişikliyi tutacaq yoxlama da əlavə olunur.',
    ),
    classify(
        'Hansı işlər Nigarın — data engineer-in — gündəlik işidir, hansılar başqa rolların?',
        [
            ('Data engineer-in işi', [
                'Pipeline xətasını araşdırıb düzəltmək',
                'Data keyfiyyəti yoxlaması əlavə etmək',
                'Boş dayanan bulud klasterini söndürmək',
                'Cədvəllərin təsvirini data kataloquna yazmaq',
            ]),
            ('Başqa rolun işi', [
                'Gələn ilin satışlarını proqnozlaşdıran model qurmaq',
                'Rəhbərlik üçün rüblük dashboard-un dizaynını hazırlamaq',
                'Marketinq kampaniyasının şüarını yazmaq',
            ]),
        ],
        'Etibarlılıq, keyfiyyət, xərc və sənədləşdirmə data engineer-in işidir. Proqnoz modelləri data scientist-in, dashboard dizaynı analitikin, şüar isə marketinqin işidir.',
    ),
])

m.quiz('yekun-test', 'Yekun test: What is Data Engineering?', [
    single(
        'Data iş axınının **birinci** mərhələsi hansıdır və ondan kim məsuldur?',
        [
            'Kəşf və vizuallaşdırma — data analitik',
            'Toplama və saxlama — data engineer',
            'Eksperiment və proqnoz — data scientist',
            'Hazırlama — dizayner',
        ],
        2,
        'Data iş axını toplama və saxlama ilə başlayır və bu mərhələ data engineer-in məsuliyyətidir.',
    ),
    classify(
        'Tapşırıqları rollara ayır.',
        [
            ('Data engineer', [
                'Mənbələrdən datanı avtomatik toplayan pipeline qurmaq',
                'Data warehouse-da cədvəllərin sxemini dizayn etmək',
                'Gecəlik yükləmələrin xətalarını izləmək',
            ]),
            ('Data analitik / data scientist', [
                'Satışların niyə düşdüyünü təhlil etmək',
                'Müştərilərin abunəni dayandıracağını proqnozlaşdırmaq',
                'Dashboard-da həftəlik trendləri göstərmək',
            ]),
        ],
        'Data engineer təməli — toplama, saxlama, çatdırma sistemlərini qurur; analitik və data scientist bu datadan nəticə çıxarır.',
    ),
    single(
        '**ETL** nə deməkdir?',
        [
            'Extract, Transform, Load — çıxar, çevir, yüklə',
            'Encrypt, Transfer, Lock — şifrələ, ötür, kilidlə',
            'Explore, Test, Learn — kəşf et, yoxla, öyrən',
            'Edit, Translate, Launch — redaktə et, tərcümə et, başlat',
        ],
        1,
        'ETL — datanı mənbədən çıxarmaq, təmizləyib çevirmək və təyinat yerinə yükləmək deməkdir.',
    ),
    classify(
        'Datanı növünə görə ayır.',
        [
            ('Strukturlaşdırılmış', ['Bank çıxarışı cədvəli', 'İşçilərin maaş cədvəli']),
            ('Yarım-strukturlaşdırılmış', ['API-dən gələn JSON cavab', 'Sensorun JSON formatlı ölçmə qeydi']),
            ('Strukturlaşdırılmamış', ['Reklam videosu', 'Müştəri ilə zəngin səs yazısı']),
        ],
        'Cədvəllər — strukturlaşdırılmış, JSON — yarım-strukturlaşdırılmış, video və səs — strukturlaşdırılmamış datadır.',
    ),
    single(
        'Data scientist-lər müxtəlif növ **xam data** üzərində eksperiment etmək istəyirlər: loglar, fotolar, JSON hadisələr. Bu data harada saxlanmalıdır?',
        ['Data warehouse', 'Data lake', 'Tətbiqin əməliyyat bazası', 'Analitikin Excel faylı'],
        2,
        'Data lake hər növ xam datanı olduğu kimi saxlayır və data scientist-lərin kəşfiyyat işləri üçün nəzərdə tutulub.',
    ),
    single(
        'Təchizatçı anbara yeni qaimə faylı yükləyən kimi emal avtomatik başlayır. Bu hansı planlaşdırma üsuludur?',
        ['Əl ilə', 'Vaxta görə', 'Hadisəyə (sensora) görə', 'Planlaşdırma yoxdur'],
        3,
        'İşə salma müəyyən hadisədən — faylın gəlməsindən asılıdır. Bu, hadisəyə görə (sensor) planlaşdırmadır.',
    ),
    single(
        'Paralel hesablama haqqında hansı ifadə **yanlışdır**?',
        [
            'Tapşırıq hissələrə bölünür və eyni vaxtda icra olunur',
            'Data bir neçə maşının yaddaşında bölünə bilər',
            'Paralellik həmişə, hətta kiçik tapşırıqlarda da işi sürətləndirir',
            'Apache Spark paralel emal alətidir',
        ],
        3,
        'Kiçik tapşırıqlarda bölmə və birləşdirmə xərci qazancdan çox ola bilər — paralel versiya daha yavaş işləyə bilər.',
    ),
    single(
        'Buludun on-premise serverlərə nisbətən əsas üstünlüyü hansıdır?',
        [
            'Data heç vaxt internetə çıxmır',
            'Resursları lazım olduğu qədər artırıb-azaltmaq və yalnız istifadəyə görə ödəmək',
            'Heç bir xərc olmaması',
            'Təhlükəsizlik barədə düşünməyə ehtiyac olmaması',
        ],
        2,
        'Bulud çevikdir: resurslar dəqiqələr içində artırılıb azaldılır, ödəniş istifadəyə görədir. Amma xərc nəzarəti və təhlükəsizlik yenə vacibdir.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
