from common import Course, classify, multiple, single

c = Course(
    'what-is-cyber-security',
    {
        '_comment': (
            'What is Cyber Security? — giriş kursu (kodsuz).\n'
            'Hər dərs nəzəri addımdır: videonu admin paneldə dərsin «Video» sahəsinə yükləyin — mətnin üstündə görünür.\n'
            'Məşqlər yalnız sual-cavabdır: tək seçim, çox seçim və «qruplara ayır» (classify).'
        ),
        'track': 'cyber-security',
        'title': 'What is Cyber Security?',
        'level': 'beginner',
        'description': (
            'Kibertəhlükəsizliyə kodsuz, sadə dildə giriş: CIA triadası, təhdid, zəiflik və risk, hücumçular, '
            'zərərli proqramlar, sosial mühəndislik və fişinq, şəbəkə və veb hücumları, parollar və MFA, '
            'müdafiə qatları, şifrələmə, insidentə cavab və kibertəhlükəsizlik peşələri. '
            'Hər dərsdən sonra real ssenarilərə əsaslanan məşqlər.'
        ),
        'sequential': True,
        'estimated_hours': 3,
        'published': True,
    },
)

# ───────────────────────────── Fəsil 1 ─────────────────────────────
m = c.module('giris', 'Kibertəhlükəsizliyə giriş', 'Kibertəhlükəsizlik nədir, CIA triadası, aktiv, təhdid, zəiflik və risk.')

m.lesson('xos-geldin', 'Kursa xoş gəldin: niyə kibertəhlükəsizlik?', 5, '''
    Bank hesabın, e-poçtun, şəkillərin, iş sənədlərin, hətta evinin kamerası — hamısı artıq rəqəmsaldır. Rəqəmsal olan hər şey isə hücuma məruz qala bilər. **Kibertəhlükəsizlik** — sistemləri, şəbəkələri, cihazları və datanı rəqəmsal hücumlardan, icazəsiz girişdən və zərərdən qorumaq üçün texnologiyalar, proseslər və vərdişlər toplusudur.

    ## Niyə bu qədər vacibdir?

    - **Kibercinayətkarlıq nəhəng biznesdir** — dünyada ona görə ildə trilyonlarla dollar zərər dəyir.
    - **Hücumlar avtomatlaşdırılıb** — botlar internetdə hər gün milyonlarla zəif parol və yenilənməmiş server axtarır. «Mən maraqlı hədəf deyiləm» düşüncəsi işləmir.
    - **İnsan amili** — data sızmalarının əksəriyyətində insan səhvi və ya aldadılması rol oynayır: fişinq linkinə klik, zəif parol, səhv göndərilmiş fayl.
    - **Nəticələr real həyata təsir edir** — dayanan xəstəxanalar, bloklanan limanlar, oğurlanan əmanətlər.

    > 🛡️ Kibertəhlükəsizlik yalnız IT şöbəsinin işi deyil. Hər işçi, hər istifadəçi müdafiə xəttinin bir hissəsidir.

    ## Kurs boyu: NarPay və SOC analitiki Rauf 💳

    **NarPay** — uydurma rəqəmsal pul kisəsi və ödəniş tətbiqidir: 2 milyon istifadəçi, kart ödənişləri, pul köçürmələri, NarMarket-də alış-veriş. Belə şirkət kibercinayətkarlar üçün çox cəlbedici hədəfdir. Kurs boyu NarPay-in təhlükəsizlik əməliyyatları mərkəzində (SOC) çalışan **Rauf**la birlikdə real ssenariləri təhlil edəcəyik.

    ## Kursda nə öyrənəcəksən

    | Fəsil | Mövzu |
    | --- | --- |
    | 1. Giriş | CIA triadası; aktiv, təhdid, zəiflik, risk |
    | 2. Təhdidlər | Hücumçular, zərərli proqramlar, sosial mühəndislik, şəbəkə və veb hücumları |
    | 3. Müdafiə | Parollar və MFA, müdafiə qatları, şifrələmə və heşləmə |
    | 4. İnsident və peşə | İnsidentə cavab, peşələr, gündəlik kibergigiyena, yekun test |

    ## Necə öyrənəcəksən

    1. **Dərs** — video və qısa mətn.
    2. **Məşq** — real ssenarilər: düzgün cavabı seç, elementləri qruplara ayır.
    3. Səhv etsən, izahı oxu və yenidən cəhd et.

    > ⚖️ **Etik qayda:** bu kursda öyrəndiyin hücum üsulları müdafiə üçündür. Başqasının sisteminə icazəsiz daxil olmaq və ya onu yoxlamaq qanunla cəzalandırılır.
''')

m.lesson('cia-triadasi', 'CIA triadası', 7, '''
    Kibertəhlükəsizliyin təməlində üç məqsəd dayanır. Onlar ingiliscə baş hərflərinə görə **CIA triadası** adlanır (Kəşfiyyat İdarəsi ilə əlaqəsi yoxdur 🙂).

    ## C — Confidentiality (məxfilik)

    Məlumata **yalnız icazəsi olanlar** baxa bilməlidir.

    - **Pozulma nümunələri:** müştərilərin kart məlumatlarının internetə sızması; işçinin icazəsi olmadan həmkarının maaşına baxması.
    - **Qoruma vasitələri:** şifrələmə, giriş hüquqlarının idarəsi, güclü autentifikasiya.

    ## I — Integrity (bütövlük)

    Məlumat **dəqiq və tam** olmalı, icazəsiz **dəyişdirilməməlidir**.

    - **Pozulma nümunələri:** hücumçunun köçürmə məbləğini 100 ₼-dan 10 000 ₼-a dəyişməsi; virusun mühasibat cədvəlindəki rəqəmləri korlaması.
    - **Qoruma vasitələri:** heş (hash) yoxlamaları, rəqəmsal imzalar, dəyişikliklərin jurnalı, versiyalama.

    ## A — Availability (əlçatanlıq)

    Məlumat və sistemlər **lazım olanda** icazəli istifadəçilər üçün **işlək** olmalıdır.

    - **Pozulma nümunələri:** DDoS hücumu səbəbindən NarPay tətbiqinin 3 saat açılmaması; ransomware-in faylları şifrələməsi; server otağında yanğın.
    - **Qoruma vasitələri:** ehtiyat nüsxələr, ehtiyat serverlər, DDoS müdafiəsi, fəlakətdən bərpa planı.

    ## Bir cədvəldə

    | Prinsip | Sual | NarPay-də qorunan |
    | --- | --- | --- |
    | **Məxfilik** | Kim görə bilər? | Kart nömrələri, şəxsi məlumatlar |
    | **Bütövlük** | Dəyişdirilməyibmi? | Köçürmə məbləğləri, balanslar |
    | **Əlçatanlıq** | Lazım olanda işləyirmi? | Tətbiq və ödəniş xidməti 24/7 |

    ## Balans

    Üç prinsip bəzən bir-biri ilə ziddiyyət təşkil edir. Məsələn, məxfiliyi artırmaq üçün hər əməliyyata 5 təsdiq addımı qoysan, əlçatanlıq və rahatlıq azalar. Təhlükəsizlik mütəxəssisinin işi — **riskə uyğun balans** tapmaqdır.

    ## Daha üç anlayış

    - **Autentifikasiya** (authentication) — «Sən kimsən?» Kimliyin yoxlanması: parol, barmaq izi.
    - **Avtorizasiya** (authorization) — «Sənə nə etmək icazəlidir?» Hüquqların yoxlanması.
    - **Təkzibedilməzlik** (non-repudiation) — əməliyyatı edən sonradan «mən etməmişəm» deyə bilməsin: rəqəmsal imza, jurnal qeydləri.

    ## Qısa xülasə

    - Məxfilik — yalnız icazəlilər görür; bütövlük — data dəyişdirilmir; əlçatanlıq — sistem lazım olanda işləyir.
    - Hər hücum bu üç prinsipdən ən azı birini pozur.
    - Təhlükəsizlik — üç prinsip və rahatlıq arasında riskə uyğun balansdır.
''')

m.quiz('cia-ni-tap', 'Məşq: CIA-nı tap', [
    classify(
        'NarPay-də baş vermiş insidentlər. Hər biri CIA triadasının hansı prinsipini **ən çox** pozur?',
        [
            ('Məxfilik', [
                'Müştərilərin kart məlumatları internetə sızdı',
                'İşçi icazəsi olmadan həmkarının maaş məlumatlarına baxdı',
            ]),
            ('Bütövlük', [
                'Hücumçu köçürmənin məbləğini 100 ₼-dan 10 000 ₼-a dəyişdi',
                'Virus mühasibat cədvəlindəki rəqəmləri korladı',
            ]),
            ('Əlçatanlıq', [
                'DDoS hücumu səbəbindən NarPay tətbiqi 3 saat açılmadı',
                'Server otağında yanğın sistemləri dayandırdı',
                'Ransomware faylları şifrələdi və heç kim onları aça bilmir',
            ]),
        ],
        'Sızma və icazəsiz baxış — məxfilik; datanın dəyişdirilməsi və korlanması — bütövlük; sistemin və ya datanın istifadə oluna bilməməsi — əlçatanlıq.',
    ),
    single(
        'Hansı tədbir əsasən **bütövlüyü** (integrity) qoruyur?',
        [
            'Serverin ehtiyat nüsxəsini başqa şəhərdə saxlamaq',
            'Faylın heş dəyərini yoxlamaq ki, dəyişdirilmədiyinə əmin olaq',
            'Ofis girişinə mühafizəçi qoymaq',
            'Sayta DDoS müdafiəsi qoşmaq',
        ],
        2,
        'Heş dəyəri faylın «barmaq izi»dir: bir simvol dəyişsə, heş tamamilə dəyişir. Ehtiyat nüsxə və DDoS müdafiəsi əlçatanlığı qoruyur.',
    ),
])

