# ADR 0002: Keep exactly one persistent origin branch

- Status: Accepted
- Date: 2026-09-30

## Context

The repository is intended to remain visually clean, keep project history attributable to the primary repository owner, and avoid stale or automation-created origin branches. The project still needs reviewable feature history without sacrificing the single-branch public repository shape.

## Decision

`main` is the only persistent branch in the origin repository.

- External contributions use short-lived branches in forks and open pull requests against `main`.
- Maintainer work may be reviewed and integrated directly into `main`.
- When historical feature work already exists on an origin branch, its reviewed commits are merged into `main` before the branch is removed.
- `.github/workflows/branch-policy.yml` runs on branch creation, after pushes to `main`, on manual dispatch, and on a scheduled reconciliation pass; it deletes any remaining non-`main` origin refs.
- Dependabot configuration is intentionally absent because its default update model creates origin branches.
- Dependency versions are reviewed and updated deliberately on `main`.

## Consequences

The public origin branch list converges automatically to exactly one branch while merged commit ancestry can still preserve reviewed feature history. Any accidental origin feature branch is ephemeral by design, so ongoing branch-based work must happen in a fork. The workflow requires narrowly scoped `contents: write` permission solely to delete non-`main` refs; normal CI remains read-only.
