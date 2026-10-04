---
title: Reqressiya nədir və necə təfsir olunur?
xp: 10
estimated_minutes: 9
---

**Reqressiya** — bir dəyişənin (asılı dəyişən, y) digər dəyişən(lər)dən (müstəqil dəyişənlər, X) necə asılı olduğunu modelləşdirən statistik metoddur. Məqsəd: əlaqəni ölçmək və **proqnoz** vermək.

- **Sadə xətti reqressiya:** bir X — `y = b₀ + b₁·x`
- **Çoxlu (mürəkkəb) xətti reqressiya:** bir neçə X — `y = b₀ + b₁·x₁ + b₂·x₂ + …`

## Əmsallar

- **b₀ (intercept, sabit)** — x = 0 olanda y-in gözlənilən dəyəri.
- **b₁ (slope, meyl)** — x 1 vahid artanda y-in orta hesabla nə qədər dəyişdiyi.

> Mənfəət = −20 + 0.25 × Satış → hər əlavə 100 ₼ satış orta hesabla 25 ₼ mənfəət gətirir.

## Modelin keyfiyyəti

| Göstərici | Mənası |
| --- | --- |
| **R²** | y-dəki dəyişkənliyin neçə faizini model izah edir (0–1). 0.8 — 80% |
| **Adjusted R²** | Dəyişən sayına görə düzəldilmiş R² — çoxlu reqressiyada müqayisə üçün |
| **t-dəyəri / p-dəyəri** | Əmsal statistik əhəmiyyətlidirmi? p < 0.05 — adətən «əhəmiyyətli» |
| **Qalıqlar (residuals)** | Faktiki y − proqnoz. Təsadüfi səpələnməlidir |

## Qalıqları yoxlamaq

1. **Qalıqlar vs proqnoz** qrafiki — nöqtələr 0 xəttinin ətrafında **təsadüfi** səpələnməlidir. Naxış (qövs, huni) görünürsə, model nəyisə qaçırır.
2. **Q-Q qrafiki** — qalıqlar normal paylanıbsa, nöqtələr düz xətt üzərində olur.

## Ehtiyat

- Reqressiya **korrelyasiyanı** modelləşdirir — səbəbiyyəti sübut etmir.
- Data aralığından çox kənara proqnoz (ekstrapolyasiya) etibarsızdır.
- Kənar dəyərlər xətti güclü əyə bilər.
