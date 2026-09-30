package ai.numen.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dataset_records",
        indexes = @Index(name = "idx_records_task", columnList = "task_id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_task_fingerprint", columnNames = {"task_id", "fingerprint"}))
public class DatasetRecord {
    @Id private UUID id;
    @Column(name = "task_id", nullable = false) private UUID taskId;
    private String title;
    private String organization;
    private String location;
    private String website;
    @Column(nullable = false, length = 2048) private String sourceUrl;
    private String sourceName;
    private String sourceType;
    @Column(columnDefinition = "text") private String excerpt;
    @Column(nullable = false) private double qualityScore;
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(nullable = false) private Instant collectedAt;

    protected DatasetRecord() { }

    public DatasetRecord(UUID taskId, String title, String organization, String location, String website,
                         String sourceUrl, String sourceName, String sourceType, String excerpt,
                         double qualityScore, String fingerprint) {
        this.id = UUID.randomUUID();
        this.taskId = taskId;
        this.title = title;
        this.organization = organization;
        this.location = location;
        this.website = website;
        this.sourceUrl = sourceUrl;
        this.sourceName = sourceName;
        this.sourceType = sourceType;
        this.excerpt = excerpt;
        this.qualityScore = qualityScore;
        this.fingerprint = fingerprint;
        this.collectedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public String getTitle() { return title; }
    public String getOrganization() { return organization; }
    public String getLocation() { return location; }
    public String getWebsite() { return website; }
    public String getSourceUrl() { return sourceUrl; }
    public String getSourceName() { return sourceName; }
    public String getSourceType() { return sourceType; }
    public String getExcerpt() { return excerpt; }
    public double getQualityScore() { return qualityScore; }
    public String getFingerprint() { return fingerprint; }
    public Instant getCollectedAt() { return collectedAt; }
}
