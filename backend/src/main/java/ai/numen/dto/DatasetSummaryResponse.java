package ai.numen.dto;

import ai.numen.service.TaskService;

import java.time.Instant;
import java.util.List;

public record DatasetSummaryResponse(
        int totalRecords,
        int uniqueOrganizations,
        int uniqueLocations,
        int uniqueSources,
        int configuredSources,
        int attemptedSources,
        int successfulSources,
        int failedSources,
        int unavailableSources,
        int unauthorizedSources,
        int rejectedSources,
        int rateLimitedSources,
        int notAttemptedSources,
        String sourceCoverageState,
        int evidenceLinkedRecords,
        int demoRecords,
        Instant latestCollectedAt,
        List<ValueCountResponse> topLocations) {

    public static DatasetSummaryResponse from(TaskService.DatasetSummary summary) {
        return new DatasetSummaryResponse(
                summary.totalRecords(),
                summary.uniqueOrganizations(),
                summary.uniqueLocations(),
                summary.uniqueSources(),
                summary.configuredSources(),
                summary.attemptedSources(),
                summary.successfulSources(),
                summary.failedSources(),
                summary.unavailableSources(),
                summary.unauthorizedSources(),
                summary.rejectedSources(),
                summary.rateLimitedSources(),
                summary.notAttemptedSources(),
                summary.sourceCoverageState(),
                summary.evidenceLinkedRecords(),
                summary.demoRecords(),
                summary.latestCollectedAt(),
                summary.topLocations().stream().map(ValueCountResponse::from).toList()
        );
    }

    public record ValueCountResponse(String value, long count) {
        private static ValueCountResponse from(TaskService.ValueCount value) {
            return new ValueCountResponse(value.value(), value.count());
        }
    }
}
