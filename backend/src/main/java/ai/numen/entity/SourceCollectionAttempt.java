package ai.numen.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "source_collection_attempts")
public class SourceCollectionAttempt {
    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "source_url", nullable = false, length = 2048)
    private String sourceUrl;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_message", length = 512)
    private String errorMessage;

    @Column(name = "attempted_at", nullable = false)
    private Instant attemptedAt;

    protected SourceCollectionAttempt() { }

    public SourceCollectionAttempt(UUID id, UUID taskId, String sourceUrl) {
        this.id = id;
        this.taskId = taskId;
        this.sourceUrl = sourceUrl;
        this.status = "FAILED";
        this.attemptedAt = Instant.now();
    }

    public void succeeded() {
        this.status = "SUCCEEDED";
        this.errorCode = null;
        this.errorMessage = null;
        this.attemptedAt = Instant.now();
    }

    public void failed(String errorCode, String errorMessage) {
        this.status = "FAILED";
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.attemptedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public String getSourceUrl() { return sourceUrl; }
    public String getStatus() { return status; }
    public String getErrorCode() { return errorCode; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getAttemptedAt() { return attemptedAt; }
}
