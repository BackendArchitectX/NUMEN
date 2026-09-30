# Engineering Standards

NUMEN is intentionally structured as a maintainable product rather than a single-file challenge demo.

## Runtime contract

A fresh checkout must start with one command (`start.bat`, `./start.ps1`, or `./start.sh`) and require only Docker with Compose v2. The launcher owns environment bootstrap, stale-container recovery, image builds, dependency ordering, health verification, diagnostics, and browser opening.

## Backend

- Java 17 is the supported language/runtime baseline.
- Controllers expose versioned API contracts and never return JPA entities directly.
- DTOs, persistence entities, repositories, service orchestration, outbound security, configuration, and exception mapping remain separated.
- Database changes are forward-only Flyway migrations; Hibernate validates rather than mutates production schemas.
- Long-running work uses bounded executors.
- Every HTTP request has a correlation ID and errors return that ID for supportability.
- Health, metrics, and Prometheus instrumentation are available through Actuator.
- Outbound collection must pass SSRF controls and explicit resource limits.

## Frontend

- React UI composition lives under `components/`; stateful orchestration belongs in hooks; API transport belongs in services; shared models and helpers stay independent of UI code.
- TypeScript strict mode and production builds are CI gates.
- Production assets are served by an unprivileged Nginx image with CSP and other response hardening.
- The browser talks to the API through the same-origin gateway; no environment-specific API URL is hard-coded into UI components.

## Containers and operations

- Application containers run non-root.
- Host ports bind to loopback for local use.
- Read-only filesystems, dropped capabilities, `no-new-privileges`, bounded logs, graceful shutdown, and health checks are used where practical.
- PostgreSQL data is preserved on normal stop/restart and removed only through an explicit reset command.

## Repository governance

- `main` is the only persistent origin branch; `.github/workflows/branch-policy.yml` automatically prunes accidental non-`main` origin branches.
- Automated dependency PR generation is disabled because it creates origin branches; dependency upgrades are reviewed and committed manually after CI verification.
- CI validates repository structure, backend verification, frontend typechecking/build, Compose validity, and a complete one-step startup smoke test.
- Frontend dependency manifests use exact versions; the lockfile is authoritative for reproducible CI/container installs.
- Generated artifacts, local secrets, `.env`, `node_modules`, `target`, and `dist` must never be tracked.
