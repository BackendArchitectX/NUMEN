# NUMEN Aurora X Visual System

NUMEN uses **Aurora X**, a fresh, cool, premium analytical system built around Deep Ink structure, Frost workspaces, Azure interaction, Aqua live-state cues, Iris interpretation and Emerald verification.

The full implementation directive is in [AURORA_X_VISUAL_DIRECTIVE.md](AURORA_X_VISUAL_DIRECTIVE.md).

## Product hierarchy

The default hierarchy is outcome-first:

1. research question,
2. useful result,
3. source/evidence trust,
4. next action,
5. technical execution detail.

Completed research must not lead with the workflow timeline or internal engine state.

## Semantic color roles

| Semantic token | Role | Light value |
| --- | --- | --- |
| `--color-bg-app` | Frost application background | `#F6F8FC` |
| `--color-bg-surface` | primary analytical surface | `#FFFFFF` |
| `--color-text-primary` | primary Ink typography | `#0F1728` |
| `--color-text-secondary` | supporting typography | `#42506A` |
| `--color-border` | cool structural separator | `#E1E7EF` |
| `--color-action-primary` | decisive interaction / selected state | `#2F6BFF` |
| `--color-live` | live, fresh, streaming, active research | `#18C3D6` |
| `--color-intelligence` | interpretation, synthesis and review | `#685BF6` |
| `--color-success` | verified, healthy and complete | `#11996F` |
| `--color-error` | true failures and destructive feedback | `#D92D20` |

Components consume semantic tokens instead of scattering palette values through JSX.

## Palette prohibition

Intentional orange, burnt orange, peach, copper, rust, terracotta, orange-red, warm beige and cream-dominant UI are prohibited.

Aurora X is not a generic blue dashboard. Azure is scarce and action-oriented; Aqua is live/fresh; Iris is interpretation/review; Emerald is trust/completion; most analytical surfaces remain cool neutral.

## Navigation

The sidebar uses layered Deep Ink surfaces, compact rows and a narrow Azure selection indicator. Primary navigation uses plain product language:

- Research
- Datasets
- Runs

Recent research is outcome-oriented. Infrastructure/security controls do not occupy permanent primary-navigation space.

## Research composer

The composer is a compact productivity surface rather than a hero. It exposes:

- a plain-language research prompt,
- concise guidance,
- example prompts,
- one primary **Run research** action,
- keyboard execution.

## Research outcome

A completed run receives a dedicated outcome summary derived only from persisted records:

- results,
- unique organizations,
- unique sources,
- unique locations,
- evidence-linked records,
- update time,
- top locations where available.

Demo records are explicitly labeled.

## Active research

The primary UI communicates what NUMEN is doing using human language such as **Searching sources** or **Validating results**.

Fixed internal engine milestones are not shown as precise user-facing percentages.

Timeline, plan and safeguards remain available under **Run details**.

## Results and evidence

Results are the dominant completed-research surface.

Tables use compact rows, sticky headers, real sorting and actual search/filter behavior. Selecting a record opens a right-side evidence inspector without losing dataset context.

The inspector shows only persisted data and clearly distinguishes source-backed records from demo records.

## Typography and density

Use the primary sans-serif stack for normal product text. Monospace is reserved for hashes, IDs, code and diagnostics.

Typical working sizes:

- page title: 24–30px,
- panel title: 13–16px,
- body: 11–14px,
- table: 12–13px,
- technical metadata: 9–11px.

Avoid giant application headings, excessive uppercase, excessive letter spacing and nested cards.

## Surfaces and radii

Normal panels rely on cool borders and spacing rather than large shadows.

- 4px technical micro-elements,
- 6px controls,
- 8px standard panels,
- 10px floating surfaces.

Floating drawers/popovers may use the stronger elevation token.

## Theme behavior

Light and dark themes are both supported. Theme preference is persisted locally and initialized through a CSP-safe static script before the React application loads to avoid a visible theme flash.

