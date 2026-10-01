package ai.numen.dto;

import ai.numen.service.TaskService;

import java.time.Instant;

public record SourceSummaryResponse(
        String name,
        String url,
        String type,
        int records,
        int evidence,
        Instant latestCollectedAt,
        boolean demo) {

    public static SourceSummaryResponse from(TaskService.SourceSummary source) {
        return new SourceSummaryResponse(
                source.name(),
                source.url(),
                source.type(),
                source.records(),
                source.evidence(),
                source.latestCollectedAt(),
                source.demo()
        );
    }
}