m.lesson('esas-anlayislar', 'Aktiv, təhdid, zəiflik və risk', 7, '''
    Təhlükəsizlik mütəxəssisləri hər şeyi eyni anda qoruya bilməzlər. Hara vaxt və pul xərcləməli olduqlarını müəyyən etmək üçün bir neçə əsas anlayışdan istifadə edirlər.

    ## Ev bənzətməsi 🏠

    | Anlayış | Mənası | Evdə | NarPay-də |
    | --- | --- | --- | --- |
    | **Aktiv** (asset) | Qorunmalı olan dəyərli şey | Ev və içindəki əşyalar | Müştəri bazası, pul köçürmə sistemi |
    | **Təhdid** (threat) | Zərər vura biləcək şəxs və ya hadisə | Oğru, yanğın | Kiberdələduzlar, narazı işçi, sel |
    | **Zəiflik** (vulnerability) | Təhdidin istifadə edə biləcəyi boşluq | Açıq qalmış pəncərə | Yenilənməmiş server, zəif parol |
    | **Ekspluatasiya** (exploit) | Zəiflikdən istifadə üsulu | Pəncərədən içəri girmək | Köhnə proqramdakı xətadan istifadə edən kod |
    | **Risk** | Zərərin baş vermə ehtimalı və təsiri | Oğurluq ehtimalı × itkinin dəyəri | Sızma ehtimalı × cərimə və itirilən etimad |
    | **Nəzarət tədbiri** (control) | Riski azaldan vasitə | Kilid, siqnalizasiya, sığorta | 2FA, firewall, ehtiyat nüsxə |

    ## Risk necə qiymətləndirilir?

    Sadə formada:

    > **Risk = Ehtimal × Təsir**

    - Zəif parolla qorunan və internetə açıq admin paneli: ehtimal **yüksək**, təsir **çox yüksək** → kritik risk, dərhal həll edilməlidir.
    - Ofisdəki printerin köhnə proqramı: ehtimal orta, təsir aşağı → sonraya planlaşdırıla bilər.

    Təhdid olmadan zəiflik zərər vermir, zəiflik olmadan təhdid uğur qazanmır. Risk — onların **görüşdüyü yerdir**. Biz təhdidləri adətən yox edə bilmərik (dələduzlar həmişə olacaq), amma **zəiflikləri** azalda bilərik.

    ## Riskə qarşı 4 strategiya

    | Strategiya | Mənası | NarPay nümunəsi |
    | --- | --- | --- |
    | **Azaltmaq** (mitigate) | Nəzarət tədbirləri ilə ehtimalı və ya təsiri kiçiltmək | Bütün işçilərə 2FA tətbiq etmək |
    | **Ötürmək** (transfer) | Riskin maliyyə yükünü başqasına keçirmək | Kibersığorta almaq |
    | **Qaçmaq** (avoid) | Riskli fəaliyyətdən imtina etmək | Kart məlumatlarını ümumiyyətlə saxlamamaq |
    | **Qəbul etmək** (accept) | Risk kiçikdirsə, onunla yaşamaq | Printerin kiçik zəifliyini hələlik saxlamaq |

    ## Qısa xülasə

    - Aktiv — qorunan dəyər; təhdid — zərər mənbəyi; zəiflik — boşluq; risk — ehtimal × təsir.
    - Təhdidləri çox vaxt dəyişə bilmirik, zəiflikləri isə azalda bilirik.
    - Riskə qarşı: azalt, ötür, qaç, qəbul et.
''')

m.quiz('tehdid-zeiflik', 'Məşq: Təhdid, zəiflik, yoxsa tədbir?', [
    classify(
        'Rauf NarPay-in risk reyestrini doldurur. Hər elementi düzgün qrupa yerləşdir.',
        [
            ('Təhdid (threat)', [
                'Pul oğurlamaq istəyən kiberdələduz qrup',
                'Narazı keçmiş işçi',
            ]),
            ('Zəiflik (vulnerability)', [
                'Yenilənməmiş, köhnə server proqramı',
                "İşçilərin '123456' parolundan istifadə etməsi",
                'Şifrələnməmiş müştəri bazası',
            ]),
            ('Nəzarət tədbiri (control)', [
                'İki faktorlu autentifikasiya (2FA)',
                'Firewall',
                'Müntəzəm ehtiyat nüsxələr',
            ]),
        ],
        'Təhdid — zərər vura biləcək şəxs və ya hadisə; zəiflik — onların istifadə edə biləcəyi boşluq; nəzarət tədbiri — riski azaldan vasitə.',
    ),
    single(
        'NarPay kiberhücumların maliyyə nəticələrinə qarşı **sığorta polisi** alır. Bu hansı risk strategiyasıdır?',
        ['Riskin azaldılması', 'Riskin ötürülməsi', 'Riskdən qaçmaq', 'Riskin qəbul edilməsi'],
        2,
        'Sığorta riskin maliyyə yükünü sığorta şirkətinə ötürür. Hücumun ehtimalı isə dəyişmir — buna görə sığorta digər tədbirləri əvəz etmir.',
    ),
    single(
        'Hansı vəziyyətdə risk **ən yüksəkdir**?',
        [
            'Ofis printerinin köhnə proqramı, internetə çıxışı yoxdur',
            'Zəif parolla qorunan və internetdən hamıya açıq admin paneli',
            'Şifrələnmiş və ehtiyat nüsxəsi olan test serveri',
            'İşçilərin istirahət otağındakı televizor',
        ],
        2,
        'Ehtimal yüksəkdir (zəif parol, internetə açıq) və təsir çox böyükdür (admin hüquqları). Risk = ehtimal × təsir.',
    ),
])

# ───────────────────────────── Fəsil 2 ─────────────────────────────
m = c.module('tehdidler', 'Təhdidlər və hücumlar', 'Hücumçular, zərərli proqramlar, sosial mühəndislik və fişinq, şəbəkə və veb hücumları.')

m.lesson('hucumcular', 'Hücumçular kimdir?', 6, '''
    Müdafiəni qurmaq üçün əvvəlcə bilmək lazımdır: kim hücum edir və nə istəyir? Kibertəhlükəsizlikdə hücumçulara **təhdid aktorları** (threat actors) deyilir.

    ## Əsas təhdid aktorları

    | Aktor | Motivasiya | Nümunə |
    | --- | --- | --- |
    | **Kibercinayətkarlar** | Pul | Ransomware, kart oğurluğu, fişinq |
    | **Haktivistlər** | İdeologiya, siyasi etiraz | Saytları sındırıb şüar yazmaq, DDoS |
    | **Dövlət dəstəkli qruplar** (APT) | Casusluq, təxribat | Uzunmüddətli gizli hücumlar, kritik infrastruktur |
    | **İnsayderlər** | Qisas, pul və ya ehtiyatsızlıq | Datanı aparan narazı işçi; səhvən fayl göndərən işçi |
    | **«Script kiddie»-lər** | Maraq, şöhrət | Hazır alətlərlə bacarıqsız hücumlar |
    | **Rəqiblər** | Sənaye casusluğu | Gizli məlumatların oğurlanması |

    **APT** (Advanced Persistent Threat) — böyük resurslara malik, hədəfdə aylarla gizli qala bilən qruplardır.

    > ⚠️ **İnsayderləri** unutma: təhdid həmişə kənardan gəlmir. Ehtiyatsız işçi bəzən ən güclü hakerdən çox zərər verir — məsələn, müştəri bazasını səhv ünvana göndərməklə.

    ## «Şlyapa» rəngləri 🎩

    - **Ağ şlyapa** (white hat) — **icazə ilə** sistemləri yoxlayan etik hakerlər; zəiflikləri tapıb sahibinə bildirirlər.
    - **Qara şlyapa** (black hat) — icazəsiz, zərər və ya qazanc üçün hücum edənlər.
    - **Boz şlyapa** (grey hat) — icazəsiz yoxlayan, amma zərər vurmaq niyyəti olmayanlar. Niyyət yaxşı olsa da, icazəsiz yoxlama **qanunsuzdur**.

    ## Hücum necə qurulur?

    Hücumlar adətən mərhələlərlə gedir. Məşhur **Cyber Kill Chain** modeli:

    1. **Kəşfiyyat** — hədəf haqqında məlumat toplamaq: işçilərin adları, e-poçt formatı, istifadə olunan texnologiyalar.
    2. **Silahlanma** — zərərli fayl və ya link hazırlamaq.
    3. **Çatdırılma** — e-poçt, saxta sayt, USB.
    4. **Ekspluatasiya** — zəiflikdən istifadə edib kodu işə salmaq.
    5. **Quraşdırma** — sistemdə qalıcı yer tutmaq.
    6. **İdarəetmə** (C2) — yoluxmuş sistemi uzaqdan idarə etmək.
    7. **Məqsədə çatmaq** — datanı oğurlamaq, şifrələmək, sistemi dağıtmaq.

    Müdafiəçi üçün yaxşı xəbər: zəncirin **istənilən halqasını** qırmaq hücumu dayandırır. Məsələn, fişinq təlimi «çatdırılma», yeniləmələr «ekspluatasiya» mərhələsini qırır.

    ## Qısa xülasə

    - Təhdid aktorları: kibercinayətkarlar, haktivistlər, dövlət dəstəkli qruplar, insayderlər, script kiddie-lər, rəqiblər.
    - Etik (ağ şlyapa) haker yalnız icazə ilə yoxlayır.
    - Hücum mərhələlərlə gedir; istənilən mərhələdə dayandırmaq olar.
''')

