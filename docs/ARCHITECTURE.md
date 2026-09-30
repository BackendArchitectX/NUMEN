# NUMEN Architecture

## Design goals

NUMEN is designed around five constraints: traceability, safe collection, repeatability, operational visibility and zero mandatory paid-AI dependency.

## Runtime topology

```text
Browser
  │ :5173
  ▼
Nginx + React
  │ /api/*
  ▼
Spring Boot :8080
  │
  ├─ WorkflowPlanner
  ├─ TaskRunner
  ├─ CollectionEngine
  ├─ UrlSafetyGuard
  └─ JPA repositories
        │
        ▼
PostgreSQL
```

Docker Compose is the canonical local runtime. The browser reaches only the frontend and optionally the API loopback port. PostgreSQL stays private to the Compose network.

## Backend package responsibilities

- `controller` — HTTP boundary, versioned routes, validation and response DTOs.
- `dto` — stable external API contracts. JPA entities are not exposed directly.
- `service` — application use cases and workflow orchestration.
- `security` — outbound source validation and SSRF guardrails.
- `repository` — database access contracts.
- `entity` — persistence model and state transitions.
- `exception` — consistent HTTP error mapping.
- `config` — typed configuration and cross-cutting framework setup.

## Workflow lifecycle

`QUEUED → PLANNING → COLLECTING → PROCESSING → COMPLETED`

Terminal alternatives are `FAILED` and `CANCELLED`. Progress events are published through Server-Sent Events. Optimistic locking protects concurrent workflow updates.

## Persistence

Flyway owns schema evolution. Hibernate runs with `ddl-auto=validate`, so accidental schema drift fails fast instead of mutating production tables.

## Collection boundary

Only explicit absolute HTTP(S) URLs are accepted for live fetching. NUMEN resolves the target host, rejects private/local/link-local/multicast addresses, disables redirects and applies timeout/body-size limits. Prompts without URLs use the labelled demo adapter.

## Scaling path

The current worker pool is intentionally bounded for a single-node challenge deployment. At higher scale, replace in-process dispatch with Kafka/SQS, move raw evidence to object storage, use distributed rate limiting, persist event streams, and add per-tenant quotas.
