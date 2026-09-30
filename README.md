# NUMEN

**AI-Powered Data Intelligence Platform** — natural-language intent → managed workflow → permitted-source collection → validated, deduplicated, source-backed dataset.

NUMEN is a full-stack data-intelligence platform built as an industry-style product rather than a single-file demo. It converts plain-English requirements into auditable collection workflows, gathers data from explicitly permitted public HTTP(S) sources, preserves provenance, scores quality, deduplicates records, streams execution progress live, and exposes the resulting dataset through an operations console.

## One-step start

A fresh checkout needs **Docker Desktop / Docker Engine with Compose v2 only**. Java, Maven, Node.js, npm and PostgreSQL do not need to be installed locally.

### Windows

Double-click `start.bat`, or run:

```powershell
.\start.ps1
```

If Docker Desktop is installed but not running, the Windows launcher attempts to start it automatically. The launcher creates or repairs `.env`, replaces the placeholder database password with a unique local secret, validates ports and Compose, recovers stale NUMEN containers, checks port conflicts, builds all images, waits for health probes, verifies the public gateway, prints diagnostics on failure, and opens the UI.

### macOS / Linux

```bash
./start.sh
```

On macOS the launcher also attempts to open Docker Desktop when the engine is stopped.

- Web: `http://localhost:5173`
- API gateway: `http://localhost:5173/api/v1`
- Direct API: `http://localhost:8080/api/v1`
- Health: `http://localhost:5173/api/v1/health`
- Stop: `./stop.sh` or `.\stop.ps1`
- Reset local data: `./stop.sh --volumes` or `.\stop.ps1 -Volumes`

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 7, Vite 8, Lucide, unprivileged Nginx |
| Backend | Java 17, Spring Boot 3.3, Spring MVC, Bean Validation, JPA/Hibernate |
| Data | PostgreSQL 16, Flyway migrations, H2 PostgreSQL-mode integration tests |
| Collection | Jsoup behind an explicit source-connector boundary |
| Realtime | Server-Sent Events with reconnect hints plus polling fallback |
| Observability | Spring Boot Actuator, Micrometer, Prometheus metrics, correlation IDs |
| Runtime | Docker Compose v2 with health/readiness dependency ordering |
| CI | GitHub Actions, locked frontend installs, Maven verification, full-stack smoke tests |

## Environment configuration

The root launcher creates `.env` from `.env.example` automatically. Defaults are safe for local use and host ports bind only to loopback.

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_DB` | `numen` | Local database name |
| `POSTGRES_USER` | `numen` | Local database user |
| `POSTGRES_PASSWORD` | generated | Unique local password created on first start |
| `NUMEN_WEB_PORT` | `5173` | Browser/gateway port |
| `NUMEN_API_PORT` | `8080` | Direct loopback API port |
| `NUMEN_HTTP_FETCH_ENABLED` | `true` | Enables explicit public HTTP(S) collection |
| `NUMEN_MAX_FETCH_URLS` | `8` | Maximum explicit source URLs per workflow |
| `NUMEN_MAX_FETCH_ATTEMPTS` | `2` | Bounded attempts for transient source failures |
| `NUMEN_RETRY_BASE_DELAY_MS` | `250` | Base backoff before retry jitter |
| `NUMEN_ALLOWED_ORIGINS` | local web origins | Backend CORS allowlist |

## Architecture

```text
Browser
  │
  ▼
Unprivileged Nginx / React + TypeScript
  │  REST + SSE + correlation IDs
  ▼
Spring Boot API (non-root)
  ├── controller    versioned HTTP boundary
  ├── dto           public API contracts
  ├── service       workflow/use-case orchestration
  ├── security      outbound URL/SSRF policy
  ├── repository    persistence boundary
  ├── entity        JPA persistence model
  ├── exception     consistent error contracts
  └── config        typed runtime + request infrastructure
        │
        ▼
 PostgreSQL + Flyway
        │
        └── Actuator / Micrometer / Prometheus instrumentation
