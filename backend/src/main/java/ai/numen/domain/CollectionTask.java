package ai.numen.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collection_tasks")
public class CollectionTask {
    @Id
    private UUID id;
    @Column(nullable = false, columnDefinition = "text")
    private String prompt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;
    private String stage;
    private int progress;
    @Column(columnDefinition = "text")
    private String planJson;
    private int recordCount;
    private double averageQuality;
    private String errorMessage;
    private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;

    protected CollectionTask() {}

    public CollectionTask(UUID id, String prompt) {
        this.id = id;
        this.prompt = prompt;
        this.status = TaskStatus.QUEUED;
        this.stage = "Queued";
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getPrompt() { return prompt; }
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

    public void begin() { this.startedAt = Instant.now(); }
    public void update(TaskStatus status, String stage, int progress) { this.status = status; this.stage = stage; this.progress = progress; }
    public void setPlanJson(String planJson) { this.planJson = planJson; }
    public void complete(int recordCount, double averageQuality) { this.status = TaskStatus.COMPLETED; this.stage = "Ready"; this.progress = 100; this.recordCount = recordCount; this.averageQuality = averageQuality; this.completedAt = Instant.now(); }
    public void cancel() { this.status = TaskStatus.CANCELLED; this.stage = "Cancelled"; this.completedAt = Instant.now(); }
    public void fail(String error) { this.status = TaskStatus.FAILED; this.stage = "Failed"; this.errorMessage = error; this.completedAt = Instant.now(); }
}
