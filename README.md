# NUMEN

**AI-Powered Data Intelligence Platform** — natural-language intent → managed workflow → permitted-source collection → validated, deduplicated, source-backed dataset.

NUMEN is a full-stack data-intelligence system built as an industry-style modular monolith. It turns a plain-English requirement into an auditable workflow, collects from explicitly supplied and permitted public HTTP(S) sources, preserves provenance, scores and deduplicates records, streams real backend progress to the UI and exposes the resulting dataset through a responsive operations console.

## Quick Start

A fresh checkout requires only **Docker Desktop / Docker Engine with Docker Compose v2**. Java, Maven, Node.js, npm and PostgreSQL do not need to be installed on the host.

### Windows

Double-click `start.bat`, or run:

```powershell
.\start.ps1
```

### macOS / Linux

```bash
./start.sh
```

The launcher creates/repairs `.env`, generates the local database password, validates configuration and ports, starts PostgreSQL, builds the backend/frontend images, runs Flyway through backend startup, respects dependency readiness, verifies the public gateway through the same explicit IPv4 loopback binding used by Docker, prints actionable diagnostics if startup fails and opens the UI unless browser launch is disabled.

Service URLs:

| Service | URL |
| --- | --- |
| Web application | `http://localhost:5173` |
| API through gateway | `http://localhost:5173/api/v1` |
| OpenAPI JSON | `http://localhost:5173/api/v1/openapi` |
| Public application health | `http://localhost:5173/api/v1/health` |
| Direct local backend | `http://localhost:8080/api/v1` |
| Backend readiness | `http://localhost:8080/actuator/health/readiness` |
| Prometheus metrics | `http://localhost:8080/actuator/prometheus` |

Stop while preserving local data:

```bash
./stop.sh
```

Windows:

```powershell
.\stop.ps1
```

Delete the local PostgreSQL volume as well with `./stop.sh --volumes` or `.\stop.ps1 -Volumes`.

## Problem Statement

Teams often need a clean, structured dataset from a small set of permitted public sources, but the manual workflow is fragmented: interpret the request, visit sources, normalize fields, deduplicate results, retain evidence and track progress separately.

NUMEN combines those steps into one managed workflow with explicit source provenance and visible execution state. The current implementation intentionally supports explicit public HTTP(S) URLs supplied in the request plus clearly labelled offline demo data; it does **not** pretend to provide unrestricted autonomous web search.

## Key Features

- Natural-language workflow requests with deterministic planning.
- Explicit permitted-source HTTP(S) collection behind a pluggable connector boundary.
- SSRF and outbound URL policy, including reserved/private network, credential and non-standard-port rejection.
- Source-backed records with fingerprints, collection timestamps and quality scores.
- Database-backed workflow history and dataset persistence.
- Transactional result publication, optimistic locking and database constraints for domain invariants.
- Idempotent workflow creation with payload-conflict detection.
- Bounded asynchronous execution, overload rejection and interrupted-workflow restart recovery.
- Bounded transient source retries with backoff and jitter.
- Genuine SSE progress updates with reconnect hints and polling fallback.
- Durable per-workflow timeline events for creation, state transitions, restart recovery, cancellation, failure and completion.
- Aurora X premium visual system with Deep Ink navigation, Frost analytical surfaces, Azure interaction, Aqua live-state cues, Iris interpretation, Emerald verification, persisted light/dark themes and a compact outcome-first hierarchy.
- First-class Sources workspace with exact per-source record contribution, evidence coverage, freshness and explicit demo/live classification.
- Deep-linked Research, Datasets, Sources and Runs workspaces so browser refresh/back/forward preserve the intended research context.
- Outcome-first completed research summaries backed by exact persisted dataset aggregates, search, sortable dataset exploration, quality filtering, right-side record evidence inspection and spreadsheet-safe CSV export.
- Stable API error codes and request correlation IDs.
- Process-local gateway abuse controls for mutation bursts and excessive concurrent SSE streams, with deterministic HTTP 429 responses.
- Aggregate health/readiness, Micrometer/Prometheus metrics and executor-saturation metrics.
- One-step Docker Compose startup on Windows, macOS and Linux.
- Backend unit/integration tests, deterministic frontend component-state tests and full-stack workflow verification.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 7, Vite 8, Lucide |
| Gateway | unprivileged Nginx |
| Backend | Java 17, Spring Boot 3.3, Spring MVC, Bean Validation, JPA/Hibernate |
| Persistence | PostgreSQL 16, Flyway |
| Fast integration tests | H2 in PostgreSQL compatibility mode |
| Collection | Jsoup behind `SourceConnector` |
| Realtime | Server-Sent Events + polling recovery |
| Observability | Actuator, Micrometer, Prometheus, correlation IDs |
| Runtime | Docker Compose v2 |
| CI | GitHub Actions |

