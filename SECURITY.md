# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting for this repository when available.

Include the affected component, reproduction steps, impact, and any proposed mitigation. Do not include real credentials, personal data, or third-party secrets in reports.

## Security posture

NUMEN is designed for explicitly permitted public HTTP(S) collection. The application includes private/reserved-network blocking, credential and non-standard-port rejection, redirect restrictions, request size and timeout limits, source provenance, bounded execution, transactional result publication, spreadsheet-safe export, non-root containers, loopback-only host ports, security headers, aggregate health/readiness probes and correlation IDs.

Repository controls are documented in [`docs/SECURITY.md`](docs/SECURITY.md) and the explicit trust-boundary analysis is in [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

This remains a demonstration platform. Handling sensitive, regulated or multi-tenant production data requires a deployment-specific security review and the production gates listed in the threat model.
