package ai.numen.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collection_tasks")
public class CollectionTask {
    @Id private UUID id;
    @Version private long version;
    @Column(nullable = false, columnDefinition = "text") private String prompt;
    @Column(name = "idempotency_key", length = 128, unique = true) private String idempotencyKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private TaskStatus status;
    @Column(nullable = false, length = 128) private String stage;
    @Column(nullable = false) private int progress;
    @Column(columnDefinition = "text") private String planJson;
    @Column(nullable = false) private int recordCount;
    @Column(nullable = false) private double averageQuality;
    @Column(columnDefinition = "text") private String errorMessage;
    @Column(nullable = false) private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;

    protected CollectionTask() { }

    public CollectionTask(UUID id, String prompt) {
        this(id, prompt, null);
    }

    public CollectionTask(UUID id, String prompt, String idempotencyKey) {
        this.id = id;
        this.prompt = prompt;
        this.idempotencyKey = idempotencyKey;
        this.status = TaskStatus.QUEUED;
        this.stage = "Queued";
        this.progress = 0;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public long getVersion() { return version; }
    public String getPrompt() { return prompt; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public TaskStatus getStatus() { return status; }
    public String getStage() { return stage; }
    public int getProgress() { return progress; }
    public String getPlanJson() { return planJson; }
    public int getRecordCount() { return recordCount; }
    public double getAverageQuality() { return averageQuality; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }

    public void begin() { if (startedAt == null) startedAt = Instant.now(); }

    public void update(TaskStatus status, String stage, int progress) {
        this.status = status;
        this.stage = stage;
        this.progress = Math.max(0, Math.min(100, progress));
    }

    public void setPlanJson(String planJson) { this.planJson = planJson; }

    public void complete(int recordCount, double averageQuality) {
        this.status = TaskStatus.COMPLETED;
        this.stage = "Ready";
        this.progress = 100;
        this.recordCount = recordCount;
        this.averageQuality = averageQuality;
        this.completedAt = Instant.now();
    }

    public void cancel() {
        this.status = TaskStatus.CANCELLED;
        this.stage = "Cancelled";
        this.completedAt = Instant.now();
    }

    public void fail(String error) {
        this.status = TaskStatus.FAILED;
        this.stage = "Failed";
        this.errorMessage = error;
        this.completedAt = Instant.now();
    }
}
