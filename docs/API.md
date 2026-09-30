# NUMEN API

NUMEN exposes a versioned HTTP API under `/api/v1`. The browser normally reaches it through the Nginx gateway on port `5173`; the Spring Boot service is also bound to loopback on port `8080` for local diagnostics and development.

Machine-readable OpenAPI:

```text
http://localhost:5173/api/v1/openapi
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Aggregate application health |
| `POST` | `/api/v1/tasks` | Create or replay an idempotent workflow |
| `GET` | `/api/v1/tasks?limit=50` | List recent workflows, newest first |
| `GET` | `/api/v1/tasks/{id}` | Read one workflow |
| `POST` | `/api/v1/tasks/{id}/cancel` | Cancel a non-terminal workflow |
| `GET` | `/api/v1/tasks/{id}/events` | Subscribe to workflow progress with SSE |
| `GET` | `/api/v1/tasks/{id}/records` | Read/search/filter dataset records |
| `GET` | `/api/v1/tasks/{id}/export.csv` | Export the complete workflow dataset as CSV |
| `GET` | `/api/v1/openapi` | OpenAPI JSON |

## Workflow creation

`POST /api/v1/tasks`

Request:

```json
{
  "prompt": "Collect data from https://example.com and preserve source provenance"
}
```

The prompt is required and is bounded by backend validation.

Clients that may retry should send:

```http
Idempotency-Key: <8-128 safe characters>
```

The first successful submission returns `202 Accepted`, a `Location` header and:

```http
Idempotency-Replayed: false
```

Repeating the same key with the same normalized prompt returns the original workflow and `Idempotency-Replayed: true`. Reusing the key with a different prompt returns `409 IDEMPOTENCY_CONFLICT`.

## Dataset query

`GET /api/v1/tasks/{id}/records` supports:

| Parameter | Default | Bounds | Meaning |
| --- | ---: | ---: | --- |
| `q` | empty | max 128 chars | Case-insensitive search across title, organization, location, excerpt and source |
| `minQuality` | `0` | 0-100 | Minimum quality score |
| `limit` | `250` | 1-500 | Maximum rows returned |

Task listing supports `limit` from 1 to 100 and defaults to 50.

## Error contract

API failures use one consistent JSON shape containing:

- UTC timestamp;
- HTTP status;
- HTTP error text;
- stable application `code`;
- human-readable `message`;
- request `path`;
- `correlationId`.

Examples of stable codes currently include:

- `VALIDATION_ERROR`
- `MALFORMED_REQUEST`
- `RESOURCE_NOT_FOUND`
- `IDEMPOTENCY_CONFLICT`
- `WORKFLOW_CAPACITY_EXHAUSTED`
- `BAD_REQUEST`
- `INTERNAL_ERROR`

Unexpected internal failures are logged server-side while the response remains sanitized.

The Nginx gateway may also return `429 GATEWAY_RATE_LIMIT` with `Retry-After: 1` when a client exceeds the local mutation burst or concurrent SSE connection limit. This response is generated before the request reaches Spring Boot.

## Correlation IDs

Clients may provide `X-Correlation-ID` using the documented safe format. Invalid or missing values are replaced with a server-generated UUID. The effective ID is returned on the response and included in API error bodies and logs.

## CORS

The backend's documented local origins may call the direct API. Allowed request headers are explicit and include `Content-Type`, `X-Correlation-ID` and `Idempotency-Key`. The browser may read `X-Correlation-ID` and `Idempotency-Replayed` from responses.

The normal Docker runtime uses the same-origin Nginx gateway, so browser requests do not require CORS in that path.

## Gateway abuse controls

The local gateway limits POST request bursts per client and caps concurrent SSE streams per client process. These controls are intentionally small, deterministic safeguards for the shipped local runtime rather than a claim of distributed tenant-level rate limiting. The direct loopback backend port is for diagnostics/development and does not provide the gateway's per-client limits.

## Realtime contract

SSE is server-to-client only. A subscriber receives the current workflow state immediately, then progress events as backend state changes. The server advertises reconnect timing, bounds stream lifetime and cleans up subscriptions on disconnect, timeout and shutdown. The frontend also polls at low frequency to converge after missed events or temporary network interruption.

## Authentication

The local/demo runtime does not implement authentication or multi-tenant authorization. It binds host ports to loopback and is not presented as an internet-facing production deployment. Production deployment gates are documented in `DEPLOYMENT.md`.
