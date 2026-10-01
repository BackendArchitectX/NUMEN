package ai.numen.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_timeline_events")
public class TaskTimelineEvent {
    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private TaskTimelineEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TaskStatus status;

    @Column(nullable = false, length = 128)
    private String stage;

    @Column(nullable = false)
    private int progress;

    @Column(columnDefinition = "text")
    private String detail;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected TaskTimelineEvent() { }

    public TaskTimelineEvent(UUID id,
                             UUID taskId,
                             TaskTimelineEventType eventType,
                             TaskStatus status,
                             String stage,
                             int progress,
                             String detail,
                             Instant occurredAt) {
        this.id = id;
        this.taskId = taskId;
        this.eventType = eventType;
        this.status = status;
        this.stage = stage;
        this.progress = progress;
        this.detail = detail;
        this.occurredAt = occurredAt;
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public TaskTimelineEventType getEventType() { return eventType; }
    public TaskStatus getStatus() { return status; }
    public String getStage() { return stage; }
    public int getProgress() { return progress; }
    public String getDetail() { return detail; }
    public Instant getOccurredAt() { return occurredAt; }
}
