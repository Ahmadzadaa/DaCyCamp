#!/bin/sh
# Docker Desktop is the only host requirement. Never resets or removes volumes.
set -eu
cd "$(dirname "$0")/.."
action=${1:-start}
case "$action" in start|stop|status|logs) ;; *) echo 'Usage: bash scripts/docker-local.sh [start|stop|status|logs]' >&2; exit 1;; esac
docker info >/dev/null
if [ ! -f .env.docker.local ]; then
  if [ "$action" != start ]; then echo 'Run start first.' >&2; exit 1; fi
  umask 077
  # The separate file does not replace an existing .env or its keys.
  (
    set -C
    cat > .env.docker.local <<EOF
WEB_PORT=3000
DACY_DB_PASSWORD=$(openssl rand -hex 24)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CTF_PEPPER=$(openssl rand -hex 32)
SEED_ADMIN_EMAIL=admin@dacy.local
SEED_ADMIN_PASSWORD=$(openssl rand -hex 16)
EOF
  )
fi
compose() { docker compose --env-file .env.docker.local -f docker-compose.local.yml "$@"; }
case "$action" in
  start)
    compose build api
    compose up -d --wait --wait-timeout 300
    web_port=$(sed -n 's/^WEB_PORT=//p' .env.docker.local)
    echo "Ready. URL: http://localhost:${web_port:-3000}"
    echo 'Admin login: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.docker.local'
    ;;
  stop) compose stop ;;
  status) compose ps ;;
  logs) compose logs --tail=100 -f ;;
esac
