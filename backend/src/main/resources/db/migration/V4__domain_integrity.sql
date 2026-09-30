ALTER TABLE collection_tasks
    ADD CONSTRAINT chk_task_record_count CHECK (record_count >= 0);

ALTER TABLE collection_tasks
    ADD CONSTRAINT chk_task_average_quality CHECK (average_quality >= 0 AND average_quality <= 100);

ALTER TABLE collection_tasks
    ADD CONSTRAINT chk_task_terminal_completed_at CHECK (
        (status IN ('COMPLETED', 'CANCELLED', 'FAILED') AND completed_at IS NOT NULL)
        OR status NOT IN ('COMPLETED', 'CANCELLED', 'FAILED')
    );

ALTER TABLE collection_tasks
    ADD CONSTRAINT chk_task_completed_progress CHECK (status <> 'COMPLETED' OR progress = 100);

ALTER TABLE dataset_records
    ADD CONSTRAINT chk_record_fingerprint_length CHECK (CHAR_LENGTH(fingerprint) = 64);
