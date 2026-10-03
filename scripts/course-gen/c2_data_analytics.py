from common import Course, classify, multiple, single

c = Course(
    'what-is-data-analytics',
    {
        '_comment': (
            'What is Data Analytics? — giriş kursu (kodsuz).\n'
            'Hər dərs nəzəri addımdır: videonu admin paneldə dərsin «Video» sahəsinə yükləyin — mətnin üstündə görünür.\n'
            'Məşqlər yalnız sual-cavabdır: tək seçim, çox seçim və «qruplara ayır» (classify).'
        ),
        'track': 'data-analytics',
        'title': 'What is Data Analytics?',
        'level': 'beginner',
        'description': (
            'Data analitikasına kodsuz, sadə dildə giriş: datadan necə sual verilir, cavab tapılır və qərar çıxarılır. '
            'Analitikanın 4 növü, analiz prosesinin 6 addımı, SMART suallar və KPI-lar, data növləri, '
            'datanın təmizlənməsi, əsas statistika, korrelyasiya və A/B test, düzgün qrafik seçimi, '
            'dashboard-lar və data ilə hekayə. Hər dərsdən sonra real ssenarilərə əsaslanan məşqlər.'
        ),
        'sequential': True,
        'estimated_hours': 3,
        'published': True,
    },
)

# ───────────────────────────── Fəsil 1 ─────────────────────────────
m = c.module('giris', 'Data analitikasına giriş', 'Data analitikası nədir, analitikanın 4 növü və data analitikin rolu.')

m.lesson('xos-geldin', 'Kursa xoş gəldin: data ilə qərar vermək', 5, '''
    Hər gün minlərlə qərar verilir: hansı məhsulu endirimə qoymalı, harada yeni mağaza açmalı, neçə kuryer işə götürməli. Bu qərarlar ya **təxminə və hissiyyata**, ya da **dataya** əsaslanır. İkinci yolu mümkün edən sahə **data analitikasıdır**.

    ## Data analitikası nədir?

    **Data analitikası** — datanı yoxlamaq, təmizləmək, təhlil etmək və ondan **qərar üçün faydalı nəticələr** çıxarmaq prosesidir. Analitik datada suallara cavab axtarır:

    - Nə baş verib?
    - Niyə baş verib?
    - Bundan sonra nə olacaq?
    - Nə etməliyik?

    ## Hissiyyat və data

    NarMarket-in direktoru düşünür: «Satışlar düşüb, deməli, qiymətlərimiz bahadır — endirim edək». Analitik Aysel isə dataya baxır və görür ki, satış yalnız **Gəncədə** düşüb və elə həmin həftə orada çatdırılma müddəti 35 dəqiqədən 70 dəqiqəyə qalxıb. Problem qiymətdə yox, **çatdırılmadadır**. Endirim pul itirərdi, problemi isə həll etməzdi.

    Data əsaslı qərar vermək (data-driven decision making) məhz budur: fikirləri datayla yoxlamaq.

    ## Hər yerdə analitika

    - **Strimminq xidmətləri** baxdığın filmlərə görə yeni filmlər tövsiyə edir.
    - **Banklar** saxta əməliyyatları qeyri-adi davranışa görə tanıyır.
    - **Futbol klubları** oyunçuların qaçış məsafəsini və ötürmələrini təhlil edir.
    - **Xəstəxanalar** hansı günlərdə daha çox həkim lazım olacağını proqnozlaşdırır.

    ## Kurs boyu: NarMarket və analitik Aysel 🍎

    Kurs boyu uydurma onlayn ərzaq marketi **NarMarket**-in analitiki **Aysel**lə birlikdə işləyəcəyik. Gündə 50 000 sifariş, 3 şəhər, 400 kuryer — və hər gün yeni suallar.

    | Fəsil | Mövzu |
    | --- | --- |
    | 1. Giriş | Analitikanın 4 növü, data analitik kimdir |
    | 2. Proses | Analizin 6 addımı, SMART suallar və KPI-lar, data mənbələri və növləri |
    | 3. Təmizləmə və təhlil | Çirkli data, əsas statistika, korrelyasiya və A/B test |
    | 4. Vizuallaşdırma | Düzgün qrafik, dashboard-lar, data ilə hekayə |
    | 5. Alətlər və karyera | Alət dəsti, tam layihə nümunəsi, yekun test |

    ## Necə öyrənəcəksən

    1. **Dərs** — video və qısa mətn.
    2. **Məşq** — suallar: düzgün cavabı seç və ya elementləri düzgün qrupa sürüşdür.
    3. Səhv etsən, izahı oxu və yenidən cəhd et.

    > 💡 Kod yazmağa ehtiyac yoxdur. Bu kurs düşünmə tərzini öyrədir — alətlər sonra gələcək.
''')

m.lesson('analitika-novleri', 'Analitikanın 4 növü', 7, '''
    Analitik suallar mürəkkəbliyinə və gətirdiyi dəyərə görə dörd növə bölünür. Onları pilləkən kimi təsəvvür et: hər pillə əvvəlkinin üzərində qurulur.

    ## 1. Təsviri analitika (descriptive) — «Nə baş verdi?»

    Keçmişi rəqəmlərlə təsvir edir: cəmlər, ortalar, müqayisələr.

    - «Sentyabrda neçə sifariş olub?» — 1 480 000.
    - «Hansı kateqoriya ən çox satılıb?» — meyvə-tərəvəz.

    Hesabatların və dashboard-ların böyük hissəsi təsviri analitikadır.

    ## 2. Diaqnostik analitika (diagnostic) — «Niyə baş verdi?»

    Səbəbləri axtarır: datanı hissələrə bölür, müqayisə edir, əlaqələr axtarır.

    - «Satışlar niyə düşüb?» → yalnız Gəncədə düşüb → həmin həftə çatdırılma iki dəfə uzanıb → yeni anbarın açılışı gecikib.

    ## 3. Proqnozlaşdırıcı analitika (predictive) — «Nə baş verəcək?»

    Keçmiş datadakı qanunauyğunluqlara əsasən gələcəyi təxmin edir.

    - «Novruz həftəsində neçə sifariş gözlənilir?»
    - «Hansı müştəri gələn ay bizi tərk edə bilər?»

    ## 4. Tövsiyəedici analitika (prescriptive) — «Nə etməliyik?»

    Ən yaxşı hərəkəti tövsiyə edir — çox vaxt optimallaşdırma və simulyasiya ilə.

    - «Novruz həftəsi üçün hər anbara neçə kuryer təyin edək ki, gecikmə olmasın və xərc minimum olsun?»
    - «Hər kuryer üçün ən qısa marşrut hansıdır?»

    ## Bir cədvəldə

    | Növ | Sual | NarMarket nümunəsi | Çətinlik |
    | --- | --- | --- | --- |
    | Təsviri | Nə baş verdi? | Ötən ayın satış hesabatı | ⭐ |
    | Diaqnostik | Niyə baş verdi? | Gəncədə satışın düşmə səbəbi | ⭐⭐ |
    | Proqnozlaşdırıcı | Nə olacaq? | Bayram həftəsinin sifariş proqnozu | ⭐⭐⭐ |
    | Tövsiyəedici | Nə etməliyik? | Kuryerlərin optimal bölgüsü | ⭐⭐⭐⭐ |

    > 💡 **Necə tanımalı?** Sualın içindəki açar sözlərə bax: «neçə», «nə qədər» → təsviri; «niyə», «səbəb» → diaqnostik; «gələn», «gözlənilir», «ehtimal» → proqnozlaşdırıcı; «nə etməli», «ən yaxşı», «optimal» → tövsiyəedici.

    Şirkətlər adətən təsviri analitikadan başlayır. Data və təcrübə artdıqca daha yuxarı pillələrə qalxırlar. Amma yuxarı pillələr aşağıdakılarsız mümkün deyil: keçmişi düzgün təsvir edə bilməyən gələcəyi də proqnozlaşdıra bilməz.

    ## Qısa xülasə

    - Təsviri — nə baş verdi; diaqnostik — niyə; proqnozlaşdırıcı — nə olacaq; tövsiyəedici — nə etməli.
    - Hər növ əvvəlkinin üzərində qurulur və daha çox dəyər, amma daha çox mürəkkəblik gətirir.
''')

m.quiz('hansi-analitika', 'Məşq: Hansı analitikadır?', [
    classify(
        'NarMarket-in rəhbərliyi analitiklərə müxtəlif suallar göndərib. Hər sualı analitikanın düzgün növünə yerləşdir.',
        [
            ('Təsviri', [
                'Keçən ay neçə sifariş olub?',
                'Sentyabr və avqust satışlarının müqayisə qrafiki',
            ]),
            ('Diaqnostik', [
                'Satışlar niyə Gəncədə düşüb?',
                'Şikayətlərin artmasının səbəbi kuryer gecikmələridirmi?',
            ]),
            ('Proqnozlaşdırıcı', [
                'Gələn həftə neçə kuryer lazım olacaq?',
                'Hansı müştərilərin abunəni dayandırma ehtimalı yüksəkdir?',
            ]),
            ('Tövsiyəedici', [
                'Satışı artırmaq üçün hansı məhsula nə qədər endirim etməliyik?',
                'Hər kuryer üçün optimal marşrut hansıdır?',
            ]),
        ],
        '«Neçə», müqayisə → təsviri; «niyə», səbəb → diaqnostik; «gələn», ehtimal → proqnozlaşdırıcı; «nə etməli», optimal → tövsiyəedici.',
    ),
    single(
        'Şirkət analitikaya yeni başlayır. Adətən **hansı növdən** başlamaq məntiqlidir?',
        ['Tövsiyəedici', 'Proqnozlaşdırıcı', 'Təsviri', 'Hamısına eyni anda'],
        3,
        'Keçmişi düzgün təsvir etmədən səbəbləri, gələcəyi və ən yaxşı hərəkəti tapmaq mümkün deyil. Pilləkən təsviri analitikadan başlayır.',
    ),
])

