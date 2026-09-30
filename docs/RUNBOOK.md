# NUMEN Operations Runbook

## Start

Windows: `start.bat` or `.\start.ps1`

macOS/Linux: `./start.sh`

The launcher performs Docker preflight checks, creates `.env`, validates Compose, builds all images, starts the stack, polls the public health endpoint and opens the UI.

## Stop

Windows: `.\stop.ps1`

macOS/Linux: `./stop.sh`

## Health

- Public: `http://localhost:5173/api/v1/health`
- Backend actuator: `http://localhost:8080/actuator/health`
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

## Failure modes

- **Docker not running** — launcher exits before doing any work.
- **Port already in use** — change the matching port in `.env`.
- **Backend unhealthy** — inspect `docker compose logs backend`.
- **Database unhealthy** — inspect `docker compose logs db`.
- **Source rejected** — ensure the supplied URL is public HTTP(S) and directly reachable without redirects.
