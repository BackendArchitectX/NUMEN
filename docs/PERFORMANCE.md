# NUMEN Performance and Capacity Testing

NUMEN intentionally publishes no synthetic TPS, latency, uptime or concurrent-user claims.

## What to measure

Representative performance testing should observe:

- public API request latency and error rate;
- workflow admission/rejection rate;
- workflow executor active threads and queue depth;
- PostgreSQL/Hikari pool saturation;
- source-fetch duration and transient retry frequency;
- payload size and dataset query latency;
- SSE connection count and reconnect behavior;
- CPU and memory of backend/frontend containers.

## Scenarios

Use deterministic local/demo sources for repeatable application-capacity tests and separately test explicitly permitted live sources for network behavior.

Recommended scenarios:

1. steady task-list and record-read traffic;
2. bursts of workflow creation within the bounded executor capacity;
3. workflow creation beyond capacity to verify predictable `429` behavior;
4. concurrent SSE subscribers plus polling fallback;
5. larger persisted datasets exercising search and quality filters;
6. backend restart with non-terminal workflows to verify recovery;
7. database restart/unavailability to verify readiness behavior.

## Method

Record the hardware/runtime, dataset size, concurrency, test duration, exact revision and configuration. Capture p50/p95/p99 latency, errors and saturation signals. Keep raw results outside the repository unless they are intentionally versioned benchmark artifacts.

Numeric SLOs should be chosen only after representative measurements exist.
