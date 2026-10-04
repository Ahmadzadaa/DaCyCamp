---
title: Boş dəyərləri doldurmaq və tipləri düzəltmək
xp: 10
estimated_minutes: 9
---

## Boş dəyərləri tapmaq

```python
df.isnull().sum()               # sütunlar üzrə
df[df["Şəhər"].isnull()]        # boş olan sətirlər
```

## fillna — doldurmaq

```python
df["Ad"] = df["Ad"].fillna("Bilinmir")              # sabit dəyər
df["Bonus"] = df["Bonus"].fillna(0)
df["Yaş"] = df["Yaş"].fillna(df["Yaş"].mean())       # orta ilə
df["Yaş"] = df["Yaş"].fillna(df["Yaş"].median())     # median ilə (kənar dəyərlərə dayanıqlı)
df["Şəhər"] = df["Şəhər"].ffill()                    # əvvəlki dəyərlə (forward fill)
df["Şəhər"] = df["Şəhər"].bfill()                    # sonrakı dəyərlə (backward fill)
df["Şəhər"] = df["Şəhər"].fillna(df["Ad"])           # başqa sütunla
```

> 📝 Köhnə yazılış `fillna(method="ffill")` artıq tövsiyə olunmur — `ffill()` / `bfill()` istifadə et.

## dropna — silmək

```python
df.dropna()                          # ən azı bir boşluğu olan sətirləri sil
df.dropna(subset=["Payment Method"]) # yalnız bu sütun boşdursa
df.dropna(how="all")                 # bütün dəyərləri boş olan sətirləri
```

**Nə vaxt doldurmalı, nə vaxt silməli?** Boşluq azdırsa və təsadüfidirsə — silmək olar. Çoxdursa və ya məlumat vacibdirsə — məntiqli dəyərlə doldur və bunu qeyd et.

## Tiplər: dtypes, astype, to_numeric

```python
df["Age"] = df["Age"].astype(int)
df["Mebleg"] = pd.to_numeric(df["Mebleg"], errors="coerce")   # çevrilməyən → NaN
df["Date"] = pd.to_datetime(df["Date"])
```

## Mətnin təmizlənməsi

```python
df["Region"] = df["Region"].str.strip()          # kənar boşluqlar
df["Region"] = df["Region"].str.lower().map(lugat)   # vahid yazılış
```

⚠️ **İ/ı problemi:** Python-da `"BAKI".lower()` → `"baki"` (nöqtəli i), `"Sumqayıt".title()` isə qaydasında görünsə də `"SUMQAYIT".title()` → `"Sumqayit"` olur. Azərbaycan dilindəki ı/İ hərfləri ingilis qaydaları ilə çevrilir. Buna görə səliqəsiz yazılışları **lüğətlə** düzgün forma uyğunlaşdırmaq daha etibarlıdır.

## 0 — həmişə «sıfır» deyil

Sistem xətası səbəbindən gəlir 0 yazıla bilər. Belə dəyərləri tapıb düzgün hesabla əvəz etmək lazımdır:

```python
sehv = df["Total Revenue"] == 0
df.loc[sehv, "Total Revenue"] = df.loc[sehv, "Units Sold"] * df.loc[sehv, "Unit Price"]
```
