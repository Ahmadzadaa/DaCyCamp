# Python4Business — Gün 1–2: kursun quruluşu və boşluqlar

Mənbə: `Python_Day_1.pptx`, `Python_Day_2.pptx` (nəzəri slaydlar) və `Python_Day_1.docx`, `Python_Day_2.docx` (tapşırıqlar).
Paket: [`content/courses/python4business/`](../../content/courses/python4business) — `pnpm dev` zamanı avtomatik idxal olunur.

**7 fəsil · 43 addım** — 18 nəzəri, 18 praktik Python tapşırığı, 7 test (55 sual) · 915 XP · ~4 saat.

## Quruluş: slayd və tapşırıq → addım

| Fəsil                                  | Nəzəri addımlar (slaydlar)                                                                                                                                  | Praktik tapşırıqlar (docx)                     | Test                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| Gün 1 · Python-a giriş və iş mühiti    | Kurs haqqında (G1 s.2–3) · Open source və Python (s.4–6) · Jupyter və IDE-lər (s.7–10) · Funksiyalar və operatorlar (s.11–12) · OOP, skript, PEP8 (s.13–15) | İsinmə _(əlavə)_                               | 8 sual              |
| Gün 1 · Əsas məlumat tipləri           | int, float (s.17–20) · str, bool (s.21–24)                                                                                                                  | G1 #1–4 · #5, 6, 8 · #7, 9, 10 · #11–13        | 8 sual              |
| Gün 1 · Məlumat strukturları           | list, tuple (s.26–29) · dict, set (s.30–33)                                                                                                                 | G1 #14, 15, 20 · #16–19                        | 8 sual              |
| Gün 2 · Şərtlər, funksiyalar, modullar | if/elif/else (G2 s.3–4) · Funksiyalar (s.5–7) · Modullar (s.8–9)                                                                                            | G2 #2 · #1 · #4 · #3                           | 7 sual              |
| Gün 2 · Dövrlər                        | for, while (s.10–11) · break, continue, pass, if (s.12–15)                                                                                                  | G2 #5–6 · #9, 12 · #8, 14 · #7, 13 · #11 · #15 | 7 sual              |
| Gün 2 · Jupyter                        | İş direktoriyası (s.16–17) · Markdown (s.18–19) · HTML/PDF ixrac (s.20)                                                                                     | —                                              | 7 sual              |
| Gün 2 · Xətaların idarəsi              | try/except/else/finally (s.21–23)                                                                                                                           | G2 #10                                         | Yekun test, 10 sual |

Docx-dakı **35 tapşırığın hamısı** platformadadır. Mövzuca yaxın tapşırıqlar bir addımda birləşdirilib (hər addımda 1–4 bənd, soldakı siyahıda görünür). Hər addımda var: təlimat, starter kod, nümunə həll (tələbəyə göstərilmir), avtomatik testlər (səhvdə tələbəyə nəyin gözlənildiyini yazır) və 2–3 ipucu.

Hər Python addımı yoxlanılıb: nümunə həll testlərdən keçir, boş starter kod keçmir, alternativ düzgün həllər (məs. `while True` + `break`, `del` əvəzinə `pop`, rekursiv faktorial) qəbul olunur — `pnpm --filter @dacy/web check:python`.

## Slaydlarda düzəldilən səhvlər

| Yer      | Slaydda                                                  | Kursda                                                                                           |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| G1 s.12  | `^` — qüvvət                                             | Python-da qüvvət `**`; `^` bit üzrə XOR-dur (`2 ^ 3 = 1`). Xəbərdarlıq əlavə olundu              |
| G1 s.12  | `.` `[]` — `table$column`                                | `$` R sintaksisidir; Python nümunəsi ilə əvəz olundu                                             |
| G1 s.7–9 | IDE = «Integrated User Environment»                      | Integrated **Development** Environment                                                           |
| G1 s.22  | Kodda əyri dırnaqlar (`“Code"`)                          | Düz dırnaqlar (əyri dırnaq `SyntaxError` verir) + tələbə üçün xəbərdarlıq                        |
| G1 s.22  | `name = "Code"` → `name.split()` = `['Code', 'Academy']` | Səhvdir (`['Code']` olardı) — `"Code Academy".split()`                                           |
| G1 s.22  | `print(str(10))  # "10"`                                 | Ekranda dırnaqsız `10` çıxır                                                                     |
| G1 s.33  | Başlıq və metodlar «Tuple», kod isə set                  | Set metodları: `add`, `remove`, `union`, `intersection`                                          |
| G1 s.30  | Dictionary «sıralı deyil»                                | Python 3.7+ daxiletmə sırasını saxlayır; vurğu «indekslə yox, açarla müraciət» üzərinə keçirildi |
| G2 s.3   | `&` — «and», `\|` — «or»                                 | Adi Python-da `and` / `or`; `&` və `\|` pandas filtrlərində (izah əlavə olundu)                  |
| G2 s.7   | Funksiya adı `ədəd_təyin_et`                             | İşləyir, amma klaviatura və PEP8 üçün ASCII adlar: `eded_novu`                                   |
| G2 s.16  | «files kitabxanası»                                      | Bu, Google Colab-ın `google.colab.files` modulu; `os.getcwd()` / `os.chdir()` əlavə olundu       |
| G2 s.18  | Qalın mətn: `qalin`                                      | `**qalın**` (ulduzlar itmişdi)                                                                   |

