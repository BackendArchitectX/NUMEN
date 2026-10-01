# NUMEN — AURORA X Premium Product & Visual Directive

This directive supersedes previous NUMEN visual/theme directions while preserving sound backend, security, evidence, provenance, workflow and reliability work.

## 1. Product before decoration

NUMEN must look and behave like a serious intelligence workspace, not a workflow debugger, marketing landing page, hackathon dashboard or generic SaaS admin template.

The visual hierarchy must communicate, in order:

1. What was researched.
2. What NUMEN found.
3. What evidence supports the result.
4. What is incomplete or uncertain.
5. What the user can do next.
6. Technical execution details only when requested.

Completed research must never lead with internal workflow mechanics.

## 2. Absolute palette prohibition

Do not use orange, burnt orange, coral-orange, peach, copper, rust, terracotta, orange-red, warm tan, warm beige or cream-dominant surfaces.

Do not hide prohibited warm tones in gradients, SVG assets, charts, logos, shadows, focus rings, loading states, dark mode, hover states or inline styles.

Do not merely override old colors later in the cascade. Remove them at the source.

## 3. Aurora X semantic palette

Use a cool, restrained system:

- **Ink** — structure, navigation and technical depth.
- **Frost** — analytical workspace and calm neutral surfaces.
- **Azure** — primary interaction and selection.
- **Aqua** — live, current, recently updated and streaming states.
- **Iris** — interpretation, analysis and review.
- **Emerald** — verified, healthy and completed states.
- **Crimson** — true error and destructive states only.
- **Slate** — supporting text, borders and neutral hierarchy.

Approximate visual budget: 70% cool neutral, 20% Ink structure, 7% Azure interaction, 2% contextual Aqua/Iris/Emerald, 1% exceptional semantics. This is a restraint rule, not literal pixel accounting.

## 4. Never become “another blue SaaS dashboard”

Freshness does not mean tinting every surface blue.

Most analytical surfaces remain neutral. Azure appears where the user can act or where selection matters. Aqua appears only for live/fresh states. Iris appears only for interpretation/review. Emerald appears only for verified/healthy outcomes.

A saturated accent should usually have a neutral neighbor. Avoid multiple competing accent blocks in the same visual cluster.

## 5. Outcome-first screen contract

For completed research, the first useful viewport should contain:

- research title/question,
- honest completion/demo state,
- result count,
- organization/source/location context when derivable,
- evidence-linked count when derivable,
- freshness,
- primary next action,
- beginning of the results table.

The technical run timeline, execution plan, retries and safeguards belong under collapsed **Run details**.

## 6. No fake precision

Do not expose engine milestone percentages as user progress unless the percentage corresponds to measurable completed work.

Prefer:

- “Searching sources”
- “Validating collected records”
- “4 of 8 sources completed”

over decorative 45%, 72% or 90% milestones.

Internal progress numbers may remain in diagnostics.

## 7. Research outcome summary

Every completed run should summarize actual persisted data only.

Allowed summaries include:

- published result count,
- unique organizations,
- unique locations,
- contributing sources,
- records with captured evidence,
- last collected/updated time,
- top values derived from the result set.

Never invent coverage, trust, source counts or insight statistics.

Demo data must be explicitly labeled as demo data.

## 8. Typography

Use one primary sans-serif family, preferably Inter/Geist/system UI.

Use monospace only for identifiers, hashes, code, raw API/schema fields and technical diagnostics.

Working application titles should normally be 24–32px, not marketing-scale 50px+.

Avoid excessive uppercase and letter spacing. Ordinary labels should read as natural product language.

Use tabular numerals for counts, timestamps and metrics where alignment helps.

## 9. Density

NUMEN is an analytical application. Information density should be high but calm.

Avoid:

- giant hero spacing,
- oversized cards,
- 70–100px table rows,
- repeated explanatory copy,
- large empty vertical gaps,
- cards nested inside cards.

Prefer compact toolbars, 40–44px table rows, thin separators and progressive disclosure.

## 10. Surface hierarchy

Define clear layers:

- Level 0: application background,
- Level 1: primary working surface,
- Level 2: inset analytical section,
- Level 3: floating drawer/popover,
- Level 4: modal/command surface.

Most panels rely on background + border + spacing. Shadows are reserved for floating elements.

## 11. Radius discipline

Use small precise radii:

- 4px technical micro-elements,
- 6px inputs/buttons/chips,
- 8px normal panels,
- 10px floating surfaces,
- 12px maximum for exceptional large overlays.

Avoid bubbly 16–24px radii across ordinary enterprise UI.

## 12. Navigation

Use deep Ink navigation with a restrained Azure active indicator.

The main terminology is:

- Research
- Datasets
- Runs

Recent items represent research outcomes, not raw task IDs.

Do not permanently advertise infrastructure controls such as SSRF protection in primary navigation.

## 13. Composer

The research composer must be compact and outcome-oriented.

Use:

- “New research”
- concise instruction,
- natural-language text area,
- one clear “Run research” primary action,
- optional examples,
- keyboard shortcut.

Do not make the composer a giant landing-page hero.

## 14. Results table

The table is a primary product surface.

Require:

- sticky headers,
- compact rows,
- real sort,
- real search/filter,
- readable selected state,
- clear source links,
- numeric alignment,
- accessible caption and headers,
- horizontal overflow handling,
- no saturated header bands.

