# Aurora X42 — Snapshot Integrity, Change Semantics & Long-Lived State

Aurora X42 closes a layer that the earlier UI/source hardening did not fully model: **what exactly changed between repeated research runs, what was actually observed, and which integrity signals NUMEN is allowed to claim**.

## Implemented

### Separate identity from evidence integrity

Dataset records now retain two different concepts:

- the existing **record identity fingerprint**, used for connector/task deduplication;
- a new **evidence-content hash**, SHA-256 over canonicalized persisted title + captured excerpt.

The content hash intentionally excludes source identity. It can therefore identify exact matching captured evidence across separate source URLs. This does not imply the sources are independent, authentic or true.

Historical records created before migration V10 retain a null evidence hash. NUMEN treats those as non-comparable instead of manufacturing a hash after the fact.

### Previous-equivalent-run comparison

Completed research exposes a server-side change summary against the latest earlier completed run with equivalent:

- normalized research question,
- Demo/live mode,
- material source scope.

Comparison is source-scoped and supports multiple records per source by comparing a deterministic multiset of evidence hashes.

States are deliberately asymmetric:

- **changed** — both runs successfully observed comparable hashed evidence and the captured content set differs;
- **unchanged** — both runs successfully observed comparable hashed evidence and the captured content set is identical;
- **newly observed** — the current run observed evidence that the baseline did not successfully observe;
- **unobserved current** — the current run could not successfully observe the required source;
- **unhashable** — one side lacks compatible snapshot hashes, including legacy records.

NUMEN may show an overall “no captured snapshot changes detected” statement only when every expected source is directly comparable. Missing observations, newly observed sources or legacy/unhashable evidence force a **partial comparison**.

This compares NUMEN snapshots. It is not a claim that the world, source, organization or underlying fact did not change.

### Matching-snapshot signal

Dataset summary now exposes exact evidence-content hash groups that occur across more than one source URL.

The UI calls these matching snapshots and explicitly states that they are **not independent corroboration**. It does not label them syndicated, copied, coordinated or deceptive because exact matching content alone cannot establish motive or provenance lineage.

### Persistence-safe source identity

Explicit public source URLs are normalized before persistence:

- HTTP(S) only;
- lowercase canonical host;
- default ports normalized;
- fragments removed;
- dot segments normalized;
- embedded credentials rejected;
- nonstandard ports rejected;
- recognized credential/signed-token query parameters rejected.

Network/public-address enforcement still occurs at the connector boundary. Syntax normalization is not SSRF protection.

Source-attempt persistence uses a safe audit reference. If an unsafe prompt-extracted URL fails before normalization, credential/query material is not duplicated into the source-attempt table.

### Long-lived frontend ownership

- A valid selected/deep-linked run remains loadable even if it falls outside the 50-item recent list.
- Bounded recents are navigation, not existence truth.
- Aborted health probes do not flip the interface to a false offline state.
- Source polling uses request-sequence ownership so an aborted older request cannot publish an error over a newer request.
- SSE is only held for active tasks and closes once a task is terminal.

### Provenance styling

“Source-backed” is a provenance description, not a success or trust judgment. The evidence inspector no longer uses Emerald success styling for that label.

## Explicit non-claims

Aurora X42 does not add or imply:

- factual verification;
- source authenticity;
- cryptographic signing;
- independent-source proof;
- semantic plagiarism/syndication detection;
- world-event change detection;
- publication/effective-time reconstruction;
- claim dependency graphs;
- automatic downstream conclusion invalidation;
- monitoring outside explicitly executed research runs.

Evidence hashes are local integrity/change aids over persisted normalized content. They are not signatures and they do not make a source true.

## Migration behavior

Flyway V10 adds nullable `evidence_hash` and `evidence_hash_algorithm` columns.

No historical hash is fabricated. New records receive `SHA-256 canonical-text-v1`; legacy rows remain explicitly non-comparable until a later newly collected run provides compatible snapshots.

## Verification gates

X42 is complete only after the exact main-branch SHA passes:

- repository standards;
- Flyway/schema validation;
- backend unit/integration tests;
- frontend hue policy;
- TypeScript;
- deterministic component-state tests;
- production frontend build;
- one-step full-stack Docker smoke test;
- branch policy.

Rendered-browser screenshot review remains a separate visual gate and must not be claimed unless actually performed.
