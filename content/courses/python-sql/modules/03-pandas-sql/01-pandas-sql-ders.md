---
title: 'pandas ilə baza: to_sql və read_sql_query'
xp: 10
estimated_minutes: 8
---

Cursor ilə tuple-larla işləmək əvəzinə nəticəni birbaşa **DataFrame** kimi almaq daha rahatdır.

```python
import sqlite3
import pandas as pd

con = sqlite3.connect(":memory:")
df = pd.read_csv("satislar.csv")

df.to_sql("satislar", con, index=False, if_exists="replace")   # DataFrame → cədvəl

netice = pd.read_sql_query("""
    SELECT Region, SUM("Total Revenue") AS gelir
    FROM satislar
    GROUP BY Region
    ORDER BY gelir DESC
""", con)
```

- `if_exists="replace"` — cədvəl varsa əvəz et; `"append"` — sonuna əlavə et; `"fail"` — xəta.
- Boşluqlu sütun adları SQL-də **qoşa dırnaqda** yazılır: `"Total Revenue"`.
- Parametrlər: `pd.read_sql_query("... WHERE Region = ?", con, params=("Bakı",))`.

Real serverlərdə (MySQL, PostgreSQL) pandas **SQLAlchemy** «engine» ilə işləyir:

```python
from sqlalchemy import create_engine
engine = create_engine(os.environ["DATABASE_URL"])
df = pd.read_sql_query("SELECT * FROM orders", engine)
```

## SQL JOIN və pd.merge

```sql
SELECT s.SifarişID, m.Ad, s.Məbləğ
FROM sifarisler s
JOIN musteriler m ON m.MüştəriID = s.MüştəriID
```

```python
pd.merge(sifarisler, musteriler, on="MüştəriID")   # eyni nəticə
```

| SQL | pandas |
| --- | --- |
| `JOIN` / `INNER JOIN` | `how="inner"` |
| `LEFT JOIN` | `how="left"` |
| `WHERE` | `df[şərt]` |
| `GROUP BY` + `SUM` | `groupby(...).sum()` |
| `ORDER BY ... DESC` | `sort_values(ascending=False)` |
| `LIMIT 5` | `head(5)` |

> 💡 Qayda: datanı bazadan **lazım olduğu qədər** götür. Milyonlarla sətri pandas-a çəkib orada filtrləmək əvəzinə `WHERE` və `GROUP BY`-ı bazada et — daha sürətli və yaddaşa qənaətlidir.