m.lesson('malware', 'Zərərli proqramlar (malware)', 7, '''
    **Malware** (malicious software) — cihaza zərər vurmaq, datanı oğurlamaq və ya sistemə icazəsiz nəzarət etmək üçün yaradılmış proqramdır. Növləri işləmə üsuluna və məqsədinə görə fərqlənir.

    ## Əsas növlər

    | Növ | Necə işləyir | Nümunə |
    | --- | --- | --- |
    | **Virus** | Başqa fayla yapışır, istifadəçi faylı açanda işə düşür və yayılır | Yoluxmuş Word sənədi |
    | **Qurd** (worm) | İstifadəçinin heç bir hərəkəti olmadan şəbəkə üzərindən özü yayılır | 2017-də dünya üzrə yüz minlərlə kompüteri yoluxduran WannaCry |
    | **Troyan** (trojan) | Faydalı proqram kimi görünür, arxa planda zərərli iş görür | «Pulsuz oyun hiyləsi», sındırılmış proqram |
    | **Ransomware** | Faylları şifrələyir və açar üçün fidyə istəyir | Şirkətin bütün serverlərinin şifrələnməsi |
    | **Spyware** | Gizlicə izləyir və məlumat toplayır | Telefonda yazışmaları oxuyan tətbiq |
    | **Keylogger** | Basılan hər düyməni qeyd edir | Parolların və kart nömrələrinin oğurlanması |
    | **Adware** | Zorla reklam göstərir | Brauzerdə dayanmadan açılan pəncərələr |
    | **Rootkit** | Sistemin dərinliyində gizlənir, aşkarlanmaqdan yayınır | Antivirusdan gizlənən zərərli proqram |
    | **Botnet** | Yoluxmuş cihazlar şəbəkəsi, uzaqdan birlikdə idarə olunur | Minlərlə cihazla DDoS hücumu, spam |

    ## Ransomware haqqında ətraflı 🔒

    Ransomware bu gün şirkətlər üçün ən təhlükəli təhdidlərdən biridir. Müasir qruplar çox vaxt **ikiqat şantaj** edir: həm faylları şifrələyir, həm də datanı əvvəlcədən oğurlayıb «ödəməsəniz, internetə yayacağıq» deyirlər.

    Fidyə ödəmək tövsiyə olunmur: faylların qaytarılacağına zəmanət yoxdur, ödəniş cinayətkarları maliyyələşdirir və şirkəti yenidən hədəfə çevirir. Ən yaxşı müdafiə — **yoxlanılmış ehtiyat nüsxələr** və hücumun qarşısını almaqdır.

    ## Malware necə daxil olur?

    - **E-poçt əlavələri** — «qaimə.zip», «maaş_cədvəli.xlsm»;
    - **Sındırılmış və qeyri-rəsmi proqramlar** — «pulsuz» Photoshop, oyunlar;
    - **Tapılmış USB fləşkalar**;
    - **Zərərli reklamlar və saxta saytlar**;
    - **Yenilənməmiş proqramlar** — məlum zəifliklərdən istifadə edilir.

    ## Əsas müdafiə

    - Əməliyyat sistemini və proqramları **vaxtında yeniləmək**;
    - Antivirus / EDR istifadə etmək;
    - Proqramları yalnız **rəsmi mənbələrdən** yükləmək;
    - Gözlənilməz əlavələri açmamaq;
    - **Ehtiyat nüsxələri** müntəzəm çıxarmaq və bərpanı yoxlamaq.

    ## Qısa xülasə

    - Virus fayla yapışır, qurd özü yayılır, troyan faydalı kimi görünür, ransomware fidyə istəyir.
    - Spyware və keylogger gizlicə məlumat toplayır; botnet — yoluxmuş cihazlar ordusudur.
    - Əsas müdafiə: yeniləmələr, rəsmi mənbələr, ehtiyatlılıq və ehtiyat nüsxələr.
''')

m.quiz('malware-tani', 'Məşq: Malware-i tanı', [
    single(
        'NarPay-in mühasibat kompüterində bütün fayllar açılmır, ekranda isə yazı var: «Fayllarınız şifrələnib. Açar üçün 72 saat ərzində kriptovalyuta ilə ödəyin.» Bu nədir?',
        ['Adware', 'Ransomware', 'Spyware', 'Qurd (worm)'],
        2,
        'Faylları şifrələyib fidyə istəyən zərərli proqram ransomware-dir.',
    ),
    single(
        'İşçi internetdən «pulsuz oyun hiyləsi» proqramı yükləyir. Proqram işləyir, amma arxa planda hücumçuya kompüterə uzaqdan giriş açır. Bu nədir?',
        ['Virus', 'Troyan', 'Adware', 'Botnet'],
        2,
        'Faydalı proqram kimi görünüb gizli zərərli iş görən proqram troyandır — Troya atı kimi.',
    ),
    single(
        'Zərərli proqram **heç kim heç nə açmadan** şəbəkədəki bir kompüterdən digərinə özü yayılır. Bu nədir?',
        ['Qurd (worm)', 'Virus', 'Keylogger', 'Rootkit'],
        1,
        'Qurd istifadəçinin hərəkəti olmadan şəbəkə üzərindən özü yayılır. Virus isə yoluxmuş fayl açılanda işə düşür.',
    ),
    single(
        'Proqram klaviaturada basılan hər düyməni qeyd edib hücumçuya göndərir — parollar da daxil olmaqla. Bu nədir?',
        ['Ransomware', 'Adware', 'Keylogger', 'Qurd'],
        3,
        'Basılan düymələri qeyd edən spyware növü keylogger adlanır.',
    ),
    single(
        'Minlərlə yoluxmuş kamera və router eyni anda NarPay saytına sorğu göndərib onu əlçatmaz edir. Bu cihazlar şəbəkəsi necə adlanır?',
        ['Botnet', 'Rootkit', 'Troyan', 'Firewall'],
        1,
        'Uzaqdan birlikdə idarə olunan yoluxmuş cihazlar şəbəkəsi botnet adlanır və tez-tez DDoS hücumlarında istifadə olunur.',
    ),
], xp=30)

m.lesson('sosial-muhendislik', 'Sosial mühəndislik və fişinq', 8, '''
    Ən möhkəm qapını sındırmaqdan asan yol var — kimisə inandırıb qapını **özünə açdırmaq**. **Sosial mühəndislik** texnologiyanı yox, insan psixologiyasını hədəf alan hücumlardır.

    ## Psixoloji «düymələr»

    Hücumçular insanların təbii reaksiyalarından istifadə edir:

    - **Təcililik** — «24 saat ərzində təsdiqləməsəniz, hesab bloklanacaq!»
    - **Nüfuz** — «Mən baş direktoram, bu köçürməni dərhal edin.»
    - **Qorxu** — «Hesabınızdan şübhəli əməliyyat edilib.»
    - **Maraq** — «Şirkətin maaş siyahısı.xlsx»
    - **Tamah** — «Siz iPhone qazandınız, sadəcə çatdırılma haqqını ödəyin.»
    - **Kömək etmək istəyi** — «Kuryerəm, əlim doludur, qapını tuta bilərsiniz?»

    ## Hücum növləri

    | Növ | Necə |
    | --- | --- |
    | **Fişinq** (phishing) | Kütləvi saxta e-poçtlar: bank, kuryer şirkəti, tanınmış brend adından |
    | **Spear phishing** | Konkret şəxsə hazırlanmış, adla müraciət edən, inandırıcı məktub |
    | **Whaling** | Rəhbər şəxsləri hədəf alan fişinq |
    | **Smishing** | SMS ilə fişinq: «Bağlamanız gecikir, linkə keçin» |
    | **Vishing** | Telefon zəngi: «Bankdan zəng edirik, SMS kodu deyin» |
    | **Pretexting** | Uydurma ssenari: «IT şöbəsindənəm, parolunuzu yoxlamalıyam» |
    | **Baiting** (yem) | Ofisin qarşısında «Maaşlar 2026» yazılmış USB fləşka |
    | **Tailgating** | Kartı olan işçinin arxasınca mühafizəli binaya keçmək |

    ## Fişinq məktubunu necə tanımalı? 🚩

    > **Göndərən:** NarPay Dəstək <support@narpay-secure-login.com>
    > **Mövzu:** TƏCİLİ! Hesabınız 24 saat ərzində bloklanacaq
    >
    > Hörmətli müştəri,
    > hesabınızda şübhəli fəaliyyət aşkar edildi. Bloklanmamaq üçün aşağıdakı linkə daxil olub kart məlumatlarınızı və SMS kodu təsdiqləyin.
    > **[Hesabı təsdiqlə]**
    > Əlavə: hesab_yenilenmesi.zip

    Qırmızı bayraqlar:

    1. **Göndərənin domeni** rəsmi deyil: `narpay-secure-login.com` (rəsmi — `narpay.az` olardı).
    2. **Təcililik və qorxu** — «24 saat», «bloklanacaq».
    3. **Ümumi müraciət** — «Hörmətli müştəri», adınız yoxdur.
    4. **Linkin üzərinə gələndə** başqa ünvan görünür.
    5. **Gözlənilməz əlavə** — `.zip`, `.exe`, makroslu `.xlsm`/`.docm`.
    6. **Həssas məlumat tələbi** — heç bir bank e-poçtla kart məlumatı və ya SMS kodu istəmir.
    7. Bəzən **yazı və qrammatika səhvləri**.

    ## Nə etməli?

    - Linkə klikləmə, əlavəni açma.
    - Məlumatı **rəsmi kanalla** yoxla: tətbiqə özün daxil ol, bankın kartın arxasındakı nömrəsinə özün zəng et.
    - Şübhəli məktubu **təhlükəsizlik komandasına bildir** — bəlkə də başqalarına da gəlib.
    - Klikləmisənsə, utanma — dərhal bildir və parolunu dəyiş. Sürətli reaksiya zərəri kəskin azaldır.

    ## Qısa xülasə

    - Sosial mühəndislik insan psixologiyasından istifadə edir: təcililik, nüfuz, qorxu, maraq, tamah.
    - Növləri: fişinq, spear phishing, smishing, vishing, pretexting, baiting, tailgating.
    - Qırmızı bayraqlar: qəribə domen, təcililik, ümumi müraciət, gizli link, gözlənilməz əlavə, həssas məlumat tələbi.
''')

