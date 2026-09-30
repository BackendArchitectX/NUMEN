#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
bash -n start.sh stop.sh scripts/runtime/start.sh scripts/runtime/stop.sh
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -NonInteractive -File scripts/quality/check-powershell.ps1
else
  printf '[NUMEN] pwsh unavailable; PowerShell parser check skipped locally. CI runs it.\n'
fi
printf '[NUMEN] runtime launcher syntax OK\n'