Dark mode uses layered Ink/navy rather than pure black and avoids neon treatment.

## Motion

Motion is quiet and purposeful. Most interactions should complete in roughly 120–240ms. Active research may use a subtle Aqua pulse; reduced-motion users receive effectively static behavior.

## Accessibility

Maintain visible focus states, keyboard-operable controls, semantic tables/forms, non-color status cues, reduced motion, forced-colors resilience and sufficient contrast.

The right-side evidence inspector closes through its explicit close control, backdrop action or Escape key.

## Automated enforcement

`scripts/quality/check-visual-policy.sh` rejects known legacy warm/orange values, prohibited warm color names and selected decorative effects.

Visual acceptance should additionally verify:

- no fake progress precision,
- no indistinguishable demo/live records,
- no generic KPI-card wall,
- no workflow-debugger-first completed state,
- no theme flash,
- no evidence inspector hidden behind other layers.

Aurora X is a product hierarchy, not a recolor.


## Sources workspace

Sources are a first-class product surface rather than a hidden implementation detail. The source view uses exact backend aggregation from the full persisted dataset and therefore does not change when the user searches or quality-filters the Results table.

Each source exposes record contribution, captured-evidence coverage, collection freshness, source type and explicit demo/live state.

## Navigation and selection

Research, Datasets, Sources and Runs use durable hash routes. Selected research context is encoded into Research/Datasets/Sources URLs so refresh and browser back/forward preserve intent.

New research is explicit: it clears the prior selection and filter state and presents an empty composer. Example prompts remain optional suggestions rather than prefilled user intent.

## Infrastructure status

Healthy infrastructure remains visually quiet. The header surfaces service availability only when health has actually resolved to an unavailable state, avoiding both permanent engine-status clutter and false initial-offline flashes.

## Semantic integrity

Dataset-wide outcome metrics are never derived from the filtered Results table. The UI consumes the exact dataset summary API for total records, organization/location/source counts, evidence-linked records, demo-record count and top locations.

Visual clarity must never be achieved by weakening data truthfulness.

## Aurora X outcome-first hardening

The premium product hierarchy now enforces several additional rules that close gaps between visual polish and actual product clarity:

- when a research run is selected, the **New research** composer is not shown above the outcome; completed research opens directly into outcome summary and results,
- **Refine research** is a real action that restores the prior question, demo/live mode and explicit source scope into a fresh composer,
- **View sources** is a direct action from the completed outcome,
- active live research reports measurable source progress such as `3 / 8 sources checked` from persisted source-attempt state instead of exposing milestone percentages,
- demo-only datasets suppress arbitrary quality precision and disable the quality-threshold filter,
- result ordering defaults to a neutral title sort rather than silently prioritizing heuristic quality scores,
- the completed outcome uses a compact analytical fact strip instead of a generic icon-heavy KPI wall,
- global overlays use a named layering model (`--z-sticky`, `--z-navigation`, `--z-inspector-backdrop`, `--z-inspector`, `--z-modal`, `--z-toast`) rather than arbitrary large z-index values,
- non-interactive section icons are visually quieter than primary actions so Azure remains an interaction color rather than decoration,
- mobile and non-research workspaces retain an explicit **New research** action so the primary task is never trapped behind desktop-only navigation.

### Additional acceptance cases

Visual quality must survive:

- a selected completed run with a very long research question,
- an active run where some configured sources have succeeded, some failed and others have not been attempted,
- a demo-only dataset where synthetic quality values exist internally but must not be presented as verified precision,
- zero-result completion with a useful next step,
- source-summary failure while published records remain available,
- narrow mobile layouts with the sidebar hidden,
- inspector focus trapping, Escape close, backdrop close and focus restoration,
- 200% zoom without clipping the outcome actions or result controls,
- dark mode without neon accents, glowing borders or washed-out slate text.

Aurora X is considered successful only when product meaning remains obvious after removing all technical workflow terminology from the primary screen.
