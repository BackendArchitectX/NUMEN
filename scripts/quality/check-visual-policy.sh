#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail() { printf '[NUMEN] visual policy failed: %s\n' "$1" >&2; exit 1; }

SCAN_TARGETS=(frontend/src frontend/index.html frontend/public)
OLD_WARM_HEX='c86537|a94f27|f8e4d8|c86336|d87849|b85a31|dc8b60|d49170|f5f1e9|efe9df|faf8f4|f1eee8|e2ddd4|d4cec3|fffaf6|f6e6dc|f8f5ef|f3eee6|f1c6ae|4a2414|da8052|f97316|fb923c|ea580c|c2410c|fff7ed|ffedd5|fed7aa'

if grep -R -nEi "#(${OLD_WARM_HEX})" "${SCAN_TARGETS[@]}" --include='*.css' --include='*.tsx' --include='*.ts' --include='*.js' --include='*.svg' --include='*.html'; then
  fail "legacy warm/orange palette values remain in frontend source"
fi

if grep -R -nEi '(orange|terracotta|copper|peach|warm[[:space:]_-]*beige)' "${SCAN_TARGETS[@]}" --include='*.css' --include='*.tsx' --include='*.ts' --include='*.js' --include='*.svg' --include='*.html'; then
  fail "prohibited warm color names remain in frontend source"
fi

if grep -R -nEi 'radial-gradient|filter:[[:space:]]*drop-shadow|text-shadow:' frontend/src --include='*.css'; then
  fail "decorative glow/background effects violate Aurora X restraint"
fi

for token in   --color-bg-app   --color-bg-surface   --color-text-primary   --color-border   --color-action-primary   --color-live   --color-intelligence   --color-success   --color-error; do
  grep -q -- "$token" frontend/src/styles/global.css || fail "required semantic visual token missing: $token"
done

if [[ -f frontend/src/components/MetricsGrid.tsx ]]; then
  fail "generic KPI-card wall component was reintroduced; outcome-specific summaries are required"
fi

printf '[NUMEN] Aurora X visual policy OK\n'