## Architecture

```text
Browser
  │
  │  HTTP + SSE
  ▼
Unprivileged Nginx / React + TypeScript
  │
  │  /api/v1/*
  ▼
Spring Boot modular monolith
  ├── controller   versioned HTTP boundary
  ├── dto          API contracts
  ├── domain       workflow/domain contracts
  ├── service      use-case orchestration
  ├── connector    source adapters
  ├── security     outbound URL / SSRF policy
  ├── repository   persistence boundary
  ├── entity       JPA persistence model
  ├── exception    stable error model
  └── config       typed runtime / request infrastructure
        │
        ├── PostgreSQL + Flyway
        ├── bounded workflow executor
        └── Actuator / Micrometer / Prometheus
```

Detailed system and request-flow diagrams are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository Structure

```text
NUMEN/
├── .github/
│   ├── workflows/{ci.yml,branch-policy.yml,dependency-review.yml}
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── backend/
│   ├── src/main/java/ai/numen/
│   │   ├── config/
│   │   ├── connector/
│   │   ├── controller/
│   │   ├── domain/
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── exception/
│   │   ├── repository/
│   │   ├── security/
│   │   └── service/
│   ├── src/main/resources/db/migration/
│   ├── src/test/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/
│   ├── src/{app,components,hooks,model,services,shared,styles}/
│   ├── tests/
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   ├── runtime/
│   └── quality/
├── docs/
│   ├── adr/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── DESIGN_SYSTEM.md
│   ├── AURORA_X_VISUAL_DIRECTIVE.md
│   ├── DEPLOYMENT.md
│   ├── ENGINEERING_STANDARDS.md
│   ├── PERFORMANCE.md
│   ├── RECOVERY.md
│   ├── RUNBOOK.md
│   ├── SECURITY.md
│   ├── SLO.md
│   ├── TESTING.md
│   └── THREAT_MODEL.md
├── docker-compose.yml
├── .env.example
├── start.bat / start.ps1 / start.sh
├── stop.ps1 / stop.sh
├── Makefile
└── README.md
```

## Prerequisites

Canonical one-step runtime:

- Docker Engine or Docker Desktop.
- Docker Compose v2.
- Git for cloning the repository.

Direct non-container backend/frontend development additionally requires the runtime versions documented in the Maven and npm manifests.

## Environment Variables

The root launcher creates `.env` automatically from `.env.example`. The generated file is ignored by Git.

