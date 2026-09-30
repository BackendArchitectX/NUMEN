# Dependency Policy

NUMEN uses a main-only origin-branch policy, so repository-local dependency bots that create branches are intentionally disabled.

Dependencies are updated manually on `main` after reviewing release notes and compatibility, then validated by the complete CI pipeline. Major framework/runtime upgrades are treated as architecture changes rather than automatic version bumps.

At minimum, dependency maintenance should check Java/Spring Boot compatibility, Node/Vite/TypeScript compatibility, container base-image changes, database migration compatibility, security advisories, API breaking changes, and the one-step full-stack smoke test.
