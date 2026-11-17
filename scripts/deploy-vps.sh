#!/bin/sh
# DaCy Academy — VPS-də bir əmrlə işə salma (Caddy HTTPS + web + api + PostgreSQL).
#   bash scripts/deploy-vps.sh start <domen> <admin-email>   ilk dəfə (sonrakı start-larda arqument lazım deyil)
#   bash scripts/deploy-vps.sh update                        git pull + yenidən build (məlumatlar qalır)
#   bash scripts/deploy-vps.sh status | logs | stop | admin
# Heç vaxt volume silmir, bazanı sıfırlamır. Mövcud .env.production-ın üzərinə yazmır.
set -eu
cd "$(dirname "$0")/.."
action=${1:-start}
case "$action" in start|update|stop|status|logs|admin) ;; *)
  echo 'İstifadə: bash scripts/deploy-vps.sh [start <domen> <admin-email>|update|status|logs|stop|admin]' >&2; exit 1;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker yoxdur. Quraşdırın: curl -fsSL https://get.docker.com | sh' >&2; exit 1
fi
docker info >/dev/null

envf=.env.production
if [ ! -f "$envf" ]; then
  if [ "$action" != start ] || [ $# -lt 3 ]; then
    echo "İlk dəfə: bash scripts/deploy-vps.sh start <domen> <admin-email>  (məs. start dacy.az admin@dacy.az)" >&2; exit 1
  fi
  domain=$2; admin=$3
  umask 077
  (
    set -C
    cat > "$envf" <<EOF
# DaCy Academy production — bu faylı git-ə əlavə ETMƏYİN, ehtiyat nüsxəsini təhlükəsiz yerdə saxlayın.
DOMAIN=$domain
ACME_EMAIL=$admin
DACY_DB_PASSWORD=$(openssl rand -hex 24)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CTF_PEPPER=$(openssl rand -hex 32)
SEED_ADMIN_EMAIL=$admin
SEED_ADMIN_PASSWORD=$(openssl rand -hex 12)
APP_TIMEZONE=Asia/Baku
# Məktublar: file = serverdə saxlanılır (göndərilmir). Real göndərmək üçün smtp + SMTP_* doldurun.
MAIL_TRANSPORT=file
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASSWORD=
# MAIL_FROM=DaCy Academy <noreply@$domain>
EOF
  )
  echo "✓ $envf yaradıldı (təsadüfi açarlar və admin şifrəsi ilə)."
fi

# Ubuntu 23.10+ unprivileged user namespace-ləri məhdudlaşdırır — bubblewrap (Python sandbox) işləməz
f=/proc/sys/kernel/apparmor_restrict_unprivileged_userns
if [ "$action" = start ] || [ "$action" = update ]; then
  if [ -r "$f" ] && [ "$(cat "$f")" = 1 ]; then
    echo "⚠ Bu server unprivileged user namespace-ləri bağlayır; Python tapşırıqlarının sandbox-u işləməyəcək." >&2
    echo "  Həll (bir dəfə, root kimi):" >&2
    echo "    echo 'kernel.apparmor_restrict_unprivileged_userns=0' > /etc/sysctl.d/60-dacy-userns.conf && sysctl --system" >&2
    echo "  Və ya Debian 12 serverdən istifadə edin." >&2
    exit 1
  fi
fi

compose() { docker compose --env-file "$envf" -f docker-compose.prod.yml "$@"; }
domain=$(sed -n 's/^DOMAIN=//p' "$envf")

case "$action" in
  start|update)
    if [ "$action" = update ]; then git pull --ff-only; fi
    compose build api
    compose up -d --wait --wait-timeout 600
    echo
    echo "✓ Hazırdır: https://$domain"
    echo "  Admin girişi: bash scripts/deploy-vps.sh admin"
    ;;
  admin)
    echo "E-poçt: $(sed -n 's/^SEED_ADMIN_EMAIL=//p' "$envf")"
    echo "Şifrə:  $(sed -n 's/^SEED_ADMIN_PASSWORD=//p' "$envf")"
    echo "(Dəyərlər $envf faylındadır — o faylı təhlükəsiz saxlayın.)"
    ;;
  stop) compose stop ;;
  status) compose ps ;;
  logs) compose logs --tail=100 -f ;;
esac