m.quiz('fisinqi-tut', 'Məşq: Fişinqi tut', [
    classify(
        '''
        Rauf işçilərə gələn məktubu təhlil edir:

        > **Göndərən:** NarPay Dəstək <support@narpay-secure-login.com>
        > **Mövzu:** TƏCİLİ! Hesabınız 24 saat ərzində bloklanacaq
        >
        > Hörmətli müştəri, bloklanmamaq üçün linkə keçib kart məlumatlarınızı və SMS kodu təsdiqləyin.
        > Əlavə: hesab_yenilenmesi.zip

        Elementləri ayır: hansılar fişinq əlamətidir, hansılar düzgün davranışdır?
        ''',
        [
            ('Fişinq əlaməti 🚩', [
                'Göndərənin domeni: narpay-secure-login.com',
                "Mövzu: 'TƏCİLİ! 24 saat ərzində bloklanacaq'",
                "'Hörmətli müştəri' — adınız yoxdur",
                'Əlavə: hesab_yenilenmesi.zip',
                'SMS kodunun təsdiqlənməsi tələbi',
            ]),
            ('Düzgün davranış ✅', [
                'Linkə klikləmədən rəsmi tətbiqə özün daxil olub yoxlamaq',
                'Məktubu təhlükəsizlik komandasına bildirmək',
                'Bankın rəsmi nömrəsinə özün zəng edib soruşmaq',
            ]),
        ],
        'Qəribə domen, təcililik, ümumi müraciət, gözlənilməz əlavə və SMS kod tələbi — klassik fişinq əlamətləridir. Düzgün reaksiya: klikləmə, rəsmi kanalla yoxla, bildir.',
    ),
    single(
        'Özünü bank əməkdaşı kimi təqdim edən biri zəng edir: «Kartınızdan şübhəli əməliyyat var, ləğv etmək üçün telefonunuza gələn kodu deyin.» Bu hansı hücumdur?',
        ['Smishing', 'Vishing', 'Baiting', 'Tailgating'],
        2,
        'Telefon zəngi ilə aldatma vishing (voice phishing) adlanır. Bank heç vaxt SMS kodunu soruşmur.',
    ),
    single(
        'Ofis girişində əlində qutular olan «kuryer» kartı olan işçinin arxasınca içəri keçir. Bu hansı texnikadır?',
        ['Pretexting', 'Whaling', 'Tailgating', 'Smishing'],
        3,
        'Mühafizəli əraziyə icazəli şəxsin arxasınca keçmək tailgating adlanır. Kömək etmək istəyi burada «düymə» rolunu oynayır.',
    ),
])

m.lesson('sebeke-veb', 'Şəbəkə və veb hücumları', 8, '''
    Bəzi hücumlar insanları yox, birbaşa sistemləri, şəbəkələri və veb tətbiqləri hədəf alır.

    ## DoS və DDoS

    **DoS** (Denial of Service) — xidməti həddən artıq sorğu ilə doldurub əlçatmaz etmək. **DDoS** (Distributed DoS) — eyni hücumun minlərlə cihazdan (çox vaxt **botnet**dən) eyni anda edilməsi. Məqsəd datanı oğurlamaq yox, **əlçatanlığı** pozmaqdır.

    🛡️ Müdafiə: DDoS müdafiə xidmətləri, trafikin filtrlənməsi, resursların ehtiyatı.

    ## Ortadakı adam (Man-in-the-Middle, MitM)

    Hücumçu istifadəçi ilə sayt arasına girib trafiki oxuyur və ya dəyişdirir. Klassik ssenari: hava limanında **«Free_Airport_WiFi»** adlı saxta şəbəkə — qoşulanların bütün trafiki hücumçunun cihazından keçir.

    🛡️ Müdafiə: HTTPS (brauzerdə qıfıl), VPN, tanımadığın açıq Wi-Fi-da həssas əməliyyatlar etməmək.

    ## Parol hücumları

    - **Brute force** — bütün mümkün kombinasiyaları sınamaq. Qısa parollar dəqiqələrlə tapılır.
    - **Lüğət hücumu** — ən populyar parolları və sözləri sınamaq: `123456`, `password`, `qwerty`.
    - **Credential stuffing** — başqa saytdan **sızmış** e-poçt və parol cütlərini avtomatik olaraq digər saytlarda sınamaq. Eyni parolu bir neçə yerdə istifadə edənlər hədəfdir.

    🛡️ Müdafiə: uzun, unikal parollar, MFA, giriş cəhdlərinin məhdudlaşdırılması.

    ## SQL injection

    Veb tətbiq istifadəçinin yazdığını yoxlamadan birbaşa baza sorğusuna əlavə edirsə, hücumçu giriş sahəsinə **SQL kodu** yazıb sorğunun mənasını dəyişə bilər: parolsuz daxil olmaq, bütün müştəri bazasını çıxarmaq, datanı silmək.

    🛡️ Müdafiə: parametrləşdirilmiş sorğular (istifadəçi datası heç vaxt kod kimi icra olunmur), daxil edilən datanın yoxlanması.

    ## Cross-site scripting (XSS)

    Hücumçu sayta (məsələn, şərh sahəsinə) zərərli **JavaScript** yerləşdirir və bu kod səhifəni açan digər istifadəçilərin brauzerində işləyir — sessiyalarını oğurlaya bilər.

    🛡️ Müdafiə: istifadəçi datasını səhifədə göstərməzdən əvvəl təhlükəsiz formaya salmaq (escaping).

    ## Zero-day və təchizat zənciri hücumları

    - **Zero-day** — istehsalçının hələ xəbəri olmayan və yamağı (patch) olmayan zəiflik. Müdafiə: müdafiə qatları, anormal davranışın izlənməsi.
    - **Təchizat zənciri hücumu** (supply chain) — hədəfin istifadə etdiyi proqram və ya xidmət təchizatçısını sındırmaq. 2020-ci ildə SolarWinds proqramının yeniləməsinə zərərli kod yerləşdirildi və minlərlə təşkilat yoluxdu.

    ## Qısa xülasə

    - DDoS əlçatanlığı pozur; MitM trafiki ələ keçirir.
    - Brute force, lüğət hücumu və credential stuffing parolları hədəf alır.
    - SQL injection və XSS veb tətbiqlərin istifadəçi datasını yoxlamamasından istifadə edir.
    - Zero-day və təchizat zənciri hücumları müdafiə qatlarının vacibliyini göstərir.
''')

m.quiz('hucumu-tani', 'Məşq: Hücumu tanı', [
    classify(
        'Rauf həftəlik insident hesabatını hazırlayır. Hər hadisəni düzgün hücum növünə yerləşdir.',
        [
            ('DDoS', [
                'Saniyədə milyonlarla saxta sorğu ilə sayt əlçatmaz edildi',
                'Botnet NarPay serverlərini trafiklə doldurdu',
            ]),
            ('Man-in-the-Middle', [
                "Hava limanında saxta 'Free WiFi' şəbəkəsi qurulub trafik oxundu",
                'İctimai Wi-Fi-da istifadəçi ilə sayt arasındakı məlumat ələ keçirildi',
            ]),
            ('Credential stuffing', [
                'Başqa saytdan sızan e-poçt və parollar NarPay-də sınandı',
                'Eyni parolu bir neçə saytda işlədənlərin hesablarına avtomatik giriş cəhdləri',
            ]),
            ('SQL injection', [
                'Axtarış sahəsinə xüsusi simvollar yazılıb bazadan bütün müştərilər çıxarıldı',
                'Giriş formasına SQL kodu yazılıb parolsuz daxil olundu',
            ]),
        ],
        'Trafiklə doldurmaq — DDoS; arada dayanıb trafiki oxumaq — MitM; sızmış parolları başqa saytda sınamaq — credential stuffing; sahəyə SQL kodu yazmaq — SQL injection.',
    ),
    single(
        'Kafedə açıq Wi-Fi-a qoşulmusan və bank tətbiqinə girmək lazımdır. **Ən təhlükəsiz** seçim hansıdır?',
        [
            'Açıq Wi-Fi-da daxil olmaq — kafe etibarlıdır',
            'Mobil internetdən istifadə etmək və ya etibarlı VPN qoşmaq',
            'Wi-Fi şəbəkəsinin adı kafenin adına oxşayırsa, daxil olmaq',
            'Brauzerin gizli rejimində daxil olmaq',
        ],
        2,
        'Açıq şəbəkə saxta ola bilər (MitM). Mobil internet və ya VPN trafiki qoruyur. Gizli rejim yalnız tarixçəni saxlamır — trafiki qorumur.',
    ),
])

