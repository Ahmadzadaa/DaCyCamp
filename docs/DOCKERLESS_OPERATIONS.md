# Docker olmadan işə salma və idarəetmə

SQL/Python pilotu üçün Linux, Node.js **22.13+** (burada 24), pnpm 10, PostgreSQL 16+, Python 3.11+ və davamlı fayl diski lazımdır. Terminal/CTF və Docker faylları tarixi imkanları saxlamaq üçün repoda qalır; bu rejimdə istifadə edilmir. Web və API Node.js ilə işləyir.

## İlk quraşdırma

Ubuntu/Debian nümunəsi:

```bash
sudo apt-get update
sudo apt-get install bubblewrap python3-venv postgresql-client rclone
corepack pnpm install --frozen-lockfile
python3 -m venv .local/python
.local/python/bin/pip install -r ops/python-requirements.txt
```

PostgreSQL serveri ayrıca yerli servis və ya idarə olunan xidmət ola bilər. Bazanı və giriş məlumatlarını `.env`-də göstərin. İşlək bazada `db:reset` işlətməyin. `.env.example`-dakı açıq nümunə açarları hər biri ayrıca təsadüfi açarla əvəz edilməlidir.

```dotenv
PYTHON_BIN=/opt/dacy/.local/python/bin/python3
PYTHON_SANDBOX_BIN=/usr/bin/bwrap
LAB_DRIVER=off
LEGACY_LABS_ENABLED=false
NEXT_PUBLIC_LEGACY_LABS=false
```

Yol tətbiqin faktiki yerləşdiyi qovluğa uyğun olmalıdır. PostgreSQL müştərisinin versiyası server versiyasından köhnə olmamalıdır; fərqli qovluqdadırsa `PG_BIN` verin. Linux unprivileged user namespaces imkanına ehtiyac var. `doctor` sandbox yoxlamasından keçmirsə host siyasətini və bubblewrap icazələrini düzəldin; sandbox-ı söndürməklə tələbə kodunu API prosesində işlətməyin.

```bash
corepack pnpm db:deploy
corepack pnpm build
corepack pnpm run doctor
corepack pnpm pilot:start
corepack pnpm pilot:status
```

`db:deploy` əlavə miqrasiyaları tətbiq edir. `build`, `start` və `pilot:start` seed/reset işləmir. İlk admin üçün yalnız yeni mühitdə `SEED_*` dəyərləri və ayrıca `db:seed` istifadə edilir. Yerli bu sessiyanın hesabları qorunan `.local/PILOT_ACCESS.md` faylındadır.

Web `http://localhost:3000`, API `http://localhost:4000`. `pilot:start` terminaldan ayrılan supervisor açır; web/API/monitor xəta ilə dayandıqda yenidən başladılır. Təkrar start ikinci nüsxə yaratmır. `pilot:stop` bütün idarə olunan servisləri dayandırır, `pilot:restart` yenidən açır. Yeni yığım üçün əvvəl dayandırın, sonra build və start edin. PostgreSQL mövcud məlumat qovluğundan açılır; sıfırlanmır.

## Qiymətləndirmə

- Brauzer SQL/Python sınağı və ilkin rəy üçün worker işlədir. Göndərişdə server kodu yenidən icra edir; brauzerin keçid bayrağı/hash-i əsas götürülmür.
- SQL məhdud Node/DuckDB altprosesində, xarici giriş bağlı halda işləyir; 10 saniyə vaxt və nəticə limiti var.
- Python birdəfəlik bubblewrap istifadəçi/PID/mount/network mühitində, tətbiq sirrləri olmadan işləyir. `/work` və `/tmp` müvəqqətidir; datasetlər yalnız oxunur. Etibarlı grader tələbə interpreterindən ayrıdır; JSON məlumatları və məhdud əməliyyatlarla nəticəni yoxlayır, pickle istifadə etmir. Learner interpreterində seccomp yeni prosesləri, exec, proseslərarası müdaxilə və siqnalları bloklayır; elmi paketlər üçün eyni prosesin thread-lərinə icazə verir.
- Python üçün 15 saniyə divar vaxtı, 10 saniyə CPU və proses başına 1 GiB virtual yaddaş limiti var. SQL/Python ortaq növbəsi eyni anda 2 icra, ən çox 12 gözləyən sorğu qəbul edir.
- Köhnə brauzer təsdiqli nəticələr server tərəfindən yoxlanmış kimi yenidən işarələnmir. Müəllim təsdiqli qiymət/sertifikat qaydaları saxlanılır.

## Şifrə bərpası və məktublar

Yerli sınaqda:

```dotenv
MAIL_TRANSPORT=file
MAIL_OUTBOX_DIR=.local/mail
```

Məktub yalnız şəxsi disk qovluğunda saxlanılır; internetə və tələbənin poçtuna göndərilmir. Qovluğu publik web qovluğuna köçürməyin. Canlı göndəriş üçün:

```dotenv
MAIL_TRANSPORT=smtp
MAIL_FROM="DaCy Academy <noreply@your-domain.example>"
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account
SMTP_PASSWORD=your-private-password
OPERATIONS_ALERT_EMAIL=your-operations-address
```

