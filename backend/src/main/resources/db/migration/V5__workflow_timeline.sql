CREATE TABLE task_timeline_events (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    stage VARCHAR(128) NOT NULL,
    progress INTEGER NOT NULL,
    detail TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_timeline_task FOREIGN KEY (task_id) REFERENCES collection_tasks(id) ON DELETE CASCADE,
    CONSTRAINT chk_timeline_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_timeline_task_occurred
    ON task_timeline_events(task_id, occurred_at, id);