# ───────────────────────────── Fəsil 3 ─────────────────────────────
m = c.module('mudafie', 'Müdafiə', 'Parollar və MFA, müdafiə qatları, şifrələmə və heşləmə.')

m.lesson('parol-mfa', 'Parollar və çoxfaktorlu autentifikasiya', 7, '''
    Hesablarına giriş — sənin rəqəmsal evinin açarıdır. Hücumların böyük hissəsi elə bu açarın oğurlanması və ya təxmin edilməsi ilə başlayır.

    ## Güclü parol necə olur?

    - **Uzunluq mürəkkəblikdən vacibdir.** 8 simvollu `P@ssw0rd!` tez tapılır: həm qısadır, həm də hücumçuların lüğətlərində var. 4–5 təsadüfi sözdən ibarət uzun **parol ifadəsi** (passphrase) həm güclü, həm də yadda saxlanılandır.
    - **Unikallıq** — hər hesab üçün ayrı parol. Bir sayt sızsa, digərləri təhlükəsiz qalır (credential stuffing-ə qarşı).
    - **Şəxsi məlumatdan qaç** — ad, doğum tarixi, sevdiyin komanda asanlıqla tapılır.

    | Parol | Qiymət |
    | --- | --- |
    | `123456`, `qwerty` | ❌ Saniyələrlə tapılır |
    | `Nigar1995` | ❌ Ad və il — sosial şəbəkədən tapılır |
    | `P@ssw0rd!` | ❌ Simvollar var, amma məşhur nümunədir |
    | `bənövşəyi-kuryer-dəniz-qatar-74` | ✅ Uzun, təsadüfi, yadda qalan |

    ## Parol meneceri 🔑

    Onlarla unikal uzun parolu yadda saxlamaq mümkün deyil — və lazım da deyil. **Parol meneceri** (Bitwarden, 1Password, KeePass və s.) bütün parolları şifrələnmiş seyfdə saxlayır, güclü parollar yaradır və avtomatik doldurur. Sən yalnız **bir** güclü master parolu yadda saxlayırsan.

    ## Çoxfaktorlu autentifikasiya (MFA)

    Parol oğurlansa belə, hesabı qorumağın ən təsirli yolu — **MFA**: kimliyini iki və ya daha çox **fərqli növ** faktorla təsdiqləmək.

    | Faktor | Nədir | Nümunələr |
    | --- | --- | --- |
    | **Bildiyin bir şey** | Yaddaşındakı məlumat | Parol, PIN, gizli sualın cavabı |
    | **Sahib olduğun bir şey** | Fiziki əşya və ya cihaz | Telefondakı autentifikator tətbiqi, SMS kodu, fiziki təhlükəsizlik açarı, bank kartı |
    | **Olduğun bir şey** | Biometrik göstərici | Barmaq izi, üz tanıma, səs |

    > ⚠️ Parol + PIN **MFA deyil** — hər ikisi «bildiyin bir şey»dir. Faktorlar fərqli növdən olmalıdır.

    **Hansı ikinci faktor daha güclüdür?** SMS kodu heç olmamasından çox yaxşıdır, amma SIM kartın saxta dəyişdirilməsi (SIM swap) və fişinqlə ələ keçirilə bilər. **Autentifikator tətbiqləri** daha güclüdür, **fiziki təhlükəsizlik açarları** və **passkey**-lər isə fişinqə qarşı ən dayanıqlı seçimdir.

    ## Passkey — parolsuz gələcək

    **Passkey** — parol əvəzinə cihazında saxlanan kriptoqrafik açardır. Barmaq izi və ya üz ilə təsdiqləyirsən, açar heç vaxt cihazdan çıxmır və yalnız həqiqi sayt üçün işləyir — saxta fişinq saytı ondan istifadə edə bilməz.

    ## Qısa xülasə

    - Güclü parol uzun və unikal olur; parol ifadəsi yaxşı seçimdir.
    - Parol meneceri unikal parolları idarə etməyi asanlaşdırır.
    - MFA fərqli növ faktorları birləşdirir: bildiyin, sahib olduğun, olduğun bir şey.
''')

m.quiz('faktorlari-ayir', 'Məşq: Faktorları ayır', [
    classify(
        'Hər autentifikasiya vasitəsini düzgün faktor növünə yerləşdir.',
        [
            ('Bildiyin bir şey', ['Parol', 'PIN kod', 'Gizli sualın cavabı']),
            ('Sahib olduğun bir şey', [
                'Telefondakı autentifikator tətbiqi',
                'Fiziki təhlükəsizlik açarı (USB)',
                'Bank kartı',
            ]),
            ('Olduğun bir şey (biometrik)', ['Barmaq izi', 'Üz tanıma']),
        ],
        'Yaddaşdakı məlumat — bildiyin; cihaz və əşya — sahib olduğun; bədən göstəriciləri — olduğun bir şey. Güclü MFA fərqli növləri birləşdirir.',
    ),
    single(
        'Hansı parol **ən güclüdür**?',
        ['P@ssw0rd!', 'Nigar1995', 'bənövşəyi-kuryer-dəniz-qatar-74', 'qwerty123456'],
        3,
        'Uzun, təsadüfi sözlərdən ibarət parol ifadəsi həm brute force, həm də lüğət hücumlarına qarşı ən dayanıqlıdır.',
    ),
    single(
        'Rauf eyni parolu 6 fərqli saytda istifadə edir. **Ən böyük risk** nədir?',
        [
            'Parolu unutmaq',
            'Bir saytdan parol sızarsa, qalan hesablar da credential stuffing ilə ələ keçirilə bilər',
            'Saytların yavaş işləməsi',
            'Heç bir risk yoxdur, əgər parol uzundursa',
        ],
        2,
        'Parol nə qədər güclü olsa da, bir sayt sızanda hücumçular həmin cütü digər saytlarda avtomatik sınayır. Hər hesaba unikal parol lazımdır.',
    ),
    single(
        'Hansı birləşmə **həqiqi MFA**-dır?',
        [
            'Parol + PIN kod',
            'Parol + gizli sualın cavabı',
            'Parol + telefondakı autentifikator tətbiqinin kodu',
            'İki fərqli parol',
        ],
        3,
        'MFA fərqli növ faktorlar tələb edir: parol (bildiyin) + autentifikator tətbiqi (sahib olduğun). Parol və PIN eyni növdəndir.',
    ),
])

m.lesson('mudafie-qatlari', 'Müdafiə qatları (defense in depth)', 7, '''
    Heç bir müdafiə vasitəsi 100% etibarlı deyil. Buna görə təhlükəsizlik **qatlarla** qurulur: bir qat yarılsa, növbəti qat hücumu dayandırır. Bu yanaşma **defense in depth** (dərin müdafiə) adlanır.

    ## Qala bənzətməsi 🏰

    Orta əsr qalasını düşün: xəndək, hündür divarlar, qapıda keşikçilər, içəridə mühafizəçilər, xəzinə isə kilidli otaqda. Düşmən xəndəkdən keçsə, divar; divarı aşsa, keşikçilər onu dayandırır.

    ## Nəzarət tədbirlərinin üç növü

    **Texniki tədbirlər:**

    - **Firewall** — şəbəkəyə daxil olan və çıxan trafiki qaydalara görə süzür.
    - **IDS/IPS** — şübhəli şəbəkə fəaliyyətini aşkarlayan və bloklayan sistemlər.
    - **Antivirus / EDR** — cihazlarda zərərli proqramları və şübhəli davranışı aşkarlayır.
    - **Yeniləmələr** (patching) — məlum zəiflikləri bağlayır. Ən sadə, amma ən təsirli tədbirlərdən biridir.
    - **Şifrələmə** — oğurlansa belə datanı oxunmaz edir.
    - **Jurnallar və monitorinq (SIEM)** — bütün sistemlərin qeydlərini bir yerdə toplayıb anomaliyaları göstərir.

    **İnzibati tədbirlər (qaydalar və insanlar):**

    - təhlükəsizlik siyasətləri və parol qaydaları;
    - işçilərin fişinq və təhlükəsizlik təlimləri;
    - giriş hüquqlarının mütəmadi yoxlanması;
    - insidentə cavab planı.

    **Fiziki tədbirlər:**

    - server otağına kartla giriş, kilidlər;
    - videomüşahidə kameraları, mühafizəçilər;
    - yanğın söndürmə və fasiləsiz enerji təchizatı.

    ## Əsas prinsiplər

    - **Ən az imtiyaz** (least privilege) — hər kəs yalnız işi üçün lazım olan minimum hüquqa sahib olmalıdır. Marketinq təcrübəçisinə ödəniş bazasına giriş lazım deyil.
    - **Şəbəkənin seqmentləşdirilməsi** — şəbəkəni hissələrə bölmək: ofis kompüterləri ödəniş serverləri ilə eyni şəbəkədə olmamalıdır. Bir hissə yoluxsa, hücum yayılmır.
    - **Zero trust** — «heç vaxt etibar etmə, həmişə yoxla»: şəbəkənin içində olmaq avtomatik etibar demək deyil, hər giriş yoxlanılır.

    ## Ehtiyat nüsxə: 3-2-1 qaydası 💾

    - **3** nüsxə data (orijinal + 2 ehtiyat),
    - **2** fərqli daşıyıcıda (məsələn, disk və bulud),
    - **1** nüsxə başqa yerdə (offsite) — ideal halda şəbəkədən ayrılmış, ransomware-in çata bilmədiyi yerdə.

    Və ən vacibi: **bərpanı mütəmadi yoxla**. Yoxlanılmamış ehtiyat nüsxə — ümiddir, plan deyil.

    ## Qısa xülasə

    - Defense in depth: bir-birini tamamlayan bir neçə müdafiə qatı.
    - Tədbirlər üç növdür: texniki, inzibati, fiziki.
    - Əsas prinsiplər: ən az imtiyaz, seqmentləşdirmə, zero trust, 3-2-1 ehtiyat nüsxə.
''')

