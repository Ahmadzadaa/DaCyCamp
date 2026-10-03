---
title: Dictionary və set
xp: 10
estimated_minutes: 7
---

## Dictionary — `{açar: dəyər}`

Dictionary **açar–dəyər** (key–value) cütlərindən ibarətdir. Lüğət kimi: sözü (açarı) tapırsan, mənasını (dəyəri) alırsan. Elementlərə indekslə yox, **açarla** müraciət olunur.

- Dəyişdirilə bilən: cütləri əlavə etmək, silmək və yeniləmək olar.
- Açarlar **unikal** olmalıdır.
- Dəyərlər təkrarlana bilər.

### Əsas metodlar

| Metod           | Nə edir                                           |
| --------------- | ------------------------------------------------- |
| `d[açar]`       | açarın dəyəri (açar yoxdursa `KeyError`)          |
| `get(açar)`     | açarın dəyəri (açar yoxdursa `None`)              |
| `keys()`        | bütün açarlar                                     |
| `values()`      | bütün dəyərlər                                    |
| `items()`       | bütün açar–dəyər cütləri                          |
| `update({...})` | yeni cütlər əlavə edir və ya mövcudları yeniləyir |

```python
my_dict = {"name": "Riyad", "age": 25}
print(my_dict["name"])         # Riyad
print(my_dict.get("age"))      # 25

my_dict["age"] = 26            # mövcud açarın dəyərini dəyiş
my_dict.update({"city": "Bakı"})
print(my_dict)                 # {'name': 'Riyad', 'age': 26, 'city': 'Bakı'}

print(my_dict.keys())          # dict_keys(['name', 'age', 'city'])
```

## Set — `{ }`

Set yalnız **unikal** elementlərdən ibarətdir. Təkrarlar avtomatik silinir, elementlərin sırası yoxdur — buna görə indekslə müraciət etmək olmur. Siyahıdakı unikal dəyərləri tapmaq üçün çox faydalıdır.

- Dəyişdirilə bilən: element əlavə etmək və silmək olar.
- Təkrar elementlərə icazə verilmir.
- Sıralı deyil, indeks yoxdur.

### Əsas metodlar

| Metod             | Nə edir                                       |
| ----------------- | --------------------------------------------- |
| `add(x)`          | element əlavə edir                            |
| `remove(x)`       | elementi silir                                |
| `union(s)`        | birləşmə — hər iki setdəki bütün elementlər   |
| `intersection(s)` | kəsişmə — yalnız hər ikisində olan elementlər |

```python
my_set = {1, 2, 3, 4}
my_set.add(5)        # {1, 2, 3, 4, 5}
my_set.remove(2)     # {1, 3, 4, 5}

another_set = {3, 4, 5, 6}
print(my_set.union(another_set))          # {1, 3, 4, 5, 6}
print(my_set.intersection(another_set))   # {3, 4, 5}

seherler = ["Bakı", "Gəncə", "Bakı", "Şəki"]
print(set(seherler))   # {'Bakı', 'Gəncə', 'Şəki'} — təkrarlar silindi
```

## Hansını nə vaxt seçməli?

| Struktur | Yazılış     | Sıralı | Dəyişdirilə bilər | Təkrar          | Nə üçün                  |
| -------- | ----------- | ------ | ----------------- | --------------- | ------------------------ |
| `list`   | `[1, 2, 2]` | ✔      | ✔                 | ✔               | ümumi siyahılar          |
| `tuple`  | `(1, 2, 2)` | ✔      | ✘                 | ✔               | dəyişməməli məlumatlar   |
| `dict`   | `{"a": 1}`  | açarla | ✔                 | açar ✘, dəyər ✔ | açarla axtarış, qeydlər  |
| `set`    | `{1, 2}`    | ✘      | ✔                 | ✘               | unikal dəyərlər, kəsişmə |
