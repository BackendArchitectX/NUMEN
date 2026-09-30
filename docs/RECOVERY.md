# NUMEN Backup, Restore and Recovery

NUMEN persists workflow history and datasets in the Docker-managed PostgreSQL volume. Local/demo recovery is intentionally simple and explicit.

## What to back up

Back up PostgreSQL. Application containers are reproducible from source and should be rebuilt rather than backed up.

The local database name and user come from `.env` and default to `numen`.

## Logical backup

With NUMEN running:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > backups/numen.dump
```

Treat backup files as potentially sensitive data. `backups/` is ignored by Git and must not be committed.

## Restore into the local environment

1. Stop application traffic while preserving the database container.
2. Verify that the backup file is from the expected environment.
3. Recreate the target database.
4. Restore the dump.
5. Restart NUMEN and verify readiness plus a representative workflow.

Example for the local/demo environment:

```bash
docker compose stop frontend backend
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/numen.dump
docker compose start backend frontend
curl --fail http://localhost:5173/api/v1/health
```

Flyway remains authoritative for schema history. Do not manually edit the Flyway history table.

## Bad application release

Application rollback is source/image rollback, not database rollback:

1. stop the current application containers;
2. restore the previously known-good application revision/image;
3. keep the database if all applied migrations are backward compatible;
4. verify readiness and core workflow behavior before reopening traffic.

Forward-only migrations should therefore prefer additive/backward-compatible changes. Destructive changes require a dedicated migration and recovery plan.

## Database corruption or accidental deletion

- stop writers immediately;
- retain the damaged volume for investigation;
- restore into a clean database/volume from the most recent verified backup;
- run health and representative workflow checks;
- compare expected workflow/data counts before declaring recovery complete.

## Recovery limits

This repository does not provide automated production backup scheduling, point-in-time recovery, cross-region replication or retention enforcement. Those are deployment concerns and must be supplied by the production database platform.
