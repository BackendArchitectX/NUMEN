# ADR 0002: Keep a single persistent origin branch

- Status: Accepted
- Date: 2026-09-30

## Context

The repository is intended to remain visually clean and attribute project work to the primary repository owner. Automated dependency tools and local feature workflows can create many persistent origin branches that add noise without improving this project's delivery model.

## Decision

`main` is the only persistent branch in the origin repository. External contributions use fork branches. Dependency updates are applied manually to `main` after review and CI validation. Dependabot configuration is intentionally absent because its update workflow creates origin branches.

## Consequences

The repository stays simple and the public branch list remains minimal. Maintainers must review dependency updates deliberately rather than relying on automated update pull requests. CI becomes especially important because changes converge directly on `main`.
