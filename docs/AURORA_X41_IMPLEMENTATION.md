# Aurora X41 implementation

This implementation applies the parts of Aurora X41 that the current NUMEN architecture can support truthfully. It deliberately does not manufacture dependency graphs, historical conclusion invalidation, collaboration, monitoring or decision engines that the backend does not persist.

## Implemented in this tranche

### Research intent and asynchronous ownership

- Read APIs now accept external `AbortSignal` ownership while retaining request timeouts.
- Record, timeline, summary and source reads are aborted when their owning selection/query changes.
- Task-list refreshes use monotonic sequence ownership so an older response cannot overwrite a newer refresh.
- Research creation captures an intent epoch. A late create response may still exist as persisted run history, but it cannot select itself or clear a newer draft after the user has changed intent.
- Page visibility / BFCache-style resume revalidates task and service state without automatically resubmitting research.
- Ctrl/Cmd+Enter and source-entry Enter are ignored during IME composition.

### Public-source safety and evidence usability

- Browser source UX uses one standards-based URL policy for normalization, validation, safe external links and destination-host display.
- Credential-bearing, unsupported-scheme, non-standard-port and obviously local/private source URLs are rejected before submission for user feedback; backend policy remains authoritative.
- Source links expose the parsed destination hostname with bidi isolation rather than trusting a source-controlled label alone.
- Backend URL-safety errors do not echo rejected raw URLs.
- The public-page connector rejects redirects instead of silently changing source origin.
- Obvious sign-in, CAPTCHA/challenge and compact access-interstitial pages are rejected rather than recorded as successful evidence.
- Unsupported media types are represented as rejected source collection for this connector.
- Captured plain text strips bidi control characters before persistence.

These checks reduce false-success and spoofing risk. They do **not** establish factual truth, source independence or source quality.

### Product and visual system

- The accumulated versioned Aurora CSS cascade was consolidated into one authoritative light-only cascade rather than adding another override layer.
- Research entry keeps a strong editorial hierarchy while reducing vertical overhead on laptop viewports.
- Source setup is visually compressed after the question instead of becoming a nested form/card stack.
- Empty states are smaller and action-oriented.
- Runs use one primary Open action with quieter Dataset/Sources actions.
- Dataset provenance actions are secondary to opening the dataset.
- Sources now open on a useful provenance/research index instead of a giant empty selection panel.
- The same parsed source hostname appears in result/source provenance links.
- The persisted `qualityScore` is presented as a **record heuristic** (`N/100`) with an explicit “not factual confidence” explanation rather than as generic data quality or factual certainty.

## Existing invariants preserved

- Light theme only.
- No warm/orange decorative palette.
- Demo data remains explicitly labelled.
- Source attempt and last successful observation remain distinct.
- Zero results are not presented as proof of absence.
- Collection time is not presented as real-world event time.
- Source failure remains separate from successful zero-result research.
- Result/evidence provenance remains inspectable.
- No fake progress percentage is introduced.

## Explicitly unsupported / not faked

The current repository does not persist enough information to truthfully implement:

- a transitive claim/evidence dependency graph;
- circular-claim detection across derived conclusions;
- automatic downstream conclusion invalidation after evidence correction;
- historical decision records;
- scenario/what-if isolation as a product feature;
- source-independence or syndication graphs;
- effective-date / publication-date / real-world event-time modelling;
- full point-in-time reconstruction;
- authenticated multi-user permissions, RBAC or permission propagation;
- production monitoring/alerts or real-time freshness claims;
- redirect provenance chains (redirects are currently rejected rather than followed).

Those remain future backend capabilities, not decorative frontend controls.

## Verification contract

Implementation is complete only for gates actually executed. Required automated gates are frontend color policy, TypeScript, component-state tests, production build, backend tests/verification, repository standards and full-stack smoke. Rendered-browser screenshot review is a separate gate and must not be claimed unless a browser rendering session actually inspects the final screens.
