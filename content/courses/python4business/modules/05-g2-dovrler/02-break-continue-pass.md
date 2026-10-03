---
title: 'Dövrün idarəsi: break, continue, pass və dövr daxilində if'
xp: 10
estimated_minutes: 7
---

## `continue` — bu addımı burax

`continue` dövrün **cari** təkrarını yarımçıq saxlayır və növbəti təkrara keçir:

```python
# 1-dən 10-a qədər ədədləri çap et, lakin 5-i burax
for i in range(1, 11):
    if i == 5:
        continue      # 5-ə çatanda bu təkrarı burax
    print(i)
# 1 2 3 4 6 7 8 9 10
```

## `break` — dövrü dayandır

`break` dövrü vaxtından əvvəl, tamamilə dayandırır:

```python
# 1-dən 10-a qədər ədədləri çap et, lakin 5-ə çatanda dayan
for i in range(1, 11):
    if i == 5:
        break         # dövrdən çıx
    print(i)
# 1 2 3 4
```

`break` xüsusilə `while True:` ilə birlikdə istifadə olunur — «dayanma şərti ödənənə qədər təkrarla»:

```python
while True:
    cavab = input("Davam edək? (h/y): ")
    if cavab == "y":
        break
```

## `pass` — heç nə etmə

`pass` boş əməliyyatdır. Python boş bloka icazə vermir, ona görə «burada hələ kod yoxdur» demək üçün `pass` yazırıq:

```python
x = 5
if x > 10:
    pass              # bu blok hələlik boşdur
else:
    print("x 10-dan kiçikdir")

def gelecek_funksiya():
    pass              # sonra yazacağam

for i in range(5):
    pass              # dövr heç nə etmir
print("For dövrü başa çatdı")
```

## Dövr daxilində `if`

Dövrün içində şərt yoxlayaraq yalnız lazım olan elementlərlə işləyirik. `%` (bölmədən qalıq) operatoru burada çox işə yarayır: `i % 2 == 0` — cüt ədəd, `i % 5 == 0` — 5-ə bölünən ədəd.

```python
# 1-dən 10-a qədər yalnız cüt ədədləri çap et
for i in range(1, 11):
    if i % 2 == 0:
        print(i)
# 2 4 6 8 10
```

## Brauzerdə `input()`

`input()` istifadəçidən klaviatura ilə dəyər alır və onu **sətir** kimi qaytarır, ona görə ədəd lazımdırsa `int()` ilə çeviririk:

```python
eded = int(input("Ədəd daxil edin: "))
```

Bu platformada klaviatura girişi olmadığı üçün `input()` istifadə edən tapşırıqlarda kodun əvvəlində kiçik bir hazır hissə var: `input()` dəyərləri `girisler` siyahısından növbə ilə götürür. Sən adi Jupyter-dəki kimi `input()` yazırsan — sadəcə «istifadəçi» əvəzinə dəyərləri siyahı verir.
