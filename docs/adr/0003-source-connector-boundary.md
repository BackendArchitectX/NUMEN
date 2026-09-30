# ADR 0003: Use an explicit source-connector boundary

- Status: Accepted
- Date: 2026-09-30

## Context

Collection logic originally mixed workflow orchestration, URL extraction, HTTP transport, source-specific mapping and offline demo generation in one service. That shape is workable for a prototype but makes new source types harder to add, test and secure independently.

## Decision

NUMEN separates application orchestration from source adapters.

- `CollectionEngine` extracts bounded source references, selects exactly one compatible connector and performs cross-source deduplication.
- `SourceConnector` is the adapter contract.
- `HttpPageConnector` owns public HTTP(S) fetching and mapping after applying outbound URL policy.
- `DemoCatalogConnector` owns explicitly labelled offline/demo records.
- `WorkflowPlan` is a domain contract rather than a nested service type.
- Result replacement and workflow completion occur through `WorkflowResultPublisher` in one transaction.

## Consequences

Source-specific behavior is isolated from workflow orchestration, security policy remains testable at the boundary, demo data cannot silently masquerade as live collection, and additional permitted connectors can be introduced without turning the application service into a monolith.

The connector boundary does not remove the need for source-specific legal, robots, authentication, quota or egress controls in a production deployment.