m.lesson('data-analitik-kimdir', 'Data analitik kimdir?', 7, '''
    **Data analitik** biznes suallarını data suallarına çevirən, datadan cavab tapan və bu cavabı insanların başa düşəcəyi dildə təqdim edən mütəxəssisdir.

    ## Analitik nə edir?

    1. **Sualı aydınlaşdırır** — «Satışlar pisdir» kimi qeyri-müəyyən narahatlığı ölçülə bilən suala çevirir.
    2. **Datanı toplayır** — bazalardan, cədvəllərdən, sorğulardan.
    3. **Datanı təmizləyir** — dublikatlar, boşluqlar, səhv formatlar.
    4. **Təhlil edir** — müqayisə, trendlər, seqmentlər, əlaqələr.
    5. **Vizuallaşdırır** — qrafiklər, dashboard-lar.
    6. **Təqdim edir və tövsiyə verir** — «nə tapdıq və nə etməliyik».

    ## Ayselin bir günü

    - **09:30** — satış dashboard-unda gözlənilməz düşüş görür.
    - **10:00** — SQL ilə datanı şəhərlər və kateqoriyalar üzrə bölür: düşüş yalnız Gəncədə, meyvə-tərəvəzdədir.
    - **12:00** — anbar komandası ilə danışır: təchizatçı 3 gündür gecikir.
    - **14:00** — itirilən satışın təxmini dəyərini hesablayır.
    - **16:00** — rəhbərliyə 3 slayd hazırlayır: problem, təsiri, təklif — ehtiyat təchizatçı.

    ## Data komandasında rollar

    | Rol | Əsas sual | İşi |
    | --- | --- | --- |
    | **Data analitik** | Nə baş verib və niyə? | Hesabatlar, dashboard-lar, təhlil, tövsiyələr |
    | **Data scientist** | Nə baş verəcək? | Proqnoz modelləri, maşın öyrənməsi, eksperimentlər |
    | **Data engineer** | Data etibarlı və vaxtında çatırmı? | Pipeline-lar, bazalar, infrastruktur |
    | **BI developer** | Hamı lazım olan rəqəmi özü tapa bilirmi? | BI sistemləri, şirkət miqyasında dashboard-lar |

    Bu sərhədlər şirkətdən şirkətə dəyişir: kiçik şirkətdə bir nəfər hamısını edə bilər.

    ## Bacarıqlar

    **Texniki (hard skills):**

    - **Excel / Google Sheets** — formullar, pivot cədvəllər;
    - **SQL** — bazalardan data çıxarmaq;
    - **BI alətləri** — Power BI, Tableau, Looker Studio;
    - **Statistika** — orta, median, paylanma, korrelyasiya;
    - **Python və ya R** — daha mürəkkəb təhlillər üçün.

    **Şəxsi (soft skills):**

    - **Maraq** — «niyə?» sualını təkrar-təkrar vermək;
    - **Tənqidi düşünmə** — rəqəmlərə kor-koranə inanmamaq;
    - **Ünsiyyət** — nəticəni texniki olmayan insana sadə dillə izah etmək;
    - **Biznes anlayışı** — şirkət necə pul qazanır, hansı rəqəm həqiqətən vacibdir.

    > 💬 Yaxşı analitiki yaxşı edən təkcə alətlər deyil — düzgün sual verməsi və nəticəni hekayə kimi danışa bilməsidir.

    ## Harada işləyirlər?

    Demək olar ki, hər sahədə: bank və maliyyə, pərakəndə və e-ticarət, telekommunikasiya, səhiyyə, logistika, marketinq, idman, dövlət qurumları.

    ## Qısa xülasə

    - Analitik sual verir, datanı toplayır və təmizləyir, təhlil edir, vizuallaşdırır və tövsiyə verir.
    - Analitik keçmişi və səbəbləri izah edir; data scientist gələcəyi modelləşdirir; data engineer datanı çatdırır.
    - Texniki bacarıqlar qədər maraq, tənqidi düşünmə və ünsiyyət vacibdir.
''')

m.quiz('analitikin-isi', 'Məşq: Analitikin işi', [
    classify(
        'Hansı tapşırıqlar data analitikin işidir, hansılar başqa rolların?',
        [
            ('Data analitikin işi', [
                'Satış datasında trendləri tapmaq',
                'Rəhbərlik üçün dashboard hazırlamaq',
                '«Satışlar pisdir» narahatlığını ölçülə bilən suala çevirmək',
                'Nəticələri sadə dillə təqdim etmək',
            ]),
            ('Analitikin işi deyil', [
                'Gecəlik data pipeline-ın arxitekturasını qurmaq',
                'Serverləri quraşdırmaq və qulluq etmək',
                'Mobil tətbiqin kodunu yazmaq',
            ]),
        ],
        'Analitik sual verir, təhlil edir, vizuallaşdırır və təqdim edir. Pipeline və serverlər data engineer-in, tətbiq kodu isə proqramçının işidir.',
    ),
    single(
        'Data analitik ilə data scientist arasındakı **əsas fərq** nədir?',
        [
            'Analitik yalnız Excel, data scientist yalnız Python istifadə edir',
            'Analitik əsasən mövcud datadan keçmişi və səbəbləri izah edir; data scientist daha çox proqnoz modelləri qurur',
            'Data scientist-in statistikaya ehtiyacı yoxdur',
            'Heç bir fərq yoxdur — eyni peşənin iki adıdır',
        ],
        2,
        'Analitik «nə baş verdi və niyə?», data scientist isə daha çox «nə baş verəcək?» sualına fokuslanır. Amma sərhədlər çevikdir.',
    ),
    multiple(
        'Bunlardan hansılar data analitik üçün vacib **şəxsi (soft)** bacarıqlardır? (Bir neçə cavab)',
        ['Maraq və «niyə?» sualını vermək', 'Nəticəni sadə dillə izah etmək', 'Tənqidi düşünmə', 'Serverləri təmir etmək'],
        [1, 2, 3],
        'Maraq, ünsiyyət və tənqidi düşünmə analitiki fərqləndirən əsas şəxsi bacarıqlardır.',
    ),
])

# ───────────────────────────── Fəsil 2 ─────────────────────────────
m = c.module('proses', 'Analitika prosesi', 'Analizin 6 addımı, SMART suallar və KPI-lar, data mənbələri və növləri.')

m.lesson('alti-addim', 'Analiz prosesinin 6 addımı', 7, '''
    Yaxşı analiz təsadüfi deyil — müəyyən ardıcıllıqla aparılır. Ən geniş yayılmış model altı addımdan ibarətdir:

    ```text
    1. Soruş → 2. Hazırla → 3. Təmizlə → 4. Təhlil et → 5. Paylaş → 6. Hərəkət et
    ```

    ## 1. Soruş (Ask)

    Problemi və sualı aydınlaşdır. Kimin üçün işləyirik? Hansı qərar veriləcək? Uğur nə ilə ölçülür?

    ## 2. Hazırla (Prepare)

    Lazım olan datanı müəyyən et və topla: hansı cədvəllər, hansı dövr, data etibarlıdırmı?

    ## 3. Təmizlə (Process)

    Datanı təhlilə hazırla: dublikatları sil, boşluqlarla məşğul ol, formatları vahid et, səhvləri düzəlt.

    ## 4. Təhlil et (Analyze)

    Cəmlə, müqayisə et, seqmentlərə böl, trend və əlaqələri axtar. Sualın cavabı burada tapılır.

    ## 5. Paylaş (Share)

    Nəticəni qrafiklər, dashboard və ya təqdimatla auditoriyaya çatdır. Məqsəd — başa düşülmək.

    ## 6. Hərəkət et (Act)

    Nəticəyə əsasən qərar verilir və həyata keçirilir. Sonra nəticə yenidən ölçülür — və dövr təkrarlanır.

    ## NarMarket nümunəsi: tərk edilən səbətlər 🛒

    | Addım | Ayselin etdiyi |
    | --- | --- |
    | **Soruş** | «Son 3 ayda səbətə məhsul atıb sifarişi tamamlamayan müştərilərin payı niyə 60%-dən 70%-ə qalxıb?» |
    | **Hazırla** | Tətbiq hadisələri (səbətə əlavə, ödəniş səhifəsi), sifarişlər, çatdırılma qiymətləri |
    | **Təmizlə** | Test istifadəçilərini çıxarır, dublikat hadisələri silir, vaxtları bir saat qurşağına salır |
    | **Təhlil et** | Müştərilərin çoxu çatdırılma haqqını gördüyü addımda çıxır; haqq iyulda 2 ₼-dan 4 ₼-a qaldırılıb |
    | **Paylaş** | Addımlar üzrə müştəri itkisini göstərən qrafik və 3 slayd |
    | **Hərəkət et** | 30 ₼-dan yuxarı sifarişlərdə pulsuz çatdırılma A/B testlə yoxlanılır |

    > 🔁 Proses həmişə düz xətt deyil. Təhlil zamanı datanın natamam olduğunu görüb «Hazırla» addımına qayıtmaq, ya da sualı dəqiqləşdirmək tamamilə normaldır.

    ## Qısa xülasə

    - Analiz prosesi: soruş → hazırla → təmizlə → təhlil et → paylaş → hərəkət et.
    - Hər addımın öz məqsədi var; prosesi atlamaq səhv nəticələrə aparır.
    - Proses dövridir: hərəkətin nəticəsi yenidən ölçülür.
''')

