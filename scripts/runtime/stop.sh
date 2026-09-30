#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

args=(docker compose down --remove-orphans)
if [[ "${1:-}" == "--volumes" ]]; then args+=(--volumes); fi
"${args[@]}"
if [[ "${1:-}" == "--volumes" ]]; then
  printf '\033[32m[NUMEN]\033[0m NUMEN stopped and local database data removed.\n'
else
  printf '\033[32m[NUMEN]\033[0m NUMEN stopped. Local database data was preserved.\n'
fi
