package ai.numen.dto;

import ai.numen.service.TaskService;

import java.time.Instant;
import java.util.UUID;

public record RunChangeSummaryResponse(
        String status,
        UUID baselineTaskId,
        Instant baselineCompletedAt,
        int expectedSources,
        int comparedSources,
        int changedSources,
        int unchangedSources,
        int newlyObservedSources,
        int unobservedCurrentSources,
        int unhashableSources,
        boolean completeObservation) {

    public static RunChangeSummaryResponse from(TaskService.RunChangeSummary summary) {
        return new RunChangeSummaryResponse(
                summary.status(),
                summary.baselineTaskId(),
                summary.baselineCompletedAt(),
                summary.expectedSources(),
                summary.comparedSources(),
                summary.changedSources(),
                summary.unchangedSources(),
                summary.newlyObservedSources(),
                summary.unobservedCurrentSources(),
                summary.unhashableSources(),
                summary.completeObservation()
        );
    }
}