m.quiz('hansi-addim', 'Məşq: Bu hansı addımdır?', [
    classify(
        'Ayselin «tərk edilən səbətlər» layihəsində gördüyü işləri prosesin addımlarına ayır.',
        [
            ('Soruş', [
                'Rəhbərliklə görüşüb hansı qərarın veriləcəyini dəqiqləşdirmək',
                'Uğurun hansı rəqəmlə ölçüləcəyini müəyyən etmək',
            ]),
            ('Hazırla və təmizlə', [
                'Lazım olan cədvəlləri tapıb son 3 ayın datasını çıxarmaq',
                'Dublikat hadisələri silib vaxtları bir formata salmaq',
            ]),
            ('Təhlil et', [
                'Müştərilərin hansı addımda çıxdığını hesablamaq',
                'Şəhərlər üzrə tərk edilmə faizini müqayisə etmək',
            ]),
            ('Paylaş və hərəkət et', [
                'Rəhbərliyə qrafiklə qısa təqdimat etmək',
                'Pulsuz çatdırılma həddini A/B testlə tətbiq etmək',
            ]),
        ],
        'Sualı aydınlaşdırmaq — soruş; datanı tapmaq və təmizləmək — hazırla/təmizlə; hesablamaq və müqayisə — təhlil; təqdimat və qərar — paylaş və hərəkət et.',
    ),
    single(
        'Təhlil zamanı Aysel görür ki, avqust ayının datası natamamdır. Nə etməlidir?',
        [
            'Natamam datayla davam edib nəticəni təqdim etmək',
            '«Hazırla» addımına qayıdıb çatışmayan datanı tapmaq və ya bu məhdudiyyəti açıq qeyd etmək',
            'Avqustu təxmini rəqəmlərlə özü doldurmaq və heç kimə deməmək',
            'Layihəni dayandırmaq',
        ],
        2,
        'Proses düz xətt deyil — əvvəlki addıma qayıtmaq normaldır. Datanı uydurmaq isə yolverilməzdir; məhdudiyyətlər açıq bildirilməlidir.',
    ),
])

m.lesson('smart-kpi', 'Düzgün sual vermək: SMART və KPI', 7, '''
    Analizin keyfiyyəti sualın keyfiyyətindən başlayır. «Müştərilər bizi sevirmi?» sualına data ilə cavab vermək demək olar ki, mümkün deyil. «Son 3 ayda tətbiqə 5 ulduz verən müştərilərin payı necə dəyişib?» — isə tamamilə mümkündür.

    ## SMART suallar

    Yaxşı analitik sual **SMART** olur:

    | Hərf | Mənası | İzah |
    | --- | --- | --- |
    | **S** — Specific | Konkret | Bir mövzuya fokuslanır |
    | **M** — Measurable | Ölçülə bilən | Cavab rəqəmlə ifadə olunur |
    | **A** — Action-oriented | Hərəkətə yönəlik | Cavab bir qərara kömək edir |
    | **R** — Relevant | Aktual | Biznesin real probleminə aiddir |
    | **T** — Time-bound | Vaxtla bağlı | Dövr müəyyəndir |

    **Pis:** «Satışları necə artıraq?»
    **Yaxşı:** «Oktyabrda Bakıda 30 ₼-dan yuxarı sifarişlərdə pulsuz çatdırılma orta sifariş məbləğini neçə manat artırdı?»

    ## Metrika və KPI

    **Metrika** — ölçülən hər hansı göstəricidir: ziyarət sayı, sifariş sayı, orta məbləğ.
    **KPI** (Key Performance Indicator — əsas performans göstəricisi) — məqsədə çatmağı göstərən **ən vacib** metrikalardır. Hər metrika KPI deyil.

    ## E-ticarətin əsas KPI-ları

    | KPI | Düstur | NarMarket nümunəsi |
    | --- | --- | --- |
    | **Konversiya dərəcəsi** | sifariş sayı ÷ ziyarət sayı × 100% | 600 sifariş ÷ 20 000 ziyarət = **3%** |
    | **Orta sifariş məbləği (AOV)** | ümumi gəlir ÷ sifariş sayı | 21 000 ₼ ÷ 600 = **35 ₼** |
    | **Səbətin tərk edilməsi** | tamamlanmayan səbətlər ÷ yaradılan səbətlər × 100% | 1400 ÷ 2000 = **70%** |
    | **Müştərinin saxlanması (retention)** | geri qayıdan müştərilər ÷ ümumi müştərilər × 100% | 3 600 ÷ 6 000 = **60%** |
    | **Müştəri itkisi (churn)** | gedən müştərilər ÷ dövrün əvvəlindəki müştərilər × 100% | 300 ÷ 6 000 = **5%** |

    > ⚠️ **Boş metrikalardan** (vanity metrics) qorun: «tətbiq 1 milyon dəfə yüklənib» gözəl səslənir, amma neçə nəfərin həqiqətən sifariş verdiyini göstərmir. Yaxşı KPI qərara təsir edir.

    ## Biznes sualından data sualına

    | Biznes deyir | Analitik soruşur |
    | --- | --- |
    | «Kuryerlər gecikir» | «Son 30 gündə çatdırılmaların neçə faizi 45 dəqiqədən uzun çəkib və bu, şəhərlər üzrə necə fərqlənir?» |
    | «Yeni kampaniya işləyirmi?» | «Kampaniya həftəsində konversiya dərəcəsi əvvəlki 4 həftənin ortası ilə müqayisədə neçə faiz dəyişib?» |

    ## Qısa xülasə

    - Yaxşı sual SMART-dır: konkret, ölçülə bilən, hərəkətə yönəlik, aktual, vaxtla bağlı.
    - KPI — məqsədi göstərən ən vacib metrikalardır; boş metrikalardan qorun.
    - Konversiya = sifariş ÷ ziyarət; AOV = gəlir ÷ sifariş sayı.
''')

m.quiz('yaxsi-sual', 'Məşq: Yaxşı sual, pis sual', [
    classify(
        'Rəhbərlik analitiklərə suallar göndərib. Hansılar SMART-dır, hansılar qeyri-müəyyəndir?',
        [
            ('SMART sual', [
                'Son 3 ayda Bakıda səbəti tərk edən müştərilərin payı neçə faiz olub?',
                'Oktyabr kampaniyası orta sifariş məbləğini neçə manat artırıb?',
                'Ötən həftə ən çox geri qaytarılan 5 məhsul hansıdır?',
            ]),
            ('Qeyri-müəyyən sual', [
                'Müştərilər bizi sevirmi?',
                'Satışları necə artıraq?',
                'Tətbiqimiz yaxşıdırmı?',
            ]),
        ],
        'SMART suallarda konkret mövzu, ölçülə bilən göstərici və müəyyən dövr var. Qeyri-müəyyən suallara rəqəmlə cavab vermək mümkün deyil.',
    ),
    single(
        'NarMarket saytına bir gündə **20 000** ziyarət olub və **600** sifariş verilib. Konversiya dərəcəsi neçədir?',
        ['0.3%', '3%', '30%', '33%'],
        2,
        'Konversiya = 600 ÷ 20 000 × 100% = 3%.',
    ),
    single(
        'Gün ərzində ümumi gəlir **21 000 ₼**, sifariş sayı isə **600**-dür. Orta sifariş məbləği (AOV) neçədir?',
        ['21 ₼', '35 ₼', '60 ₼', '350 ₼'],
        2,
        'AOV = ümumi gəlir ÷ sifariş sayı = 21 000 ÷ 600 = 35 ₼.',
    ),
])

m.lesson('menbeler-novler', 'Data mənbələri və data növləri', 7, '''
    Sualı aydınlaşdırdıqdan sonra növbəti addım — cavabın harada olduğunu tapmaqdır.

    ## Data mənbələri

    **Daxili və xarici:**

    - **Daxili data** — şirkətin öz sistemlərində yaranan data: sifarişlər, ödənişlər, tətbiq hadisələri, CRM, anbar qalıqları.
    - **Xarici data** — kənardan gələn data: dövlət statistikası (məsələn, Dövlət Statistika Komitəsinin açıq məlumatları), hava proqnozu, bazar araşdırmaları, tərəfdaşların datası.

    **Birinci və ikinci dərəcəli:**

    - **Birinci dərəcəli (primary)** — sənin öz məqsədin üçün özün topladığın data: sorğu, müsahibə, eksperiment.
    - **İkinci dərəcəli (secondary)** — başqası tərəfindən başqa məqsədlə toplanmış data: hesabatlar, açıq datasetlər.

    ## Data toplama üsulları

    | Üsul | Nümunə |
    | --- | --- |
    | Əməliyyat sistemləri | Hər sifariş, ödəniş, qaytarma |
    | Veb və tətbiq analitikası | Kliklər, baxılan səhifələr, səbətə əlavələr |
    | Sorğular | «Çatdırılmadan nə dərəcədə razısınız?» |
    | API-lər | Valyuta məzənnəsi, hava datası |
    | Açıq datasetlər | Statistika komitələri, Kaggle |

    ## Data növləri

    **Kəmiyyət datası (quantitative)** — rəqəmlə ölçülür, üzərində hesablama aparmaq olur:

    - **Diskret** — sayılır, tam ədədlərdir: səbətdəki məhsul sayı, sifariş sayı.
    - **Fasiləsiz** (continuous) — ölçülür, istənilən dəyəri ala bilər: məbləğ, çəki, çatdırılma müddəti.

    **Keyfiyyət datası (qualitative / kateqoriyal)** — kateqoriya və ya təsvirdir:

    - **Nominal** — sırası yoxdur: şəhər, ödəniş üsulu, rəng.
    - **Ordinal** — sırası var: məmnunluq (aşağı / orta / yüksək), paltar ölçüsü (S / M / L).

    > 💡 **Yoxlama sualı:** «Bu dəyərlərin ortasını hesablamaq məna verirmi?» Məbləğin ortası — bəli (kəmiyyət). Şəhərlərin ortası — xeyr (keyfiyyət). Telefon nömrəsi rəqəmlərdən ibarətdir, amma ortası mənasızdır — o, əslində keyfiyyət datasıdır!

    ## Etika və məxfilik 🔒

    - Şəxsi datanı yalnız lazım olduğu qədər topla və istifadə et.
    - Müştərinin razılığı olmadan datasını başqa məqsədlə işlətmə.
    - Təhlil üçün adları, telefonları gizlət (anonimləşdirmə).
    - Nəticələri təqdim edərkən fərdləri tanımaq mümkün olmamalıdır.

    ## Qısa xülasə

    - Mənbələr: daxili və xarici; birinci dərəcəli (özün toplayırsan) və ikinci dərəcəli (hazır).
    - Kəmiyyət datası rəqəmlə ölçülür (diskret, fasiləsiz); keyfiyyət datası kateqoriyadır (nominal, ordinal).
    - Şəxsi data məsuliyyət tələb edir: minimum toplama, razılıq, anonimləşdirmə.
''')

