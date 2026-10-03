---
title: Jupyter-də Markdown
xp: 10
estimated_minutes: 7
---

Yaxşı notebook yalnız koddan ibarət olmur: hər addımın nə etdiyi izah olunur. Jupyter bunun üçün **Markdown** dilini dəstəkləyir. Markdown — sadə işarələrlə formatlanmış mətni HTML-ə çevirən dildir. Onunla başlıqlar, siyahılar, qalın və kursiv mətn, linklər və şəkillər əlavə edirik.

## Markdown hüceyrəsi

Hüceyrənin tipini **Code**-dan **Markdown**-a dəyiş (alət panelindəki siyahıdan və ya klaviaturada `Esc`, sonra `M`). Hüceyrəni işlədəndə (`Shift + Enter`) mətn formatlanmış şəkildə göstərilir.

![Hüceyrə tipini Markdown-a dəyişmək](images/jupyter-markdown-hucre.png)

## Sintaksis

| Nə                     | Yazılış                                          |
| ---------------------- | ------------------------------------------------ |
| Başlıqlar (H1 … H6)    | `# Başlıq 1`, `## Başlıq 2`, … `###### Başlıq 6` |
| Qalın mətn             | `**qalın**` və ya `__qalın__`                    |
| Kursiv mətn            | `*kursiv*` və ya `_kursiv_`                      |
| Üstündən xətt çəkilmiş | `~~köhnə qiymət~~`                               |
| Link                   | `[Linkin adı](https://example.com)`              |
| Şəkil                  | `![Alternativ mətn](şəkil_url)`                  |
| Maddəli siyahı         | `* Maddə 1` (və ya `- Maddə 1`)                  |
| Nömrəli siyahı         | `1. Maddə 1`                                     |
| Kod (sətir daxilində)  | `` `kod` ``                                      |
| Sitat                  | `> Bu bir sitatdır.`                             |
| Üfüqi xətt             | `---`                                            |

Kod blokunu üç «backtick» arasında yazırıq — dilin adını da göstərmək olar:

````markdown
```python
print("Salam, Dünya!")
```
````

## Nümunə

Bu Markdown mətni:

```markdown
# Layihə başlığı

Bu, Markdown istifadəsi ilə bağlı **sadə bir nümunədir**. Markdown _məzmunu_ daha anlaşıqlı edir.

## Maddələr

- _İlk maddə_
- _İkinci maddə_
- **Üçüncü maddə**:
  - Alt maddə 1
  - Alt maddə 2

## Nömrəli siyahı

1. Birinci maddə
2. İkinci maddə

## Bağlantılar

Məlumat üçün [bu linkə](https://www.example.com) daxil olun.
```

notebook-da belə görünəcək:

> # Layihə başlığı
>
> Bu, Markdown istifadəsi ilə bağlı **sadə bir nümunədir**. Markdown _məzmunu_ daha anlaşıqlı edir.
>
> ## Maddələr
>
> - _İlk maddə_
> - _İkinci maddə_
> - **Üçüncü maddə**:
>   - Alt maddə 1
>   - Alt maddə 2

> **Məsləhət:** hər analizi Markdown başlığı ilə başla və nəticələri qısa mətnlə izah et. Notebook-u başqası (və ya bir aydan sonra sən özün) açanda nə baş verdiyini dərhal anlayacaq.
