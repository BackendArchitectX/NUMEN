# NUMEN Security Model

## Implemented controls

- Absolute HTTP(S)-only source URLs.
- DNS resolution before fetch with loopback/private/link-local/multicast rejection.
- Redirects disabled in the collection adapter.
- Response size and connection timeout limits.
- Backend runs as a non-root container user.
- PostgreSQL is not published to the host.
- CORS allowlist comes from typed runtime configuration.
- API returns DTOs rather than persistence entities.
- Nginx adds basic browser hardening headers.
- Secrets and local `.env` files are excluded from Git.

## Known boundary

DNS pre-resolution alone does not fully eliminate DNS-rebinding risk because the HTTP client performs its own resolution. A production internet-facing deployment should pin the validated IP or use an egress proxy that enforces network policy.

## Production additions

- Authentication and RBAC.
- Tenant isolation and quotas.
- Per-source allowlists and connector credentials.
- robots.txt / terms-aware source policy enforcement.
- Central secret manager.
- Audit logs and OpenTelemetry.
- Request rate limiting.
- Dependency and container vulnerability scanning.
- TLS termination and secure headers/CSP tuned for deployment.
