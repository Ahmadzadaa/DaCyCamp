---
title: Fərdiləşdirmə və subplot-lar
xp: 10
estimated_minutes: 9
---

Yaxşı qrafik özü-özünü izah edir: başlıq, ox adları, vahidlər, legend.

```python
plt.plot(x, y1, label="Xətt 1", color="blue", linestyle="-", marker="o", markersize=8, linewidth=2)
plt.plot(x, y2, label="Xətt 2", color="red", linestyle="--", marker="s", markersize=8, linewidth=2)

plt.title("Nümunə qrafik", fontsize=14, fontweight="bold")
plt.xlabel("X oxunun etiketi", fontsize=12)
plt.ylabel("Y oxunun etiketi", fontsize=12)
plt.legend(loc="upper left", fontsize=10, shadow=True, frameon=True, fancybox=True)
plt.grid(True, linestyle=":", linewidth=0.5, color="gray")
plt.xlim(0, 6)
plt.ylim(0, 10)
plt.tight_layout()       # məsafələri tənzimləyir
plt.show()
```

| Ayar | Funksiya |
| --- | --- |
| Başlıq | `plt.title(..., fontsize=, fontweight=)` |
| Ox adları | `plt.xlabel()`, `plt.ylabel()` |
| Legend | `label=...` + `plt.legend(loc=...)` |
| Grid | `plt.grid(axis="both"/"x"/"y", linestyle=":", color=...)` |
| Limitlər | `plt.xlim()`, `plt.ylim()` |
| Ölçü | `plt.figure(figsize=(10, 5))` |

Xətt üslubları: `"-"` bütöv, `"--"` qırıq, `"-."` nöqtə-qırıq, `":"` nöqtəli. Markerlər: `"o"`, `"s"`, `"^"`, `"x"`.

## Subplot-lar: bir figure-də bir neçə qrafik

```python
fig, axs = plt.subplots(nrows=2, ncols=1, figsize=(8, 6))

axs[0].plot(x, y1, color="blue")
axs[0].set_title("Sine Function")
axs[0].set_xlabel("X-axis")
axs[0].grid(True)

axs[1].plot(x, y2, color="red")
axs[1].set_title("Cosine Function")

plt.tight_layout()
```

- `plt.subplots(nrows, ncols)` — figure və axes massivi qaytarır.
- `nrows=2, ncols=2` olanda `axs[0, 0]`, `axs[0, 1]`, `axs[1, 0]`, `axs[1, 1]`.
- Axes metodlarında `set_` prefiksi var: `ax.set_title()`, `ax.set_xlabel()`, `ax.set_ylim()`.
- pandas qrafikini müəyyən axes-ə çəkmək: `seriya.plot(kind="bar", ax=axs[1, 0])`.