m.quiz('data-novleri', 'Məşq: Data növlərini ayır', [
    classify(
        'NarMarket-in sifariş cədvəlindəki sütunları kəmiyyət və keyfiyyət datasına ayır.',
        [
            ('Kəmiyyət (rəqəmlə ölçülür)', [
                'Sifarişin məbləği (₼)',
                'Səbətdəki məhsul sayı',
                'Çatdırılma müddəti (dəqiqə)',
                'Müştərinin yaşı',
            ]),
            ('Keyfiyyət (kateqoriya / təsvir)', [
                'Ödəniş üsulu: kart / nağd',
                'Müştərinin şəhəri',
                'Rəydəki şərh mətni',
                'Məmnunluq: aşağı / orta / yüksək',
            ]),
        ],
        'Üzərində hesablama aparıla bilən rəqəmlər kəmiyyət datasıdır. Kateqoriyalar və mətnlər — hətta sıralı olsa belə (aşağı/orta/yüksək) — keyfiyyət datasıdır.',
    ),
    single(
        'Aysel çatdırılmadan razılığı öyrənmək üçün müştərilərə **özü sorğu göndərir** və cavabları toplayır. Bu hansı datadır?',
        ['İkinci dərəcəli (secondary) data', 'Birinci dərəcəli (primary) data', 'Xarici data', 'Strukturlaşdırılmamış data'],
        2,
        'Öz məqsədin üçün özün topladığın data birinci dərəcəli datadır.',
    ),
    single(
        'Müştərilərin **telefon nömrələri** rəqəmlərdən ibarətdir. Bu hansı data növüdür?',
        [
            'Kəmiyyət — çünki rəqəmlərdən ibarətdir',
            'Keyfiyyət — rəqəmlər identifikator rolunu oynayır, onların ortasını hesablamaq mənasızdır',
            'Fasiləsiz kəmiyyət datası',
            'Ordinal data',
        ],
        2,
        'Ortasını, cəmini hesablamaq mənasızdırsa, rəqəm görünüşlü data əslində kateqoriyadır. Telefon nömrəsi, sifariş nömrəsi, poçt indeksi belədir.',
    ),
])

# ───────────────────────────── Fəsil 3 ─────────────────────────────
m = c.module('temizleme-tehlil', 'Datanın təmizlənməsi və təhlili', 'Çirkli data, əsas statistika, korrelyasiya və A/B test.')

m.lesson('cirkli-data', 'Çirkli data və təmizləmə', 7, '''
    Analitikada məşhur bir qayda var: **«Garbage in, garbage out»** — zibil girirsə, zibil çıxır. Ən mükəmməl qrafik də səhv datanın üzərində qurulubsa, səhv qərara aparır. Buna görə analitiklər vaxtlarının çox hissəsini — bəzən yarıdan çoxunu — datanı təmizləməyə sərf edirlər.

    ## Ən çox rast gəlinən problemlər

    | Problem | Nümunə | Nə etməli |
    | --- | --- | --- |
    | **Dublikatlar** | Eyni sifariş №1045 iki dəfə yazılıb | Təkrarları sil; nəyə görə təkrarlandığını yoxla |
    | **Boş dəyərlər** (missing) | Müştərinin telefonu və ya çatdırılma tarixi yoxdur | Səbəbi araşdır; məntiqli dəyərlə doldur və ya həmin sətri təhlildən çıxar |
    | **Format uyğunsuzluğu** | «Bakı», «baku», «BAKI»; `03.10.2026` və `2026-10-03` | Vahid formata sal |
    | **Kənar dəyərlər** (outliers) | Orta sifariş 35 ₼ ikən bir sifariş 250 000 ₼ | Səhvdirsə düzəlt; realdırsa ayrıca təhlil et |
    | **Səhv tip** | Məbləğ mətn kimi saxlanılıb: «42,50 AZN» | Ədədə çevir |
    | **Yazı səhvləri** | «Gənca», «Sumgait» | Düzgün dəyərə uyğunlaşdır |
    | **Lazımsız data** | Test sifarişləri, işçilərin sınaq hesabları | Təhlildən çıxar |

    ## Əvvəl və sonra

    | sifariş | şəhər | məbləğ | tarix |
    | --- | --- | --- | --- |
    | 1045 | baku | 42,50 AZN | 03.10.2026 |
    | 1045 | baku | 42,50 AZN | 03.10.2026 |
    | 1046 | Gənca | 18.20 | 2026-10-03 |
    | 1047 | BAKI | 250000 | 2026-10-03 |
    | 1048 | Sumqayıt | | 2026-10-04 |

    Aysel nə edir?

    1. 1045-in **dublikatını** silir.
    2. Şəhərləri **vahid formaya** salır: Bakı, Gəncə.
    3. Məbləği **ədədə** çevirir: 42.50.
    4. 1047-ni araşdırır: kassir 250.00 əvəzinə 250000 yazıb → **düzəldir**.
    5. 1048-in məbləği **boşdur**: ödəniş sistemindən tapır və doldurur; tapmasaydı, bu sifarişi məbləğ hesablamalarından çıxarıb qeyd edərdi.

    ## Boş dəyərlərlə ehtiyatlı ol

    Bütün boş sətirləri silmək ən asan yoldur, amma təhlükəlidir: datanın böyük hissəsi itə və nəticə **təhrif** oluna bilər. Məsələn, telefon nömrəsi yalnız köhnə müştərilərdə boşdursa, onları silmək təhlili yalnız yeni müştərilərə çevirər.

    > 📋 **Qızıl qayda:** təmizləmə zamanı nə etdiyini qeyd et. Başqası (və ya bir aydan sonra sən özün) nəticəni təkrarlaya bilməlidir.

    ## Qısa xülasə

    - Səhv data səhv qərar deməkdir — təmizləmə analizin ən vacib hissələrindəndir.
    - Əsas problemlər: dublikatlar, boş dəyərlər, format uyğunsuzluğu, kənar dəyərlər, səhv tiplər.
    - Hər problemin səbəbini araşdır və etdiyin dəyişiklikləri sənədləşdir.
''')

m.quiz('problemi-tap', 'Məşq: Problemi tap', [
    classify(
        'Ayselin cədvəlində müxtəlif problemlər var. Hər birini düzgün problem növünə yerləşdir.',
        [
            ('Dublikat', [
                'Eyni sifariş (№1045) cədvəldə iki dəfə var',
                'Bir müştəri eyni gündə eyni ünvanla iki dəfə qeydiyyatdan keçib',
            ]),
            ('Boş dəyər', [
                'Müştərinin telefon sütunu boşdur',
                'Sifarişin çatdırılma tarixi yazılmayıb',
            ]),
            ('Format uyğunsuzluğu', [
                "Şəhər sütununda: 'Bakı', 'baku', 'BAKI'",
                "Tarixlər: '03.10.2026' və '2026-10-03'",
            ]),
            ('Kənar dəyər (outlier)', [
                'Bir sifarişin məbləği 250 000 ₼ (orta 35 ₼)',
                'Çatdırılma 900 dəqiqə çəkib (adətən 30–40)',
            ]),
        ],
        'Təkrarlanan qeydlər — dublikat; olmayan dəyər — boşluq; eyni şeyin fərqli yazılışı — format; qeyri-adi böyük və ya kiçik dəyər — kənar dəyər.',
    ),
    single(
        'Analitik boş dəyəri olan **bütün sətirləri** sildi və datanın 40%-i itdi. Daha yaxşı yanaşma hansıdır?',
        [
            'Bu yaxşıdır — boş dəyərli sətirlər həmişə silinməlidir',
            'Boşluqların səbəbini araşdırmaq; mümkün olduqda doldurmaq və ya yalnız həmin sütunun lazım olduğu hesablamada nəzərə almamaq',
            'Boşluqları təsadüfi rəqəmlərlə doldurmaq',
            'Boşluqları sıfırla əvəz etmək — sıfır həmişə təhlükəsizdir',
        ],
        2,
        'Kütləvi silmə nəticəni təhrif edə bilər. Səbəbi araşdırmaq və hər sütun üçün düşünülmüş qərar vermək lazımdır. Sıfır isə çox vaxt «məlum deyil» yox, «heç nə» deməkdir — bu da səhvdir.',
    ),
])