## Boşluqlar — mənbədə olmayan və ya təsdiq tələb edən

1. **Yaş qrupları (G2 #4):** sərhədlər verilməyib. Qəbul etdim: 0–12 uşaq, 13–17 yeniyetmə, 18+ yetkin. Başqa sərhəd lazımdırsa, dəyişək.
2. **`input()` tapşırıqları (G2 #7, 10, 11, 13, 15):** brauzerdə klaviatura pəncərəsi yoxdur. Sərbəst kodda dəyərlər konsolun **«Giriş»** sekməsindən götürülür (hər sətir bir `input()`). Yoxlanılan tapşırıqlarda testlər sabit girişlə işləməlidir, ona görə starter kodda `input()` dəyərləri `girisler` siyahısından götürür; tələbə Jupyter-dəki kimi `input()` yazır.
3. **Modul tapşırığı (G2 #3):** brauzerdə ayrıca `.py` faylı yaratmaq üçün redaktor yoxdur. Modulun kodu sətirdən fayla yazılır (Jupyter-dəki `%%writefile` kimi) və `import hesablama` ilə daxil edilir.
4. **Şəkil-slaydlar (G1 s.8–10, G2 s.17, 19–20):** mətn yox idi. Şəkillər paketə əlavə olundu və izah mətni yazıldı. Colab kodu şəkildən mətnə köçürüldü.
5. **Tapşırıqlarda dəyişən adları və gözlənilən nəticə yox idi:** avtomatik yoxlama üçün hər bəndə dəyişən adı verildi (`tam`, `en_boyuk`, `sozler` …). G1 #5, 6, 8 eyni `numbers` adını iki fərqli siyahı üçün istifadə edirdi, ona görə ikincisi `numbers2` oldu. G1 #20-dəki siyahıya `qarisiq` adı verildi.
6. **Təkrar tapşırıq:** G2 #13 = G2 #7 + cəm. İkisi bir addımda birləşdirildi.
7. **Əlavə etdiyim məzmun** (slaydlarda yoxdur): isinmə tapşırığı, 7 test (55 sual), müqayisə cədvəlləri (strukturlar, istisna tipləri, `range`), `return` və `print` fərqi, `os.getcwd()`, `nbconvert`, `round(2.5)` bankir yuvarlaqlaşdırması.
8. **Qiymətləndirmə:** slayd 2-də «3 dərs-daxili + 4 ev tapşırığı (~70%)» və «yekun layihə (~30%, Gün 8-də)» yazılıb, amma bu tapşırıqların mətni yoxdur. Fayllar gələndə yekun layihəni və qiymətləndirilən ev tapşırıqlarını karyera yolunda layihə/imtahan kimi qura bilərəm (müəllim yoxlaması, fayl təhvili).
9. **G2 s.24 «Təcrübi tapşırıq (qiymətləndirilməyən)»:** mətni yoxdur. Onun yerinə docx tapşırıqları istifadə olundu.
10. **Data yoxdur:** Gün 1–2-də dataset yoxdur. Pandas mövzusu (ehtimal ki, Gün 3+) üçün CSV/Excel faylları lazım olacaq.
11. **Video yoxdur:** nəzəri addımlarda `video_url` sahəsi boşdur. Dərs yazıları varsa, əlavə etmək olar.
12. **Markdown/Jupyter üçün praktika:** platformada «notebook» tipli addım yoxdur, ona görə bu mövzu yalnız testlə yoxlanılır.

## Bu iş zamanı platformada edilən təkmilləşdirmələr

- **Python testləri çap olunanı görür:** `dacy.stdout`, `dacy.lines`, `dacy.code` — «ekrana yazdırın» tapşırıqları yoxlanılır.
- **`print(x, end=" ")` itmirdi → düzəldi:** sonu yeni sətirsiz çıxış konsolda görünmürdü.
- **Sonsuz dövr səhifəni dondururdu → 10 saniyəlik gözətçi:** kod dayandırılır, aydın xəta göstərilir, səhifə işləməyə davam edir.
- **Test suallarında Markdown:** `kod` və kod blokları göstərilir.
- **`content/courses/` + `pnpm content:sync`:** repo-dakı kurslar `pnpm dev` zamanı avtomatik idxal olunur.
- **CI:** hər paket idxal validasiyasından keçir, hər Python addımının həlli testdən keçir, starter kodu keçmir.

## Qalan texniki məhdudiyyətlər (tövsiyə)

- Python brauzerin əsas axınında işləyir: ağır kod 10 saniyəyə qədər səhifəni ləngidə bilər. Web Worker-ə keçirmək «Dayandır» düyməsi də verər.
- Python nəticəsi brauzerdə yoxlanılır (server `passed` bayrağına etibar edir). Ciddi imtahanlar üçün serverdə Python sandbox lazımdır.
- Test variantları hər tələbə üçün qarışdırılmır (yalnız sual sırası — `shuffle_questions`). Bu kursda variantların sırası mənbədə qarışdırılıb ki, düzgün cavab həmişə birinci olmasın.
