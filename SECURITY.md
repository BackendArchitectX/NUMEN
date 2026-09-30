# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting for this repository when available.

Include the affected component, reproduction steps, impact, and any proposed mitigation. Do not include real credentials, personal data, or third-party secrets in reports.

## Security posture

NUMEN is designed for explicitly permitted public HTTP(S) collection. The application includes private-network/loopback blocking, redirect restrictions, request size and timeout limits, source provenance, non-root containers, loopback-only host ports, security headers, health probes, and correlation IDs.

Security controls are documented in [`docs/SECURITY.md`](docs/SECURITY.md). This project is a demonstration platform and should receive a dedicated threat model and deployment review before handling sensitive or regulated production data.