m.lesson('esas-statistika', 'Əsas statistika', 7, '''
    Analitikin gündəlik alətlərindən biri — datanı bir neçə rəqəmlə xülasə etməkdir. Bunun üçün böyük riyaziyyat lazım deyil, amma hər göstəricinin nəyi göstərdiyini və nəyi gizlətdiyini bilmək vacibdir.

    ## Mərkəzi meyl göstəriciləri

    Bir gündə NarMarket-in 7 sifarişinin məbləğləri (₼): **12, 15, 18, 20, 25, 30, 400**

    | Göstərici | Necə hesablanır | Nəticə |
    | --- | --- | --- |
    | **Orta** (mean) | Hamısının cəmi ÷ say | 520 ÷ 7 ≈ **74.3 ₼** |
    | **Median** | Sıralanmış datanın ortasındakı dəyər | **20 ₼** |
    | **Moda** (mode) | Ən çox təkrarlanan dəyər | Bu datada yoxdur |

    Bir korporativ sifariş (400 ₼) ortanı 74 ₼-a qaldırıb, halbuki 7 sifarişdən 6-sı 30 ₼-dan azdır. **Median kənar dəyərlərə daha az həssasdır** və «tipik» sifarişi daha düzgün göstərir.

    > 💼 Eyni səbəbdən maaşlar haqqında danışanda median daha düzgündür: bir neçə çox yüksək maaş ortanı şişirdir.

    Say cüt olduqda median iki orta dəyərin ortasıdır: 10, 20, 30, 40 → (20 + 30) ÷ 2 = 25.

    **Moda** kateqoriyal data üçün xüsusilə faydalıdır: «ən çox seçilən ödəniş üsulu hansıdır?» — kart.

    ## Yayılma göstəriciləri

    Ortalar eyni olsa da, data çox fərqli ola bilər:

    - Anbar A-da çatdırılma: 29, 30, 31 dəqiqə
    - Anbar B-də çatdırılma: 10, 30, 50 dəqiqə

    Hər ikisində orta 30 dəqiqədir, amma B-də müştəri nə vaxt sifariş alacağını bilmir.

    - **Diapazon** (range) = maksimum − minimum: A-da 2, B-də 40 dəqiqə.
    - **Standart kənarlaşma** (standard deviation) — dəyərlərin ortadan orta hesabla nə qədər uzaq olduğunu göstərir. Kiçikdirsə, data sabitdir; böyükdürsə, dağınıqdır.

    ## Faizlər və dəyişmə

    **Faiz dəyişməsi** = (yeni − köhnə) ÷ köhnə × 100%

    Satış sentyabrda 50 000 ₼, oktyabrda 60 000 ₼ → (60 000 − 50 000) ÷ 50 000 × 100% = **+20%**.

    > ⚠️ **Faiz və faiz bəndi fərqlidir.** Konversiya 2%-dən 3%-ə qalxıbsa, bu **1 faiz bəndi** artımdır, amma nisbi artım **50%**-dir. Hesabatlarda hansını nəzərdə tutduğunu aydın yaz.

    ## Qısa xülasə

    - Orta bütün dəyərləri nəzərə alır, amma kənar dəyərlər onu təhrif edir; median daha dayanıqlıdır.
    - Moda ən çox təkrarlanan dəyərdir — kateqoriyalar üçün faydalıdır.
    - Diapazon və standart kənarlaşma datanın nə qədər dağınıq olduğunu göstərir.
    - Faiz dəyişməsi = (yeni − köhnə) ÷ köhnə × 100%.
''')

m.quiz('hesabla', 'Məşq: Hesabla', [
    single(
        'Beş sifarişin məbləğləri: **10, 20, 20, 30, 120 ₼**. Median neçədir?',
        ['20 ₼', '30 ₼', '40 ₼', '10 ₼'],
        1,
        'Dəyərlər artıq sıralanıb; ortadakı (3-cü) dəyər 20-dir.',
    ),
    single(
        'Eyni datada (**10, 20, 20, 30, 120 ₼**) orta (mean) neçədir?',
        ['20 ₼', '30 ₼', '40 ₼', '50 ₼'],
        3,
        'Cəm 200 ₼, say 5 → 200 ÷ 5 = 40 ₼. 120 ₼-lıq sifariş ortanı medianın iki qatına qaldırıb.',
    ),
    single(
        'Hansı göstərici kənar dəyərlərə (outlier) **ən az** həssasdır?',
        ['Orta', 'Median', 'Diapazon', 'Cəm'],
        2,
        'Median yalnız ortadakı dəyərdən asılıdır, ona görə bir neçə həddən artıq böyük dəyər onu demək olar ki, dəyişmir.',
    ),
    single(
        'Satış sentyabrda **50 000 ₼**, oktyabrda **60 000 ₼** olub. Artım neçə faizdir?',
        ['10%', '16.7%', '20%', '60%'],
        3,
        '(60 000 − 50 000) ÷ 50 000 × 100% = 20%.',
    ),
    single(
        'Konversiya dərəcəsi **2%-dən 3%-ə** qalxıb. Hansı ifadə doğrudur?',
        [
            'Konversiya 1% artıb',
            'Konversiya 1 faiz bəndi, nisbi olaraq isə 50% artıb',
            'Konversiya 3 dəfə artıb',
            'Konversiya 150% artıb',
        ],
        2,
        'Fərq 1 faiz bəndidir, nisbi artım isə (3 − 2) ÷ 2 × 100% = 50%-dir.',
    ),
], xp=30)

m.lesson('korrelyasiya-ab', 'Korrelyasiya, səbəbiyyət və A/B test', 8, '''
    Analitikin ən çox verdiyi suallardan biri: «Bu iki şey əlaqəlidirmi?» və daha vacibi: «Biri digərinə **səbəb** olurmu?»

    ## Korrelyasiya

    **Korrelyasiya** iki göstəricinin birlikdə necə dəyişdiyini göstərir və −1 ilə +1 arasında ölçülür:

    | Növ | Mənası | Nümunə |
    | --- | --- | --- |
    | **Müsbət** (0-dan +1-ə) | Biri artanda digəri də artır | Reklam büdcəsi ↑ → sayt ziyarətləri ↑ |
    | **Mənfi** (0-dan −1-ə) | Biri artanda digəri azalır | Çatdırılma gecikməsi ↑ → müştəri reytinqi ↓ |
    | **Yoxdur** (~0) | Aralarında əlaqə yoxdur | Kuryerin ayaqqabı ölçüsü və çatdırılma sürəti |

    ## Korrelyasiya səbəbiyyət deyil ⚠️

    Yay aylarında həm **dondurma satışı**, həm də **dənizdə boğulma halları** artır. Bu o demək deyil ki, dondurma boğulmaya səbəb olur. Hər ikisinə **üçüncü amil** — isti hava təsir edir: insanlar həm daha çox dondurma alır, həm daha çox dənizə girir.

    Belə gizli amillərə **qarışdırıcı dəyişən** (confounding variable) deyilir. NarMarket-də: «Tətbiqdə çox vaxt keçirən müştərilər daha çox xərcləyir» — bəlkə də hər ikisinin səbəbi müştərinin böyük ailəsi və həftəlik böyük alış-verişidir.

    ## Səbəbi necə sübut etmək olar? A/B test

    **A/B test** — səbəb-nəticə əlaqəsini yoxlamağın ən etibarlı üsuludur:

    1. İstifadəçilər **təsadüfi** iki qrupa bölünür.
    2. **A qrupu** (nəzarət qrupu) köhnə versiyanı görür, **B qrupu** yeni versiyanı.
    3. Qalan hər şey eynidir.
    4. Müəyyən müddətdən sonra əsas göstərici (məsələn, konversiya) müqayisə edilir.

    Qruplar təsadüfi bölündüyü üçün aralarındakı yeganə sistemli fərq dəyişiklikdir — deməli, nəticədəki fərq də ondan qaynaqlanır.

    > 🧪 **NarMarket:** «Sifariş et» düyməsi yaşıldan narıncıya dəyişdirilir. 2 həftə ərzində 50 000 istifadəçi: A (yaşıl) — konversiya 3.0%, B (narıncı) — 3.4%. Fərq kifayət qədər böyük və sabitdirsə, narıncı düymə tətbiq olunur.

    **Diqqət:** qrup çox kiçik olarsa və ya test çox qısa çəkərsə, fərq təsadüfi ola bilər. Buna görə testin ölçüsü və müddəti əvvəlcədən planlaşdırılır, nəticənin **statistik əhəmiyyəti** yoxlanılır.

    ## Seqmentasiya, trend və mövsümilik

    - **Seqmentasiya** — datanı qruplara bölmək: şəhər, yaş, yeni/köhnə müştəri. Ümumi orta çox vaxt qrupların arasındakı fərqi gizlədir.
    - **Trend** — uzunmüddətli istiqamət: sifarişlər hər ay orta hesabla 3% artır.
    - **Mövsümilik** — təkrarlanan dövri dəyişmə: Novruz və Yeni il ərəfəsində sifarişlər artır, yayda bəzi kateqoriyalar düşür. Oktyabrı dekabrla müqayisə etmək yanlış nəticə verə bilər — keçən ilin eyni dövrü ilə müqayisə et.

    ## Qısa xülasə

    - Korrelyasiya iki göstəricinin birlikdə dəyişməsidir: müsbət, mənfi və ya yoxdur.
    - Korrelyasiya səbəbiyyət deyil — gizli üçüncü amil ola bilər.
    - Səbəbi yoxlamaq üçün A/B test: təsadüfi qruplar, bir dəyişiklik, nəticələrin müqayisəsi.
''')

