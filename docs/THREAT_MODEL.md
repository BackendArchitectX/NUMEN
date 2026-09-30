# NUMEN Threat Model

## Scope

This threat model covers the local/demo architecture shipped in this repository: browser, unprivileged Nginx, Spring Boot API, PostgreSQL, the outbound public-HTTP(S) collection boundary, CSV export, local Docker Compose runtime, and repository automation.

It is intentionally deployment-agnostic. A production deployment still requires an environment-specific review covering identity, tenancy, network policy, secrets, TLS, compliance, data retention and incident response.

## Assets

- Workflow prompts and execution history.
- Collected records, provenance and source URLs.
- Local PostgreSQL state.
- Generated local database credentials.
- Repository source, CI workflows and release history.
- Availability of the workflow executor and API.

## Trust boundaries

1. Browser → Nginx gateway.
2. Nginx gateway → Spring Boot API.
3. Spring Boot API → PostgreSQL.
4. Spring Boot API → external public HTTP(S) sources.
5. Developer workstation / GitHub Actions → Docker runtime.
6. Repository contributors → protected project history on `main`.

## Primary threats and current controls

### SSRF and internal-network access

Risk: a supplied source URL could target loopback, private infrastructure, metadata endpoints or reserved networks.

Controls: absolute HTTP(S)-only URLs, credential rejection, standard ports only, DNS pre-resolution, private/local/link-local/multicast/CGNAT/documentation/benchmarking/IPv6-ULA rejection, redirects disabled, body-size limit and connection timeout.

Residual risk: DNS rebinding remains possible because the HTTP client performs a later resolution. Internet-facing deployments should enforce egress through a policy-aware proxy or connect to the validated address while preserving safe host/TLS semantics.

### Malicious or oversized source content

Risk: hostile pages could attempt resource exhaustion or inject active content.

Controls: bounded response size, bounded timeout, redirects disabled, HTML parsed server-side with Jsoup, and only normalized text/metadata is returned to the React application. Source HTML is not executed or rendered as raw HTML.

### Spreadsheet formula injection

Risk: exported cells beginning with formula characters can execute when opened in spreadsheet software.

Controls: CSV export quotes fields and neutralizes spreadsheet-formula prefixes before emission.

### Cross-site scripting and browser abuse

Risk: collected text may contain markup or script payloads.

Controls: React text rendering escapes values by default, no raw HTML rendering path is used, CSP blocks arbitrary script/object/frame sources, framing is denied, and the UI has no runtime third-party font/CDN dependency.

### Request flooding and worker exhaustion

Risk: excessive workflow creation can exhaust threads or memory.

Controls: bounded executor pool, bounded queue, explicit rejection with HTTP 429 and `Retry-After`, bounded task/result reads, prompt-size validation and source-count limits.

Residual risk: there is no distributed rate limiter or tenant quota in the demo deployment.

### Concurrent cancellation and result publication

Risk: a cancellation racing with result publication could leave a completed task with partial or stale data.

Controls: optimistic locking on workflow state and transactional result replacement/completion. A conflicting cancellation causes the publication transaction to roll back rather than leaving a partially published dataset.

### Data poisoning and provenance loss

Risk: collected public information may be inaccurate or adversarial.

Controls: every record retains source identity, source type, collection time, excerpt, quality score and fingerprint. Demo records are explicitly labelled `DEMO` and use `urn:numen:demo:...` provenance rather than masquerading as live data.

Residual risk: provenance does not establish truth. Production use needs source allowlists, confidence policies and domain-specific validation.

### Secret leakage

Risk: generated local credentials or environment files could be committed.

Controls: `.env` is ignored, repository quality checks reject tracked local environment files, launchers generate/repair placeholder credentials, and Unix launchers restrict local `.env` permissions where supported.

### Repository and branch drift

Risk: stale feature/bot branches can diverge from the audited application state.

Controls: `main` is the only persistent origin branch and the branch-policy workflow reconciles accidental non-`main` branches.

## Explicit non-goals of the current demo

The repository does not claim production-grade authentication, RBAC, tenant isolation, distributed rate limiting, source credential management, legal/robots-policy enforcement, centralized secrets, immutable audit storage, network egress enforcement, production TLS termination or regulated-data controls.

These are deployment gates, not hidden assumptions.
