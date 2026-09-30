# Dependency Policy

NUMEN uses an exact-main-only origin-branch policy, so repository-local dependency bots that create branches are intentionally disabled.

Frontend direct dependencies and build-tool dependencies are pinned to exact versions in `frontend/package.json`, and `package-lock.json` is the reproducible installation source used by CI and container builds. Floating `latest` and wildcard direct dependency versions are rejected by the repository quality check.

Backend versions are managed explicitly through Maven and the Spring Boot parent. Major framework/runtime upgrades are treated as architecture changes rather than automatic version bumps.

Dependencies are updated manually on `main` after reviewing release notes and compatibility, then validated by the complete CI pipeline. Pull requests also run GitHub dependency review and fail when a newly introduced dependency has high-severity known risk. At minimum, dependency maintenance checks Java/Spring Boot compatibility, Node/Vite/TypeScript compatibility, container base-image changes, database migration compatibility, security advisories, API breaking changes, and the one-step full-stack smoke test.

The single-origin-branch policy is enforced by `.github/workflows/branch-policy.yml`; dependency maintenance must not reintroduce bot-generated origin branches.

Third-party GitHub Actions are pinned to reviewed commit SHAs with human-readable version comments. Updating an action means reviewing the release/tag, resolving its immutable commit SHA, changing the pin and rerunning the complete CI pipeline.


Container base-image tags are intentionally explicit about major/runtime families while allowing patch-level security refreshes within those families. A production release process may additionally pin image digests after vulnerability review when exact byte-for-byte base-image reproducibility is required.
