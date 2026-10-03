---
title: İndeks və kəsmə (slicing)
xp: 10
estimated_minutes: 7
---

Sətir (string) simvolların **sıralı** ardıcıllığıdır. Hər simvolun öz yeri — **indeksi** var və sayma **0-dan** başlayır.

```text
 T   e   c   h   N   a   r
 0   1   2   3   4   5   6      ← müsbət indeks
-7  -6  -5  -4  -3  -2  -1      ← mənfi indeks (sondan)
```

```python
ad = "TechNar"
print(ad[0])    # T  — ilk simvol
print(ad[4])    # N
print(ad[-1])   # r  — son simvol
print(len(ad))  # 7
```

## Kəsmə: `[başlanğıc:son:addım]`

Kəsmə sətrin bir hissəsini götürür. **Son indeks daxil deyil.**

| Yazılış | Nəticə | İzah |
| --- | --- | --- |
| `ad[0:4]` | `'Tech'` | 0, 1, 2, 3 |
| `ad[:4]` | `'Tech'` | başlanğıc buraxılıbsa — əvvəldən |
| `ad[4:]` | `'Nar'` | son buraxılıbsa — sona qədər |
| `ad[-3:]` | `'Nar'` | son 3 simvol |
| `ad[::2]` | `'TcNr'` | hər ikinci simvol |
| `ad[::-1]` | `'raNhceT'` | tərsinə |

## Real nümunə: məhsul kodu

TechNar anbarında hər məhsulun kodu belədir: `TEC-1001-BAKU-2024` — kateqoriya, nömrə, şəhər, il.

```python
kod = "TEC-1001-BAKU-2024"
kateqoriya = kod[:3]     # 'TEC'
nomre = kod[4:8]         # '1001'
il = kod[-4:]            # '2024'
```

> 💡 Kodların formatı sabit olanda kəsmə çox rahatdır. Format dəyişkəndirsə (məs. hissələrin uzunluğu fərqlidir), `split("-")` daha etibarlıdır — növbəti dərsdə.

## Sətirlər dəyişməzdir (immutable)

Sətrin bir simvolunu yerində dəyişmək olmur:

```python
ad[0] = "M"   # TypeError: 'str' object does not support item assignment
```

Bunun əvəzinə **yeni sətir** yaradılır: `"M" + ad[1:]` → `'MechNar'`. Sətir metodları da (`upper()`, `replace()`...) həmişə yeni sətir qaytarır, orijinalı dəyişmir.
