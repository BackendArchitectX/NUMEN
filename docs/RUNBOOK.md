# NUMEN Operations Runbook

## Start

Windows: `start.bat` or `.\start.ps1`

macOS/Linux: `./start.sh`

The launcher performs Docker preflight checks, creates or repairs `.env`, generates a unique password when the placeholder is still present, validates port values and port separation, validates Compose, builds all images, starts the stack, verifies that the public health response identifies NUMEN, and opens the UI. The readiness probe uses `127.0.0.1` because Docker host ports are explicitly bound to IPv4 loopback; user-facing links continue to use `localhost`.

## Stop

Windows: `.\stop.ps1`

macOS/Linux: `./stop.sh`

## Health

- Public: `http://localhost:5173/api/v1/health`
- Backend actuator: `http://localhost:8080/actuator/health`
- Backend readiness: `http://localhost:8080/actuator/health/readiness`
- OpenAPI contract: `http://localhost:5173/api/v1/openapi`
- Frontend container: `http://localhost:5173/healthz`

## Diagnostics

```bash
docker compose ps
docker compose logs --tail 200
docker compose logs -f backend
docker compose logs -f frontend
```

## Clean reset

```bash
docker compose down --volumes --remove-orphans
```

This removes the local PostgreSQL volume. Use it only when you intentionally want to erase local workflow history.

## Port overrides

Edit `.env`:

```text
NUMEN_WEB_PORT=5173
NUMEN_API_PORT=8080
```

## Idempotent restart

Running the same start command again against an already-healthy NUMEN stack exits successfully without rebuilding or replacing containers. CI verifies this behavior.

If the backend process was interrupted while workflows were active, NUMEN redispatches non-terminal workflows after the application becomes ready. Recovered work still goes through the bounded executor and transactional publication path.

## Backup and recovery

See [`RECOVERY.md`](RECOVERY.md) for logical backup, restore, bad-release rollback and corruption recovery guidance.

## Failure modes

- **Docker not running** — launcher exits before doing any work.
- **Invalid or duplicate port configuration** — use distinct integer ports from 1–65535 in `.env`.
- **Port already in use** — change the matching port in `.env`.
- **Containers show healthy but startup says the public endpoint is not ready** — current launchers probe `127.0.0.1`, matching the Compose IPv4 bind. If this still occurs, run `Invoke-RestMethod http://127.0.0.1:5173/api/v1/health` on Windows (or `curl http://127.0.0.1:5173/api/v1/health` on Unix), then inspect `docker compose logs frontend backend` and check local proxy/firewall/security software.
- **Backend unhealthy** — inspect `docker compose logs backend`.
- **Database unhealthy** — inspect `docker compose logs db`.
- **Source rejected** — ensure the supplied URL is public HTTP(S), uses port 80/443, contains no embedded credentials and is directly reachable without redirects. Transient network/408/429/5xx failures receive only a small bounded retry budget.
- **HTTP 429 `GATEWAY_RATE_LIMIT`** — the local Nginx gateway observed a mutation burst or too many concurrent SSE streams from one client. Wait for the `Retry-After` interval, reduce request concurrency, and retry.
- **HTTP 429 `WORKFLOW_CAPACITY_EXHAUSTED`** — the bounded backend worker queue is full; retry after the response `Retry-After` interval.
