#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '\033[36m[NUMEN]\033[0m %s\n' "$1"; }
fail() { printf '\033[31m[NUMEN] ERROR:\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is not installed or is not available on PATH."
docker info >/dev/null 2>&1 || fail "Docker daemon is not running."

if [[ ! -f .env ]]; then
  cp .env.example .env
  log "Created .env from .env.example"
fi

log "Validating Docker Compose configuration"
docker compose config --quiet

log "Building and starting PostgreSQL, Spring Boot and React"
docker compose up --build --detach --remove-orphans

WEB_PORT="$(awk -F= '/^NUMEN_WEB_PORT=/{print $2; exit}' .env | tr -d '[:space:]')"
WEB_PORT="${WEB_PORT:-5173}"
APP_URL="http://localhost:${WEB_PORT}"
HEALTH_URL="${APP_URL}/api/v1/health"

log "Waiting for the application to become healthy"
healthy=false
for _ in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1; then
    if curl --fail --silent "$HEALTH_URL" | grep -q '"status":"UP"'; then healthy=true; break; fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -qO- "$HEALTH_URL" | grep -q '"status":"UP"'; then healthy=true; break; fi
  else
    fail "curl or wget is required for startup health verification."
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  docker compose ps || true
  docker compose logs --tail 120 || true
  fail "NUMEN did not become healthy within 120 seconds."
fi

printf '\n\033[32mNUMEN is ready\033[0m\n'
printf 'Web: %s\n' "$APP_URL"
printf 'API: http://localhost:8080/api/v1\n'
printf 'Stop: ./stop.sh\n\n'

if [[ "${1:-}" != "--no-browser" ]]; then
  if command -v open >/dev/null 2>&1; then open "$APP_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$APP_URL" >/dev/null 2>&1 || true
  fi
fi
