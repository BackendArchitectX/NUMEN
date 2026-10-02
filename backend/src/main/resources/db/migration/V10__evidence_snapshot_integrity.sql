ALTER TABLE dataset_records
    ADD COLUMN evidence_hash VARCHAR(64);

ALTER TABLE dataset_records
    ADD COLUMN evidence_hash_algorithm VARCHAR(64);