## 15. Evidence inspector

Record evidence should open in a right-side inspector that preserves dataset context.

The inspector shows only persisted information:

- record identity,
- organization/location,
- data-quality score with explicit terminology,
- source type,
- collected timestamp,
- fingerprint in technical presentation,
- captured excerpt,
- source link,
- explicit demo/source-backed state.

Escape and close controls must work.

## 16. Theme behavior

Support light and dark themes with a persisted user preference and system preference fallback.

Initialize the theme before first React paint to avoid a visible theme flash.

Dark mode is separately designed, not simply inverted.

Never use pure black/pure white contrast everywhere; use layered Ink surfaces.

## 17. Interactive state matrix

Every interactive component should define:

- default,
- hover,
- focus-visible,
- active/pressed,
- disabled,
- loading where relevant,
- selected where relevant,
- error where relevant.

No component should fall back to browser-default focus behavior because a custom theme omitted a state.

## 18. Accessibility

Target strong WCAG 2.2 AA behavior.

Audit:

- focus visibility,
- contrast,
- keyboard operation,
- semantic headings,
- table semantics,
- icon-only labels,
- 200% zoom/reflow,
- long text,
- forced-colors/high-contrast mode,
- reduced motion,
- color-blind safety.

Color alone must never communicate a critical state.

## 19. Long-content resilience

Test the interface with:

- very long research questions,
- very long organization/source names,
- long URLs,
- long localized labels,
- zero-result datasets,
- hundreds of rows,
- narrow browser widths,
- 200% zoom.

Truncate only when the full value remains available through the correct detail surface or accessible name.

## 20. Overlays and z-index

Use a documented small z-index scale.

Record inspectors and popovers must not appear behind sticky table headers.

Avoid arbitrary z-index escalation.

Backdrop surfaces should remain neutral and never become decorative blur showcases.

## 21. Motion budget

Use motion only for cause/effect/state.

Typical durations:

- 120–180ms micro-interaction,
- 180–240ms panel transition,
- <=250ms large transition.

No bouncing, glowing, animated gradients or decorative layout movement.

Respect prefers-reduced-motion.

## 22. Live-state motion

Aqua may use a small pulse for active research, but it must be subtle and disabled under reduced motion.

Do not animate completed/verified states continuously.

## 23. Chart policy

Charts exist only when they answer a real analytical question.

Use one primary series or 2–4 meaningful comparison series.

Never use orange.

Do not use 3D charts, decorative radial gauges, rainbow palettes or gradient plot backgrounds.

Provide labels/table equivalents where necessary.

## 24. Empty-state policy

Empty states contain:

- small icon,
- direct title,
- one useful explanation,
- one next action when applicable.

No giant illustration by default.

Differentiate:

- no research yet,
- no matching filtered results,
- run completed with zero publishable records,
- source failure,
- cancelled run.

## 25. Error-state policy

Errors explain:

- what failed,
- what still succeeded,
- whether useful partial results remain,
- what the user can do next.

Do not expose raw stack traces to the product UI.

## 26. Demo-data integrity

Demo content must be visually and verbally explicit.

Never let sample records appear indistinguishable from live intelligence.

A completed demo run should say “Demo dataset”, not “Verified intelligence”.

## 27. Visual signature

NUMEN becomes recognizable through:

- Deep Ink shell,
- Frost workspace,
- thin cool separators,
- Azure interaction,
- Aqua freshness,
- Iris interpretation,
- Emerald trust,
- dense tables,
- sharp typography,
- quiet motion.

## 28. Anti-template rules

Do not default to:

- four equal KPI cards on every page,
- giant greeting text,
- sparkle icons everywhere,
- gradient primary buttons,
- purple-blue page backgrounds,
- glass cards,
- huge rounded containers,
- radial quality gauges,
- random mini charts,
- rainbow status pills.

Every component must exist because it supports the current user task.

## 29. Semantic tokens

Components use semantic CSS tokens such as:

- --color-bg-app
- --color-bg-surface
- --color-text-primary
- --color-text-muted
- --color-border
- --color-action-primary
- --color-live
- --color-intelligence
- --color-success
- --color-error

Do not scatter palette-specific raw hex values across JSX.

## 30. Automated visual policy

Keep repository guards that reject legacy warm/orange palette values and prohibited warm color names.

Guard against decorative glow/background effects that violate Aurora restraint.

Where practical, add screenshot regression coverage for the composer, active research, completed research, dataset, inspector and dark mode.

## 31. Performance

Premium must also feel fast.

Avoid excessive backdrop filters, large blur radii, expensive animated shadows and unnecessary DOM wrappers.

Large tables must remain responsive.

Theme switching must not trigger page reload.

## 32. Final acceptance tests

A new user should understand NUMEN in seconds.

A completed run should answer “what did it find?” before “how did the engine execute?”.

A record should expose its evidence without leaving the result context.

Demo data must be unmistakable.

No intentional orange or beige may remain.

Both themes must feel deliberately designed.

The interface must remain usable with keyboard-only navigation, reduced motion, forced colors, long strings, narrow screens and 200% zoom.

NUMEN should feel premium because it is clear, precise, fast and trustworthy — not because it has more decoration.
