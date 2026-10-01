#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail() { printf '[NUMEN] visual policy failed: %s\n' "$1" >&2; exit 1; }

OLD_WARM_HEX='c86537|a94f27|f8e4d8|c86336|d87849|b85a31|dc8b60|d49170|f5f1e9|efe9df|faf8f4|f1eee8|e2ddd4|d4cec3|fffaf6|f6e6dc|f8f5ef|f3eee6|f1c6ae|4a2414|da8052'

if grep -R -nEi "#(${OLD_WARM_HEX})" frontend/src frontend/index.html --include='*.css' --include='*.tsx' --include='*.ts' --include='*.svg' --include='*.html'; then
  fail "legacy warm/orange palette values remain in frontend source"
fi

if grep -R -nEi '(orange|terracotta|copper|peach)' frontend/src frontend/index.html --include='*.css' --include='*.tsx' --include='*.ts' --include='*.svg' --include='*.html'; then
  fail "prohibited warm color names remain in frontend source"
fi

if grep -R -nEi 'radial-gradient|filter:[[:space:]]*drop-shadow' frontend/src --include='*.css'; then
  fail "decorative glow/background effects violate Aurora restraint"
fi

printf '[NUMEN] Aurora visual policy OK\n'
