CREATE TABLE collection_tasks (
    id UUID PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    prompt TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    stage VARCHAR(128) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    plan_json TEXT,
    record_count INTEGER NOT NULL DEFAULT 0,
    average_quality DOUBLE PRECISION NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_task_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE dataset_records (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    title VARCHAR(255),
    organization VARCHAR(255),
    location VARCHAR(255),
    website VARCHAR(255),
    source_url VARCHAR(2048) NOT NULL,
    source_name VARCHAR(255),
    source_type VARCHAR(255),
    excerpt TEXT,
    quality_score DOUBLE PRECISION NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_records_task FOREIGN KEY (task_id) REFERENCES collection_tasks(id) ON DELETE CASCADE,
    CONSTRAINT uk_task_fingerprint UNIQUE (task_id, fingerprint)
);

CREATE INDEX idx_records_task ON dataset_records(task_id);
CREATE INDEX idx_tasks_created_at ON collection_tasks(created_at);
