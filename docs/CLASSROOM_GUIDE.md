# Sinif otağı — istifadə qaydası

Bu versiya `claude/clever-dirac-f7c6aa` üzərində hazırlanıb. Camp, akademiya, kurslar, qrup kodları, təhvil və qiymət tarixçəsi saxlanılır. Yeni cədvəllər əlavə olunur; köhnə cədvəl və məzmun silinmir.

## Admin

1. **Admin → Akademiya** bölməsində proqram və qrup yaradın.
2. Müəllim hesabı yaradıb qrupa aparıcı müəllim təyin edin. Köməkçi müəllim əvvəlki qayda ilə təyin edilir.
3. Qrupun qoşulma kodunu və ya qeydiyyat linkini tələbələrə verin.
4. Tələbələr kodla qoşulduqdan sonra **Mənim akademiyam → Sinif otağına keç** linkini açırlar.

Qoşulma kodu, tutum, qəbul statusları, kodun yenilənməsi və deaktiv edilməsi əvvəlki qaydada işləyir.

## Müəllim

**Müəllim paneli** üzərində gündəlik iş masası yaxın 7 günün dərslərini, yoxlama növbəsini və cavab gözləyən sualları göstərir. Qrupun mövcud idarəetmə səhifəsində **Sinif otağına keç** linki var. Sinif otağının sağ panelindən əvvəlki qiymət cədvəlinə, davamiyyətə və tapşırıq idarəetməsinə keçmək olar.

- **Elanlar:** mətn (Markdown), link və qorunan fayl əlavələri, yuxarıda sabitləmə, şərhlərin açılıb-bağlanması. Qaralama, dərhal və ya gələcək vaxtda yayım.
- **Dərslər və materiallar:** mövzu yaradın, sıra nömrəsi verin, sonra dərs qeydi, video linki, fayllar və mövcud kurslardan məşqlər əlavə edin. Məzmun kopyalanmır; mövcud SQL/Python/nəzəriyyə/quiz addımlarına istinad edilir.
- **Fayllar:** dərs səhifəsində yüklənir. Mətn, video, link və ya məşq olmadan yalnız fayl yayımlamaq üçün əvvəl qaralama yaradın, faylı yükləyin, sonra tələbələrə açın.
- **Tapşırıqlar və qiymətlər:** əvvəlki mühərrik istifadə olunur. Son tarix, təkrar cəhd, rəy, rubrika, geri qaytarma və qiyməti açıqlama qaydaları dəyişmir.
- **Qaralamalar və tarixçə:** elan/material redaktorları istifadəçi üzrə yerli qaralama saxlayır. Serverdə mətn dəyişibsə əvvəl qaralamanı bərpa etmək və ya atmaq seçilir; bu seçimədək yadda saxlamaq bağlıdır. **Versiya tarixçəsi** əvvəlki mətni göstərir və onu yeni versiya kimi bərpa edir. Tarixçə bu versiyadan etibarən toplanır; əvvəlki redaktələri geriyə dönük yaratmır.
- **Bildirişlər:** yeni suala qrupun müəllimləri/admin, cavaba aidiyyəti olan tələbə və müəllimlər tətbiqdaxili bildiriş alır. Şəxsi sualın məzmunu digər tələbələrə açılmır.
- **Sual-cavab:** qrupa açıq və yalnız müəllimə görünən suallar. Tapşırıq səhifəsində verilən sual həmin tapşırığa bağlanır. Müəllim və sualın sahibi sualı cavablandırılmış kimi işarələyə və yenidən aça bilər.

**Arxivlə** məzmunu tələbələrdən gizlədir. **Geri qaytar** onu bərpa edir. Faylı və ya şərhi gizlətmək fiziki faylı və tarixçəni silmir. Mövzu arxivlənəndə onun dərsləri də tələbəyə görünmür; geri qaytaranda mövcud dərc qaydaları bərpa olunur.

## İcazələr

