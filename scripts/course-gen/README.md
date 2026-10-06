# Kurs generatorları (iş alətləri — idxal olunmur)

`content/courses/<slug>/` paketlərini yaradan Python skriptləri. Nəticə faylları repoda saxlanılır; skriptlər yenidən
yaratmaq və davam etdirmək üçündür.

| Fayl | Nə edir | Status |
| --- | --- | --- |
| `common.py` | Course/Module köməkçiləri: dərs (md), test (quiz yaml), Python addımı | — |
| `c1_*`, `c2_*`, `c3_*` | What is Data Engineering / Data Analytics / Cyber Security | hazır, repoda |
| `c4_python_basics.py` | Python Basics (köhnə python4business-in nüsxəsini `../src_p4b`-dən götürür) | hazır, repoda |
| `c5_pandas.py` | Python Pandas (15 fəsil, 80 addım, 44 tapşırıq) | hazır, repoda |
| `c6_viz.py` | Python for Data Analysis & Visualization (10 fəsil, 42 addım, 21 tapşırıq) | hazır, repoda |
| `c7_sql.py` | Python & SQL: Working with Databases (5 fəsil, 17 addım, 7 tapşırıq) | hazır, repoda |
| `c8_capstone.py` | Python Capstone: Sales Analytics Project (6 fəsil, 24 addım, 10 tapşırıq) | hazır, repoda |
| `py_datasets.py` | Sintetik datasetlər (deterministik). xlsx üçün pandas+openpyxl lazımdır | — |
| `pyverify.py` | CPython-da (Pyodide ilə eyni paket versiyaları) həll keçir / starter keçmir yoxlaması; `--en` — ingiliscə tərcümə + çarpaz yoxlama | — |
| `validate-package.cjs` | Paketi shared sxemləri ilə yoxlayır (`apps/api` qovluğundan işlədin) | — |
| `validate_api.mjs` | Paketi işləyən API-nin idxal validasiyasından keçirir (səhvlər + tərcümə xəbərdarlıqları) | — |
| `i18n_tools.py` | İngiliscə tərcümə: `extract` — fəslin skeleti, `check` — əhatə və azərbaycan hərfi qalmaması | — |

Generatorlarda `REPO` yolu mütləqdir (`/home/user/DaCyCamp/content/courses`) — lazım olsa dəyişin.
Yoxlama mühiti: `python3 -m venv pyenv && pyenv/bin/pip install pandas==2.3.3 numpy==2.2.5 matplotlib==3.8.4
scipy==1.14.1 statsmodels==0.14.4 scikit-learn==1.7.0 seaborn==0.13.2 wordcloud==1.9.4 openpyxl pyyaml`.

İngiliscə tərcümələr (`content/courses/<slug>/i18n/en/`) generatorlardan asılı deyil — əl ilə yazılıb. Generatoru yenidən işlədib azərbaycanca mətni dəyişsəniz, həmin sahələrin tərcüməsi bazaya yazılmayacaq (köhnəlmiş sayılır) — tərcüməni də yeniləyin. Format və qaydalar: `docs/content-package.md` → «İngiliscə tərcümə».
