# NUMEN Architecture

## Product flow

1. **Intent** — user submits a natural-language business requirement.
2. **Plan** — the zero-credit deterministic planner classifies the use case and creates an auditable workflow.
3. **Guard** — every external URL is restricted to public HTTP(S); private, loopback, link-local and multicast targets are rejected.
4. **Collect** — explicit permitted URLs are fetched with strict timeout/body limits. If no URL is supplied, NUMEN enters clearly identified offline demo mode.
5. **Process** — records are normalized, completeness-scored and SHA-256 deduplicated.
6. **Provenance** — every row retains source URL/name/type and collection timestamp.
7. **Publish** — results stream to the UI over SSE and can be searched, filtered and exported as CSV.

## Components

```text
React/Vite UI
   │ REST + SSE
   ▼
Spring Boot API ── TaskEventHub
   │
   ├── WorkflowPlanner (zero-credit, deterministic)
   ├── UrlSafetyGuard (SSRF controls)
   ├── CollectionEngine (Web + Offline Demo adapter)
   └── JPA repositories
          │
          ▼
      PostgreSQL
```

## Why the project works without paid AI credits

The default planner is deterministic and local, so the full workflow can be demonstrated offline. The planner interface is intentionally isolated so an optional local model adapter (for example Ollama) can be added without changing collection, validation, provenance or the frontend.

## Production-hardening path

- Per-source robots.txt / terms-aware policies and connector credentials
- Distributed queue (Kafka/SQS) for long-running jobs
- Object storage for raw evidence snapshots
- Schema registry and configurable validation rules
- AuthN/AuthZ, tenant isolation and encrypted secrets
- OpenTelemetry traces, metrics and structured audit logs
- Headless-browser worker for JavaScript-heavy permitted sources
- Local LLM planner with constrained JSON schema output
