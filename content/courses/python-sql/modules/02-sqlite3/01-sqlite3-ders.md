---
title: sqlite3 ilə ilk baza
xp: 10
estimated_minutes: 9
---

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
