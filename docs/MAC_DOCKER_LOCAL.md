# Mac-də Docker Desktop ilə lokal işə salma

Docker Desktop işləməlidir. Hostda Node, PostgreSQL və Python quraşdırılması tələb olunmur.
Layihənin bu versiyasını ayrıca qovluğa açın və həmin qovluqda terminal açın:

```sh
bash scripts/docker-local.sh
```

İlk yığım paketləri endirir və bir neçə dəqiqə çəkə bilər. Sonra
http://localhost:3000/giris ünvanını açın. Admin e-poçtu və təsadüfi şifrəsi
yalnız yerli `.env.docker.local` faylının `SEED_ADMIN_EMAIL` və
`SEED_ADMIN_PASSWORD` sətirlərindədir. Faylı paylaşmayın.

```sh
bash scripts/docker-local.sh status
bash scripts/docker-local.sh logs
bash scripts/docker-local.sh stop
```

Təkrar başlatmaq üçün ilk əmri yenidən işlədin. Skript mövcud `.env` faylını
dəyişmir, bazanı sıfırlamır, volume silmir. `dacy-local` Compose layihəsinin
ayrıca `pgdata`, `storage` və `mail` volume-ları var. Köhnə quraşdırmanın
məlumatları avtomatik köçürülmür. İlk admin və nümunə məzmun yalnız istifadəçisi
olmayan yeni bazada yaradılır. 3000 portu məşğuldursa `.env.docker.local` faylında
`WEB_PORT=3001` yazıb başlatma əmrini yenidən işlədin.

API açılışda miqrasiyaları tətbiq edir, bazanı və həqiqi SQL/Python icrasını
yoxlayır. Bu yoxlamalar keçməsə web başlamır; səbəb `logs` əmrində görünür.
Məktublar Docker-in şəxsi `mail` volume-unda saxlanılır; SMTP aktiv deyil.

Bu konfiqurasiya lokal Docker Desktop sınağı üçündür. Yalnız web portu localhost-a
açılır; baza və API hosta port açmır. İçəridəki bubblewrap üçün API konteynerinin
xarici seccomp/AppArmor siyasətləri istisna edilir. API qeyri-root istifadəçi ilə,
capability-lərsiz və Docker socket-i olmadan işləyir; tələbə kodu öz namespace və
seccomp məhdudiyyətlərində qalır. Bu faylı olduğu kimi internetə açıq deployment
üçün istifadə etməyin.

Docker faylı həm amd64, həm arm64 bazalarından istifadə edə bilir. Faktiki
platforma üzrə yoxlama nəticəsini buraxılış qeydlərində nəzərə alın.
