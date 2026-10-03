---
title: Notebook-u HTML və PDF kimi ixrac etmək
xp: 10
estimated_minutes: 4
---

Analizi bitirdin və rəhbərinə və ya müştəriyə göndərmək istəyirsən. Hər kəsdə Jupyter yoxdur — ona görə notebook-u **HTML** və ya **PDF** kimi ixrac edirik. Kod, nəticələr, qrafiklər və Markdown izahları bir sənəddə qalır.

## Menyu ilə

**File → Download as** (yeni versiyalarda **File → Save and Export Notebook As…**) və formatı seç:

![File → Download as menyusu](images/jupyter-download-as.png)

| Format                   | Nə vaxt                                                     |
| ------------------------ | ----------------------------------------------------------- |
| **HTML (.html)**         | ən asan yol: istənilən brauzerdə açılır, qrafiklər daxildir |
| **PDF via LaTeX (.pdf)** | çap üçün; kompüterdə LaTeX quraşdırılmalıdır                |
| **PDF via HTML**         | LaTeX-siz PDF (Jupyter-in yeni versiyalarında «WebPDF»)     |
| **Python (.py)**         | yalnız kod — skript kimi işlətmək üçün                      |
| **Markdown (.md)**       | mətn sənədi kimi                                            |
| **Reveal.js slides**     | notebook-dan təqdimat                                       |

> PDF almağın ən sadə yolu: əvvəlcə HTML kimi ixrac et, sonra brauzerdə aç və **Print → Save as PDF** seç.

## Komanda sətri ilə

Eyni işi `nbconvert` aləti ilə terminaldan da görmək olar:

```bash
jupyter nbconvert --to html analiz.ipynb
jupyter nbconvert --to pdf analiz.ipynb
jupyter nbconvert --to slides analiz.ipynb
```

> Göndərməzdən əvvəl **Kernel → Restart & Run All** et: bütün hüceyrələr yuxarıdan aşağı ardıcıl işləsin. Belə ki, sənəddəki nəticələr kodla tam uyğun olur.
