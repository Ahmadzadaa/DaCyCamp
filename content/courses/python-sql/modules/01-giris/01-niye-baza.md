---
title: Python və verilənlər bazaları
xp: 10
estimated_minutes: 8
---

Şirkətlərin datası adətən CSV-də deyil, **verilənlər bazasında** (MySQL, PostgreSQL, SQL Server, Oracle) yaşayır. Analitik datanı ya SQL alətində sorğulayır, ya da **Python-dan bazaya qoşulub** nəticəni birbaşa pandas-a götürür — sonra təmizləyir, təhlil edir, qrafik çəkir və hesabatı avtomatlaşdırır.

## Hər bağlantının eyni addımları

```text
1. Sürücünü (driver) import et     →  import mysql.connector
2. Bağlantı aç                      →  connection = ...connect(host, database, user, password)
3. Kursor yarat                     →  cursor = connection.cursor()
4. Sorğunu icra et                  →  cursor.execute("SELECT ...")
5. Nəticəni götür                   →  rows = cursor.fetchall()
6. Bağla                            →  cursor.close(); connection.close()
```

## Gün 9 nümunəsi: MySQL

```python
# !pip install mysql-connector-python
import os
import mysql.connector

connection = mysql.connector.connect(
    host="localhost",                       # serverin ünvanı
    database="satis_db",                    # bazanın adı
    user=os.environ["DB_USER"],             # istifadəçi
    password=os.environ["DB_PASSWORD"],     # parol — koda yazılmır!
)
cursor = connection.cursor()
cursor.execute("SELECT * FROM orders LIMIT 10;")
for row in cursor.fetchall():
    print(row)
cursor.close()
connection.close()
```

## Sürücülər

| Baza | Python paketi |
| --- | --- |
| SQLite | `sqlite3` — Python ilə birlikdə gəlir |
| MySQL / MariaDB | `mysql-connector-python`, `PyMySQL` |
| PostgreSQL | `psycopg2` / `psycopg` |
| SQL Server | `pyodbc` |
| Hamısı üçün ümumi qat | `SQLAlchemy` (pandas ilə ən rahat) |

Slaydlardakı **RODBC** R dilinin paketidir; Python-da onun analoqu `pyodbc` və yuxarıdakı sürücülərdir.

## Bu kursda: SQLite

**SQLite** — server tələb etməyən, bütün bazanı bir faylda (və ya yaddaşda) saxlayan kiçik verilənlər bazasıdır. Python-da hazırdır və DaCy-də brauzerdə işləyir. SQL dili MySQL/PostgreSQL ilə demək olar ki, eynidir — burada öyrəndiklərin real serverlərdə də keçərlidir.

```python
import sqlite3
con = sqlite3.connect(":memory:")     # yaddaşda müvəqqəti baza
# con = sqlite3.connect("satis.db")   # faylda
```

## 🔒 Təhlükəsizlik

- Parol və istifadəçi adı **mühit dəyişənlərində** saxlanılır, koda yazılmır.
- Analitikə adətən yalnız **oxuma** hüququ verilir (ən az imtiyaz prinsipi).
- İstifadəçidən gələn dəyərlər sorğuya **parametr** kimi ötürülür — SQL injection-dan qorunmaq üçün (növbəti fəsildə).
