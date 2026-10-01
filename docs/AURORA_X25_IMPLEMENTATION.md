# Aurora X²⁵ implementation

This increment applies the temporal-integrity parts of Aurora X²⁵ that the current NUMEN data model can support without inventing event-time, effective-date or monitoring capabilities.

## Implemented

- Replaced ambiguous UI uses of **Updated** in run history, research outcomes and published datasets with explicit lifecycle or collection semantics.
- Added one shared frontend time formatter so invalid timestamps resolve to **Unknown** rather than vague **Recently** copy.
- Renamed the technical workflow view from **Run timeline** to **Run lifecycle** so persisted execution events cannot be mistaken for real-world events.
- Labels dataset evidence timestamps as **Collected by NUMEN**. `DatasetRecord.collectedAt` is explicitly a collection timestamp, not an event/publication/effective date.
- Added `lastSuccessfulObservationAt` to the per-source API contract. Successful source observation is now distinct from `lastAttemptedAt`.
- Failed source rows therefore present their timestamp as **Last attempt**, while successful source rows present **Last success**.
- Added backend integration and frontend component-state assertions for these semantics.
- Updated API documentation with the supported temporal contract and the boundaries of that contract.

## Intentionally not claimed

The current repository does not contain enough persisted information to truthfully implement:

- generic real-world event-time extraction;
- announcement versus effective-date modelling;
- historical point-in-time reconstruction;
- late-arriving event backfill;
- monitor schedules, observation gaps or no-change assertions;
- entity rename/merger lifecycle history;
- forecast-versus-actual history;
- world-change attribution.

These remain explicitly unsupported rather than being inferred from `createdAt`, `updatedAt`, `collectedAt`, task lifecycle events or source-attempt timestamps.

## Temporal invariants enforced by this increment

1. Last attempt is not last successful observation.
2. Collection time is not world-event time.
3. Run lifecycle events are not research-world events.
4. Completion time is not a generic update time.
5. Invalid/missing timestamps are not described as "recent".
6. Existing historical evidence timestamps remain collection provenance only; no event-date precision is invented.

## Verification gates

The implementation is complete only when backend tests, frontend typecheck/component tests/build and repository CI pass for the resulting commit.
