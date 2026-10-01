# NUMEN Aurora Visual System

NUMEN uses the **Aurora** visual system: a fresh, cool, premium analytical interface built around Deep Ink structure, Frost workspace surfaces, Azure interaction, Aqua live-state cues, Iris intelligence cues and Emerald verification. The system explicitly avoids orange, beige, muddy warm palettes and generic blue-SaaS styling.

## Product feel

The interface should feel:

- fresh without being playful,
- technical without being cold,
- enterprise without being boring,
- dense without being cramped,
- minimal without being empty,
- distinctive without becoming gimmicky.

Premium quality comes from hierarchy, typography, density, precise spacing, strong tables and quiet interaction feedback rather than decorative effects.

## Semantic color roles

| Semantic token | Role | Light value |
| --- | --- | --- |
| `--color-bg-app` | Frost application background | `#F7F9FC` |
| `--color-bg-surface` | primary analytical surface | `#FFFFFF` |
| `--color-text-primary` | primary Ink typography | `#101828` |
| `--color-text-secondary` | supporting typography | `#475467` |
| `--color-border` | cool structural separator | `#E4E9F0` |
| `--color-action-primary` | decisive interaction / selected state | `#2F6BFF` |
| `--color-live` | live, fresh, streaming, active research | `#18C3D6` |
| `--color-intelligence` | interpretation, synthesis, advanced intelligence | `#685BF6` |
| `--color-success` | verified, healthy, complete | `#11996F` |
| `--color-error` | failures and destructive feedback | `#D92D20` |

Components should consume **semantic tokens**, not scatter raw palette values through JSX.

## Color hierarchy

Color is intentionally scarce. Most of the product remains white, slate and Ink. Azure is the primary interaction color. Aqua appears only for live/fresh states. Iris is reserved for intelligence/interpretation. Emerald means verified/healthy/complete. Error red is used only when failure matters.

The brand mark is one of the few permitted small gradient moments: Azure → Iris → Aqua. Page backgrounds, normal cards, buttons, tables and navigation must remain flat and restrained.

## Sidebar

The sidebar uses Deep Ink (`#08111F`) with layered navy surfaces. Active navigation is a quiet darker surface with a narrow Azure indicator rather than a large filled blue control. Recent research is compact and dense. Security status is a minimal footer treatment rather than a prominent card.

## Workspace hierarchy

The working area uses Frost (`#F7F9FC`) and white analytical surfaces. Page titles remain around 26–32px rather than marketing-scale hero typography. Completed research prioritizes results; technical workflow internals live under collapsible **Run details**.

The default information hierarchy is:

1. page purpose / research question,
2. useful outcome,
3. results,
4. evidence and source trust,
5. secondary actions,
6. technical execution detail.

## Typography

Use the application sans-serif stack for ordinary product text. Monospace is reserved for hashes, IDs, code, API fields and diagnostics.

- Page titles: 26–32px
- Section headings: 18px
- Panel headings: 14–15px
- Body: 13–14px
- Table text: 12.5–13px
- Metadata: 10–12px

Avoid uppercase and letter-spaced monospace for ordinary labels.

## Surfaces, borders and radii

Normal panels rely on cool borders and spacing, not large shadows.

- ordinary controls: 6px radius,
- standard panels: 8px,
- floating elements: 10px,
- 12px is the upper limit for major shell elements.

Avoid card nesting and do not wrap every section in a raised container.

## Tables

Tables are a primary NUMEN surface and should feel analytical and fast:

- 40–44px rows,
- 32–36px sticky headers,
- cool separators,
- subtle hover,
- compact toolbars,
- accurate numerical alignment,
- accessible sortable controls.

Selected rows use a restrained Azure-tinted surface rather than saturated fill.

## Status language

- **Azure** — interaction and selection
- **Aqua** — live, searching, fresh
- **Iris** — interpretation and review
- **Emerald** — verified, source-backed, healthy, complete
- **Crimson** — failure

Do not rely on color alone; pair important states with text and/or icons.

## Research composer

The composer is a productivity surface, not a decorative AI hero. It uses a compact header, a clearly labeled research question, restrained Iris intelligence cue, meaningful example prompts and a simple Azure **Run research** action.

## Run details

Workflow state remains inspectable but is visually secondary. A completed run should summarize the published outcome and collapse timeline, execution plan and safeguards under **Run details**. Raw internal enum names should not dominate the primary UI.

## Evidence inspector

Record evidence opens in a right-side inspector on desktop. The inspector uses white surfaces, thin borders, compact sections, Azure links, Emerald verification cues, Aqua freshness and Iris transformation cues only when semantically relevant.

## Motion

Interaction motion should be 120–240ms and communicate cause/effect only. Avoid bounce, glow and decorative layout movement. Respect `prefers-reduced-motion`.

## Accessibility

Maintain appropriate WCAG contrast, visible Azure focus rings, keyboard navigation, semantic tables/forms and non-color status cues. Audit secondary slate text and accent text carefully.

## Dark theme tokens

Dark theme support is defined through `html[data-theme="dark"]`, using Deep Ink layered surfaces and softer accent values. Dark mode must remain calm and must never become neon.

## Visual policy enforcement

`scripts/quality/check-visual-policy.sh` blocks known legacy warm/orange palette values, prohibited warm color names in frontend source and selected decorative effects. CI runs this check with the other repository standards.

## Anti-patterns

Do not reintroduce:

- orange or beige,
- cream-heavy canvases,
- oversized heroes,
- giant type,
- rounded cards everywhere,
- card nesting,
- heavy shadows,
- background radial gradients,
- glow,
- rainbow badges,
- decorative charts,
- random icon colors,
- monospace abuse,
- generic blue-purple SaaS landing-page styling,
- fake futuristic AI visuals.

## Acceptance bar

A NUMEN screen should feel fresh, precise and high-end within seconds. Users should immediately identify the page purpose, primary result, primary action and secondary technical detail. If all surfaces feel equally important, the hierarchy has failed.

Aurora is not a recolor. It is the visual hierarchy of the product.
