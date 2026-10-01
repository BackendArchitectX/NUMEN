package ai.numen.dto;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;

import java.time.Instant;
import java.util.UUID;

public record TaskResponse(UUID id, String prompt, boolean demoMode, TaskStatus status, String stage, int progress,
                           String planJson, int recordCount, double averageQuality, String errorMessage,
                           Instant createdAt, Instant startedAt, Instant completedAt) {
    public static TaskResponse from(CollectionTask task) {
        return new TaskResponse(task.getId(), task.getPrompt(), task.isDemoMode(), task.getStatus(), task.getStage(), task.getProgress(),
                task.getPlanJson(), task.getRecordCount(), task.getAverageQuality(), task.getErrorMessage(),
                task.getCreatedAt(), task.getStartedAt(), task.getCompletedAt());
    }
}
