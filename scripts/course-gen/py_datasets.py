"""
Python kursları üçün sintetik, lakin real görünüşlü datasetlər (deterministik — seed sabitdir).

satislar.csv       — TechNar mağazalar şəbəkəsinin 2023–2024 satışları (Gün 3–8 tapşırıqlarının sütunları)
satislar_xam.csv   — eyni data, «çirkli» halda: dublikatlar, boşluqlar, 0 gəlir, səliqəsiz yazılışlar
satis_yanvar/fevral/mart.csv — concat üçün aylıq fayllar (2024 I rüb)
musteriler.csv, sifarisler_qisa.csv — merge/join üçün kiçik cədvəllər
isciler.csv        — sütun manipulyasiyası, fillna, cut nümunələri
telebeler.csv      — ballar: apply/qiymətləndirmə, rank, melt
sifarisler.csv     — Superstore tipli sifarişlər (Gün 9 və yekun layihə): OrderDate, ShipDate, Sales, Profit...
reyler.txt         — müştəri rəyləri (regex, wordcloud)
"""
import csv
import math
import os
import random
from datetime import date, timedelta

OUT = os.path.join(os.path.dirname(__file__), 'datasets')
os.makedirs(OUT, exist_ok=True)
R = random.Random(2026)

# ───────────────────────────── satislar ─────────────────────────────
REGIONS = {
    'Bakı': (0.55, ['Nizami', 'Gənclik', 'Xətai', '28 May']),
    'Gəncə': (0.15, ['Gəncə Mərkəz']),
    'Sumqayıt': (0.13, ['Sumqayıt Mərkəz']),
    'Lənkəran': (0.09, ['Lənkəran']),
    'Şəki': (0.08, ['Şəki']),
}
EMPLOYEES = {
    'Nizami': ['Aysel Məmmədova', 'Rauf Həsənov'],
    'Gənclik': ['Nigar Əliyeva', 'Murad Quliyev'],
    'Xətai': ['Leyla Hüseynova', 'Kamran İsmayılov'],
    '28 May': ['Günel Rəhimova', 'Tural Babayev'],
    'Gəncə Mərkəz': ['Səbinə Kərimova', 'Elvin Nəsirov'],
    'Sumqayıt Mərkəz': ['Fidan Abbasova', 'Orxan Vəliyev'],
    'Lənkəran': ['Aynur Səfərova'],
    'Şəki': ['Ramin Cəfərov'],
}
# (ad, kateqoriya, baza qiymət ₼, populyarlıq çəkisi, ədəd aralığı)
PRODUCTS = [
    ('iPhone 15', 'Electronics', 2399, 9, (1, 3)),
    ('iPhone 14', 'Electronics', 1899, 6, (1, 3)),
    ('Samsung Galaxy S24', 'Electronics', 2099, 7, (1, 3)),
    ('Xiaomi Redmi Note 13', 'Electronics', 549, 8, (1, 4)),
    ('MacBook Air M2', 'Electronics', 2899, 4, (1, 2)),
    ('iPad 10', 'Electronics', 1199, 4, (1, 2)),
    ('AirPods Pro 2', 'Electronics', 599, 8, (1, 4)),
    ('Apple Watch Series 9', 'Electronics', 899, 5, (1, 2)),
    ('Sony WH-1000XM5', 'Electronics', 799, 4, (1, 2)),
    ("Levi's 501 Jeans", 'Clothing', 179, 7, (1, 5)),
    ('Zara Basic T-Shirt', 'Clothing', 39, 9, (2, 10)),
    ('H&M Hoodie', 'Clothing', 69, 7, (1, 6)),
    ('Nike Tech Fleece', 'Clothing', 249, 5, (1, 4)),
    ('Nike Air Max 90', 'Sports', 289, 7, (1, 4)),
    ('Nike Air Force 1', 'Sports', 249, 8, (1, 4)),
    ('Nike Pegasus 40', 'Sports', 269, 5, (1, 3)),
    ('Adidas Ultraboost 22', 'Sports', 319, 5, (1, 3)),
    ('Puma RS-X', 'Sports', 199, 4, (1, 4)),
    ('Yoga Mat Pro', 'Sports', 59, 6, (1, 8)),
    ('Dyson V15', 'Home Appliances', 1499, 3, (1, 2)),
    ('Philips Air Fryer XL', 'Home Appliances', 329, 6, (1, 3)),
    ('Bosch Serie 4 Washer', 'Home Appliances', 1199, 3, (1, 1)),
    ('Xiaomi Robot Vacuum S10', 'Home Appliances', 599, 4, (1, 2)),
    ("L'Oréal Revitalift", 'Beauty', 45, 7, (1, 6)),
    ('Nivea Soft 200ml', 'Beauty', 12, 8, (2, 12)),
    ('Dior Sauvage 100ml', 'Beauty', 329, 3, (1, 2)),
]
PAYMENTS = [('Credit Card', 0.42), ('Debit Card', 0.28), ('Cash', 0.18), ('Mobile Wallet', 0.12)]
MONTH_FACTOR = {1: 0.85, 2: 0.8, 3: 1.05, 4: 0.9, 5: 0.9, 6: 0.95, 7: 0.9, 8: 0.95, 9: 1.0, 10: 1.0, 11: 1.35, 12: 1.6}


