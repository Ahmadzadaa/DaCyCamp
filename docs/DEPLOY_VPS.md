# VPS-ə deploy (ən qısa yol)

Bir server: **Caddy (HTTPS) → web → api → PostgreSQL**, hamısı Docker-də.
Fayllar: `docker-compose.prod.yml`, `infra/caddy/Caddyfile`, `scripts/deploy-vps.sh`.

## 1. Server və domen

- **Server:** Debian 12 və ya Ubuntu 24.04, **ən azı 4 GB RAM** (build zamanı lazımdır), 2 CPU, 40 GB disk.
  Məs. Hetzner CX22 (≈€5/ay) və ya DigitalOcean 4 GB droplet.
- **Domen:** DNS panelində `A` qeydi: `dacy.az` → serverin IP ünvanı. 80 və 443 portları açıq olmalıdır.

## 2. Üç əmr

```bash
ssh root@SERVER_IP
curl -fsSL https://get.docker.com | sh
git clone -b deploy/vps-compose https://github.com/Ahmadzadaa/DaCyCamp.git && cd DaCyCamp
bash scripts/deploy-vps.sh start dacy.az admin@dacy.az
```

İlk `start`:

- `.env.production` yaradır — təsadüfi baza parolu, JWT/CTF açarları və admin şifrəsi ilə;
- image-i build edir (ilk dəfə 5–15 dəq), miqrasiyaları tətbiq edir, boş bazada admin hesabını yaradır;
- Caddy Let's Encrypt sertifikatını özü alır → `https://dacy.az`.

Admin girişi: `bash scripts/deploy-vps.sh admin`

## 3. Gündəlik

| Əmr | Nə edir |
| --- | --- |
| `bash scripts/deploy-vps.sh update` | `git pull` + yenidən build; məlumatlar qalır |
| `bash scripts/deploy-vps.sh status` | konteynerlərin vəziyyəti |
| `bash scripts/deploy-vps.sh logs` | son loglar (canlı) |
| `bash scripts/deploy-vps.sh stop` | dayandırır (məlumatlar silinmir) |

## Qeydlər

- **Ubuntu 23.10+**: unprivileged user namespace-lər defolt bağlıdır və Python sandbox-u (bubblewrap) işləmir.
  Skript bunu yoxlayır və həll əmrini göstərir. Debian 12-də bu problem yoxdur.
- **Məktublar** defolt olaraq göndərilmir (`MAIL_TRANSPORT=file`). Real göndərmək üçün `.env.production`-da
  `MAIL_TRANSPORT=smtp` və `SMTP_*` doldurun, sonra `update`.
- **Ehtiyat nüsxə**: `.env.production` faylını və bazanı (README → «Ehtiyat nüsxə və bərpa») mütəmadi saxlayın.
  `.env.production` itərsə köhnə sessiyalar və CTF cavab heşləri yararsız olur.
- Baza və API internetə açılmır; yalnız 80/443 (Caddy).
- Terminal lab-ları söndürülüb (`LAB_DRIVER=off`); SQL/Python dərsləri brauzerdə və sandbox-da işləyir.