```

## API contract

The HTTP API is versioned under `/api/v1`. Machine-readable OpenAPI is available at:

```text
http://localhost:5173/api/v1/openapi
```

Workflow creation accepts an optional `Idempotency-Key`. Replaying the same key and payload returns the same workflow; reusing the key with a different payload returns `409 IDEMPOTENCY_CONFLICT`. API failures use stable error codes and include the request correlation ID.

## Repository structure

```text
NUMEN/
├── .github/
│   ├── workflows/{ci.yml,branch-policy.yml}
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
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   ├── runtime/
│   └── quality/
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── ENGINEERING_STANDARDS.md
│   ├── DEPENDENCY_POLICY.md
│   ├── RUNBOOK.md
│   ├── RECOVERY.md
│   ├── SLO.md
│   ├── SECURITY.md
│   ├── THREAT_MODEL.md
│   ├── TESTING.md
│   └── DEMO.md
├── docker-compose.yml
├── start.bat / start.ps1 / start.sh
├── stop.ps1 / stop.sh
├── SECURITY.md
├── CONTRIBUTING.md
├── Makefile
└── README.md
```

## Engineering baseline

- Canonical one-command runtime tested by CI using the same launcher humans run, including an idempotent second start
- Java 17 / Spring Boot with DTO/entity separation, explicit workflow state transitions, stable error codes, idempotent workflow creation with payload-conflict detection and versioned `/api/v1` contracts
- Flyway migrations with Hibernate schema validation, database/domain invariants, optimistic locking and transactional workflow-result publication
- Bounded async execution with explicit overload rejection, restart recovery for interrupted workflows, graceful shutdown, HikariCP limits and health probes
- Correlation IDs in requests, logs and API errors plus machine-readable OpenAPI at `/api/v1/openapi`
- Actuator metrics and Prometheus registry including workflow executor activity, pool size and queue depth
- Pluggable source-connector boundary plus SSRF controls, reserved-range/credential/non-standard-port blocking, redirect restrictions, response-size/time limits, bounded transient retries with backoff/jitter and provenance
- React/TypeScript feature separation with production typecheck/build gates, resilient request timeouts, accessible interaction states and exact manifest versions backed by `package-lock.json`
- Non-root containers, read-only filesystems where practical, dropped capabilities and `no-new-privileges`
- Loopback-only host ports, CSP/security headers, immutable asset caching, bounded logs and no runtime font/CDN dependency
- Bounded task/result reads, spreadsheet-safe CSV export and forward-only database hardening migrations
- Aggregate readiness/health checks and full-stack CI that creates a workflow, waits for completion, validates persisted provenance, exports CSV and re-runs the one-step launcher idempotently
- Source-policy checks reject runtime TODO/FIXME/HACK debt, unsafe raw HTML rendering and backend stdout/stack-trace logging
- Repository structure enforcement and full-stack one-step smoke testing in CI

## Single-branch policy

The origin repository is intentionally maintained with **exactly one persistent branch: `main`**. A dedicated branch-policy workflow removes accidental non-`main` origin branches on branch creation, after pushes to `main`, and through a scheduled reconciliation pass. Dependency bots that create origin branches are disabled. External contributions use branches in forks and target `main`. See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/DEPENDENCY_POLICY.md`](docs/DEPENDENCY_POLICY.md), and ADR 0002.

## Verification model

A green `main` run requires repository policy checks, Bash/PowerShell launcher parsing, backend unit/integration verification, strict TypeScript checks, production frontend build, Docker Compose validation and a full-stack test that starts NUMEN through the real one-step launcher. The full-stack test also creates a workflow, verifies idempotent replay, waits for completion, validates persisted provenance, exports CSV and verifies a second idempotent startup.

No throughput, latency, concurrency or uptime claims are published without measurement.

## Developer commands

```bash
make start    # one-step full stack
make down     # stop and preserve local DB data
make logs     # follow service logs
make quality  # repository structure + Bash/PowerShell launcher syntax + whitespace checks
make test     # backend tests + frontend checks
make verify   # complete static/backend/frontend verification
make smoke    # start stack through canonical launcher and verify health
make reset    # stop and delete the local DB volume
```

## Troubleshooting

The launcher fails fast and prints Compose diagnostics when startup does not become healthy. For manual diagnosis:

```bash
docker compose ps
docker compose logs --tail 200
docker compose logs -f backend
```

See the runbook for port conflicts, database failures, rejected sources, capacity errors and recovery procedures.

## Documentation

See [Engineering Standards](docs/ENGINEERING_STANDARDS.md), [Architecture](docs/ARCHITECTURE.md), [Development](docs/DEVELOPMENT.md), [Testing](docs/TESTING.md), [Threat Model](docs/THREAT_MODEL.md), [Operations Runbook](docs/RUNBOOK.md), [Recovery](docs/RECOVERY.md), [Deployment](docs/DEPLOYMENT.md), [Performance](docs/PERFORMANCE.md), [Service-Level Indicators](docs/SLO.md), [Security](docs/SECURITY.md) and [Demo Script](docs/DEMO.md).

## License

MIT
