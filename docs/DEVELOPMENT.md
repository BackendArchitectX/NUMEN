# Development Guide

## Golden path

For normal development, the supported entry point is the repository root. Do not start three terminals manually unless you are debugging a service in isolation.

Windows:

```powershell
.\start.ps1
```

macOS/Linux:

```bash
./start.sh
```

The launcher performs prerequisite checks, creates a local `.env` with a unique database password, validates Compose, builds images, starts the dependency graph, waits for container health, verifies the public API through Nginx, and opens the application.

## Useful options

```bash
./start.sh --no-browser   # CI/headless usage
./start.sh --reset        # recreate local database state
./start.sh --no-build     # reuse existing images
./stop.sh --volumes       # stop and delete local database data
```

PowerShell equivalents are `-NoBrowser`, `-Reset`, `-NoBuild` and `-Volumes`.

## Service-level debugging

The full stack remains the reference environment. When debugging the backend from IntelliJ, stop the Compose backend service and run `NumenApplication` with the same datasource/configuration values. For frontend-only work, Vite can proxy `/api` to the backend.

## Definition of done

A change is complete when:

- backend verification passes;
- frontend typecheck and production build pass;
- Compose configuration validates;
- the one-step launcher starts a healthy full stack;
- database changes include Flyway migrations;
- operational/environment changes are documented;
- no secrets or generated artifacts are committed.