- Qrupun aparıcı müəllimi və admin elan/material yaradır, redaktə edir və yayımlayır.
- Qrupa təyin olunmuş köməkçi müəllim materiallara və suallara baxır, cavab verir; mövcud rol siyasəti qorunur.
- Aktiv tələbə yalnız öz qrupunun yayımlanmış və vaxtı çatmış məzmununu görür. Bitirmiş tələbə əvvəlki qayda ilə oxuya bilir.
- Şəxsi sualı yalnız onun sahibi və həmin qrupun müəllimləri/admin görə bilər.
- Tələbə digər tələbələrin qiymət və təhvil fayllarını görə bilməz.
- Tamamlanmış, arxivlənmiş və ləğv olunmuş qrupun sinif otağı yalnız oxunur.
- Akademiya qeydi olan istifadəçinin həmişəlik silinməsi bloklanır. Qrup yazılışını dayandırmaq mümkündür; qiymətlər saxlanılır.

## SQL/Python və sertifikat

Python brauzerin əsas axınından ayrılmış worker-də işləyir. Dayandırma və vaxt limiti var. SQL hər dərs üçün ayrıca DuckDB worker-i istifadə edir; göndəriş aktual kodu yenidən işlədir. Kod qaralamaları istifadəçi və dərs üzrə saxlanır.

Göndəriş zamanı SQL və Python müstəqil server yoxlamasından keçir; brauzerin hash-i və ya “keçdi” bayrağı qiymət vermir. Python şəbəkəsiz, tətbiq faylları və açarları görünməyən Linux mühitində işləyir; etibarlı yoxlayıcı tələbə interpreterindən ayrıdır. Vaxt/yaddaş/növbə limitləri var. Əvvəlki brauzer təsdiqli cəhdlərin etibar səviyyəsi dəyişdirilmir; müəllim təsdiqli sertifikat və qiymət mexanizmi qorunur.

Docker tələb olunmur. Terminal/CTF məlumatları bazada qalır, SQL/Python rejimində dərs xəritəsinə daxil edilmir. Tarixi funksiyaları geri açmaq üçün backend-də `LEGACY_LABS_ENABLED=true`, frontend build-də `NEXT_PUBLIC_LEGACY_LABS=true` tələb olunur; real terminal üçün ayrıca lab infrastrukturu lazımdır.

## Yerli işə salma

Linux, Node.js 22.13+, pnpm 10, PostgreSQL, Python elmi paketləri və bubblewrap lazımdır. Tam addımlar: [DOCKERLESS_OPERATIONS.md](DOCKERLESS_OPERATIONS.md). `.env` yalnız lokal saxlanılır.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm db:deploy
corepack pnpm build
corepack pnpm run doctor
corepack pnpm pilot:start
```

`start` seed, reset və Docker işə salmır. Mövcud məlumat bazasına qoşulur. İlkin adminin yaradılması ayrıca `corepack pnpm db:seed` ilə edilir; real bazada əvvəl seed-in təsirini yoxlayın. İnkişaf üçün əvvəlki `corepack pnpm dev` əmri saxlanılıb.

Web: `http://localhost:3000`, API: `http://localhost:4000`. Test bazası ayrıdır (`DATABASE_URL_TEST`).

## İnternetə açmazdan əvvəl

Bu sessiyanın məqsədi yerli işlək versiyadır; hosting və domen hələ seçilməyib. Canlı istifadə üçün PostgreSQL və fayllara davamlı disk, HTTPS, məxfi açarlar, yalnız etibarlı proksi ünvanları (`TRUST_PROXY`), ehtiyat nüsxə və ayrı bazada bərpa yoxlanmalıdır. API-ni ayrıca ictimai xidmət kimi açmaq tələb olunmur; web `/api/*` ilə ona proksi edir.

Giriş səhifəsində **Şifrəni unutmusunuz?** linki var. Yerli rejimdə məktub yalnız qorunan `.local/mail` qovluğuna yazılır; tələbənin e-poçtuna real göndəriş üçün SMTP konfiqurasiyası lazımdır. Link 30 dəqiqəlik və birdəfəlikdir; şifrə yenilənəndə əvvəlki sessiyalar ləğv olunur.

Admin istifadəçi səhifəsindən hesabı bloklaya, bloku aça və bütün cihazlardan çıxış etdirə bilər. Bu əməliyyatlar qrup, qiymət və irəliləyiş qeydlərini saxlayır. Öz şifrəsini dəyişən cihaz girişdə qalır, digər sessiyalar ləğv olunur. **Admin → Sistem vəziyyəti** monitor və backup statusunu göstərir.