m.quiz('dogru-netice', 'Məşq: Doğru nəticə', [
    single(
        'Yay aylarında həm dondurma satışı, həm də dənizdə boğulma halları artır. Hansı nəticə **doğrudur**?',
        [
            'Dondurma boğulma riskini artırır',
            'Boğulmalar dondurma satışını artırır',
            'Hər ikisinə üçüncü amil — isti hava təsir edir; bu, səbəb-nəticə əlaqəsi deyil',
            'Bu iki göstərici arasında heç bir korrelyasiya yoxdur',
        ],
        3,
        'Korrelyasiya var, amma səbəbiyyət yoxdur. Gizli üçüncü amil — isti hava hər ikisini artırır.',
    ),
    single(
        'NarMarket yeni «Sürətli sifariş» düyməsinin satışa təsirini yoxlamaq istəyir. **Ən düzgün** üsul hansıdır?',
        [
            'Düyməni hamıya göstərib keçən ayla müqayisə etmək',
            'İstifadəçiləri təsadüfi iki qrupa bölmək: birinə köhnə, digərinə yeni düyməni göstərib konversiyanı müqayisə etmək',
            'Ən sadiq 100 müştəriyə yeni düyməni göstərmək',
            'İşçilərdən hansı düyməni bəyəndiklərini soruşmaq',
        ],
        2,
        'A/B testdə qruplar təsadüfi bölündüyü üçün nəticədəki fərq məhz dəyişiklikdən qaynaqlanır. Keçən ayla müqayisədə isə mövsüm, kampaniya kimi başqa amillər qarışır.',
    ),
    classify(
        'Hər cüt göstərici arasındakı əlaqəni düzgün qrupa yerləşdir.',
        [
            ('Müsbət korrelyasiya', [
                'Reklam büdcəsi artdıqca sayt ziyarətləri artır',
                'Endirim faizi artdıqca satılan məhsul sayı artır',
            ]),
            ('Mənfi korrelyasiya', [
                'Çatdırılma gecikdikcə müştəri reytinqi düşür',
                'Qiymət artdıqca alınan məhsul sayı azalır',
            ]),
            ('Korrelyasiya yoxdur', [
                'Müştərinin adının uzunluğu və sifariş məbləği',
                'Kuryerin ayaqqabı ölçüsü və çatdırılma sürəti',
            ]),
        ],
        'Birlikdə artırsa — müsbət, biri artanda digəri azalırsa — mənfi, aralarında heç bir qanunauyğunluq yoxdursa — korrelyasiya yoxdur.',
    ),
])

# ───────────────────────────── Fəsil 4 ─────────────────────────────
m = c.module('vizuallasdirma', 'Vizuallaşdırma və data hekayəsi', 'Düzgün qrafik seçimi, dashboard-lar və data ilə hekayə danışmaq.')

m.lesson('qrafik-sec', 'Düzgün qrafiki seç', 7, '''
    Yaxşı qrafik bir baxışda deyir ki, cədvəl 10 dəqiqəyə deyə bilməz. Səhv qrafik isə hətta düzgün datanı da anlaşılmaz edir. Qrafik seçimi **sualdan** başlayır: nəyi göstərmək istəyirsən?

    ## Əsas qrafik növləri

    | Qrafik | Nə üçün | NarMarket nümunəsi |
    | --- | --- | --- |
    | 📈 **Xətt** (line) | Zamanla dəyişmə, trend | Son 12 ayda gündəlik sifariş sayı |
    | 📊 **Sütun** (bar) | Kateqoriyaları müqayisə | 5 şəhər üzrə satış |
    | 🥧 **Dairə** (pie) | Bütövün hissələri (2–4 hissə) | Ödəniş üsullarının payı: kart 70%, nağd 30% |
    | ⚬ **Səpələnmə** (scatter) | İki rəqəmsal göstərici arasında əlaqə | Çatdırılma məsafəsi və müddəti |
    | ▥ **Histoqram** | Bir göstəricinin paylanması | Sifariş məbləğlərinin hansı aralıqda cəmləşdiyi |
    | 🗺️ **Xəritə** | Coğrafi fərqlər | Rayonlar üzrə orta çatdırılma müddəti |
    | 🔢 **KPI kartı** | Bir vacib rəqəm | «Bu gün: 48 210 sifariş, +4% dünənə nisbətən» |
    | 📋 **Cədvəl** | Dəqiq dəyərlərə baxmaq lazım olanda | Ən çox satılan 10 məhsulun siyahısı |

    ## Seçim üçün sadə suallar

    - Zamanla dəyişməni göstərirəm? → **xətt**
    - Kateqoriyaları müqayisə edirəm? → **sütun** (çox kateqoriya varsa, üfüqi sütun)
    - Bütövün neçə hissəyə bölündüyünü göstərirəm və hissələr azdır? → **dairə** (yoxsa sütun)
    - İki rəqəm arasında əlaqə axtarıram? → **səpələnmə**
    - Dəyərlər necə paylanıb? → **histoqram**

    ## Ən çox edilən səhvlər

    - **Dairəvi qrafikdə 8–10 dilim** — göz kiçik bucaqları müqayisə edə bilmir; sütun qrafik daha yaxşıdır.
    - **Zaman üçün sütun əvəzinə dairə** — trend görünmür.
    - **3D effektlər** — ön tərəfdəki hissələri böyük göstərir, datanı təhrif edir.
    - **Həddən artıq rəng** — hər sütun fərqli rəngdə olanda vacib olan itir. Bir vurğu rəngi kifayətdir.
    - **Başlıqsız və vahidsiz oxlar** — «bu nədir, ₼, yoxsa ədəd?»

    > 💡 **Yaxşı başlıq nəticəni deyir:** «Satış» əvəzinə «Gəncədə satış oktyabrda 18% düşüb».

    ## Qısa xülasə

    - Qrafik sualdan seçilir: zaman → xətt, müqayisə → sütun, hissələr → dairə, əlaqə → səpələnmə, paylanma → histoqram.
    - Dairəvi qrafiki yalnız az hissə üçün istifadə et; 3D və artıq rənglərdən qaç.
    - Başlıq nəticəni deməli, oxların vahidi olmalıdır.
''')

m.quiz('qrafik-sec-mesq', 'Məşq: Qrafiki seç', [
    classify(
        'Aysel müxtəlif suallar üçün qrafik hazırlayır. Hər tapşırıq üçün ən uyğun qrafiki seç.',
        [
            ('Xətt (line)', [
                'Son 12 ayda gündəlik sifariş sayının dəyişməsi',
                'Gün ərzində saatlar üzrə sayt ziyarətlərinin dəyişməsi',
            ]),
            ('Sütun (bar)', [
                '5 şəhər üzrə satışların müqayisəsi',
                'Kateqoriyalar üzrə geri qaytarılan məhsul sayı',
            ]),
            ('Səpələnmə (scatter)', [
                'Reklam xərci ilə satış arasındakı əlaqə',
                'Çatdırılma məsafəsi ilə müddəti arasındakı əlaqə',
            ]),
            ('Dairə (pie)', [
                'Ödəniş üsullarının payı: kart 70%, nağd 30%',
                'Sifarişlərin mobil və veb arasında bölgüsü',
            ]),
        ],
        'Zaman → xətt; kateqoriyaların müqayisəsi → sütun; iki rəqəm arasında əlaqə → səpələnmə; az sayda hissədən ibarət bütöv → dairə.',
    ),
    single(
        'Aysel 9 məhsul kateqoriyasının satış payını göstərmək istəyir. Hansı seçim **daha yaxşıdır**?',
        [
            '9 dilimli 3D dairəvi qrafik',
            'Böyükdən kiçiyə sıralanmış üfüqi sütun qrafiki',
            'Xətt qrafiki',
            'Səpələnmə qrafiki',
        ],
        2,
        'Çox hissəli dairəvi qrafiki oxumaq çətindir, 3D isə təhrif edir. Sıralanmış sütunlar müqayisəni asanlaşdırır.',
    ),
])

