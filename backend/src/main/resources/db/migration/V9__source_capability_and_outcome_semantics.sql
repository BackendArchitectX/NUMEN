ALTER TABLE source_collection_attempts
    ADD COLUMN connector_id VARCHAR(64);

ALTER TABLE source_collection_attempts
    ADD COLUMN capabilities VARCHAR(512);

ALTER TABLE source_collection_attempts
    DROP CONSTRAINT chk_source_collection_attempt_status;

ALTER TABLE source_collection_attempts
    ADD CONSTRAINT chk_source_collection_attempt_status
        CHECK (status IN ('SUCCEEDED', 'UNAVAILABLE', 'UNAUTHORIZED', 'REJECTED', 'RATE_LIMITED', 'FAILED'));
