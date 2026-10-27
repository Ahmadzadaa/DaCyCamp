# SQL/Python və Academy — hazırlıq hesabatı

26 oktyabr 2026. Əsas kod `claude/clever-dirac-f7c6aa` (`ad483d2`), yerli iş budağı `codex/sql-python-pilot` üzərindədir. GitHub-a push edilməyib.

## Nəticə

Docker olmadan PostgreSQL, NestJS 11 API, Next.js və Linux Python sandbox-ı ilə işlək kurs pilotu hazırlanıb. Bu mühitdə sinif, müəllim/tələbə axını və qiymətləndirmə yoxlanıb. Domen/hosting verilmədiyi üçün internetdə yerləşdirilməyib.

| Sahə               | Hazırkı vəziyyət                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qəbul              | Adminin qrup açması, avtomatik kod, kodla qeydiyyat və mövcud hesabın qoşulması saxlanılır.                                                                 |
| Sinif              | Elanlar, mövzular, dərs materialları, qorunan fayllar, video/linklər, mövcud məşqlər, sual-cavab var.                                                       |
| Müəllim            | Yaxın dərslər, yoxlama növbəsi və cavab gözləyən suallar gündəlik iş masasında göstərilir.                                                                  |
| Məzmunun qorunması | İstifadəçiyə aid qaralamalar, köhnəlmiş qaralama üçün açıq seçim, versiya toqquşması və yeni versiyaya bərpa var.                                           |
| Qiymətləndirmə     | SQL/Python serverdə müstəqil yoxlanır; brauzerdən saxta hash və ya keçid bayrağı ilə XP verilmir.                                                           |
| Mövcud qiymətlər   | Köhnə cəhdlərin etibar səviyyəsi dəyişdirilmir; müəllim rəyi, qiymət açıqlama və sertifikat təsdiqi saxlanılır.                                             |
| Sessiya            | Şifrə dəyişikliyi, admin reset/blok və bütün cihazlardan çıxış köhnə tokenləri ləğv edir. Paralel refresh eyni davam tokenini alır.                         |
| Şifrə bərpası      | Birdəfəlik, 30 dəqiqəlik link, hash ilə saxlanma və əvvəlki sessiyaların ləğvi var. Yerli poçt rejimi işləyir; SMTP qoşula bilir.                           |
| Bildiriş           | Sual və cavablar yalnız aidiyyəti olan şəxslərə, məxfilik qaydaları ilə çatdırılır; təkrar hadisə dublikat yaratmır.                                        |
| İşləmə             | Detached supervisor, servisin avtomatik restartı, sağlamlıq monitoru və admin sistem ekranı var. VPS açılışı üçün systemd nümunəsi hazırlanıb.              |
| Backup             | Gündəlik yerli nüsxə və manifest; rclone ilə xarici köçürmə konfiqurasiyası; ayrıca bazaya bərpa yoxlanıb.                                                  |
| İnterfeys          | Desktop açıq/tünd mövzu, qaralama/tarixçə/bərpa ekranları, icazə və xəta halları yoxlanıb. SQL/Python rejimində tanıtım mətnləri aktual imkanları göstərir. |
| Yoxlama            | 137 unit, 250 API testi, 35 seçilmiş Chromium ssenarisi və 117 Python kurs həlli keçib. İstehsal asılılıq auditində 0 tapıntı var.                          |

## Məlumatların saxlanması

Dörd əlavə miqrasiya sinif modellərini, versiya tarixçəsini və sessiya/bərpa sahələrini əlavə edir. Əvvəlki miqrasiyalar dəyişdirilməyib. İşlək bazada reset aparılmayıb. Terminal/CTF-in kodu və məlumatları saxlanılır; SQL/Python rejimində bu addımlar dərs xəritəsinə daxil edilmir.

Elan/material bərpası cari məzmunu silmək əvəzinə yeni versiya yaradır. Köhnə material ilk redaktə zamanı da tarixçəyə yazılır; bu versiyadan əvvəl saxlanmamış redaktələri tarixçə geriyə dönük yarada bilməz. Hesabın bloklanması akademik qeydləri saxlayır. Akademiya qeydi olan hesabın həmişəlik silinməsi bloklanır. İşlək və API test bazası ayrıdır.

## Xarici xidmətlər üçün qalan konfiqurasiya

- **Hosting və domen:** hələ yoxdur. Canlı serverdə davamlı disk, HTTPS, faktiki URL-lər, etibarlı proksi və secure cookie dəyərləri verilməlidir. Cari mühitin yerli PostgreSQL giriş siyasəti publik hosta köçürülməməlidir.
- **SMTP hesabı:** verilməyib. Burada məktublar yalnız qorunan `.local/mail` qovluğuna yazılır. Tələbənin həqiqi e-poçtuna bərpa linki/xəbərdarlıq göndərişi aktiv deyil.
- **Xarici backup hədəfi:** verilməyib. Yerli avtomatik nüsxə aktivdir; real serverdən kənar köçürmə üçün şəxsi rclone hədəfi qoşulmalıdır.

Python paketlərinin brauzerdə ilk yüklənməsi CDN-dən ola bilər; tam oflayn tədris üçün paket güzgüsü ayrıca qurulur. Server yoxlaması əvvəlcədən quraşdırılmış yerli paketlərlə işləyir. Daxili videokonfrans xidməti əvəzinə qorunan materiallar və video dərs linkləri istifadə edilir.

Yük sınağı bu mühitdə 20 paralel oxuma sorğusunu əhatə edir; bu nəticə minlərlə eyni vaxtlı istifadəçi üçün ölçmə deyil. Xarici təhlükəsizlik auditi aparıldığı iddia edilmir.

Tam tapıntı siyahısı: [REMEDIATION_20261026.md](REMEDIATION_20261026.md). Faktiki sübutlar: [CLASSROOM_QA.md](CLASSROOM_QA.md). İşə salma və xidmət konfiqurasiyası: [DOCKERLESS_OPERATIONS.md](DOCKERLESS_OPERATIONS.md). Müəllim təlimatı: [CLASSROOM_GUIDE.md](CLASSROOM_GUIDE.md).
