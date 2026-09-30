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

If Docker Desktop is installed but not running, the Windows launcher attempts to start it automatically. The launcher also creates `.env` with a unique local DB password, validates Compose, recovers stale NUMEN containers, checks port conflicts, builds all images, waits for health probes, verifies the public gateway, prints diagnostics on failure, and opens the UI.

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
│   │   ├── controller/
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
│   ├── SECURITY.md
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

- Canonical one-command runtime tested by CI using the same launcher humans run
- Java 17 / Spring Boot with DTO/entity separation and versioned `/api/v1` contracts
- Flyway migrations with Hibernate schema validation and optimistic locking
- Bounded async execution with explicit overload rejection, graceful shutdown, HikariCP limits and health probes
- Correlation IDs in requests, logs and API errors
- Actuator metrics and Prometheus registry
- SSRF controls, reserved-range/credential/non-standard-port blocking, redirect restrictions, response-size/time limits and provenance
- React/TypeScript feature separation with production typecheck/build gates, resilient request timeouts, accessible interaction states and exact manifest versions backed by `package-lock.json`
- Non-root containers, read-only filesystems where practical, dropped capabilities and `no-new-privileges`
- Loopback-only host ports, CSP/security headers, immutable asset caching, bounded logs and no runtime font/CDN dependency
- Bounded task/result reads, spreadsheet-safe CSV export and forward-only database hardening migrations
- Repository structure enforcement and full-stack one-step smoke testing in CI

## Single-branch policy

The origin repository is intentionally maintained with **exactly one persistent branch: `main`**. A dedicated branch-policy workflow removes accidental non-`main` origin branches after pushes to `main`. Dependency bots that create origin branches are disabled. External contributions use branches in forks and target `main`. See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/DEPENDENCY_POLICY.md`](docs/DEPENDENCY_POLICY.md), and ADR 0002.

## Developer commands

```bash
make start    # one-step full stack
make down     # stop and preserve local DB data
make logs     # follow service logs
make quality  # repository structure + whitespace checks
make test     # backend tests + frontend checks
make verify   # complete static/backend/frontend verification
make smoke    # start stack through canonical launcher and verify health
make reset    # stop and delete the local DB volume
```

## Documentation

See [Engineering Standards](docs/ENGINEERING_STANDARDS.md), [Architecture](docs/ARCHITECTURE.md), [Development](docs/DEVELOPMENT.md), [Operations Runbook](docs/RUNBOOK.md), [Security](docs/SECURITY.md) and [Demo Script](docs/DEMO.md).

## License

MIT