| Variable | Required from user? | Default | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_DB` | No | `numen` | Local database name |
| `POSTGRES_USER` | No | `numen` | Local database user |
| `POSTGRES_PASSWORD` | No | generated on first start | Local database password |
| `NUMEN_WEB_PORT` | No | `5173` | Loopback web/gateway port |
| `NUMEN_API_PORT` | No | `8080` | Loopback direct API port |
| `NUMEN_HTTP_FETCH_ENABLED` | No | `true` | Enable explicit public HTTP(S) collection |
| `NUMEN_MAX_FETCH_URLS` | No | `8` | Maximum explicit source URLs per workflow |
| `NUMEN_MAX_FETCH_ATTEMPTS` | No | `2` | Attempts for transient source failures |
| `NUMEN_RETRY_BASE_DELAY_MS` | No | `250` | Base retry-backoff delay |
| `NUMEN_ALLOWED_ORIGINS` | No | local browser origins | Direct-backend CORS allowlist |

## Running the Project

The one-step launchers are the supported fresh-clone path. They validate Docker/Compose, configuration, port ranges and conflicts before starting the stack. Docker Compose health checks enforce PostgreSQL → backend → frontend ordering.

Running the start command again against an already healthy stack succeeds without rebuilding by default. Startup health probes intentionally use `127.0.0.1` rather than `localhost` because the Compose host ports are deliberately IPv4-loopback bound; this avoids Windows environments that resolve `localhost` to `::1` first. Browser-facing URLs remain the friendlier `localhost` form. See [docs/RUNBOOK.md](docs/RUNBOOK.md) for failure diagnostics and [docs/RECOVERY.md](docs/RECOVERY.md) for persisted-data recovery.

## Development Workflow

Useful root commands:

```bash
make start
make down
make logs
make ps
make doctor
make quality
make test
make verify
make smoke
make reset
```

`make quality` validates repository structure, source policy, Aurora visual policy, launcher syntax and whitespace. `make test` runs backend tests plus the frontend check pipeline. `make verify` performs the complete static/backend/frontend verification path.

For direct service development and debugging, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). The implemented visual system is documented in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), with the full Aurora X product/visual directive in [docs/AURORA_X_VISUAL_DIRECTIVE.md](docs/AURORA_X_VISUAL_DIRECTIVE.md).

## API Documentation

The API is versioned under `/api/v1`.

- Contract guide: [docs/API.md](docs/API.md)
- OpenAPI JSON: `http://localhost:5173/api/v1/openapi`
- Stable API errors include status, code, message, path and correlation ID.
- Workflow creation accepts `Idempotency-Key`; same key + same request replays the original task, while same key + different request returns `409 IDEMPOTENCY_CONFLICT`.
- Direct local CORS explicitly permits the idempotency and correlation headers needed by documented clients.

## Database

PostgreSQL is the persistent runtime store. Flyway owns schema evolution and Hibernate runs with schema validation rather than automatic production mutation.

Current migrations establish:

- workflow and dataset tables;
- foreign keys and per-task fingerprint uniqueness;
- workflow/query indexes;
- status, progress, quality, record-count and fingerprint constraints;
- optional idempotency-key uniqueness.

The normal startup path applies migrations automatically as the backend starts. Demo records are generated by the explicitly labelled demo connector; they are not hidden seed rows inserted directly into the database.

## Realtime Behavior

Workflow progress uses **Server-Sent Events** because communication is server → browser only.

A new subscriber receives the current persisted task state immediately. Subsequent backend state changes emit progress events. Streams have a bounded lifetime and reconnect hints; disconnect, timeout and shutdown all clean up emitters. The frontend also performs low-frequency polling as a convergence path when a proxy/browser misses events or the network briefly disconnects.

See ADR 0004 in [docs/adr](docs/adr/).

## Testing

The repository uses layered verification rather than one coverage percentage:

- Backend unit tests for planning, URL safety, correlation behavior, CSV safety and retry policy.
- Backend domain tests for workflow-state invariants.
- Spring integration tests for aggregate health, transactional publication, idempotency, CORS and API/error contracts.
- Deterministic React component-state tests for loading/disabled/empty/result/terminal workflow states and accessibility-relevant semantics.
- Strict TypeScript checks and production frontend build.
- Full-stack Docker test using PostgreSQL and the same one-step launcher a user runs.
- Full-stack workflow creation, idempotent replay, async completion, persisted provenance and CSV export.
- Idempotent second startup and clean CI shutdown.

Details: [docs/TESTING.md](docs/TESTING.md).

## Observability

Local backend endpoints:

```text
GET http://localhost:8080/actuator/health
GET http://localhost:8080/actuator/health/liveness
GET http://localhost:8080/actuator/health/readiness
GET http://localhost:8080/actuator/metrics
GET http://localhost:8080/actuator/prometheus
```