def pick(items, weights):
    return R.choices(items, weights=weights, k=1)[0]


def sales_rows():
    rows = []
    tid = 100000
    d = date(2023, 1, 1)
    end = date(2024, 12, 31)
    while d <= end:
        n = max(0, round(R.gauss(1.6 * MONTH_FACTOR[d.month] * (1.08 if d.year == 2024 else 1), 0.9)))
        for _ in range(n):
            region = pick(list(REGIONS), [v[0] for v in REGIONS.values()])
            filial = R.choice(REGIONS[region][1])
            emp = R.choice(EMPLOYEES[filial])
            weights = []
            for name, cat, price, w, rng in PRODUCTS:
                ww = w
                # Nike 2024-ün ikinci yarısında zəifləyir (Gün 6: «Nike satışları azalıb?»)
                if name.startswith('Nike') and d >= date(2024, 7, 1):
                    ww *= 0.45
                if cat == 'Electronics' and d.month in (11, 12):
                    ww *= 1.4
                weights.append(ww)
            name, cat, base, _, (lo, hi) = pick(PRODUCTS, weights)
            units = R.randint(lo, hi)
            # qiymət: kampaniyalar və məzənnə — kiçik dəyişkənlik, 2024-də +3%
            price = base * (1.03 if d.year == 2024 else 1) * R.choice([1, 1, 1, 1, 0.95, 0.9])
            if name.startswith('Nike') and d >= date(2024, 7, 1):
                price *= 0.85  # endirimlərə baxmayaraq satış düşür
            price = round(price, 2)
            tid += R.randint(1, 3)
            rows.append({
                'Transaction ID': tid,
                'Date': d.isoformat(),
                'Region': region,
                'Filial': filial,
                'Sales Employee': emp,
                'Product Name': name,
                'Product Category': cat,
                'Units Sold': units,
                'Unit Price': price,
                'Total Revenue': round(units * price, 2),
                'Payment Method': pick([p for p, _ in PAYMENTS], [w for _, w in PAYMENTS]),
            })
        d += timedelta(days=1)
    return rows


COLS = ['Transaction ID', 'Date', 'Region', 'Filial', 'Sales Employee', 'Product Name', 'Product Category',
        'Units Sold', 'Unit Price', 'Total Revenue', 'Payment Method']


def write_csv(name, rows, cols):
    with open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow(r)


sales = sales_rows()
write_csv('satislar.csv', sales, COLS)

# «çirkli» versiya
raw = [dict(r) for r in sales]
idx = list(range(len(raw)))
R.shuffle(idx)
it = iter(idx)
for _ in range(14):  # boş ödəniş üsulu
    raw[next(it)]['Payment Method'] = ''
for _ in range(9):  # boş satıcı
    raw[next(it)]['Sales Employee'] = ''
for _ in range(7):  # boş vahid qiymət
    raw[next(it)]['Unit Price'] = ''
for _ in range(8):  # 0 gəlir (sistem xətası)
    raw[next(it)]['Total Revenue'] = 0
