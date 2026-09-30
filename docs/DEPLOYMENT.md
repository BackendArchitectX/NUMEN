# NUMEN Deployment Safety

The Docker Compose setup in this repository is the canonical local/fresh-clone runtime. It is not presented as a production orchestration platform.

## Production gates

Before deploying NUMEN to an internet-facing or multi-user environment, provide:

- TLS termination and trusted proxy configuration.
- Authentication, authorization and object-level access control.
- A production secret store instead of local `.env` files.
- Network egress controls that enforce the outbound source policy and mitigate DNS rebinding.
- Managed PostgreSQL backup/PITR and tested restore procedures.
- Central log/metric collection and alerting.
- Environment-specific CORS configuration.
- Request/tenant quotas or distributed rate limiting.
- Source-specific legal, robots and credential policy.
- An environment-specific threat model and data-retention policy.

## Deployment sequence

1. Build immutable application images from a reviewed `main` revision.
2. Run repository, backend, frontend and integration quality gates.
3. Back up or verify recoverability of persistent data.
4. Apply forward-only Flyway migrations before or with application rollout.
5. Start the backend and wait for readiness before routing traffic.
6. Start/roll the frontend gateway.
7. Verify the public health endpoint and representative read/write workflow.
8. Monitor errors, latency, workflow queue depth and database saturation.

## Migration discipline

Prefer additive and backward-compatible migrations. Destructive schema changes require an explicit data migration and recovery plan. Never edit the Flyway schema history table manually.

## Rollback

Application rollback means restoring the previous known-good image/revision while keeping the database only when migrations remain backward compatible. If a migration is not backward compatible, restoration must follow the tested database recovery plan rather than improvising reverse SQL.

## Configuration

Production configuration must be injected by the deployment environment. Debug mode, development credentials, permissive CORS, hot reload and test-only endpoints must not be enabled accidentally.
