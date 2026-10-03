---
title: Data strukturları
xp: 10
estimated_minutes: 6
---

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
