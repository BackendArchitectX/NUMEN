ALTER TABLE collection_tasks
    ADD COLUMN idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX uk_tasks_idempotency_key
    ON collection_tasks(idempotency_key);
