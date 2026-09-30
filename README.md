# NUMEN

> **AI-Powered Data Intelligence Platform** — natural-language intent → managed workflow → permitted-source collection → validated, deduplicated, source-backed dataset.

NUMEN is an end-to-end implementation of the **AI-Powered Data Intelligence Platform** challenge. The challenge asks for a product that understands data requirements from natural-language prompts, dynamically creates and executes data-collection workflows, collects from multiple permitted sources, validates and deduplicates results, keeps source provenance, provides task monitoring/history, and supports search/filter/export. NUMEN implements that complete path with a premium live operations dashboard.

## Why NUMEN is different

- **Works with zero paid AI credits.** The default planner is deterministic and local, so the full demo is repeatable and offline-capable.
- **Real collection when a permitted URL is supplied.** Public HTTP(S) pages can be fetched, parsed and converted to structured records.
- **Safe-by-default URL handling.** Local/private/link-local/multicast network targets are blocked and redirects are not blindly followed.
- **Traceable evidence.** Every row carries source URL, source name/type, collection time, quality score and a SHA-256 deduplication fingerprint.
- **Live workflow observability.** Seven pipeline stages stream to the React UI using Server-Sent Events.
- **Persistent history.** Workflows and datasets are stored in PostgreSQL in Docker mode.
- **One-command launch.** Backend, frontend and database start together with Docker Compose.

## Challenge coverage

| Challenge requirement | NUMEN implementation |
|---|---|
| Understand natural-language requirements | `WorkflowPlanner` classifies intent and constructs a deterministic workflow |
| Dynamically design/execute workflows | Async `TaskRunner` executes the seven-stage plan |
| Multiple permitted sources | Explicit public HTTP(S) sources + isolated offline demo adapter |
| Clean/structure/validate/deduplicate | Normalization, completeness quality score, SHA-256 fingerprint dedupe |
| Source-backed traceable data | Provenance fields on every record |
| Monitor/manage tasks | Live SSE progress, status, stage, cancellation |
| Search/filter/export | Dataset explorer, quality filters, text search, CSV export |
| Workflow/dataset history | Persisted task and record entities |

## Architecture

```text
┌───────────────────────────┐
│ React + TypeScript + Vite │
│ premium intelligence UI   │
└─────────────┬─────────────┘
              │ REST + SSE
              ▼
┌───────────────────────────┐
│      Spring Boot API      │
│                           │
│  WorkflowPlanner          │
│  TaskRunner / EventHub    │
│  UrlSafetyGuard           │
│  CollectionEngine         │
│  Validation + Dedup       │
└─────────────┬─────────────┘
              │ JPA
              ▼
        ┌────────────┐
        │ PostgreSQL │
        └────────────┘
```

## Quick start

### Prerequisites

- Docker Desktop with Docker Compose

### Windows

```powershell
.\run.ps1
```

### macOS / Linux

```bash
chmod +x run.sh
./run.sh
```

Then open **http://localhost:5173**. The API is available at **http://localhost:8080** and health at **http://localhost:8080/actuator/health**.

## Demo prompts

Use a zero-credit demo prompt:

```text
Find Java backend engineering roles in India and structure title, company, location, URL and source.
```

Or test real permitted-source collection by including an explicit public URL:

```text
Collect structured intelligence from this permitted source: https://example.com
Return title, organization, source and a concise excerpt.
```

If no fetchable public URL is present, NUMEN deliberately switches to **offline demo mode** and labels those rows `NUMEN Demo Catalog`; it never pretends synthetic rows came from the live web.

## Local development

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The default backend profile uses an in-memory H2 database for fast local development. Docker mode uses PostgreSQL.

## API surface

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/tasks` | Create a workflow from a prompt |
| `GET` | `/api/tasks` | Workflow history |
| `GET` | `/api/tasks/{id}` | Workflow details |
| `GET` | `/api/tasks/{id}/events` | Live SSE progress |
| `POST` | `/api/tasks/{id}/cancel` | Cancel active workflow |
| `GET` | `/api/tasks/{id}/records` | Search/filter result rows |
| `GET` | `/api/tasks/{id}/export.csv` | Export dataset |

## Security model

NUMEN does **not** act as an unrestricted scraper. Its web adapter accepts only absolute HTTP(S) URLs, resolves the host before fetching, blocks private/local/link-local/multicast destinations, uses body/timeout limits and does not blindly follow redirects. A production deployment should additionally add source-specific policies, robots/terms enforcement, DNS pinning, authentication, tenant isolation and rate limits. See [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```text
NUMEN/
├── backend/                 # Java 17 / Spring Boot
├── frontend/                # React / TypeScript / Vite
├── docs/                    # architecture + demo script
├── .github/workflows/       # CI
├── docker-compose.yml
├── run.ps1
└── run.sh
```

## Tech stack

Java 17 · Spring Boot 3 · Spring Data JPA · PostgreSQL · H2 · Jsoup · React · TypeScript · Vite · Nginx · Docker Compose · GitHub Actions

## Roadmap

The architecture intentionally separates planning from collection. The next premium extensions are a local Ollama planner with constrained JSON output, connector-specific workers, source-policy/robots enforcement, raw evidence snapshots in object storage, Kafka/SQS task dispatch, OpenTelemetry, authentication/RBAC and headless-browser workers for permitted JavaScript-heavy sources.

## License

MIT
