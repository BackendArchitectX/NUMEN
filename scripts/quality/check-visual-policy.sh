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

if grep -R -nEi 'radial-gradient|filter:[[:space:]]*drop-shadow|text-shadow:|backdrop-filter:' frontend/src --include='*.css'; then
  fail "decorative glow/background effects violate Aurora X restraint"
fi

for token in   --color-bg-app   --color-bg-surface   --color-text-primary   --color-border   --color-action-primary   --color-live   --color-intelligence   --color-success   --color-error   --z-navigation   --z-sticky   --z-inspector-backdrop   --z-inspector; do
  grep -q -- "$token" frontend/src/styles/global.css || fail "required semantic visual token missing: $token"
done

if [[ -f frontend/src/components/MetricsGrid.tsx ]]; then
  fail "generic KPI-card wall component was reintroduced; outcome-specific summaries are required"
fi

if grep -R -nE 'z-index:[[:space:]]*(999|[1-9][0-9]{3,})' frontend/src --include='*.css'; then
  fail "arbitrary extreme z-index values violate the Aurora X layering model"
fi

if grep -R -nE 'OutcomeStatIcon|outcomeStatIcon|className="outcomeStats"' frontend/src --include='*.tsx' --include='*.css'; then
  fail "generic KPI-wall outcome styling was reintroduced"
fi

grep -q '!workspace.selected && <PromptComposer' frontend/src/app/App.tsx || fail "selected research must remain outcome-first instead of composer-first"
grep -q 'Refine research' frontend/src/components/ResearchOutcome.tsx || fail "completed research is missing a functional refine action"
grep -q 'View sources' frontend/src/components/ResearchOutcome.tsx || fail "completed research is missing direct source navigation"
grep -q 'sources checked' frontend/src/components/WorkflowPanel.tsx || fail "active research is missing measurable source-progress language"
grep -q 'Demo records · no quality filter' frontend/src/components/DatasetExplorer.tsx || fail "demo-only datasets must not expose misleading quality precision"
grep -q 'composerAdvanced' frontend/src/components/PromptComposer.tsx || fail "source configuration must remain progressively disclosed"
grep -q 'groupResearchTasks' frontend/src/components/Sidebar.tsx || fail "recent research must group repeated runs instead of showing duplicate task noise"
if grep -q 'navCount' frontend/src/components/Sidebar.tsx; then
  fail "bounded task data must not be presented as exact global navigation counts"
fi
grep -q 'Research complete' frontend/src/components/ResearchOutcome.tsx || fail "completed research must use explicit completed-outcome language"
if grep -q 'Research ready' frontend/src/components/ResearchOutcome.tsx; then
  fail "ambiguous Research ready copy was reintroduced"
fi


[[ -f frontend/src/components/SourceExplorer.tsx ]] || fail "first-class source coverage workspace is missing"
[[ -f frontend/src/components/DatasetLibrary.tsx ]] || fail "published dataset library is missing"
[[ -f frontend/src/shared/research.ts ]] || fail "recent-research grouping helper is missing"
grep -q "New research" frontend/src/components/Sidebar.tsx || fail "explicit new-research action is missing"
grep -q "Research complete" frontend/src/components/ResearchOutcome.tsx || fail "zero-result completion state is missing"

printf '[NUMEN] Aurora X visual policy OK\n'


if grep -q 'className="primaryAction"' frontend/src/components/ResearchOutcome.tsx; then
  fail "completed outcome actions must not overpower results with a filled primary action"
fi


if grep -nEi '(experience|pricing|target[[:space:]_-]*customer|differentiator|required[[:space:]_-]*skills)' frontend/src/model/prompts.ts frontend/src/components/PromptComposer.tsx; then
  fail "example research copy promises fields outside the shipped record contract"
fi
