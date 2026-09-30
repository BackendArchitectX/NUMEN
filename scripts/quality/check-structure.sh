#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail() { printf '[NUMEN] repository check failed: %s\n' "$1" >&2; exit 1; }

required_files=(
  README.md
  LICENSE
  SECURITY.md
  CONTRIBUTING.md
  docker-compose.yml
  start.bat
  start.ps1
  start.sh
  stop.ps1
  stop.sh
  backend/pom.xml
  backend/Dockerfile
  frontend/package.json
  frontend/package-lock.json
  frontend/Dockerfile
  frontend/nginx.conf
  scripts/runtime/start.ps1
  scripts/runtime/start.sh
  scripts/quality/check-structure.sh
  scripts/quality/check-runtime.sh
  scripts/quality/check-powershell.ps1
  docs/ARCHITECTURE.md
  docs/DEVELOPMENT.md
  docs/ENGINEERING_STANDARDS.md
  docs/RUNBOOK.md
  docs/SECURITY.md
  .github/workflows/branch-policy.yml
  backend/src/main/resources/db/migration/V2__runtime_hardening.sql
  backend/src/main/java/ai/numen/service/DatasetExportService.java
  backend/src/main/java/ai/numen/exception/WorkflowCapacityException.java
  frontend/src/app/AppErrorBoundary.tsx
)

required_dirs=(
  backend/src/main/java/ai/numen/config
  backend/src/main/java/ai/numen/controller
  backend/src/main/java/ai/numen/dto
  backend/src/main/java/ai/numen/entity
  backend/src/main/java/ai/numen/exception
  backend/src/main/java/ai/numen/repository
  backend/src/main/java/ai/numen/security
  backend/src/main/java/ai/numen/service
  backend/src/main/resources/db/migration
  backend/src/test
  frontend/src/app
  frontend/src/components
  frontend/src/hooks
  frontend/src/model
  frontend/src/services
  frontend/src/shared
  frontend/src/styles
  docs/adr
)

for path in "${required_files[@]}"; do [[ -f "$path" ]] || fail "missing required file: $path"; done
for path in "${required_dirs[@]}"; do [[ -d "$path" ]] || fail "missing required directory: $path"; done

tracked_bad="$(git ls-files | grep -E '(^|/)(node_modules|target|dist)(/|$)|(^|/)\.env$' || true)"
[[ -z "$tracked_bad" ]] || fail "generated/private files are tracked: $tracked_bad"

[[ ! -e .github/dependabot.yml ]] || fail "Dependabot branch generation is disabled by the main-only branch policy"

if grep -Eq '"[^"]+": "(latest|\\*)"' frontend/package.json; then
  fail "frontend/package.json must pin dependency versions; latest and wildcard versions are not allowed"
fi

if grep -R -Eq 'fonts\.googleapis\.com|fonts\.gstatic\.com' frontend/src frontend/nginx.conf; then
  fail "frontend must not depend on runtime Google Font/CDN requests"
fi

printf '[NUMEN] repository structure OK\n'
