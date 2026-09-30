package ai.numen.dto;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;

import java.util.UUID;

public record TaskEventResponse(UUID id, TaskStatus status, String stage, int progress) {
    public static TaskEventResponse from(CollectionTask task) {
        return new TaskEventResponse(task.getId(), task.getStatus(), task.getStage(), task.getProgress());
    }
}