m.quiz('hansi-qat', 'Məşq: Hansı qat?', [
    classify(
        'NarPay-in təhlükəsizlik tədbirlərini növlərinə görə ayır.',
        [
            ('Texniki', ['Firewall', 'Antivirus / EDR', 'Disk şifrələməsi']),
            ('İnzibati (qayda və təlim)', [
                'İşçilər üçün fişinq təlimi',
                'Parol siyasəti sənədi',
                'Giriş hüquqlarının rüblük yoxlanması',
            ]),
            ('Fiziki', ['Server otağına kartla giriş', 'Ofisdə videomüşahidə kameraları']),
        ],
        'Proqram və avadanlıq vasitələri — texniki; qaydalar, təlimlər və yoxlamalar — inzibati; binaya və otaqlara girişin qorunması — fiziki tədbirlərdir.',
    ),
    single(
        '**3-2-1** ehtiyat nüsxə qaydası nədir?',
        [
            '3 gündə bir, 2 saat ərzində, 1 diskə nüsxə çıxarmaq',
            '3 nüsxə, 2 fərqli daşıyıcıda, 1-i başqa yerdə (offsite)',
            '3 server, 2 firewall, 1 antivirus',
            '3 işçi, 2 parol, 1 açar',
        ],
        2,
        '3 nüsxə, 2 fərqli daşıyıcı, 1 nüsxə başqa yerdə — bir hadisə (yanğın, ransomware) bütün nüsxələri məhv edə bilməsin.',
    ),
    single(
        'Yeni marketinq təcrübəçisi yalnız kampaniya hesabatlarına baxmalıdır. Ona hansı hüquq verilməlidir?',
        [
            'Admin hüquqları — sonra lazım ola bilər',
            'Yalnız marketinq hesabatlarını oxumaq hüququ',
            'Bütün bazalara oxuma hüququ',
            'Heç bir hüquq — təcrübəçilər sistemə girməməlidir',
        ],
        2,
        'Ən az imtiyaz prinsipi: hər kəs yalnız işi üçün lazım olan minimum hüquqa sahib olur. Hesab ələ keçirilsə, zərər də minimal olar.',
    ),
])

m.lesson('sifreleme', 'Şifrələmə və heşləmə', 8, '''
    Data oğurlansa belə oxunmaz qalırsa, hücumçunun əlində dəyərsiz simvollar yığını olur. Bunu iki fərqli texnologiya təmin edir: **şifrələmə** və **heşləmə**.

    ## Şifrələmə (encryption)

    **Şifrələmə** — oxunaqlı datanı (**plaintext**) açar vasitəsilə oxunmaz formaya (**ciphertext**) çevirmək. Düzgün açarı olan onu geri aça (deşifrə edə) bilər.

    ```text
    "Köçürmə: 250 ₼"  ──(açar)──►  "x9#Lq2!vR7pZ"  ──(açar)──►  "Köçürmə: 250 ₼"
    ```

    ### Simmetrik şifrələmə

    Şifrələmək və açmaq üçün **eyni açar** istifadə olunur. Ən geniş yayılmış alqoritm — **AES**.

    - ✅ Çox sürətlidir, böyük datalar üçün idealdır.
    - ❌ Problem: açarı qarşı tərəfə necə təhlükəsiz çatdırmalı?

    ### Asimmetrik şifrələmə

    İki açar: **açıq açar** (public key) hamıya verilir, **gizli açar** (private key) yalnız sahibində qalır. Açıq açarla şifrələnən mesajı yalnız uyğun gizli açar aça bilər. Alqoritmlər: **RSA**, **ECC**.

    > 📬 **Bənzətmə:** açıq açar — poçt qutusunun yarığıdır: hər kəs içəri məktub ata bilər. Gizli açar isə qutunun açarıdır — məktubları yalnız sahibi götürə bilər.

    Leylaya gizli mesaj göndərmək üçün onu **Leylanın açıq açarı** ilə şifrələyirsən — yalnız Leyla öz gizli açarı ilə aça bilər.

    ### HTTPS — ikisi birlikdə

    Brauzerdə 🔒 işarəsi gördüyün zaman **TLS** protokolu işləyir: əvvəlcə asimmetrik şifrələmə ilə təhlükəsiz şəkildə müvəqqəti açar razılaşdırılır, sonra sürətli simmetrik şifrələmə ilə data ötürülür.

    ### Hərəkətdə və saxlamada

    - **Ötürülmə zamanı** (in transit) — şəbəkədə hərəkət edən data: HTTPS, VPN, mesajlaşma tətbiqlərinin uçdan-uca şifrələməsi.
    - **Saxlama zamanı** (at rest) — diskdəki data: noutbukun disk şifrələməsi, bazanın şifrələnməsi. Noutbuk oğurlansa, data oxunmaz qalır.

    ## Heşləmə (hashing)

    **Heş funksiyası** istənilən uzunluqda datadan sabit uzunluqlu «barmaq izi» yaradır. Məsələn, **SHA-256**.

    - **Birtərəflidir** — heşdən orijinal datanı geri almaq mümkün deyil. Açar yoxdur.
    - Eyni giriş həmişə **eyni heşi** verir.
    - Girişdə bir simvol dəyişsə, heş **tamamilə** dəyişir.

    ### Harada istifadə olunur?

    - **Parolların saxlanması** — sayt parolunu özünü yox, heşini saxlayır. Daxil olanda yazdığın parolun heşi hesablanıb müqayisə edilir. Baza sızsa belə, parollar açıq görünmür. Bunun üçün hər parola təsadüfi **duz** (salt) əlavə edən xüsusi yavaş alqoritmlər (bcrypt, Argon2) istifadə olunur.
    - **Bütövlüyün yoxlanması** — yüklədiyin faylın heşini rəsmi saytdakı heşlə müqayisə edərək faylın dəyişdirilmədiyinə əmin olursan.

    ## Şifrələmə və heşləmə

    | | Şifrələmə | Heşləmə |
    | --- | --- | --- |
    | **Geri açmaq** | Mümkündür (açarla) | Mümkün deyil |
    | **Açar** | Var | Yoxdur |
    | **Məqsəd** | Məxfilik | Bütövlük, parolların saxlanması |
    | **Nümunə** | AES, RSA | SHA-256, bcrypt |

    ## Qısa xülasə

    - Şifrələmə datanı açarla oxunmaz edir və geri açılır; simmetrik — bir açar, asimmetrik — açıq və gizli açar.
    - HTTPS hər iki növü birləşdirir; data həm ötürülmədə, həm saxlamada şifrələnməlidir.
    - Heşləmə birtərəflidir: parolların saxlanması və bütövlüyün yoxlanması üçün.
''')

m.quiz('sifreleme-hes', 'Məşq: Şifrələmə, yoxsa heş?', [
    classify(
        'Hər vəziyyətdə şifrələmə, yoxsa heşləmə istifadə olunur?',
        [
            ('Şifrələmə (geri açılır)', [
                'Sayt ilə brauzer arasında HTTPS əlaqəsi',
                'Noutbukun diskini oğurluğa qarşı qorumaq',
                'Mesajlaşma tətbiqində uçdan-uca qorunan yazışmalar',
                'AES',
            ]),
            ('Heşləmə (birtərəfli)', [
                'Parolların bazada saxlanması',
                'Yüklənmiş faylın dəyişdirilmədiyini yoxlamaq',
                'SHA-256',
            ]),
        ],
        'Data sonradan oxunmalıdırsa — şifrələmə; yalnız müqayisə və ya yoxlama lazımdırsa — heşləmə. AES şifrələmə, SHA-256 heş alqoritmidir.',
    ),
    single(
        'Asimmetrik şifrələmədə Leylaya yalnız onun oxuya biləcəyi mesaj göndərmək üçün mesajı **hansı açarla** şifrələyirik?',
        ['Öz gizli açarımızla', 'Leylanın açıq (public) açarı ilə', 'Leylanın gizli (private) açarı ilə', 'Açar lazım deyil'],
        2,
        'Leylanın açıq açarı ilə şifrələnən mesajı yalnız onun gizli açarı aça bilər. Gizli açar heç vaxt paylaşılmır.',
    ),
    single(
        'Sayt parolları niyə açıq mətn kimi yox, **heş** kimi saxlamalıdır?',
        [
            'Heş daha az yer tutur',
            'Baza sızsa belə, parolların özü görünməsin',
            'Heş parolu avtomatik dəyişir',
            'Heşlər istifadəçinin parolu tez xatırlamasına kömək edir',
        ],
        2,
        'Heş birtərəflidir. Sızma zamanı hücumçu parolların özünü yox, yalnız heşlərini görür — xüsusilə duz və yavaş alqoritmlər istifadə edildikdə onları açmaq çox çətindir.',
    ),
])

# ───────────────────────────── Fəsil 4 ─────────────────────────────
m = c.module('insident-pese', 'İnsidentlər və peşə', 'İnsidentə cavab, kibertəhlükəsizlik peşələri, gündəlik kibergigiyena və yekun test.')

