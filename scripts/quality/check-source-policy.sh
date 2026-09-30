#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail() { printf '[NUMEN] source policy failed: %s\n' "$1" >&2; exit 1; }

if git grep -nE '\b(TODO|FIXME|HACK|XXX)\b' --     'backend/src/**' 'frontend/src/**'     ':!scripts/quality/check-source-policy.sh' >/tmp/numen-source-markers.txt 2>/dev/null; then
  cat /tmp/numen-source-markers.txt
  fail "runtime source contains TODO/FIXME/HACK/XXX markers"
fi

if git grep -n 'dangerouslySetInnerHTML' -- frontend/src >/tmp/numen-unsafe-html.txt 2>/dev/null; then
  cat /tmp/numen-unsafe-html.txt
  fail "raw HTML rendering is not allowed without an explicit reviewed exception"
fi

if git grep -nE 'System\.out\.|printStackTrace\(' -- backend/src/main >/tmp/numen-java-stdio.txt 2>/dev/null; then
  cat /tmp/numen-java-stdio.txt
  fail "backend runtime code must use structured application logging"
fi

printf '[NUMEN] source policy OK\n'
