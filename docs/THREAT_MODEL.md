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

### Malicious, deceptive or oversized source content

Risk: hostile pages could attempt resource exhaustion, inject active content, or return an HTTP-success login wall / CAPTCHA / access interstitial that could be mistaken for usable evidence.

Controls: bounded response size, bounded timeout, redirects disabled, HTML parsed server-side with Jsoup, obvious password/CAPTCHA/access-interstitial responses rejected as source limitations, unsupported media types rejected by the public-page connector, bidi control characters removed from captured plain text, and only normalized text/metadata returned to the React application. Source HTML is not executed or rendered as raw HTML.

Residual risk: access-barrier detection is intentionally conservative and cannot prove that every HTTP 200 document contains useful research evidence. It is a guard against obvious false-success cases, not a factual-verification system.

### Spreadsheet formula injection

Risk: exported cells beginning with formula characters can execute when opened in spreadsheet software.

Controls: CSV export quotes fields and neutralizes spreadsheet-formula prefixes before emission.

### Cross-site scripting, deceptive links and browser abuse

Risk: collected text may contain markup, script payloads, bidirectional-control characters, misleading source labels or unsafe URL schemes.

Controls: React text rendering escapes values by default, no raw HTML rendering path is used, CSP blocks arbitrary script/object/frame sources, framing is denied, and the UI has no runtime third-party font/CDN dependency. External source actions are emitted only for parsed public HTTP(S) destinations, embedded credentials/non-standard ports/obviously local targets are rejected in browser UX, actual destination hostnames are displayed with bidi isolation, and backend URL policy remains authoritative.

Frontend URL validation is UX hardening, not SSRF protection. The backend still performs DNS/network-boundary checks before collection.

### Request flooding and worker exhaustion

Risk: excessive workflow creation can exhaust threads or memory.

Controls: Nginx applies per-client process-local POST burst limiting and concurrent SSE connection caps, requests are body-size bounded at the gateway, the backend uses a bounded executor pool and queue with explicit HTTP 429 admission rejection, and task/result reads plus prompt/source counts are bounded.

Residual risk: gateway limits are process-local and the diagnostic backend port is loopback-accessible. There is no distributed limiter, tenant quota or production edge enforcement in the demo deployment.

### Concurrent cancellation and result publication

Risk: a cancellation racing with result publication could leave a completed task with partial or stale data.

Controls: optimistic locking on workflow state and transactional result replacement/completion. A conflicting cancellation causes the publication transaction to roll back rather than leaving a partially published dataset.

### Data poisoning and provenance loss

Risk: collected public information may be inaccurate or adversarial.

Controls: every record retains source identity, source type, collection time, excerpt, quality score and fingerprint. Demo records are explicitly labelled `DEMO` and use `urn:numen:demo:...` provenance rather than masquerading as live data.

Residual risk: provenance does not establish truth. Production use needs source allowlists, confidence policies and domain-specific validation.

### Secret leakage

Risk: generated local credentials, credential-bearing URLs or environment files could be exposed through repository history, logs or user-visible errors.

Controls: `.env` is ignored, repository quality checks reject tracked local environment files, launchers generate/repair placeholder credentials, Unix launchers restrict local `.env` permissions where supported, source URLs with embedded credentials are rejected, and URL-safety errors do not echo the raw rejected URL.

### Repository and branch drift

Risk: stale feature/bot branches can diverge from the audited application state.

Controls: `main` is the only persistent origin branch and the branch-policy workflow reconciles accidental non-`main` branches.

## Explicit non-goals of the current demo

The repository does not claim production-grade authentication, RBAC, tenant isolation, distributed rate limiting, source credential management, legal/robots-policy enforcement, centralized secrets, immutable audit storage, network egress enforcement, production TLS termination or regulated-data controls.

These are deployment gates, not hidden assumptions.

## Aurora X¹² source and federation boundary

The shipped repository does not currently trust or authenticate external partner organizations. Live collection is limited to explicit public HTTP(S) sources and therefore has no transitive federation trust.

The connector capability contract is a safety boundary: a connector must explicitly declare the behavior required for a request before CollectionEngine can select it. Capability metadata is descriptive and must not be treated as evidence quality or factual trust.

Source-side access denial, rate limiting, policy rejection and unavailability are persisted as distinct outcomes. None of these states may be used as evidence that matching information does not exist.

If NUMEN later adds partner federation, distributed query, source-local computation, clean-room analysis, sovereign deployment or offline mutation replay, the threat model must be extended before release to cover delegated authorization, cross-organization identity namespaces, non-transitive trust, data egress, query injection/complexity, source-local policy, cache isolation and revocation.
