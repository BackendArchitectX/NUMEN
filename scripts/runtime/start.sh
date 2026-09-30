#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

NO_BROWSER=false
RESET=false
NO_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --no-browser) NO_BROWSER=true ;;
    --reset) RESET=true ;;
    --no-build) NO_BUILD=true ;;
    -h|--help)
      cat <<'EOF'
Usage: ./start.sh [--no-browser] [--reset] [--no-build]
  --no-browser  Do not open the application automatically.
  --reset       Remove containers and the local database volume before start.
  --no-build    Reuse existing images instead of rebuilding.
EOF
      exit 0 ;;
    *) printf '[NUMEN] ERROR: unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

log() { printf '\033[36m[NUMEN]\033[0m %s\n' "$1"; }
ok() { printf '\033[32m[NUMEN]\033[0m %s\n' "$1"; }
fail() { printf '\033[31m[NUMEN] ERROR:\033[0m %s\n' "$1" >&2; exit 1; }

get_env() {
  local name="$1" default="$2" value
  value="$(awk -F= -v key="$name" '$1 == key {sub(/^[^=]*=/, ""); gsub(/^[ \t\"\047]+|[ \t\"\047]+$/, ""); print; exit}' .env 2>/dev/null || true)"
  printf '%s' "${value:-$default}"
}

new_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    od -An -N24 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

ensure_database_password() {
  local current password
  current="$(get_env POSTGRES_PASSWORD "")"
  if [[ -n "$current" && "$current" != "GENERATED_ON_FIRST_START" ]]; then
    chmod 600 .env 2>/dev/null || true
    return
  fi
  password="$(new_password)"
  awk -v password="$password" '
    BEGIN { updated=0 }
    /^[[:space:]]*POSTGRES_PASSWORD=/ { print "POSTGRES_PASSWORD=" password; updated=1; next }
    { print }
    END { if (!updated) print "POSTGRES_PASSWORD=" password }
  ' .env > .env.tmp
  mv .env.tmp .env
  chmod 600 .env 2>/dev/null || true
  log "Generated a unique local database password"
}

health_ok() {
  local url="$1" body
  if command -v curl >/dev/null 2>&1; then
    body="$(curl --fail --silent --max-time 2 "$url" 2>/dev/null)" || return 1
  elif command -v wget >/dev/null 2>&1; then
    body="$(wget -qO- --timeout=2 "$url" 2>/dev/null)" || return 1
  else
    return 1
  fi
  grep -q '"status":"UP"' <<<"$body" && grep -q '"service":"NUMEN"' <<<"$body"
}

validate_port() {
  local name="$1" value="$2" numeric
  [[ "$value" =~ ^[0-9]+$ ]] || fail "$name must be an integer between 1 and 65535. Current value: $value"
  numeric=$((10#$value))
  (( numeric >= 1 && numeric <= 65535 )) || fail "$name must be between 1 and 65535. Current value: $value"
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "[:.]${port}$"
  else
    return 1
  fi
}

command -v docker >/dev/null 2>&1 || fail "Docker with Compose v2 is required."
if ! docker info >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1; then
    log "Docker engine is not running. Starting Docker Desktop automatically"
    open -a Docker >/dev/null 2>&1 || true
    for _ in $(seq 1 60); do
      sleep 2
      docker info >/dev/null 2>&1 && break
    done
  fi
fi
docker info >/dev/null 2>&1 || fail "Docker is installed but the engine is not running."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."

if [[ ! -f .env ]]; then
  cp .env.example .env
  log "Created .env from .env.example"
fi
ensure_database_password

WEB_PORT="$(get_env NUMEN_WEB_PORT 5173)"
API_PORT="$(get_env NUMEN_API_PORT 8080)"
validate_port NUMEN_WEB_PORT "$WEB_PORT"
validate_port NUMEN_API_PORT "$API_PORT"
[[ "$WEB_PORT" != "$API_PORT" ]] || fail "NUMEN_WEB_PORT and NUMEN_API_PORT must be different."
APP_URL="http://localhost:${WEB_PORT}"
HEALTH_URL="${APP_URL}/api/v1/health"

if health_ok "$HEALTH_URL"; then
  ok "NUMEN is already running and healthy"
  printf '  Web: %s\n  API gateway: %s/api/v1\n' "$APP_URL" "$APP_URL"
  if [[ "$NO_BROWSER" != true ]]; then
    if command -v open >/dev/null 2>&1; then open "$APP_URL" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$APP_URL" >/dev/null 2>&1 || true
    fi
  fi
  exit 0
fi

log "Validating Docker Compose configuration"
docker compose config --quiet

if [[ "$RESET" == true ]]; then
  log "Reset requested: removing NUMEN containers and local database volume"
  docker compose down --volumes --remove-orphans
else
  log "Recovering any stale NUMEN containers while preserving database data"
  docker compose down --remove-orphans
fi

port_in_use "$WEB_PORT" && fail "Web port $WEB_PORT is already in use. Change NUMEN_WEB_PORT in .env or stop the conflicting process."
port_in_use "$API_PORT" && fail "API port $API_PORT is already in use. Change NUMEN_API_PORT in .env or stop the conflicting process."

compose=(docker compose up --detach --remove-orphans --wait --wait-timeout 180)
[[ "$NO_BUILD" == true ]] || compose+=(--build)

log "Starting PostgreSQL, Spring Boot API and React gateway"
if ! "${compose[@]}"; then
  docker compose ps || true
  docker compose logs --tail 200 || true
  fail "NUMEN failed to start. Diagnostics are shown above."
fi

log "Verifying the public application endpoint"
healthy=false
for _ in $(seq 1 15); do
  if health_ok "$HEALTH_URL"; then healthy=true; break; fi
  sleep 2
done
if [[ "$healthy" != true ]]; then
  docker compose ps || true
  docker compose logs --tail 200 || true
  fail "Containers started, but the application health endpoint did not become ready."
fi

printf '\n'
ok "NUMEN is ready"
printf '  Web:         %s\n' "$APP_URL"
printf '  API gateway: %s/api/v1\n' "$APP_URL"
printf '  Direct API:  http://localhost:%s/api/v1\n' "$API_PORT"
printf '  Health:      %s\n' "$HEALTH_URL"
printf '  Stop:        ./stop.sh\n'
printf '  Reset data:  ./stop.sh --volumes\n\n'
docker compose ps

if [[ "$NO_BROWSER" != true ]]; then
  if command -v open >/dev/null 2>&1; then open "$APP_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$APP_URL" >/dev/null 2>&1 || true
  fi
fi
