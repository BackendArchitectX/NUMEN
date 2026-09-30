# NUMEN Security Model

## Implemented controls

- Absolute HTTP(S)-only source URLs.
- DNS resolution before fetch with loopback/private/link-local/multicast, CGNAT, documentation, benchmarking and IPv6 unique-local rejection.
- Embedded URL credentials and non-standard HTTP(S) ports are rejected; redirects are disabled in the collection adapter.
- Response size and connection timeout limits.
- Backend runs as a non-root container user.
- PostgreSQL is not published to the host.
- CORS allowlist comes from typed validated runtime configuration and allowed request headers are explicit rather than wildcarded.
- API returns DTOs rather than persistence entities.
- Nginx adds CSP, framing, referrer, permissions and cross-origin opener hardening headers.
- CSV export neutralizes spreadsheet-formula prefixes and emits UTF-8 safely.
- Secrets, local `.env` files and backup dumps are excluded from Git.
- Pull requests run dependency review and reject newly introduced high-severity dependency findings.

See [`THREAT_MODEL.md`](THREAT_MODEL.md) for the repository-level threat analysis, trust boundaries and residual risks.

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