The application exposes standard JVM/process/database-pool HTTP metrics plus NUMEN workflow executor active-thread, pool-size and queue-depth gauges. Incoming requests receive a correlation ID propagated into logs and error responses.

Numeric SLO or benchmark claims are intentionally absent until measured in a representative environment. See [docs/SLO.md](docs/SLO.md) and [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Security Notes

The local Compose runtime is intentionally loopback-bound. Containers run unprivileged where practical, use read-only filesystems/capability reduction, and the gateway applies CSP and other browser security headers.

Live collection only accepts explicitly supplied public HTTP(S) targets that pass the outbound URL policy. Redirects are disabled and response size/time are bounded. CSV export neutralizes spreadsheet-formula prefixes.

This is not an internet-facing authentication platform. The local gateway applies process-local mutation-rate and SSE-connection limits, but authentication, tenant authorization, centralized secrets, production TLS, network-enforced egress and distributed/tenant-aware rate limits remain deployment gates.

See [SECURITY.md](SECURITY.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Architecture Decisions

Important non-obvious decisions are recorded under [docs/adr](docs/adr/), including:

- one-command runtime;
- main-only origin branch policy;
- explicit source-connector boundary;
- SSE progress with polling fallback.

## CI and Supply Chain

Every push to `main` runs repository standards, backend verification, frontend tests/typecheck/build and the full-stack one-step smoke test. Pull requests also run dependency review and reject newly introduced high-severity dependency risk. Third-party GitHub Actions used by these workflows are pinned to reviewed commit SHAs rather than floating major tags.

Frontend versions are exact in `package.json` and installs use `package-lock.json`. Backend dependency versions are controlled by Maven/Spring Boot dependency management plus explicit versions where needed. Dependency bots that create origin branches are intentionally disabled to preserve the repository's single-branch policy.

## Release and Versioning

The current application version is `0.1.0`. The repository does not publish automated production releases yet. When a release is intentionally created, use a reviewed `main` revision after green CI and tag it with a conventional `vMAJOR.MINOR.PATCH` version. Do not create release tags merely to simulate release maturity.

## Troubleshooting

The launcher prints the failing stage and Compose diagnostics when readiness is not reached. Common commands:

```bash
docker compose ps
docker compose logs --tail 200
docker compose logs -f backend
```

Typical issues and corrective actions for Docker availability, port conflicts, invalid environment values, database/migration failures, unhealthy services, rejected sources, SSE connectivity and capacity rejection are documented in [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Known Limitations

- No built-in authentication, RBAC or multi-tenant isolation; the supplied runtime is local/loopback-oriented.
- No distributed or tenant-aware rate limiter. The local Nginx gateway applies per-process mutation-rate and SSE-connection limits, while bounded executor admission protects the expensive workflow path.
- HTTP collection requires explicit source URLs. NUMEN does not claim autonomous internet-wide discovery/search.
- SSRF defenses reject unsafe targets before fetch, but DNS rebinding is a residual risk without production egress enforcement.
- Compose is the supported local/fresh-clone runtime, not a production orchestrator.
- Live-source correctness depends on the external source and does not establish truth merely because provenance exists.
- No measured production throughput, uptime, latency or user-capacity claims are published.

## Single-Branch and Contribution Policy

The origin is maintained with exactly one persistent branch: `main`. A branch-policy workflow deletes accidental non-`main` origin branches on creation, after pushes to `main` and through scheduled reconciliation. External contributors use fork branches and target `main`.

New canonical project work on `main` is required to resolve to the GitHub account **BackendArchitectX** and must not contain unintended `Co-authored-by` trailers. The branch-policy workflow audits the current `main` head in addition to enforcing the single-branch rule. Historical legitimate attribution must not be rewritten or falsely re-authored for statistics.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/DEPENDENCY_POLICY.md](docs/DEPENDENCY_POLICY.md).

## Contributor

**BackendArchitectX**

## License

MIT. See [LICENSE](LICENSE).
