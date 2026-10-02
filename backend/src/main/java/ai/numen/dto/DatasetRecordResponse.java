package ai.numen.dto;

import ai.numen.entity.DatasetRecord;

import java.time.Instant;
import java.util.UUID;

public record DatasetRecordResponse(UUID id, UUID taskId, String title, String organization, String location,
                                    String website, String sourceUrl, String sourceName, String sourceType,
                                    String excerpt, double qualityScore, String fingerprint, String evidenceHash,
                                    String evidenceHashAlgorithm, Instant collectedAt) {
    public static DatasetRecordResponse from(DatasetRecord record) {
        return new DatasetRecordResponse(record.getId(), record.getTaskId(), record.getTitle(), record.getOrganization(),
                record.getLocation(), record.getWebsite(), record.getSourceUrl(), record.getSourceName(),
                record.getSourceType(), record.getExcerpt(), record.getQualityScore(), record.getFingerprint(),
                record.getEvidenceHash(), record.getEvidenceHashAlgorithm(), record.getCollectedAt());
    }
}
