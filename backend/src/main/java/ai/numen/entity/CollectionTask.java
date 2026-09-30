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

    public void begin() {
        requireNonTerminal("begin");
        if (startedAt == null) startedAt = Instant.now();
    }

    public void update(TaskStatus nextStatus, String nextStage, int nextProgress) {
        requireNonTerminal("update");
        if (!isAllowedTransition(status, nextStatus)) {
            throw new IllegalStateException("Invalid workflow transition: " + status + " -> " + nextStatus);
        }
        if (nextProgress < progress || nextProgress < 0 || nextProgress >= 100) {
            throw new IllegalArgumentException("Non-terminal workflow progress must be monotonic and between 0 and 99");
        }

        this.status = nextStatus;
        this.stage = requireStage(nextStage);
        this.progress = nextProgress;
    }

    public void recoverForRestart() {
        requireNonTerminal("recover");
        this.status = TaskStatus.PLANNING;
        this.stage = "Recovering after restart";
        this.progress = 5;
        this.errorMessage = null;
        this.completedAt = null;
    }

    public void setPlanJson(String planJson) {
        if (status != TaskStatus.PLANNING) {
            throw new IllegalStateException("Workflow plan can only be changed while planning");
        }
        this.planJson = planJson;
    }

    public void complete(int recordCount, double averageQuality) {
        if (status != TaskStatus.PROCESSING) {
            throw new IllegalStateException("Only a processing workflow can complete");
        }
        if (recordCount < 0) {
            throw new IllegalArgumentException("Record count cannot be negative");
        }
        if (averageQuality < 0 || averageQuality > 100) {
            throw new IllegalArgumentException("Average quality must be between 0 and 100");
        }

        this.status = TaskStatus.COMPLETED;
        this.stage = "Ready";
        this.progress = 100;
        this.recordCount = recordCount;
        this.averageQuality = averageQuality;
        this.errorMessage = null;
        this.completedAt = Instant.now();
    }

    public void cancel() {
        if (status == TaskStatus.CANCELLED) return;
        requireNonTerminal("cancel");
        this.status = TaskStatus.CANCELLED;
        this.stage = "Cancelled";
        this.completedAt = Instant.now();
    }

    public void fail(String error) {
        if (status == TaskStatus.FAILED) return;
        requireNonTerminal("fail");
        this.status = TaskStatus.FAILED;
        this.stage = "Failed";
        this.errorMessage = error == null || error.isBlank() ? "Workflow failed" : error;
        this.completedAt = Instant.now();
    }

    private void requireNonTerminal(String operation) {
        if (status == TaskStatus.COMPLETED || status == TaskStatus.CANCELLED || status == TaskStatus.FAILED) {
            throw new IllegalStateException("Cannot " + operation + " terminal workflow " + status);
        }
    }

    private static boolean isAllowedTransition(TaskStatus current, TaskStatus next) {
        return switch (current) {
            case QUEUED -> next == TaskStatus.PLANNING;
            case PLANNING -> next == TaskStatus.PLANNING || next == TaskStatus.COLLECTING;
            case COLLECTING -> next == TaskStatus.PROCESSING;
            case PROCESSING -> next == TaskStatus.PROCESSING;
            case COMPLETED, CANCELLED, FAILED -> false;
        };
    }

    private static String requireStage(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Workflow stage cannot be blank");
        }
        return value;
    }
}