for _ in range(10):  # region yazılışı səliqəsiz
    i = next(it)
    raw[i]['Region'] = R.choice([raw[i]['Region'].lower(), raw[i]['Region'].upper(), ' ' + raw[i]['Region'] + ' '])
for _ in range(6):  # məhsul adında artıq boşluq
    i = next(it)
    raw[i]['Product Name'] = '  ' + raw[i]['Product Name']
dups = [dict(raw[next(it)]) for _ in range(12)]
for dr in dups:
    raw.insert(R.randint(0, len(raw)), dr)
write_csv('satislar_xam.csv', raw, COLS)

# aylıq fayllar (2024 I rüb) — concat
for mon, nm in [(1, 'yanvar'), (2, 'fevral'), (3, 'mart')]:
    part = [r for r in sales if r['Date'].startswith(f'2024-{mon:02d}')]
    write_csv(f'satis_{nm}.csv', part, COLS)

# ───────────────────────────── kiçik cədvəllər ─────────────────────────────
customers = [
    (1, 'Aysel', 'Bakı', '2021-03-14'), (2, 'Namiq', 'Gəncə', '2022-07-01'), (3, 'Cavid', 'Bakı', '2020-11-23'),
    (4, 'Leyla', 'Sumqayıt', '2023-01-09'), (5, 'Rauf', 'Şəki', '2022-05-30'), (6, 'Günel', 'Bakı', '2021-09-17'),
    (7, 'Tural', 'Lənkəran', '2023-04-02'), (8, 'Nigar', 'Gəncə', '2020-02-28'),
]
with open(os.path.join(OUT, 'musteriler.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['MüştəriID', 'Ad', 'Şəhər', 'Qeydiyyat'])
    w.writerows(customers)
orders_small = [
    (1001, 2, 'Kitab', 25.0), (1002, 3, 'Telefon', 899.0), (1003, 3, 'Qulaqlıq', 120.0), (1004, 1, 'Noutbuk', 1899.0),
    (1005, 9, 'Planşet', 649.0), (1006, 6, 'Kitab', 18.5), (1007, 2, 'Saat', 299.0), (1008, 10, 'Telefon', 749.0),
    (1009, 4, 'Qulaqlıq', 89.0), (1010, 1, 'Çanta', 75.0),
]
with open(os.path.join(OUT, 'sifarisler_qisa.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['SifarişID', 'MüştəriID', 'Məhsul', 'Məbləğ'])
    w.writerows(orders_small)

emps = [
    ('Aysel', 'Satış', 1450, 200, 28, 'Bakı'), ('Namiq', 'IT', 2600, 400, 34, 'Bakı'), ('Cavid', 'Satış', 1300, '', 24, 'Gəncə'),
    ('Leyla', 'Marketinq', 1800, 250, 31, ''), ('Rauf', 'IT', 3100, 500, '', 'Bakı'), ('Günel', 'Maliyyə', 2200, 300, 45, 'Sumqayıt'),
    ('Tural', 'Satış', 1250, 150, 22, 'Bakı'), ('Nigar', 'Marketinq', 1950, '', 38, 'Gəncə'), ('Kamran', 'Maliyyə', 2400, 350, 52, ''),
    ('Səbinə', 'IT', 2900, 450, 29, 'Bakı'), ('Elvin', 'Satış', 1400, 180, 61, 'Şəki'), ('Fidan', 'HR', 1700, 200, 33, 'Bakı'),
]
with open(os.path.join(OUT, 'isciler.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Ad', 'Şöbə', 'Əməkhaqqı', 'Bonus', 'Yaş', 'Şəhər'])
    w.writerows(emps)

students = []
names = ['Aysel', 'Namiq', 'Cavid', 'Leyla', 'Rauf', 'Günel', 'Tural', 'Nigar', 'Kamran', 'Səbinə', 'Elvin', 'Fidan']
for n in names:
    m = R.randint(48, 99)
    s = max(40, min(100, m + R.randint(-15, 12)))
    e = max(40, min(100, m + R.randint(-20, 15)))
    students.append((n, m, s, e))
students[2] = ('Cavid', 88, 92, 85)
students[7] = ('Nigar', 88, 79, 91)  # Riyaziyyatda bərabər bal — rank metodları üçün
with open(os.path.join(OUT, 'telebeler.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Ad', 'Riyaziyyat', 'Fizika', 'İngilis dili'])
    w.writerows(students)

# ───────────────────────────── sifarisler (Superstore tipli) ─────────────────────────────
CITIES = {
    'Azerbaijan': ['Baku', 'Ganja', 'Sumgait'],
    'Georgia': ['Tbilisi', 'Batumi'],
    'Turkey': ['Istanbul', 'Ankara', 'Izmir'],
    'Kazakhstan': ['Almaty', 'Astana'],
    'Uzbekistan': ['Tashkent', 'Samarkand'],
}
COUNTRY_W = {'Azerbaijan': 0.34, 'Turkey': 0.28, 'Georgia': 0.14, 'Kazakhstan': 0.13, 'Uzbekistan': 0.11}
SEGMENTS = [('Consumer', 0.52), ('Corporate', 0.30), ('Small Business', 0.18)]
SHIP = [('Standard Class', 0.58, (4, 7)), ('Second Class', 0.2, (2, 4)), ('First Class', 0.15, (1, 3)), ('Same Day', 0.07, (0, 0))]
# (ProductID, ad, kateqoriya, qiymət, marja)
CATALOG = [
    ('TEC-1001', 'Logitech MX Master 3S', 'Technology', 129, 0.28),
    ('TEC-1002', 'Dell 27 Monitor P2723', 'Technology', 389, 0.18),
    ('TEC-1003', 'HP LaserJet Pro M404', 'Technology', 329, 0.15),
    ('TEC-1004', 'Lenovo ThinkPad E14', 'Technology', 1149, 0.12),
    ('TEC-1005', 'Samsung T7 SSD 1TB', 'Technology', 139, 0.30),
    ('TEC-1006', 'Jabra Evolve2 65', 'Technology', 219, 0.25),
    ('FUR-2001', 'Ergonomik ofis kreslosu', 'Furniture', 289, 0.16),
    ('FUR-2002', 'Hündürlüyü tənzimlənən masa', 'Furniture', 549, 0.10),
    ('FUR-2003', 'Kitab rəfi 5 bölməli', 'Furniture', 159, 0.08),
    ('FUR-2004', 'Konfrans masası', 'Furniture', 899, 0.06),
    ('OFF-3001', 'A4 kağız (5 paçka)', 'Office Supplies', 24, 0.35),
    ('OFF-3002', 'Gel qələm dəsti', 'Office Supplies', 9, 0.45),
    ('OFF-3003', 'Stepler və ştapellər', 'Office Supplies', 15, 0.40),
    ('OFF-3004', 'Arxiv qovluğu', 'Office Supplies', 7, 0.38),
    ('OFF-3005', 'Ağ lövhə 120x90', 'Office Supplies', 79, 0.22),
]
FIRST = ['Anar', 'Elnur', 'Lalə', 'Zaur', 'Aytən', 'Mehman', 'Sevinc', 'Ruslan', 'Nurlan', 'Gülnar', 'Emin', 'Kənan',
         'Giorgi', 'Nino', 'Mehmet', 'Elif', 'Aidos', 'Aruzhan', 'Bekzod', 'Dilnoza', 'Can', 'Zeynep', 'Levan', 'Madina']
LAST = ['Əliyev', 'Məmmədli', 'Quliyeva', 'Həsənli', 'Beridze', 'Yılmaz', 'Kaya', 'Nurlanov', 'Karimov', 'Usmonova',
        'Abdullayev', 'Kapanadze', 'Demir', 'Seitkali']
customers2 = []
for i in range(120):
    country = pick(list(COUNTRY_W), list(COUNTRY_W.values()))
    customers2.append({
        'CustomerID': f'C-{1000 + i}',
        'CustomerName': f'{R.choice(FIRST)} {R.choice(LAST)}',
        'CustomerSegment': pick([s for s, _ in SEGMENTS], [w for _, w in SEGMENTS]),
        'Country': country,
        'City': R.choice(CITIES[country]),
        'loyal': R.random() ** 2.2,  # bəzi müştərilər çox aktivdir
    })
orders = []
oid = 50000
d = date(2023, 1, 2)
while d <= date(2024, 12, 30):
    for _ in range(max(0, round(R.gauss(1.35 * MONTH_FACTOR[d.month] ** 0.5, 0.8)))):
        c = pick(customers2, [0.2 + 3 * x['loyal'] for x in customers2])
        mode, _, (lo, hi) = pick(SHIP, [w for _, w, _ in SHIP])
        oid += 1
        for _ in range(R.choice([1, 1, 1, 2, 2, 3])):
            pid, pname, cat, price, margin = R.choice(CATALOG)
            qty = R.randint(1, 4 if price > 300 else 9)
            if c['CustomerSegment'] == 'Corporate':
                qty += R.randint(0, 3)
            disc = R.choice([0, 0, 0, 0.05, 0.1, 0.15, 0.2, 0.3]) if c['CustomerSegment'] != 'Consumer' or R.random() < 0.4 else 0
            sales_v = round(price * qty * (1 - disc) * R.uniform(0.97, 1.03), 2)
            profit = round(sales_v * (margin - 1.25 * disc) + R.gauss(0, sales_v * 0.03), 2)
            orders.append({
                'OrderID': f'ORD-{oid}', 'OrderDate': d.isoformat(),
                'ShipDate': (d + timedelta(days=R.randint(lo, hi))).isoformat(), 'ShipMode': mode,
                'CustomerID': c['CustomerID'], 'CustomerName': c['CustomerName'], 'CustomerSegment': c['CustomerSegment'],
                'Country': c['Country'], 'City': c['City'], 'ProductID': pid, 'ProductName': pname, 'Category': cat,
                'Sales': sales_v, 'Quantity': qty, 'Discount': disc, 'Profit': profit,
            })
    d += timedelta(days=1)
write_csv('sifarisler.csv', orders, ['OrderID', 'OrderDate', 'ShipDate', 'ShipMode', 'CustomerID', 'CustomerName',
                                     'CustomerSegment', 'Country', 'City', 'ProductID', 'ProductName', 'Category',
                                     'Sales', 'Quantity', 'Discount', 'Profit'])

# ───────────────────────────── reyler.txt ─────────────────────────────
reviews = [
    'Çatdırılma çox sürətli idi, kuryer nəzakətli. Əla xidmət! Əlaqə: aysel.m@gmail.com',
    'Telefon qutusu əzilmişdi, amma məhsul işləyir. Zəng edin: +994 50 123 45 67',
    'Qiymətlər bahadır, endirim olsa yenə alaram.',
    'Ən yaxşı onlayn mağaza! Sifariş #A-10234 2 gündə çatdı.',
    'Gecikmə oldu, 3 gün gözlədim. Dəstəyə yazdım: help@technar.az',
    'Keyfiyyət əla, qiymət normal, çatdırılma sürətli.',
    'Qulaqlıqların səsi möhtəşəmdir, tövsiyə edirəm.',
    'Ölçü uyğun gəlmədi, qaytarma prosesi asan oldu. Nömrəm: +994 55 987 65 43',
    'Xidmət zəif idi, operator cavab vermədi.',
    'Sifariş #B-20871 natamam gəldi, bir məhsul çatışmırdı.',
    'Endirim kampaniyası çox sərfəli idi, ailəlikcə alış-veriş etdik.',
    'Kuryer gecikdi, amma üzr istədi. Məhsul keyfiyyətlidir.',
]
with open(os.path.join(OUT, 'reyler.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(reviews) + '\n')

print('satislar:', len(sales), 'xam:', len(raw), 'sifarisler:', len(orders))

# ───────────────────────────── Excel: 2024 I rüb (3 vərəq) — pandas ilə (pyenv) ─────────────────────────────
try:
    import pandas as pd

    with pd.ExcelWriter(os.path.join(OUT, 'satislar_2024q1.xlsx')) as xw:
        for nm, sheet in [('yanvar', 'Yanvar'), ('fevral', 'Fevral'), ('mart', 'Mart')]:
            pd.read_csv(os.path.join(OUT, f'satis_{nm}.csv')).to_excel(xw, sheet_name=sheet, index=False)
    print('xlsx yaradıldı')
except ImportError:
    print('pandas yoxdur — xlsx yaradılmadı (pyenv/bin/python ilə işlədin)')
