package ai.numen.dto;

import ai.numen.service.TaskService;

import java.time.Instant;
import java.util.List;

public record SourceSummaryResponse(
        String name,
        String url,
        String type,
        int records,
        int evidence,
        Instant latestCollectedAt,
        String collectionStatus,
        String errorCode,
        String errorMessage,
        Instant lastAttemptedAt,
        String connectorId,
        List<String> capabilities,
        boolean demo,
        boolean configured) {

    public static SourceSummaryResponse from(TaskService.SourceSummary source) {
        return new SourceSummaryResponse(
                source.name(),
                source.url(),
                source.type(),
                source.records(),
                source.evidence(),
                source.latestCollectedAt(),
                source.collectionStatus(),
                source.errorCode(),
                source.errorMessage(),
                source.lastAttemptedAt(),
                source.connectorId(),
                source.capabilities(),
                source.demo(),
                source.configured()
        );
    }
}
