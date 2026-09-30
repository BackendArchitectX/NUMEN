ALTER TABLE dataset_records
    ADD CONSTRAINT chk_record_quality CHECK (quality_score >= 0 AND quality_score <= 100);

ALTER TABLE collection_tasks
    ADD CONSTRAINT chk_task_status CHECK (status IN ('QUEUED', 'PLANNING', 'COLLECTING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'));

CREATE INDEX idx_records_task_quality ON dataset_records(task_id, quality_score);
CREATE INDEX idx_tasks_status_created_at ON collection_tasks(status, created_at);