SMTP xidməti və təsdiqlənmiş göndərən domeni ayrıca seçilir. Şifrə bərpa linki 30 dəqiqəlik, birdəfəlikdir; bazada yalnız hash saxlanılır. Link tokeni URL fragmentindədir, səhifə sorğusunun ünvanına/loguna daxil olmur. Şifrə dəyişəndə köhnə access/refresh sessiyaları dərhal etibarsızlaşır. Admin hesabı bloklaya və bütün cihazlardan çıxış etdirə bilər; akademik məlumatlar saxlanılır.

## Backup və monitor

`pilot:start` hər 20 saniyədə web/API yoxlaması və standart olaraq hər 24 saatda backup edir. Ardıcıl 3 xəta yerli xəbərdarlıq yaradır. SMTP və `OPERATIONS_ALERT_EMAIL` veriləndə eyni xəbərdarlıq məktubla da göndərilir. Xəta ilə dayanan web/API/monitor servisləri supervisor tərəfindən yenidən açılır. Mövcud lokal PostgreSQL köməkçi skripti varsa monitor onun əlçatanlığını da bərpa etməyə çalışır.

```bash
corepack pnpm ops:backup
corepack pnpm pilot:status
```

`backups/dacy-YYYYMMDD-HHMMSS/` qovluğu DB snapshot-ı, fayl arxivi və SHA-256/sətir sayları manifesti saxlayır. Paralel backup əmrləri eyni kilidlə qorunur; əl ilə alınan yeni nüsxənin statusu monitor yenilənməsində də saxlanılır. Heç bir əvvəlki nüsxə avtomatik silinmir. Tutumu server sahibi izləməli və saxlama müddəti seçməlidir.

Xarici, şifrələnmiş rclone hədəfi qurulandan sonra:

```dotenv
BACKUP_INTERVAL_HOURS=24
BACKUP_REMOTE=encrypted-remote:academy-backups
RCLONE_BIN=/usr/bin/rclone
```

Rclone hesabı və parolları servisi işlədən istifadəçinin şəxsi konfiqurasiyasında saxlanılır. Köçürmə `rclone copy --checksum` ilədir; sync/delete işləmir. Xarici hədəfə yazmaq alınmasa yerli nüsxə qalır və xəbərdarlıq yazılır. Bu sessiyada **xarici backup hədəfi və SMTP hesabı verilmədiyi üçün real xarici köçürmə/göndəriş aktiv deyil**.

Bərpanı işlək bazadan fərqli hədəfdə sınayın:

```bash
corepack pnpm db:restore -- backups/dacy-YYYYMMDD-HHMMSS \
  --target-url postgresql://user:password@localhost:5432/dacy_restore_check \
  --create-db --storage-dir /private/restore-check/storage
```

Əmrin URL-sini shell tarixçəsinə yazmamaq üçün faktiki əməliyyatda şəxsi mühit dəyişənindən istifadə edin. Bərpa əvvəl hash-ləri, sonra cədvəl/sətir saylarını və miqrasiya tarixçəsini manifestlə yoxlayır. `--force`/`--allow-production` gündəlik yoxlama üçün lazım deyil.

**Admin → Sistem vəziyyəti** (`/admin/sistem`) sağlamlıq, restart sayı, son backup, xarici hədəf statusu, məktub rejimi, bildiriş/icra növbəsi və xəbərdarlıqları göstərir. Loglar `.local/logs/pilot.log`, monitor vəziyyəti `.local/operations/`, PID məlumatları `.local/run/` daxilindədir; bunlar Git-ə daxil edilmir.

## Server açılışında işə düşmə

Cari mühit systemd işlətmir; burada detached supervisor işləyir. Linux VPS üçün [ops/systemd/dacy.service](../ops/systemd/dacy.service) nümunəsi hazırlanıb. `/opt/dacy`, `dacy` istifadəçisi, Node yolu və yazılan qovluqları faktiki serverə uyğunlaşdırın; əvvəl dayanan terminal nüsxəsini bağlayın və `doctor` keçsin.

```bash
sudo cp ops/systemd/dacy.service /etc/systemd/system/dacy.service
sudo systemctl daemon-reload
sudo systemctl enable --now dacy
sudo systemctl status dacy
```

PostgreSQL ayrıca idarə olunan servis kimi qalır. Canlı hostda HTTPS reverse proxy, faktiki `WEB_ORIGIN`/`NEXT_PUBLIC_APP_URL`, `COOKIE_SECURE=true` və yalnız etibarlı `TRUST_PROXY` ünvanlarını verin. DB portunu və `.local`/storage/backup fayllarını publik açmayın; API-yə web `/api/*` üzərindən keçir. Domen/hosting seçilmədiyinə görə bu sessiyada internetdə yerləşdirmə aparılmayıb.

## Təkrar keyfiyyət yoxlaması

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @dacy/api test:e2e
corepack pnpm audit --prod
corepack pnpm test:load
corepack pnpm test:operations
corepack pnpm --filter @dacy/api check:python:native
```

CI ayrıca test bazasında API testləri, elmi Python mühiti, production yığımı, sandbox diaqnostikası, seçilmiş 35 Chromium ssenarisi və oxuma yük sınağı üçün hazırlanıb. GitHub-a push edilmədiyindən CI-nin uzaq serverdə icra olunduğu iddia edilmir. Faktiki yerli nəticələr [CLASSROOM_QA.md](CLASSROOM_QA.md) faylındadır.