m.lesson('insidente-cavab', 'İnsidentə cavab', 8, '''
    Ən yaxşı müdafiə belə bəzən yarılır. Fərq — şirkətin buna **hazır** olub-olmamasındadır. **İnsident** — təhlükəsizliyi pozan və ya pozmaq təhlükəsi yaradan hadisədir: ransomware, data sızması, hesabın ələ keçirilməsi.

    ## İnsidentə cavabın mərhələləri

    Klassik model (NIST) dörd mərhələdən ibarətdir:

    | # | Mərhələ | Nə edilir |
    | --- | --- | --- |
    | 1 | **Hazırlıq** | Cavab planı, komanda və rollar, alətlər, təlimlər, yoxlanılmış ehtiyat nüsxələr |
    | 2 | **Aşkarlama və təhlil** | Xəbərdarlıqların araşdırılması, insidentin təsdiqi, miqyasın və təsirin müəyyən edilməsi |
    | 3 | **Məhdudlaşdırma, aradan qaldırma və bərpa** | Yayılmanı dayandırmaq, zərərli proqramı və giriş yollarını təmizləmək, sistemləri bərpa etmək |
    | 4 | **İnsidentdən sonrakı fəaliyyət** | «Nə öyrəndik?» görüşü, hesabat, planın və tədbirlərin yenilənməsi |

    ## NarPay-də ransomware gecəsi 🌙

    **Hazırlıq (aylar əvvəl):** NarPay-in insident planı var, ehtiyat nüsxələr 3-2-1 qaydası ilə saxlanılır və hər ay bərpa sınağı keçirilir.

    **03:12 — Aşkarlama.** SIEM xəbərdarlıq verir: mühasibat serverində dəqiqədə minlərlə fayl dəyişdirilir. Növbətçi analitik Rauf araşdırır: fayllar şifrələnir, ekranda fidyə tələbi var. İnsident təsdiqlənir, komanda oyadılır.

    **03:20 — Məhdudlaşdırma.** Yoluxmuş server və həmin seqmentdəki kompüterlər **şəbəkədən ayrılır**, ələ keçirilmiş hesabın parolu dəyişdirilir. Yayılma dayanır. Sübutlar (jurnallar, yaddaş görüntüsü) silinmədən saxlanılır.

    **Aradan qaldırma və bərpa.** Araşdırma göstərir ki, giriş bir işçinin fişinq məktubundakı makroslu fayldan başlayıb. Zərərli proqram təmizlənir, zəiflik bağlanır, server **ehtiyat nüsxədən** bərpa edilir. Fidyə ödənilmir. 11:00-da mühasibat yenidən işləyir.

    **İnsidentdən sonra.** Bir həftə sonra «Nə öyrəndik?» görüşü: e-poçtda makroslu faylların bloklanması, mühasibat şöbəsi üçün əlavə fişinq təlimi, xəbərdarlıq qaydalarının yaxşılaşdırılması. Hesabat rəhbərliyə təqdim olunur, qanunun tələb etdiyi bildirişlər edilir.

    ## Qızıl qaydalar

    - **Panika etmə, plana əməl et.** Plan böhran anında düşünməyə vaxt qazandırır.
    - **Əvvəlcə məhdudlaşdır.** Yoluxmuş cihazı şəbəkədən ayır — amma sübutları məhv etmə (cihazı dərhal formatlama).
    - **Sənədləşdir.** Nə vaxt, nə görüldü, kim nə etdi.
    - **Ünsiyyət.** Rəhbərlik, hüquq şöbəsi, lazım olduqda müştərilər və tənzimləyicilər vaxtında məlumatlandırılmalıdır.
    - **Hər insident — dərsdir.** Eyni səhv iki dəfə təkrarlanmamalıdır.

    ## Qısa xülasə

    - Mərhələlər: hazırlıq → aşkarlama və təhlil → məhdudlaşdırma, aradan qaldırma, bərpa → insidentdən sonrakı fəaliyyət.
    - Hazırlıq insident baş verməmişdən çox əvvəl başlayır.
    - Əvvəlcə yayılmanı dayandır, sübutları qoru, sonra təmizlə və bərpa et, sonda dərs çıxar.
''')

m.quiz('merheleni-tap', 'Məşq: Mərhələni tap', [
    classify(
        'Hər fəaliyyəti insidentə cavabın düzgün mərhələsinə yerləşdir.',
        [
            ('Hazırlıq', [
                'İnsidentə cavab planı yazmaq və komandanı təyin etmək',
                'Ehtiyat nüsxələrin bərpasını əvvəlcədən sınaqdan keçirmək',
            ]),
            ('Aşkarlama və təhlil', [
                'Gecə 03:00-da şübhəli girişlər barədə xəbərdarlığı araşdırmaq',
                'Hücumun hansı serverlərə yayıldığını müəyyən etmək',
            ]),
            ('Məhdudlaşdırma, aradan qaldırma, bərpa', [
                'Yoluxmuş kompüteri şəbəkədən ayırmaq',
                'Zərərli proqramı silib sistemi ehtiyat nüsxədən bərpa etmək',
            ]),
            ('İnsidentdən sonrakı fəaliyyət', [
                "'Nə öyrəndik?' görüşü keçirib planı yeniləmək",
                'Yekun insident hesabatını rəhbərliyə təqdim etmək',
            ]),
        ],
        'Plan və sınaqlar — hazırlıq; xəbərdarlıqların araşdırılması — aşkarlama; ayırmaq, təmizləmək, bərpa — üçüncü mərhələ; dərslər və hesabat — insidentdən sonra.',
    ),
    single(
        'Ransomware aşkarlanan kimi **ilk** görülməli iş hansıdır?',
        [
            'Fidyəni dərhal ödəmək',
            'Yoluxmuş cihazı şəbəkədən ayırmaq ki, yayılmasın',
            'Kompüteri dərhal formatlamaq',
            'Heç kimə deməyib özün həll etməyə çalışmaq',
        ],
        2,
        'Əvvəlcə məhdudlaşdırma: yayılmanı dayandırmaq. Formatlama sübutları məhv edir, fidyə ödəmək isə tövsiyə olunmur.',
    ),
])

m.lesson('pese', 'Kibertəhlükəsizlik peşələri', 7, '''
    Kibertəhlükəsizlik dünyada ən sürətlə böyüyən sahələrdən biridir və ixtisaslı mütəxəssislərə ehtiyac təklifdən çoxdur. Sahə genişdir — hər kəs öz marağına uyğun istiqamət tapa bilər.

    ## Komandalar: mavi, qırmızı, bənövşəyi

    - 🔵 **Mavi komanda** (blue team) — müdafiəçilər: izləyir, aşkarlayır, cavab verir.
    - 🔴 **Qırmızı komanda** (red team) — icazə ilə hücumçu rolunu oynayan etik hakerlər: zəiflikləri real hücumçulardan əvvəl tapırlar.
    - 🟣 **Bənövşəyi komanda** (purple team) — hər ikisinin əməkdaşlığı: qırmızının tapdıqları dərhal mavinin müdafiəsini gücləndirir.

    ## Əsas peşələr

    | Peşə | Nə edir |
    | --- | --- |
    | **SOC analitiki** | Xəbərdarlıqları izləyir və araşdırır (L1 → L2 → L3); bir çoxları sahəyə buradan başlayır |
    | **İnsidentə cavab mütəxəssisi** | Hücum zamanı və sonra məhdudlaşdırma, təmizləmə, bərpa |
    | **Penetrasiya testçisi** (pentester) | İcazə ilə sistemləri sındırmağa çalışıb zəiflikləri hesabat edir |
    | **Təhlükəsizlik mühəndisi** | Firewall, EDR, SIEM kimi müdafiə sistemlərini qurur |
    | **Təhdid ovçusu** (threat hunter) | Hələ xəbərdarlıq verməmiş gizli hücumçuları axtarır |
    | **Rəqəmsal kriminalist** (forensics) | Sübutları toplayır, hücumun necə baş verdiyini bərpa edir |
    | **GRC mütəxəssisi** | İdarəetmə, risk və uyğunluq: siyasətlər, auditlər, standartlar (ISO 27001, PCI DSS) |
    | **AppSec / DevSecOps** | Proqram təminatının təhlükəsiz yazılmasını təmin edir |
    | **Bulud təhlükəsizliyi mütəxəssisi** | AWS, Azure, Google Cloud mühitlərinin qorunması |

    ## Hansı bacarıqlar lazımdır?

    1. **Şəbəkələr** — TCP/IP, DNS, HTTP necə işləyir.
    2. **Əməliyyat sistemləri** — Linux və Windows; komanda sətri.
    3. **Skript yazmaq** — Python, Bash: təkrarlanan işləri avtomatlaşdırmaq.
    4. **Təhlükəsizlik əsasları** — bu kursda gördüklərimiz və onların dərinləşdirilməsi.
    5. **Şəxsi bacarıqlar** — maraq, analitik düşüncə, stress altında sakitlik, aydın hesabat yazmaq.

    **Sertifikatlar** (başlanğıcdan irəliyə): CompTIA Security+ → CEH, CySA+ → OSCP (praktik pentest) → CISSP (təcrübəli mütəxəssislər üçün).

    ## Necə məşq etməli? 🧩

    - **CTF yarışları** (Capture The Flag) — qanuni tapşırıqlarda «bayraq» tapmaq; DaCy-də də CTF tapşırıqları var.
    - **Ev laboratoriyası** — öz kompüterində virtual maşınlar qurub hücum və müdafiəni sınamaq.
    - **Təlim platformaları** — qanuni, xüsusi hazırlanmış zəif sistemlər.

    ## Etika və qanun ⚖️

    Etik hakeri cinayətkardan ayıran əsas şey — **yazılı icazədir**. İcazəsiz sistemi yoxlamaq, hətta «sadəcə maraq üçün» olsa belə, qanunsuzdur: Azərbaycan da daxil olmaqla əksər ölkələrin cinayət qanunvericiliyində kompüter sistemlərinə icazəsiz giriş üçün cəza nəzərdə tutulub. Həmişə yalnız öz sistemlərində, laboratoriyada və ya icazə verilmiş çərçivədə məşq et.

    ## Qısa xülasə

    - Mavi komanda müdafiə edir, qırmızı komanda icazə ilə hücum edir, bənövşəyi — əməkdaşlıq.
    - Bir çox mütəxəssis SOC analitiki kimi başlayır.
    - Əsaslar: şəbəkələr, Linux, skriptlər; məşq — CTF və laboratoriyalar; qızıl qayda — yalnız icazə ilə.
''')

