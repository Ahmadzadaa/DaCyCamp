---
title: İş direktoriyası və fayl yolu
xp: 10
estimated_minutes: 6
---

## Cari iş direktoriyası (working directory)

Jupyter Notebook (və ya istənilən IDE) müəyyən bir qovluq çərçivəsində işləyir — buna **cari iş direktoriyası** deyilir. Faylın adını yolsuz yazsan (`"satislar.csv"`), Python onu məhz bu qovluqda axtarır.

```python
import os

print(os.getcwd())      # cari iş direktoriyası, məs. C:\Users\Aysel\Documents\python-basics
print(os.listdir())     # bu qovluqdakı fayllar
```

## Fayl yolu (file path)

Fayl başqa qovluqdadırsa, ona tam və ya nisbi yolla müraciət edirik:

```python
# Tam (mütləq) yol
df = pd.read_csv("C:/Users/Aysel/Desktop/data/satislar.csv")

# Nisbi yol — iş direktoriyasına görə
df = pd.read_csv("data/satislar.csv")
```

Uzun yolları hər dəfə yazmamaq üçün iş direktoriyasını dəyişmək olar:

```python
os.chdir("C:/Users/Aysel/Desktop/data")
df = pd.read_csv("satislar.csv")
```

> Windows-da yollarda `\` işarəsi var: `C:\Users\...`. Python sətirlərində `\` xüsusi məna daşıyır, ona görə ya `/` yaz, ya da sətrin qarşısına `r` qoy: `r"C:\Users\Aysel\data.csv"`.

## Google Colab-da faylı yükləmək

Google Colab buludda işləyir — kompüterindəki faylı görmür. Faylı əvvəlcə Colab-a yükləmək lazımdır. Bunun üçün `google.colab` paketinin `files` modulu var:

```python
from google.colab import files
import pandas as pd

# Faylı seçib yükləmək — «Choose Files» düyməsi çıxır
uploaded = files.upload()

# Yüklənən faylların siyahısı
for file_name in uploaded.keys():
    print(f"Yüklənmiş fayl: {file_name}")

# İlk faylın adı
file_path = list(uploaded.keys())[0]

# DataFrame-ə oxumaq
try:
    # UTF-8 kodlaşdırması ilə oxumağa çalışırıq
    df = pd.read_csv(file_path, encoding="utf-8")
    print("Fayl uğurla oxundu (UTF-8)")
except UnicodeDecodeError:
    # Alınmasa, alternativ kodlaşdırma ilə
    df = pd.read_csv(file_path, encoding="latin-1")
    print("Fayl uğurla oxundu (latin-1)")
```

> Bu kodun sonundakı `try / except` bloku xətaların idarəsidir — onu növbəti fəsildə ətraflı öyrənəcəyik.

Bu platformadakı tapşırıqlarda lazım olan datasetlər avtomatik olaraq iş direktoriyasına yerləşdirilir — faylı adı ilə oxumaq kifayətdir.
