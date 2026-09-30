# NUMEN

**AI-Powered Data Intelligence Platform** — natural-language intent → managed workflow → permitted-source collection → validated, deduplicated, source-backed dataset.

NUMEN is a full-stack implementation of the AI-Powered Data Intelligence Platform challenge. It converts plain-English requirements into auditable collection workflows, gathers data from explicitly permitted public HTTP(S) sources, preserves provenance, scores quality, deduplicates records, streams progress live and exposes the resulting dataset through a premium operations console.

## One-step start

### Windows

Double-click `start.bat` **or** run exactly one command:

```powershell
.\start.ps1
```

### macOS / Linux

```bash
./start.sh
```

That single command validates Docker, creates `.env` when needed, builds the frontend/backend images, starts PostgreSQL + Spring Boot + React, waits for health checks, and opens the application.

- Web: `http://localhost:5173`
- API: `http://localhost:8080/api/v1`
- Health: `http://localhost:5173/api/v1/health`
- Stop: `./stop.sh` or `.\stop.ps1`

## Architecture

```text
Browser
  │
  ▼
Nginx / React + TypeScript
  │  REST + SSE
  ▼
Spring Boot API
  ├── controller    API boundary + DTO mapping
  ├── service       use cases / workflow orchestration
  ├── security      outbound URL validation
  ├── repository    persistence boundary
  ├── entity        JPA domain persistence model
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
│   ├── CODEOWNERS
│   └── workflows/ci.yml
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
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO.md
│   ├── RUNBOOK.md
│   └── SECURITY.md
├── docker-compose.yml
├── start.ps1 / start.sh / start.bat
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

## Engineering standards built in

- **One-command reproducible runtime** with Docker Compose
- **Layered backend architecture** with DTO/API separation
- **Feature-oriented frontend structure** instead of a monolithic component
- **Flyway database migrations** with Hibernate schema validation
- **Optimistic locking** for workflow state
- **Typed configuration** through `@ConfigurationProperties`
- **Graceful shutdown**, bounded async workers and health probes
- **SSRF controls**, redirect blocking and response-size/time limits
- **Container hardening** with a non-root backend user
- **Versioned REST API** under `/api/v1`
- **CI gates** for backend verification, frontend production build and complete Docker smoke test
- **CODEOWNERS**, `.editorconfig`, `.gitattributes`, `.dockerignore` and environment template

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

If a prompt contains no source URL, NUMEN intentionally uses its clearly-labelled offline demo catalog. Synthetic rows are never represented as live web results.

## Developer commands

```bash
make up       # start full stack
make down     # stop full stack
make logs     # follow logs
make test     # backend tests + frontend build
make verify   # validation + full local verification
make clean    # remove containers and local database volume
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Operations runbook](docs/RUNBOOK.md)
- [Security model](docs/SECURITY.md)
- [Demo script](docs/DEMO.md)

## License

MIT
