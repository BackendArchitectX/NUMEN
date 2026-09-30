# ADR 0001: One-command local runtime

**Status:** Accepted

## Context

NUMEN contains a PostgreSQL database, Spring Boot API and React/Nginx web tier. Requiring developers or judges to start each component separately creates configuration drift and increases demo risk.

## Decision

Docker Compose is the canonical local runtime. The repository exposes thin platform-native launchers (`start.bat`, `start.ps1`, `start.sh`) which delegate to version-controlled runtime scripts under `scripts/runtime/`.

The launcher must be idempotent, validate prerequisites, create local configuration safely, detect common port conflicts, wait for health checks, surface diagnostics on failure and verify the same public endpoint used by the browser.

## Consequences

- A fresh checkout needs only Docker Desktop/Engine + Compose v2.
- CI tests the same startup path used by humans.
- Individual services can still be run from an IDE for debugging, but Compose remains the reference integration environment.
- Runtime complexity is centralized in `scripts/runtime/` rather than duplicated across documentation and developer machines.
