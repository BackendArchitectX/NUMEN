# NUMEN Service-Level Indicators

NUMEN does not publish invented availability, throughput or latency claims. Numeric service-level objectives should be set only after the target deployment has representative traffic and measured baselines.

## Signals already exposed

The application exposes the signals needed to establish production objectives:

- HTTP request count, latency and status through Spring Boot/Micrometer.
- JVM/process metrics.
- HikariCP connection-pool utilization.
- Workflow executor active-thread count.
- Workflow executor pool size.
- Workflow executor queue depth.
- Aggregate liveness/readiness.
- Application error logs with correlation IDs.

Prometheus-compatible metrics are available from the backend Actuator endpoint in the local runtime.

## Initial operational objectives

Before a production launch, establish environment-specific numeric targets for:

- availability based on successful readiness and user-facing requests;
- p95/p99 latency for the public API and workflow-management operations;
- user-visible 5xx error rate;
- workflow queue saturation and rejection rate;
- database pool saturation.

Targets must be based on load tests and observed traffic rather than portfolio/demo assumptions.

## Alerting direction

Useful alerts should correspond to user impact or an approaching capacity boundary, for example:

- readiness unavailable;
- sustained 5xx increase;
- sustained workflow queue growth;
- repeated workflow-capacity rejection;
- database pool saturation;
- sustained latency regression.

Do not alert on raw metrics simply because they exist.
