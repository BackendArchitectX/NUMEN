#!/usr/bin/env bash
set -Eeuo pipefail

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

health_ok() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --max-time 2 "$url" 2>/dev/null | grep -q '"status":"UP"'
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=2 "$url" 2>/dev/null | grep -q '"status":"UP"'
  else
    return 1
  fi
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

command -v docker >/dev/null 2>&1 || fail "Docker is not installed or is not available on PATH."
docker info >/dev/null 2>&1 || fail "Docker is installed but the Docker engine is not running."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."

if [[ ! -f .env ]]; then
  cp .env.example .env
  if command -v openssl >/dev/null 2>&1; then
    password="$(openssl rand -hex 24)"
  else
    password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
  fi
  awk -v password="$password" 'BEGIN{FS=OFS="="} $1=="POSTGRES_PASSWORD" {$2=password} {print}' .env > .env.tmp
  mv .env.tmp .env
  log "Created .env with a unique local database password"
fi

WEB_PORT="$(get_env NUMEN_WEB_PORT 5173)"
API_PORT="$(get_env NUMEN_API_PORT 8080)"
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

port_in_use "$WEB_PORT" && fail "Web port $WEB_PORT is already in use. Change NUMEN_WEB_PORT in .env or stop the conflicting process."
port_in_use "$API_PORT" && fail "API port $API_PORT is already in use. Change NUMEN_API_PORT in .env or stop the conflicting process."

if [[ "$RESET" == true ]]; then
  log "Reset requested: removing existing containers and local database volume"
  docker compose down --volumes --remove-orphans
fi

log "Validating Docker Compose configuration"
docker compose config --quiet

compose=(docker compose up --detach --remove-orphans --wait --wait-timeout 180)
[[ "$NO_BUILD" == true ]] || compose+=(--build)

log "Starting PostgreSQL, Spring Boot API and React gateway"
if ! "${compose[@]}"; then
  docker compose ps || true
  docker compose logs --tail 160 || true
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
  docker compose logs --tail 160 || true
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
