# Aurora X¹² implementation status

This document records how the AURORA X¹² directive is applied to the current NUMEN codebase. It is intentionally scoped to capabilities that actually exist in the repository.

## Implemented in the current product

### Source capability contracts

Every SourceConnector declares an explicit capability set. The collection engine selects only a connector that both supports the request shape and satisfies the capabilities required by that request.

Current live HTTP collection requires:

- read-records
- evidence-capture
- retry-safe-read
- partial-failure
- public-http

The deterministic demo connector declares:

- demo-data
- evidence-capture
- deterministic

This makes connector behavior explicit without adding a federation-management UI.

### Truthful source outcomes

Persisted live-source attempts no longer collapse every source problem into a generic failure. NUMEN records one of:

- SUCCEEDED
- UNAVAILABLE
- UNAUTHORIZED
- REJECTED
- RATE_LIMITED
- FAILED

A source problem is therefore never represented as a negative research fact or a zero-result source.

REJECTED is used for requests rejected by the public-source safety boundary. UNAUTHORIZED covers source-side 401/403 responses. RATE_LIMITED covers HTTP 429. Reachability and other source-side HTTP/network failures use UNAVAILABLE. Unexpected collection defects use FAILED.

### Persisted connector provenance

Each persisted source outcome records the connector identifier and the connector capability contract used for that collection. Historical source summaries therefore remain interpretable after connectors evolve.

### Exact source coverage

The dataset summary now separates:

- configured sources
- attempted sources
- successfully collected sources
- unavailable sources
- unauthorized sources
- rejected sources
- rate-limited sources
- other failed sources
- not-attempted sources

The API also exposes a source coverage state:

- COMPLETE
- PARTIAL
- NONE
- DEMO
- NOT_APPLICABLE

The UI uses successfully collected/configured sources for coverage. It does not use the number of sources that merely happened to contribute published rows as a proxy for collection success.

### Partial-result semantics

A run with at least one successful live source can still publish useful results while preserving the failed-source outcomes. The completed outcome is labelled with limitations and the Sources workspace explains the exact source state.

If no supplied live source can be collected safely, the workflow fails rather than publishing an apparently complete empty result.

### Policy-aware current boundary

The current live collection policy remains deliberately narrow:

- explicit public HTTP(S) URLs only
- SSRF/private/local/link-local/multicast/reserved targets rejected
- no redirects
- bounded timeout/body size/retry budget
- no credentials embedded in URLs
- no non-standard ports

AURORA X¹² does not weaken this boundary in order to obtain more data.

### Product-facing semantics

The research UI remains research-first. It does not expose query planners or connector internals as a primary surface.

Users see:

- sources checked
- sources collected
- source limitations
- captured evidence
- precise failure semantics where relevant

Technical connector capabilities remain API/provenance metadata rather than decorative badges.

## Explicitly not implemented

The current NUMEN repository does not implement the following AURORA X¹² capabilities because there is no corresponding product/backend capability to secure correctly:

- multi-organization federated identity or delegated partner authorization
- distributed SQL/query federation
- cross-source joins
- federated semantic ranking
- clean-room or private-set-intersection analytics
- cross-organization review
- sovereign deployment claims
- air-gapped deployment
- offline mutation replay
- partner event feeds
- source-local remote computation
- policy-aware cross-region/model routing

These must not appear as dead UI or simulated backend states. If one is introduced later, its X¹² semantics become a release requirement.

## Release invariants

For the current repository:

1. a failed source is never counted as a successful source;
2. a source failure never becomes evidence of absence;
3. source coverage is based on persisted collection outcomes;
4. a source rejected by safety policy remains distinguishable from a source outage;
5. source-side access denial remains distinguishable from an empty source;
6. HTTP 429 remains distinguishable from ordinary unavailability;
7. connector capability metadata is stable API provenance, not a trust score;
8. the collection engine does not select a connector that lacks the request's required capabilities;
9. demo and live collection remain explicitly separate;
10. unsupported federation features are omitted rather than mocked.
