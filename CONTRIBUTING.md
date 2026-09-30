# Contributing to NUMEN

NUMEN keeps **exactly one persistent branch in the origin repository: `main`**. Do not create feature, release, dependency-bot, maintenance, test or backup branches in the origin repository. The branch-policy workflow automatically removes accidental non-`main` origin branches when they are created, after pushes to `main`, and during scheduled reconciliation.

## Canonical contribution identity

New canonical project work on `main` is intentionally contributed through the GitHub account **BackendArchitectX**. The branch-policy workflow audits the current `main` head to ensure it resolves to that GitHub account and contains no unintended `Co-authored-by` trailer.

Historical legitimate attribution must remain truthful. Do not rewrite third-party authorship, fabricate commits or copy someone else's patch under BackendArchitectX merely to make contributor statistics look cleaner.

Because this repository intentionally keeps BackendArchitectX as the only intended human contributor for new canonical work, external engineers should normally contribute through issues, review feedback or clearly attributed suggestions. A patch that requires retaining another author's commit attribution must not be silently re-authored to satisfy this repository policy.

Repository maintainers may commit reviewed changes directly to `main`; temporary implementation branches in the origin are not part of the supported workflow.

## Verification

Before a canonical change is considered complete, run:

```bash
bash scripts/quality/check-structure.sh
bash scripts/quality/check-runtime.sh
bash scripts/quality/check-source-policy.sh
cd backend && mvn -B --no-transfer-progress verify
cd ../frontend && npm ci --ignore-scripts && npm run check
cd .. && ./start.sh --no-browser
```

Changes must preserve the one-command startup contract, DTO/entity separation, versioned APIs, Flyway-managed schema, bounded resource usage, provenance, SSRF controls, gateway abuse controls, non-root containers, exact dependency manifests with lockfiles, pinned workflow actions and CI smoke coverage.

Never commit `.env`, credentials, generated build outputs, IDE metadata, database volumes, backup dumps or copied production data.