m.lesson('dashboard', 'Dashboard-lar və BI alətləri', 6, '''
    **Dashboard** — ən vacib göstəriciləri bir ekranda toplayan və mütəmadi yenilənən interaktiv paneldir. Avtomobilin cihaz panelini düşün: sürücü yolda olarkən sürəti, yanacağı və xəbərdarlıqları bir baxışda görür.

    ## Hesabat və dashboard

    | | Hesabat | Dashboard |
    | --- | --- | --- |
    | **Forma** | Sənəd, təqdimat | İnteraktiv panel |
    | **Yenilənmə** | Bir dəfəlik və ya dövri | Avtomatik, çox vaxt gündəlik və ya canlı |
    | **Məqsəd** | Konkret suala dərin cavab | Vəziyyəti daim izləmək |

    ## Yaxşı dashboard-un prinsipləri

    1. **Auditoriyanı tanı** — direktora 5 əsas KPI, anbar müdirinə isə saatlıq sifariş axını lazımdır.
    2. **5 saniyə qaydası** — ən vacib məlumat 5 saniyəyə görünməlidir.
    3. **Az, amma vacib** — 3–5 əsas KPI yuxarıda, detallar aşağıda.
    4. **Kontekst ver** — «48 210 sifariş» rəqəmi tək-başına az şey deyir. «Dünənə nisbətən +4%, hədəfdən −2%» isə deyir.
    5. **Ardıcıl dizayn** — eyni rəng hər yerdə eyni mənanı versin: yaşıl — yaxşı, qırmızı — diqqət.
    6. **Filtrlər** — istifadəçi şəhər, tarix, kateqoriya seçib özü dərinləşə bilsin.

    ## NarMarket-in direktor dashboard-u

    ```text
    ┌────────────┬────────────┬────────────┬────────────┐
    │ Sifarişlər │ Gəlir      │ Orta məbləğ│ Gecikmələr │
    │ 48 210 ↑4% │ 1.69M ₼ ↑6%│ 35.1 ₼ ↑2% │ 7.8% ↑1.2pp│
    ├────────────┴────────────┴────────────┴────────────┤
    │ Gündəlik sifarişlər (son 30 gün) — xətt qrafiki    │
    ├─────────────────────────┬─────────────────────────┤
    │ Şəhərlər üzrə satış     │ Kateqoriyalar üzrə satış│
    │ (sütun)                 │ (sütun)                 │
    └─────────────────────────┴─────────────────────────┘
    ```

    ## BI alətləri

    - **Excel / Google Sheets** — kiçik datalar və sürətli təhlil üçün; pivot cədvəllər və qrafiklər.
    - **Power BI** (Microsoft) — şirkətlərdə ən geniş yayılmış BI alətlərindən biri.
    - **Tableau** — güclü vizuallaşdırma imkanları.
    - **Looker Studio** (Google) — pulsuz, Google xidmətləri ilə asan inteqrasiya.

    Bu alətlər adətən data warehouse-a qoşulur və data engineer-in hazırladığı cədvəllərdən avtomatik yenilənir. **Self-service BI** ideyası da budur: hər kəs analitikə müraciət etmədən lazım olan rəqəmi özü tapa bilsin.

    ## Qısa xülasə

    - Dashboard vacib göstəriciləri bir ekranda toplayır və avtomatik yenilənir.
    - Prinsiplər: auditoriya, 5 saniyə qaydası, az amma vacib KPI, kontekst, ardıcıl dizayn, filtrlər.
    - Əsas alətlər: Excel/Sheets, Power BI, Tableau, Looker Studio.
''')

m.lesson('hekaye', 'Data ilə hekayə danışmaq', 7, '''
    Ən dəqiq təhlil də dinləyən başa düşməsə və heç bir qərar verilməsə, dəyərsizdir. **Data storytelling** — rəqəmləri insanları hərəkətə keçirən hekayəyə çevirmək bacarığıdır.

    ## Hekayənin quruluşu

    1. **Kontekst** — vəziyyət nədir? «Gəncə NarMarket-in ikinci böyük bazarıdır.»
    2. **Konflikt (kəşf)** — nə dəyişib? «Oktyabrda orada satış 18% düşüb, rəqib yoxdur, qiymətlər eynidir.»
    3. **Səbəb** — niyə? «Yeni anbarın açılışı gecikdiyi üçün çatdırılma 35 dəqiqədən 70 dəqiqəyə qalxıb və gecikən sifarişlərdə reytinq kəskin düşüb.»
    4. **Həll (tövsiyə)** — nə etməli? «Anbar açılana qədər Gəncəyə 20 əlavə kuryer — aylıq 9 000 ₼. İtirilən satış ayda təxminən 60 000 ₼-dır.»

    ## Auditoriyanı tanı

    | Auditoriya | Nə istəyir |
    | --- | --- |
    | **Direktor** | Nəticə, təsir (₼), qərar — 3 dəqiqədə |
    | **Əməliyyat meneceri** | Harada, nə vaxt, nə qədər — detallar |
    | **Analitik həmkar** | Metodologiya, data mənbələri, məhdudiyyətlər |

    > 💡 **«Nə olsun?» testi** (So what?): hər slayddan sonra özündən soruş — «bu rəqəm dinləyiciyə nə deyir və ondan nə gözləyirəm?» Cavab yoxdursa, slayd lazımsızdır.

    Rəhbərliklə təqdimata **əsas nəticə və tövsiyə ilə** başla, detalları sonraya saxla.

    ## Aldadıcı qrafiklər 🚩

    Qrafik bilərəkdən və ya bilməyərəkdən aldada bilər:

    - **Kəsilmiş ox** (truncated axis) — y oxu 0-dan yox, 95-dən başlayır və 96 ilə 98 arasındakı kiçik fərq nəhəng görünür.
    - **Seçmə data** (cherry-picking) — yalnız uyğun gələn dövrü göstərmək: «son 3 gündə satış artıb» (son 3 ayda isə düşüb).
    - **3D dairəvi qrafiklər** — öndəki dilimlər böyük görünür.
    - **İki fərqli miqyaslı ox** — iki xətt «eyni sürətlə» artır kimi görünür, halbuki miqyaslar fərqlidir.
    - **Kontekstsiz rəqəm** — «şikayətlər 2 dəfə artıb» (10-dan 20-yə, 50 000 sifarişin içində).

    Analitikin məsuliyyəti — datanı **dürüst** göstərməkdir, hətta nəticə gözlənilən olmasa belə.

    ## Qısa xülasə

    - Hekayə: kontekst → kəşf → səbəb → tövsiyə.
    - Auditoriyaya uyğunlaş; rəhbərliyə nəticə və tövsiyə ilə başla.
    - Kəsilmiş ox, seçmə data, 3D və kontekstsiz rəqəmlərdən qaç — datanı dürüst göstər.
''')

m.quiz('hekaye-mesq', 'Məşq: Hekayə və aldadıcı qrafiklər', [
    single(
        'Qrafikdə y oxu **0-dan yox, 95-dən** başlayır və 96 ilə 98 arasındakı fərq nəhəng görünür. Problem nədir?',
        [
            'Problem yoxdur — qrafik daha maraqlı görünür',
            'Kəsilmiş ox kiçik fərqi şişirdərək təhrif edir',
            'Xətt qrafiki əvəzinə dairə istifadə olunmalı idi',
            'Rənglər səhv seçilib',
        ],
        2,
        'Kəsilmiş ox ən çox rast gəlinən aldadıcı vizuallaşdırmalardan biridir. Sütun qrafiklərində ox 0-dan başlamalıdır.',
    ),
    single(
        'Aysel direktora 5 dəqiqəlik təqdimat hazırlayır. **Ən yaxşı** başlanğıc hansıdır?',
        [
            'Data mənbələrinin və təmizləmə addımlarının ətraflı təsviri',
            '30 qrafiklik dashboard-un ekran görüntüsü',
            'Əsas nəticə və tövsiyə: «Gecikmələr Gəncədə satışı 18% salıb — 20 əlavə kuryer təklif edirik»',
            'Statistik düsturların izahı',
        ],
        3,
        'Rəhbərlik nəticə, təsir və qərar istəyir. Metodologiya sual verilərsə və ya əlavədə göstərilə bilər.',
    ),
    classify(
        'Hansılar yaxşı dashboard təcrübəsidir, hansılar pis?',
        [
            ('Yaxşı təcrübə', [
                'Ən vacib 3–5 KPI yuxarıda',
                'Göstəricini hədəf və ya keçən dövrlə müqayisə etmək',
                'Rənglərdən ardıcıl və mənalı istifadə',
                'Auditoriyaya uyğun detallaşdırma',
            ]),
            ('Pis təcrübə', [
                'Bir səhifədə 25 qrafik',
                'Hər qrafikdə fərqli rəng sxemi',
                '3D dairəvi qrafiklər',
                'Vahidsiz və başlıqsız rəqəmlər',
            ]),
        ],
        'Yaxşı dashboard az, amma vacib göstəricini kontekstlə və ardıcıl dizaynla verir. Həddən artıq qrafik, qarışıq rənglər, 3D və vahidsiz rəqəmlər oxunuşu çətinləşdirir.',
    ),
])

# ───────────────────────────── Fəsil 5 ─────────────────────────────
m = c.module('aletler-karyera', 'Alətlər və karyera', 'Analitikin alət dəsti, tam layihə nümunəsi və yekun test.')

m.lesson('alet-desti', 'Data analitikin alət dəsti', 6, '''
    Alətlər dəyişir, düşünmə tərzi qalır. Amma işə başlamaq üçün müəyyən alətləri bilmək lazımdır.

    ## Əsas alətlər

    | Alət | Nə üçün | Nə vaxt |
    | --- | --- | --- |
    | **Excel / Google Sheets** | Formullar, pivot cədvəllər, qrafiklər | Kiçik və orta datalar, sürətli təhlil |
    | **SQL** | Bazalardan data çıxarmaq, filtrləmək, birləşdirmək | Demək olar ki, hər gün |
    | **Power BI / Tableau / Looker Studio** | Dashboard və interaktiv hesabatlar | Daimi izləmə, rəhbərlik üçün |
    | **Python (pandas) və ya R** | Böyük datalar, avtomatlaşdırma, statistika | Excel-in imkanı çatmayanda |
    | **Statistika** | Orta, median, paylanma, testlər | Nəticənin etibarlılığını yoxlamaq üçün |

    ## Öyrənmə yolu 🧭

    1. **Excel** — formullar (SUM, AVERAGE, IF, VLOOKUP/XLOOKUP), pivot cədvəllər, qrafiklər.
    2. **SQL** — SELECT, WHERE, GROUP BY, JOIN.
    3. **BI aləti** — Power BI və ya Tableau-dan birini seç və bir dashboard qur.
    4. **Statistikanın əsasları** — bu kursda gördüklərimizin dərinləşdirilməsi.
    5. **Python və pandas** — təkrarlanan işləri avtomatlaşdırmaq və böyük datalar üçün.

    > 💡 DaCy-də Python4Business kursu Python-a sıfırdan başlamaq üçün yaxşı addımdır.

    ## Portfolio qur

    İşəgötürən sertifikatdan çox **etdiyin işi** görmək istəyir:

    - açıq datasetlərdən (Kaggle, statistika komitələrinin açıq məlumatları) real sual seç;
    - təmizlə, təhlil et, dashboard qur;
    - nəticəni qısa hekayə kimi yaz: sual → data → kəşf → tövsiyə;
    - 3–4 belə layihə güclü portfolio yaradır.

    ## Karyera yolu

    **Junior analitik → Data analitik → Senior → Lead / Analytics manager.** Sonradan bu istiqamətlərə keçmək olar:

    - **Data scientist** — proqnoz modelləri, maşın öyrənməsi;
    - **Analytics engineer** — SQL və dbt ilə anbarda modellər;
    - **Product analyst** — məhsulun istifadəsi və eksperimentlər;
    - **BI developer** — şirkət miqyasında BI sistemləri.

    ## Qısa xülasə

    - Əsas üçlük: Excel, SQL, BI aləti; sonra statistika və Python.
    - Portfolio — real datasetlər üzərində 3–4 tam layihə.
    - Analitika bir çox başqa data peşəsinə qapı açır.
''')