m.lesson('kibergigiyena', 'Gündəlik kibergigiyena', 5, '''
    Diş fırçalamaq kimi, kibertəhlükəsizliyin də gündəlik vərdişləri var. Hücumların böyük hissəsi mürəkkəb texnikalarla yox, sadə səhvlərdən istifadə etməklə uğur qazanır. Rauf işçilərə bu **10 qaydanı** öyrədir:

    ## Raufun 10 qaydası ✅

    1. **Yenilə.** Əməliyyat sistemini, brauzeri və tətbiqləri vaxtında yenilə — avtomatik yeniləmələri aç.
    2. **Unikal parol + parol meneceri.** Hər hesab üçün fərqli, uzun parol.
    3. **MFA-nı aç** — xüsusilə e-poçt, bank və sosial şəbəkələrdə.
    4. **Klikləmədən əvvəl düşün.** Təcili, qorxudan və ya «çox yaxşı» təkliflərə şübhə ilə yanaş; linki rəsmi kanalla yoxla.
    5. **Proqramları yalnız rəsmi mənbələrdən** yüklə: App Store, Google Play, istehsalçının saytı.
    6. **Ehtiyat nüsxə çıxar.** Vacib faylların nüsxəsi ən azı iki yerdə olsun.
    7. **Açıq Wi-Fi-da ehtiyatlı ol.** Bank əməliyyatları üçün mobil internet və ya VPN istifadə et.
    8. **Ekranı kilidlə.** Kompüterdən uzaqlaşanda — `Win + L` və ya `Ctrl + Cmd + Q`.
    9. **Az paylaş.** Sosial şəbəkədə doğum tarixi, ev ünvanı, bilet şəkilləri — hücumçular üçün hazır məlumatdır.
    10. **Şübhəli hadisəni bildir.** Səhv kliklədinsə, utanma — dərhal bildir. Sürət zərəri azaldır.

    ## Tapılmış USB və digər tələlər

    - Tapılmış **USB fləşkanı** heç vaxt kompüterə taxma — klassik «yem» hücumudur.
    - **Parolu stikerə yazıb** monitora yapışdırma.
    - **Tətbiq icazələrinə** bax: fənər tətbiqinə kontaktlarına giriş lazım deyil.
    - **QR kodlara** da diqqət et: saxta QR kod səni fişinq saytına apara bilər.

    > 💬 «Təhlükəsizlik məhsul deyil, prosesdir.» Bir dəfə quraşdırılan proqram yox, hər gün təkrarlanan vərdişlər səni qoruyur.

    ## Qısa xülasə

    - Yeniləmələr, unikal parollar, MFA və ehtiyat nüsxələr — təməl vərdişlərdir.
    - Klikləmədən əvvəl düşün, rəsmi mənbələrdən istifadə et, az paylaş.
    - Şübhəli hadisəni dərhal bildir.
''')

m.quiz('kibergigiyena-mesq', 'Məşq: Kibergigiyena', [
    classify(
        'Hansı vərdişlər təhlükəsizdir, hansılar risklidir?',
        [
            ('Təhlükəsiz vərdiş ✅', [
                'Əməliyyat sistemini və tətbiqləri vaxtında yeniləmək',
                'Hər hesab üçün fərqli parol və parol meneceri',
                'Vacib hesablarda 2FA aktivləşdirmək',
                'Vacib faylların ehtiyat nüsxəsini çıxarmaq',
            ]),
            ('Riskli vərdiş 🚩', [
                'Kafedəki açıq Wi-Fi-da VPN-siz bank əməliyyatı etmək',
                'Tapılan USB fləşkanı iş kompüterinə taxmaq',
                'Tətbiqləri rəsmi mağazadan kənar saytlardan yükləmək',
                'Parolu stikerə yazıb monitora yapışdırmaq',
            ]),
        ],
        'Yeniləmələr, unikal parollar, MFA və ehtiyat nüsxələr müdafiəni gücləndirir. Açıq Wi-Fi, tapılmış USB, qeyri-rəsmi tətbiqlər və açıq yazılmış parollar isə hücumçulara qapı açır.',
    ),
    single(
        'Mühasib Nərmin səhvən fişinq linkinə klikləyib parolunu daxil etdiyini başa düşür. Nə etməlidir?',
        [
            'Heç kimə deməmək — bəlkə heç nə olmayacaq',
            'Dərhal təhlükəsizlik komandasına bildirmək və parolunu dəyişmək',
            'Kompüteri söndürüb evə getmək',
            'Bir həftə gözləyib nəticəyə baxmaq',
        ],
        2,
        'Sürətli reaksiya zərəri kəskin azaldır: komanda hesabı bloklaya, girişləri yoxlaya və hücumun yayılmasının qarşısını ala bilər.',
    ),
])

m.quiz('yekun-test', 'Yekun test: What is Cyber Security?', [
    classify(
        'Hər insidenti pozduğu CIA prinsipinə yerləşdir.',
        [
            ('Məxfilik', ['Müştəri bazası hakerlər forumunda satışa çıxarıldı']),
            ('Bütövlük', ['Hücumçu qiymət cədvəlində məhsulların qiymətini dəyişdi']),
            ('Əlçatanlıq', ['DDoS səbəbindən ödəniş xidməti 2 saat işləmədi']),
        ],
        'Sızma — məxfilik; icazəsiz dəyişiklik — bütövlük; xidmətin dayanması — əlçatanlıq.',
    ),
    single(
        '«Yenilənməmiş server proqramı» — bu nədir?',
        ['Təhdid', 'Zəiflik', 'Nəzarət tədbiri', 'Aktiv'],
        2,
        'Hücumçunun istifadə edə biləcəyi boşluq zəiflikdir. Hücumçunun özü isə təhdiddir.',
    ),
    single(
        'Faydalı proqram kimi görünüb arxa planda hücumçuya giriş açan zərərli proqram necə adlanır?',
        ['Qurd', 'Troyan', 'Adware', 'Ransomware'],
        2,
        'Troyan özünü faydalı proqram kimi göstərir, amma gizli zərərli funksiyası var.',
    ),
    multiple(
        'Fişinq məktubunun **qırmızı bayraqları** hansılardır? (Bir neçə cavab)',
        [
            'Qəribə göndərən domeni: narpay-secure-login.com',
            "'24 saat ərzində bloklanacaq' kimi təcililik",
            'SMS kodu və kart məlumatlarının istənməsi',
            'Bankın rəsmi tətbiqindəki bildiriş',
        ],
        [1, 2, 3],
        'Qəribə domen, süni təcililik və həssas məlumat tələbi fişinqin əsas əlamətləridir. Rəsmi tətbiqə özün daxil olub baxdığın bildiriş isə etibarlı kanaldır.',
    ),
    single(
        'Başqa saytdan sızmış e-poçt və parol cütlərini NarPay-də avtomatik sınamaq hansı hücumdur?',
        ['SQL injection', 'Credential stuffing', 'Man-in-the-Middle', 'DDoS'],
        2,
        'Credential stuffing eyni parolu bir neçə yerdə istifadə edənləri hədəf alır. Qoruma: unikal parollar və MFA.',
    ),
    single(
        'Hansı birləşmə **çoxfaktorlu autentifikasiyadır**?',
        ['Parol + PIN', 'Parol + barmaq izi', 'İki fərqli parol', 'Parol + gizli sualın cavabı'],
        2,
        'Parol (bildiyin) və barmaq izi (olduğun) fərqli növ faktorlardır.',
    ),
    single(
        'Parolların bazada saxlanması üçün hansı üsul düzgündür?',
        [
            'Açıq mətn kimi',
            'Duzla (salt) və yavaş heş alqoritmi (bcrypt, Argon2) ilə heşləmək',
            'Yalnız Base64 ilə kodlaşdırmaq',
            'Hamı üçün eyni açarla şifrələyib açarı eyni serverdə saxlamaq',
        ],
        2,
        'Parollar geri açılmamalıdır — duzlu, yavaş heş alqoritmləri bunun üçün nəzərdə tutulub. Base64 şifrələmə deyil, sadəcə kodlaşdırmadır.',
    ),
    single(
        'İnsidentə cavabda «Nə öyrəndik?» görüşü hansı mərhələyə aiddir?',
        ['Hazırlıq', 'Aşkarlama və təhlil', 'Məhdudlaşdırma və bərpa', 'İnsidentdən sonrakı fəaliyyət'],
        4,
        'Dərslərin çıxarılması və planın yenilənməsi insidentdən sonrakı fəaliyyətdir — və növbəti hazırlığın başlanğıcıdır.',
    ),
], xp=50, pass_score=70)

print(c.root, c.modules, 'modules', c.steps, 'steps')
