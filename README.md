# NUMEN

**AI-Powered Data Intelligence Platform** — natural-language intent → managed workflow → permitted-source collection → validated, deduplicated, source-backed dataset.

NUMEN is a full-stack implementation of the AI-Powered Data Intelligence Platform challenge. It converts plain-English requirements into auditable collection workflows, gathers data from explicitly permitted public HTTP(S) sources, preserves provenance, scores quality, deduplicates records, streams progress live and exposes the resulting dataset through a premium operations console.

## One-step start

A fresh checkout needs **Docker Desktop / Docker Engine with Compose v2 only**. You do not need to install Java, Maven, Node.js, npm or PostgreSQL locally.

### Windows

Double-click `start.bat`, or run exactly one command:

```powershell
.\start.ps1
```

### macOS / Linux

```bash
./start.sh
```

The launcher validates Docker, creates `.env` with a unique local database password, checks port conflicts, validates Compose, builds the complete stack, waits for health probes, verifies the public API through Nginx, and opens the application. Re-running the command is idempotent: an already-healthy NUMEN stack is detected and reused.

- Web: `http://localhost:5173`
- API gateway: `http://localhost:5173/api/v1`
- Direct API: `http://localhost:8080/api/v1`
- Health: `http://localhost:5173/api/v1/health`
- Stop: `./stop.sh` or `.\stop.ps1`
- Reset data: `./stop.sh --volumes` or `.\stop.ps1 -Volumes`

## Architecture

```text
Browser
  │
  ▼
Nginx (unprivileged) / React + TypeScript
  │  REST + SSE
  ▼
Spring Boot API (non-root)
  ├── controller    API boundary + DTO mapping
  ├── service       use cases / workflow orchestration
  ├── security      outbound URL validation
  ├── repository    persistence boundary
  ├── entity        JPA persistence model
  ├── dto           public API contracts
  ├── exception     consistent error mapping
  └── config        typed runtime configuration
        │
        ▼
   PostgreSQL + Flyway
```

## Repository structure

```text
NUMEN/
├── .github/
│   ├── workflows/ci.yml
│   ├── CODEOWNERS
│   ├── dependabot.yml
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
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── model/
│   │   ├── services/
│   │   ├── shared/
│   │   └── styles/
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   └── runtime/             # canonical cross-platform startup/stop logic
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── RUNBOOK.md
│   ├── SECURITY.md
│   └── DEMO.md
├── docker-compose.yml
├── start.bat / start.ps1 / start.sh
├── stop.ps1 / stop.sh
├── Makefile
└── README.md
```

## Challenge coverage

| Requirement | Implementation |
|---|---|
| Understand natural-language requirements | deterministic local `WorkflowPlanner` |
| Dynamically design/execute workflows | bounded async worker pool + `TaskRunner` |
| Collect from permitted sources | public HTTP(S) adapter with SSRF guardrails |
| Clean/structure/validate/deduplicate | normalization, quality scoring, SHA-256 fingerprints |
| Source-backed traceable data | provenance fields on every dataset row |
| Monitor/manage collection tasks | live SSE stages + cancellation + persistent status |
| Search/filter/export | dataset explorer, quality filters, CSV export |
| Workflow and dataset history | PostgreSQL persistence with Flyway migrations |

## Engineering standards

- **Canonical one-command runtime** tested in CI using the same launcher humans use
- **Layered backend architecture** with DTO/entity separation and versioned REST APIs
- **Feature-oriented frontend structure** with services, hooks and components separated
- **Flyway migrations** + Hibernate schema validation + optimistic locking
- **Typed configuration**, bounded workers, graceful shutdown and health probes
- **Outbound SSRF controls**, redirect blocking and response-size/time limits
- **Non-root containers**, read-only filesystems where practical, dropped Linux capabilities and `no-new-privileges`
- **Loopback-only host ports**, Nginx security headers and bounded container logs
- **CI gates** for static validation, backend verification, frontend typecheck/build and full one-step smoke test
- **CODEOWNERS**, Dependabot policy, PR template, `.editorconfig`, `.gitattributes`, `.dockerignore`, `.gitignore` and environment template
- **Operational docs + ADRs** so runtime and architecture decisions are explicit rather than tribal knowledge

## Demo prompts

Zero-credit deterministic demo:

```text
Find Java backend engineering roles in India and structure title, company, location, URL and source.
```

Real permitted-source collection:

```text
Collect structured intelligence from this permitted source: https://example.com
Return title, organization, source and a concise excerpt.
```

If a prompt contains no source URL, NUMEN intentionally uses its clearly labelled offline demo catalog. Synthetic rows are never represented as live web results.

## Developer commands

```bash
make start    # one-step full stack
make down     # preserve local database data
make logs     # follow service logs
make test     # backend tests + frontend typecheck/build
make verify   # repository + backend + frontend checks
make smoke    # start stack through the canonical launcher and verify health
make reset    # stop and delete local database volume
```

See [Development Guide](docs/DEVELOPMENT.md), [Architecture](docs/ARCHITECTURE.md), [Operations Runbook](docs/RUNBOOK.md), [Security Model](docs/SECURITY.md) and [Demo Script](docs/DEMO.md).

## License

MIT
