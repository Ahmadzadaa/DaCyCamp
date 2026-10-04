---
title: 'Python-da reqressiya: polyfit, scikit-learn, statsmodels'
xp: 10
estimated_minutes: 10
---

## 1. Trend xətti: np.polyfit

```python
import numpy as np
meyl, sabit = np.polyfit(x, y, 1)        # 1 — xətti (1-ci dərəcə)
plt.scatter(x, y)
plt.plot(x, meyl * np.array(x) + sabit, color="red", linestyle="--", label="Trend xətti")
```

## 2. scikit-learn: LinearRegression

```python
from sklearn.linear_model import LinearRegression

X = df[["Sales"]]          # 2 ölçülü olmalıdır (DataFrame və ya reshape(-1, 1))
y = df["Profit"]
model = LinearRegression()
model.fit(X, y)

model.coef_          # meyl(lər)
model.intercept_     # sabit
model.score(X, y)    # R²
model.predict(pd.DataFrame({"Sales": [1000]}))   # proqnoz
```

## 3. statsmodels: OLS və ətraflı xülasə

```python
import statsmodels.api as sm

X = sm.add_constant(data[["mph", "hp", "wt"]])   # sabit termini əlavə et
y = data["mpg"]
results = sm.OLS(y, X).fit()
print(results.summary())        # əmsallar, t, p, R², Adjusted R²

results.params                  # əmsallar
results.rsquared                # R²
results.pvalues                 # p-dəyərləri

yeni = sm.add_constant(pd.DataFrame({"mph": [65], "hp": [155], "wt": [2450]}), has_constant="add")
results.predict(yeni)
```

> ⚠️ statsmodels-də `add_constant` unudulsa, model sabitsiz (xətt 0-dan keçən) qurulur — ən çox edilən səhvlərdən biridir.

## Qalıqlar və Q-Q qrafiki

```python
qaliqlar = y - results.predict(X)

plt.scatter(results.predict(X), qaliqlar)
plt.axhline(y=0, color="red", linestyle="--")
plt.title("Qalıqlar")

import scipy.stats as stats
stats.probplot(qaliqlar, dist="norm", plot=plt)    # Q-Q qrafiki
```

| Alət | Nə vaxt |
| --- | --- |
| `np.polyfit` | Sürətli trend xətti |
| `sklearn` | Proqnoz yönümlü işlər, maşın öyrənməsi pipeline-ları |
| `statsmodels` | Statistik təfsir: p-dəyərləri, etibar intervalları, ətraflı xülasə |
