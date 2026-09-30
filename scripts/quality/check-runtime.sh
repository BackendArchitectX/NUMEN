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
grep -q 'PROBE_HOST="127.0.0.1"' scripts/runtime/start.sh || {
  printf '[NUMEN] runtime launcher validation failed: Unix health probe must use the explicit IPv4 loopback binding.\n' >&2
  exit 1
}
grep -q '\$ProbeHost = "127.0.0.1"' scripts/runtime/start.ps1 || {
  printf '[NUMEN] runtime launcher validation failed: PowerShell health probe must use the explicit IPv4 loopback binding.\n' >&2
  exit 1
}
printf '[NUMEN] runtime launcher syntax and loopback probe policy OK\n'
