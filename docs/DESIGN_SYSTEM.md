# NUMEN Visual Design System

NUMEN uses a premium light interface designed for long analytical sessions. The visual direction is intentionally restrained: warm neutral canvas, bright information surfaces, charcoal typography, muted supporting text, a single warm copper accent, and green only for healthy/verified states.

## Principles

- **Clarity before decoration** — hierarchy is created through spacing, typography, borders and elevation rather than visual noise.
- **Warm light, not sterile white** — the application canvas uses soft ivory and stone tones to reduce glare while keeping data dense and readable.
- **One primary accent** — copper is reserved for primary actions, emphasis and brand moments.
- **Semantic status colors** — green means healthy/completed, amber means active/in-progress, red means failure or destructive feedback.
- **Measured elevation** — panels use low-contrast borders and layered shadows rather than heavy outlines.
- **Self-contained UI** — no runtime font or styling CDN is required.
- **Accessible motion** — focus states are visible and reduced-motion preferences are honored.

## Core tokens

| Token | Purpose |
| --- | --- |
| `--canvas` | warm page background |
| `--surface` / `--surface-solid` | cards and elevated content |
| `--ink` | primary text |
| `--muted` | secondary text |
| `--line` | subtle borders |
| `--accent` | primary brand/action color |
| `--success` / `--warning` / `--danger` | semantic states |
| `--shadow-sm/md/lg` | controlled elevation |
| `--radius-sm/md/lg` | consistent corner system |

## Component treatment

The sidebar uses a translucent warm surface with backdrop blur. Workspace headers are compact and operational rather than landing-page heroes. The prompt composer receives the strongest elevation on the Console because it is the primary creation surface. Metric cards use compact visual hierarchy. Workflow state is quiet but legible and exposes the persisted execution plan rather than an inferred decorative stage history. Dataset tables remain high-density while sortable headers, evidence drill-downs, row hover, sticky headers and semantic badges improve scanability.

## Responsive behavior

Desktop keeps the persistent left workspace rail. Tablet collapses to the main workspace and reduces the pipeline grid. Mobile prioritizes the prompt, workflow state and dataset content with single-column metric cards on narrow screens.

## Guardrails

Do not reintroduce dark-theme-only colors, external font dependencies, neon gradients, excessive blur, glass effects that reduce contrast, or multiple competing brand colors. New components should reuse the existing CSS variables before introducing new tokens.


## Interaction truthfulness

Navigation labels that look actionable are real controls and change actual workspace views. Workflow presentation must use persisted task state and persisted plan data; do not infer a decorative completion history from a percentage. Dataset rows expose their persisted evidence metadata through a real inspector, and sortable column headers perform real sorting.

Metrics must be derivable from persisted domain state. Do not display a provenance percentage, health state or quality percentage merely because it looks desirable.