m.lesson('tam-layihe', 'Tam layihə: NarMarket-də tərk edilən səbətlər', 8, '''
    Kurs boyu öyrəndiklərimizi bir real layihədə birləşdirək. Aysel bütün prosesi başdan sona keçir.

    ## 1. Soruş

    Rəhbərlik narahatdır: «Müştərilər səbəti doldurur, amma sifariş vermir.» Aysel sualı SMART edir:

    > «İyul–sentyabr aylarında səbətin tərk edilmə dərəcəsi niyə 60%-dən 70%-ə qalxıb və onu 4 həftə ərzində ən azı 5 faiz bəndi azaltmaq üçün nə etmək olar?»

    **KPI:** səbətin tərk edilmə dərəcəsi və konversiya.

    ## 2. Hazırla

    Data mənbələri: tətbiq hadisələri (səbətə əlavə, ödəniş səhifəsinə keçid, sifariş), sifarişlər cədvəli, çatdırılma qiymətləri tarixçəsi. Hamısı daxili, data warehouse-dadır.

    ## 3. Təmizlə

    - Test hesablarını və işçilərin sifarişlərini çıxarır.
    - Dublikat hadisələri silir (tətbiq bəzən eyni hadisəni iki dəfə göndərir).
    - Vaxtları vahid saat qurşağına salır.

    ## 4. Təhlil et

    **Huni (funnel) təhlili** — müştərilər hər addımda nə qədər itir:

    | Addım | Müştəri | Növbəti addıma keçən |
    | --- | --- | --- |
    | Tətbiqə daxil olub | 100 000 | 30% |
    | Səbətə məhsul atıb | 30 000 | 40% |
    | Ödəniş səhifəsini açıb | 12 000 | 75% |
    | Sifariş verib | 9 000 | — |

    Ən böyük itki «səbət → ödəniş səhifəsi» addımındadır — məhz çatdırılma haqqının göründüyü yer. Tarixçə göstərir ki, iyulda haqq **2 ₼-dan 4 ₼-a** qaldırılıb. **Seqmentasiya**: itki ən çox 20 ₼-dan aşağı səbətlərdə artıb — kiçik sifarişdə 4 ₼ çatdırılma nisbətən baha görünür.

    Bu hələ **korrelyasiyadır** — səbəbi sübut etmək üçün test lazımdır.

    ## 5. Paylaş

    Aysel direktora 3 slayd göstərir:

    1. **Nəticə:** «Səbətlərin tərk edilməsi 10 faiz bəndi artıb; itki ödəniş səhifəsinə keçiddə, əsasən kiçik səbətlərdə baş verir.»
    2. **Qrafik:** aylar üzrə tərk edilmə dərəcəsi (xətt), haqqın dəyişdiyi tarix qeyd olunub.
    3. **Tövsiyə:** «25 ₼-dan yuxarı sifarişlərdə pulsuz çatdırılmanı A/B testlə yoxlayaq.»

    ## 6. Hərəkət et

    4 həftəlik **A/B test**: A qrupu — köhnə qayda, B qrupu — 25 ₼-dan yuxarı pulsuz çatdırılma.

    | Qrup | Tərk edilmə | Konversiya | Orta səbət |
    | --- | --- | --- | --- |
    | A (köhnə) | 70% | 9.0% | 31 ₼ |
    | B (yeni) | 63% | 10.1% | 34 ₼ |

    Tərk edilmə 7 faiz bəndi azalıb, orta səbət də artıb — müştərilər pulsuz çatdırılma həddinə çatmaq üçün əlavə məhsul alır. Yeni qayda hamı üçün tətbiq olunur, dashboard-a yeni KPI əlavə edilir və nəticə növbəti aylarda izlənir.

    ## Bu layihədən dərslər

    - Qeyri-müəyyən narahatlıq SMART suala çevrildi.
    - Təmizləmə olmasa, dublikat hadisələr nəticəni təhrif edərdi.
    - Huni və seqmentasiya problemin **harada** olduğunu göstərdi.
    - Korrelyasiya fərziyyə verdi, **A/B test** onu sübut etdi.
    - Qısa hekayə və aydın tövsiyə qərarı sürətləndirdi.
''')

m.quiz('yekun-test', 'Yekun test: What is Data Analytics?', [
    single(
        '«Hansı müştərinin gələn ay abunəni dayandıracağını təxmin et» — bu hansı analitika növüdür?',
        ['Təsviri', 'Diaqnostik', 'Proqnozlaşdırıcı', 'Tövsiyəedici'],
        3,
        'Gələcəkdə nə baş verəcəyini təxmin etmək proqnozlaşdırıcı analitikadır.',
    ),
    single(
        'Analiz prosesinin addımlarının **düzgün ardıcıllığı** hansıdır?',
        [
            'Təhlil et → Soruş → Paylaş → Təmizlə → Hazırla → Hərəkət et',
            'Soruş → Hazırla → Təmizlə → Təhlil et → Paylaş → Hərəkət et',
            'Hazırla → Təmizlə → Soruş → Paylaş → Təhlil et → Hərəkət et',
            'Paylaş → Soruş → Təhlil et → Hazırla → Təmizlə → Hərəkət et',
        ],
        2,
        'Əvvəlcə sual, sonra data, təmizləmə, təhlil, nəticənin paylaşılması və qərar.',
    ),
    classify(
        'Sütunları data növlərinə ayır.',
        [
            ('Kəmiyyət', ['Çatdırılma müddəti (dəqiqə)', 'Sifariş məbləği (₼)', 'Səbətdəki məhsul sayı']),
            ('Keyfiyyət', ['Müştərinin rayonu', 'Ödəniş üsulu', 'Sifariş nömrəsi']),
        ],
        'Üzərində hesablama aparılan rəqəmlər kəmiyyətdir. Sifariş nömrəsi rəqəm olsa da identifikatordur — ortası mənasızdır, ona görə keyfiyyət datasıdır.',
    ),
    single(
        'Sifariş məbləğləri: **8, 9, 10, 11, 12, 200 ₼**. Tipik sifarişi ən yaxşı hansı göstərici təsvir edir?',
        ['Orta (≈41.7 ₼)', 'Median (10.5 ₼)', 'Maksimum (200 ₼)', 'Diapazon (192 ₼)'],
        2,
        '200 ₼-lıq kənar dəyər ortanı şişirdir. Median (10 və 11-in ortası, 10.5 ₼) tipik sifarişi daha düzgün göstərir.',
    ),
    single(
        'Analitik tapır ki, tətbiqdə push-bildirişləri açıq olan müştərilər daha çox sifariş verir. Hansı nəticə **ən düzgündür**?',
        [
            'Bildirişlər sifariş sayını artırır — hamıya məcburi bildiriş göndərək',
            'Bu, korrelyasiyadır; səbəbiyyəti yoxlamaq üçün A/B test lazımdır — bəlkə aktiv müştərilər sadəcə bildirişləri daha çox açır',
            'Bildirişlər sifarişləri azaldır',
            'Bu datadan heç bir nəticə çıxarmaq olmaz',
        ],
        2,
        'Korrelyasiya səbəbiyyət deyil. Gizli amil (müştərinin ümumi aktivliyi) ola bilər. Təsadüfi qruplarla A/B test səbəbi yoxlamağa imkan verir.',
    ),
    classify(
        'Hər tapşırıq üçün uyğun qrafiki seç.',
        [
            ('Xətt', ['Son 2 ildə aylıq gəlirin dəyişməsi']),
            ('Sütun', ['10 kuryer üzrə çatdırılma sayının müqayisəsi']),
            ('Səpələnmə', ['Məhsulun qiyməti ilə satış sayı arasındakı əlaqə']),
            ('Histoqram', ['Sifariş məbləğlərinin paylanması']),
        ],
        'Zaman → xətt; müqayisə → sütun; iki rəqəm arasında əlaqə → səpələnmə; paylanma → histoqram.',
    ),
    single(
        'Bir gündə **40 000** ziyarət və **1 000** sifariş olub. Konversiya dərəcəsi neçədir?',
        ['0.25%', '2.5%', '4%', '25%'],
        2,
        '1 000 ÷ 40 000 × 100% = 2.5%.',
    ),
    single(
        'Hansı sual **SMART** sualdır?',
        [
            'Müştərilərimiz xoşbəxtdirmi?',
            'Marketinqimiz yaxşıdırmı?',
            'Oktyabrda Sumqayıtda çatdırılmaların neçə faizi 45 dəqiqədən uzun çəkib?',
            'Biznesimizi necə böyüdək?',
        ],
        3,
        'Bu sual konkretdir, ölçülə bilər, aktualdır və müəyyən dövrə aiddir.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
