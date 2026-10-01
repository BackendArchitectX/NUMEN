package ai.numen.dto;

import ai.numen.entity.TaskStatus;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.entity.TaskTimelineEventType;

import java.time.Instant;
import java.util.UUID;

public record TaskTimelineEventResponse(
        UUID id,
        UUID taskId,
        TaskTimelineEventType eventType,
        TaskStatus status,
        String stage,
        int progress,
        String detail,
        Instant occurredAt
) {
    public static TaskTimelineEventResponse from(TaskTimelineEvent event) {
        return new TaskTimelineEventResponse(
                event.getId(),
                event.getTaskId(),
                event.getEventType(),
                event.getStatus(),
                event.getStage(),
                event.getProgress(),
                event.getDetail(),
                event.getOccurredAt()
        );
    }
}
