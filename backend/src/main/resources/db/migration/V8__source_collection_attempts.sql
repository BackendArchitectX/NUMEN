CREATE TABLE source_collection_attempts (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    source_key VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    error_code VARCHAR(64),
    error_message VARCHAR(512),
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_source_collection_attempt_task
        FOREIGN KEY (task_id) REFERENCES collection_tasks(id) ON DELETE CASCADE,
    CONSTRAINT uk_source_collection_attempt_task_key UNIQUE (task_id, source_key),
    CONSTRAINT chk_source_collection_attempt_status
        CHECK (status IN ('SUCCEEDED', 'FAILED'))
);

CREATE INDEX idx_source_collection_attempt_task
    ON source_collection_attempts(task_id);
