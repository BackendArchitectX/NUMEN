# Engineering Standards

NUMEN is intentionally structured as a maintainable product rather than a single-file challenge demo.

## Runtime contract

A fresh checkout must start with one command (`start.bat`, `./start.ps1`, or `./start.sh`) and require only Docker with Compose v2. The launcher owns environment bootstrap and placeholder-secret repair, stale-container recovery, image builds, dependency ordering, port validation, health verification, diagnostics, browser opening, and idempotent re-entry.

## Backend

- Java 17 is the supported language/runtime baseline.
- Controllers expose versioned API contracts and never return JPA entities directly. Retryable workflow creation supports client idempotency keys enforced by a database uniqueness constraint, and key reuse with a different payload returns a conflict rather than silently replaying unrelated work.
- DTOs, domain contracts, source connectors, persistence entities, repositories, service orchestration, outbound security, configuration, and exception mapping remain separated.
- Database changes are forward-only Flyway migrations; Hibernate validates rather than mutates production schemas. Critical progress, terminal-state, quality, record-count and fingerprint invariants are enforced in domain logic and database constraints. Dataset replacement and terminal workflow state publication must remain transactional.
- Long-running work uses bounded executors, restart recovery for interrupted non-terminal workflows, graceful shutdown semantics and explicit overload rejection rather than silently dropping work.
- Every HTTP request has a correlation ID and errors return that ID plus a stable machine-readable error code for supportability.
- Health, readiness, metrics and Prometheus instrumentation are available through Actuator. The public health endpoint reflects aggregate Actuator status rather than an unconditional constant. Workflow executor active threads, pool size and queue depth are explicit saturation metrics. The versioned API contract is published as OpenAPI JSON.
- Outbound collection must pass SSRF controls, reserved-range/default-port policy and explicit resource limits. Only transient network/408/429/5xx failures are retried, with a bounded attempt count, exponential backoff and jitter. Per-source failures are logged without leaking URL query content.

## Frontend

- React UI composition lives under `components/`; stateful orchestration belongs in hooks; API transport belongs in services; shared models and helpers stay independent of UI code.
- TypeScript strict mode, unused-code checks, implicit-return checks, fallthrough checks and production builds are CI gates. Browser API calls use bounded timeouts, polling must not overlap, stale responses must not overwrite current state, and rapid repeated workflow submissions are guarded client-side in addition to server idempotency.
- Production assets are served by an unprivileged Nginx image with CSP and other response hardening. The gateway bounds request bodies, limits mutation bursts, caps concurrent SSE streams and emits deterministic 429 responses with `Retry-After`. The UI has no runtime font/CDN dependency and includes keyboard/focus/reduced-motion support.
- The browser talks to the API through the same-origin gateway; no environment-specific API URL is hard-coded into UI components.

## Containers and operations

- Application containers run non-root.
- Host ports bind to loopback for local use.
- Read-only filesystems, dropped capabilities, `no-new-privileges`, bounded logs, graceful shutdown, explicit SSE completion, and health checks are used where practical.
- PostgreSQL data is preserved on normal stop/restart and removed only through an explicit reset command. Database constraints and indexes are delivered through forward-only Flyway migrations.

## Repository governance

- `main` is the only persistent origin branch; `.github/workflows/branch-policy.yml` prunes accidental non-`main` origin branches on creation, after main pushes, and on a scheduled reconciliation pass.
- Automated dependency PR generation is disabled because it creates origin branches; dependency upgrades are reviewed and committed manually after CI verification. Pull requests are gated by GitHub dependency review for newly introduced high-severity dependency risk, and third-party workflow actions are pinned to reviewed commit SHAs.
- CI validates repository structure, Bash and PowerShell launcher syntax, backend verification, frontend typechecking/build, Compose validity, a complete one-step startup smoke test, a real workflow/persistence/export path, and idempotent startup.
- Frontend dependency manifests use exact versions; the lockfile is authoritative for reproducible CI/container installs.
- Generated artifacts, local secrets, `.env`, `node_modules`, `target`, and `dist` must never be tracked.
