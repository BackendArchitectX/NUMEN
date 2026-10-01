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
