CREATE TABLE collection_task_sources (
    task_id UUID NOT NULL,
    position INTEGER NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    CONSTRAINT pk_collection_task_sources PRIMARY KEY (task_id, position),
    CONSTRAINT fk_collection_task_sources_task
        FOREIGN KEY (task_id) REFERENCES collection_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_collection_task_sources_task
    ON collection_task_sources(task_id);
