# Contributing to NUMEN

NUMEN keeps **exactly one persistent branch in the origin repository: `main`**. Do not create feature, release, dependency-bot, or maintenance branches in the origin repository. The branch-policy workflow automatically removes accidental non-`main` origin branches when they are created, after pushes to `main`, and during scheduled reconciliation.

For external contributions, fork the repository, create a short-lived branch in the fork, open a pull request against `main`, and delete the fork branch after the change is complete. Repository maintainers may also commit reviewed changes directly to `main` when appropriate.

Before submitting a change, run:

```bash
bash scripts/quality/check-structure.sh
bash scripts/quality/check-runtime.sh
cd backend && mvn -B --no-transfer-progress verify
cd ../frontend && npm ci --ignore-scripts && npm run check
cd .. && ./start.sh --no-browser
```

Changes should preserve the one-command startup contract, DTO/entity separation, versioned APIs, Flyway-managed schema, bounded resource usage, provenance, SSRF controls, non-root containers, exact dependency manifests with lockfiles, and CI smoke coverage.

Never commit `.env`, credentials, generated build outputs, IDE metadata, database volumes, or copied production data.
