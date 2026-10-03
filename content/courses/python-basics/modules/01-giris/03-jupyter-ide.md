---
title: Jupyter Notebook və IDE-lər
xp: 10
estimated_minutes: 5
---

**IDE** (Integrated Development Environment — inteqrasiya olunmuş inkişaf mühiti) kod yazmaq, işlətmək və səhvləri tapmaq üçün bir yerə yığılmış alətlər toplusudur.

## Jupyter Notebook

Jupyter Notebook — Python ilə işləmək üçün ən çox istifadə olunan interaktiv mühitdir. Data analitiklər onu xüsusilə sevir, çünki kod, nəticə və izahlar bir sənəddə saxlanılır.

- **Vahid mühit** — kodu yazmaq, sınamaq və işə salmaq bir yerdədir.
- **Hüceyrə (cell) əsaslı interfeys** — kod hüceyrələrini ayrı-ayrılıqda işlədib nəticəni dərhal altında görürsən.
- **Debugging və profiling** — kodu addım-addım izləmək və performansı ölçmək mümkündür.
- **Markdown və qrafiklər** — izahları Markdown hüceyrələrində yazır, `matplotlib`, `seaborn`, `Plotly` qrafiklərini notebook-un içində göstərirsən.

![Jupyter Notebook interfeysi](images/jupyter-notebook.png)

Kod hüceyrəsini işlətmək üçün **Shift + Enter** bas.

## Bir notebook — bir neçə dil

Jupyter yalnız Python üçün deyil: R, Julia, Scala və başqa dillərdə də kod yazmaq olar. Bunu fərqli **kernel**-lər (dil mühərrikləri) təmin edir. Yeni notebook yaradanda kernel seçirsən, məsələn _Python 3 (ipykernel)_.

![Jupyter-də R kernel ilə işləmə nümunəsi](images/jupyter-r-kernel.png)

Jupyter-i quraşdırmağın ən asan yolu **Anaconda (Conda)** paketidir: Python, Jupyter və əsas data kitabxanaları birlikdə gəlir. Brauzerdə quraşdırmasız işləmək üçün **Google Colab** da var.

## Python üçün digər IDE-lər

![Python üçün IDE-lər: PyCharm, VS Code, Spyder, Jupyter və başqaları](images/ide-siyahisi.png)

Ən populyarları: **VS Code**, **PyCharm**, **Spyder**, **Jupyter**, **Thonny** (yeni başlayanlar üçün).

> Bu platformadakı praktik tapşırıqlar Jupyter-in bir kod hüceyrəsi kimi işləyir: kodu yazırsan, **İşə sal** basırsan və nəticəni konsolda görürsən.
