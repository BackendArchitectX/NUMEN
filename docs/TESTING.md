# NUMEN Testing Strategy

NUMEN uses layered verification so a green build means more than successful compilation.

## 1. Repository and runtime-contract checks

CI verifies the expected folder structure, absence of tracked generated/private artifacts, exact frontend dependency versions, no runtime Google Font/CDN dependency, Bash launcher syntax, PowerShell launcher syntax, whitespace and Docker Compose validity.

## 2. Backend unit tests

Focused tests cover deterministic planning, correlation-ID behavior, SSRF/address policy and spreadsheet-safe CSV output.

## 3. Backend integration tests

Spring Boot integration tests boot the actual application context with Flyway and JPA enabled.

- `HealthControllerIntegrationTest` verifies that the public health API reflects aggregate Actuator health rather than returning an unconditional constant.
- `WorkflowResultPublisherIntegrationTest` verifies transactional dataset replacement, terminal workflow publication and the final completion-timeline event through the persistence layer.
- `TaskSummaryIntegrationTest` verifies exact dataset-wide outcome counts, top-location aggregation and per-source evidence contribution from persisted records.
- `TaskIdempotencyIntegrationTest` proves repeated submissions with the same idempotency key create one workflow and one durable creation-timeline event.
- `ApiContractIntegrationTest` protects the OpenAPI endpoint plus the stable error-code/correlation-ID contract.

The default test datasource is H2 in PostgreSQL compatibility mode for fast deterministic CI. The full-stack stage below provides the PostgreSQL runtime check.

## 4. Frontend component and build verification

CI installs only from `package-lock.json`, runs strict TypeScript typechecking, executes deterministic server-rendered component-state tests and produces the Vite production build.

The component tests exercise meaningful presentation states without adding a browser-simulation dependency: offline and busy submission controls, accessible prompt semantics, completed-empty datasets, populated source/provenance rendering, active-vs-terminal workflow controls, persisted execution-plan rendering, persisted run-timeline rendering, no-fake-progress semantics, explicit new-research navigation, source coverage, zero-result completion and exact outcome rendering. These tests intentionally complement rather than duplicate the full-stack browser-facing gateway smoke test.

## 5. Full-stack one-step smoke test

CI starts NUMEN through the same `./start.sh --no-browser` entry point used by a real user. Docker Compose starts PostgreSQL, Spring Boot and Nginx/React and waits for service readiness.

The smoke stage then verifies:

- frontend container health;
- public API aggregate health;
- workflow creation through the Nginx gateway;
- asynchronous workflow completion;
- persisted dataset retrieval and labelled demo provenance;
- CSV export;
- a second idempotent invocation of the one-step launcher;
- clean shutdown and ephemeral CI-volume removal.

This is the canonical end-to-end contract for the repository.

## 6. Live-source testing

External HTTP(S) collection is deliberately not required for deterministic CI because public-network availability and third-party behavior are outside the repository's control. Live-source checks are manual/targeted and must use explicitly permitted public sources.

## Definition of done

A change is not complete until repository checks, backend verification, frontend checks and the full-stack workflow smoke test pass on `main`.


## Aurora X product/visual verification

Frontend verification now protects product hierarchy as well as rendering correctness:

- the warm-color denylist rejects known legacy values and prohibited color names,
- the hue-based Aurora X check rejects newly introduced orange/tan/copper-like hex, RGB and HSL literals even when the exact value was never seen before,
- component-state tests cover progressive source-scope disclosure,
- repeated recent research is grouped only when question, Demo/live mode and source scope are materially equivalent,
- published datasets are exposed through a library rather than a stale cross-workspace selection,
- bounded recent-run/dataset collections do not masquerade as lifetime totals,
- zero-result outcomes avoid meaningless evidence ratios,
- completed outcome actions stay visually secondary to the results themselves.

## Aurora X¹² source-boundary verification

Backend verification now protects the source capability and partiality contract:

- the workflow plan declares source-capability and partial-source-truth safeguards;
- HTTP 401/403 classify as UNAUTHORIZED;
- HTTP 429 classifies as RATE_LIMITED;
- source-side unavailability remains UNAVAILABLE;
- persisted task summaries distinguish configured, attempted, successful, failed and not-attempted sources;
- connector identity and capability metadata survive into source summaries.

Frontend component-state verification protects the corresponding user semantics:

- partial source coverage shows successful/configured collection rather than contributing/configured rows;
- an unavailable source is labelled as unavailable rather than as an empty source;
- active workflow progress counts checked sources and reports limitations without exposing fake milestone percentages.

A future federated, partner, sovereign or air-gapped feature is not considered covered by these tests merely because this source-boundary foundation exists. Such a feature must add the relevant AURORA X¹² acceptance tests before it is presented as supported.
