# Contributing to NUMEN

NUMEN follows a small-team production discipline: changes should preserve the one-step runtime, architectural boundaries, source traceability and safe-by-default collection model.

## Development contract

1. Keep controllers thin: HTTP parsing, validation and DTO mapping only.
2. Put business workflows in services; persistence access stays in repositories.
3. Do not expose JPA entities as public API contracts.
4. Database changes require a forward-only Flyway migration.
5. New external collection paths must pass through outbound URL safety controls and preserve source provenance.
6. Frontend API calls belong in `services/`; stateful orchestration belongs in hooks; presentational UI belongs in components.
7. New runtime configuration must be documented in `.env.example` and `docs/RUNBOOK.md`.
8. Never commit credentials, tokens, local `.env` files, generated build output or database data.

## Before opening a change

```bash
make verify
make smoke
```

On Windows, the equivalent full-stack check is:

```powershell
.\start.ps1 -NoBrowser
.\stop.ps1
```

Use focused commit messages such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:` and `chore:`. Keep each commit independently understandable and avoid unrelated formatting churn.
