# NUMEN Aurora X41 design system

NUMEN is a **light-only, evidence-first research workspace**. The visual system exists to make research intent, source scope, results and provenance easier to understand; it must never imply factual certainty that the backend has not earned.

## Product hierarchy

The default hierarchy is:

1. research question,
2. explicit source scope,
3. primary research action,
4. useful result,
5. source/evidence provenance,
6. next action,
7. technical execution detail.

The **Ask NUMEN** workbench is the dominant creation surface. Completed research opens outcome-first; engine lifecycle and persisted plan remain secondary under **Run details**.

## Semantic color roles

| Semantic token | Role |
| --- | --- |
| Frost / `--color-bg-workspace` | continuous application canvas |
| Paper / `--color-bg-surface` | primary working surface |
| Ink / `--color-text-primary` | strongest hierarchy and primary text |
| Slate / text/border tokens | secondary information and structure |
| Azure / `--color-action-primary` | interaction, selection, focus and links |
| Aqua / `--color-live` | active collection or observation state only |
| Iris / `--color-intelligence` | NUMEN interpretation or analysis |
| Emerald / `--color-success` | successful system outcome, never factual truth |
| Crimson / `--color-error` | actual failure or destructive state |

Aqua does **not** mean “fresh” or “current.” Emerald does **not** mean “verified fact.”

Intentional orange, amber-orange, peach, copper, rust, terracotta, coral-orange, warm tan, beige and warm-cream identity are prohibited.

## Theme behavior

NUMEN has one theme: **light**.

There is no dark-mode setting, system-theme substitution, appearance menu or duplicate dark token tree. The static theme bootstrap exists only to remove obsolete `numen-theme` state and establish a stable light first paint.

## Navigation

Primary product navigation uses plain nouns:

- Research
- Datasets
- Sources
- Runs

The sidebar belongs to the same light canvas as the workspace and should not dominate the content. Recent research is compact and outcome-oriented.

## Research workbench

The creation hierarchy is:

**Question → Source scope → Run**

The composer must not degrade into a form wizard or chatbot. Source setup remains explicit but compresses after configuration. The primary action explains unmet prerequisites instead of appearing mysteriously disabled.

Demo data is an explicit alternate collection mode and is always labeled as such.

## Results and datasets

Datasets are reusable research outputs, not generic task cards. Lists favor scanability and one dominant action. Result tables become denser than the research entry screen and use actual server-backed search, filtering, sorting and pagination only where supported.

The browser displays source links only after parsing them as safe public HTTP(S) URLs. The actual destination hostname is exposed alongside the source label and isolated from bidirectional-text spoofing.

## Evidence

Selecting a result opens the evidence inspector without losing dataset context. The inspector distinguishes:

- persisted result fields,
- captured source evidence,
- source identity,
- NUMEN collection time,
- fingerprint / technical provenance.

Collection time is not publication time, event time or effective time.

Source evidence and NUMEN interpretation must never be visually interchangeable. A source-backed record is a provenance state, not a success/trust verdict, so provenance labels must not borrow Emerald “success” semantics.

## Sources workspace

Sources are a first-class provenance surface. Before selection, the page presents recent research with source activity instead of a giant empty panel. Once selected, the source workspace shows exact collection outcomes, record/evidence contribution and the correct temporal concept:

- **Last success** when a successful observation exists,
- **Last attempt** when the latest attempt did not produce a successful observation.

A failed recent attempt never makes older data appear fresh.

## Runs

Runs form an operational ledger. **Open run** is the primary row action; Dataset and Sources are secondary. Normal success is visually quiet. Repeated status text is avoided.

## Density

Density follows the task:

- Research entry: spacious
- Research outcome: medium
- Dataset library: medium-dense
- Dataset explorer: dense
- Sources: medium-dense
- Runs: dense
- Evidence: comfortable reading density

## Surfaces

Use spacing, alignment and dividers before cards and shadows. The workbench and floating inspector may use elevation; ordinary repeated rows should not.

Empty states must answer:

- what is empty,
- why,
- what the user can do next.

They must not become giant decorative rectangles.

## Accessibility

Maintain:

- visible focus,
- keyboard-operable controls,
- semantic tables/forms/landmarks,
- dialog focus trapping and restoration,
- non-color state communication,
- reduced-motion support,
- forced-colors resilience,
- 200–400% zoom operability,
- IME-safe keyboard submission.

## Async ownership

A response may update the interface only while it still belongs to the current user intent. A late response from research A must not overwrite a newer draft, selection or research B.

Cancelable read requests use AbortSignal ownership where supported. Page/tab resume revalidates connectivity and task state rather than assuming old state is current. A selected deep-linked run remains addressable even when it is older than the bounded recent-run list; absence from recents is not deletion. Terminal tasks close their SSE stream instead of retaining live infrastructure indefinitely.

## CSS architecture

`frontend/src/styles/global.css` is an authoritative consolidated cascade. Do not append another versioned Aurora override block. Edit the canonical selector or token instead.

Design tokens own repeated color, radius, shadow and z-index semantics. Dark selectors and obsolete theme styles are prohibited.

## Reference synthesis

The focused reference corpus is documented in [INTERFACE_REFERENCE_CORPUS.md](INTERFACE_REFERENCE_CORPUS.md). References inform interaction and hierarchy; they do not authorize copying logos, proprietary assets, exact layouts, trade dress or signature animation.

## Automated enforcement

Repository checks enforce the light-only/warm-color policy, component semantics, TypeScript correctness and production build. Automated success does not by itself prove visual quality: rendered-browser review remains a separate release gate.
