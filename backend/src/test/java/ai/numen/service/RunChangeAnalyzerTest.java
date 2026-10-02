package ai.numen.service;

import ai.numen.entity.DatasetRecord;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RunChangeAnalyzerTest {
    @Test
    void reportsChangedAndUnchangedSnapshotsOnlyWhenBothRunsObservedThem() {
        DatasetRecord currentA = record("https://a.example", "same", "cur-a");
        DatasetRecord baselineA = record("https://a.example", "same", "base-a");
        DatasetRecord currentB = record("https://b.example", "new body", "cur-b");
        DatasetRecord baselineB = record("https://b.example", "old body", "base-b");

        RunChangeAnalyzer.Analysis result = RunChangeAnalyzer.analyze(
                Set.of("https://a.example", "https://b.example"),
                List.of(currentA, currentB),
                List.of(baselineA, baselineB),
                Set.of("https://a.example", "https://b.example"),
                Set.of("https://a.example", "https://b.example")
        );

        assertThat(result.changedSources()).isEqualTo(1);
        assertThat(result.unchangedSources()).isEqualTo(1);
        assertThat(result.comparedSources()).isEqualTo(2);
        assertThat(result.completeObservation()).isTrue();
    }

    @Test
    void comparesAllRecordsForASourceInsteadOfOnlyTheFirstRecord() {
        DatasetRecord currentOne = record("https://a.example", "alpha", "cur-a1");
        DatasetRecord currentTwo = record("https://a.example", "beta changed", "cur-a2");
        DatasetRecord baselineOne = record("https://a.example", "alpha", "base-a1");
        DatasetRecord baselineTwo = record("https://a.example", "beta", "base-a2");

        RunChangeAnalyzer.Analysis result = RunChangeAnalyzer.analyze(
                Set.of("https://a.example"),
                List.of(currentOne, currentTwo),
                List.of(baselineOne, baselineTwo),
                Set.of("https://a.example"),
                Set.of("https://a.example")
        );

        assertThat(result.changedSources()).isEqualTo(1);
        assertThat(result.unchangedSources()).isZero();
        assertThat(result.completeObservation()).isTrue();
    }

    @Test
    void refusesCompleteNoChangeWhenCurrentSourceWasNotObserved() {
        DatasetRecord baseline = record("https://a.example", "same", "base-a");

        RunChangeAnalyzer.Analysis result = RunChangeAnalyzer.analyze(
                Set.of("https://a.example"),
                List.of(),
                List.of(baseline),
                Set.of(),
                Set.of("https://a.example")
        );

        assertThat(result.changedSources()).isZero();
        assertThat(result.unchangedSources()).isZero();
        assertThat(result.unobservedCurrentSources()).isEqualTo(1);
        assertThat(result.completeObservation()).isFalse();
    }

    @Test
    void distinguishesNewlyObservedFromChanged() {
        DatasetRecord current = record("https://a.example", "body", "cur-a");

        RunChangeAnalyzer.Analysis result = RunChangeAnalyzer.analyze(
                Set.of("https://a.example"),
                List.of(current),
                List.of(),
                Set.of("https://a.example"),
                Set.of()
        );

        assertThat(result.newlyObservedSources()).isEqualTo(1);
        assertThat(result.changedSources()).isZero();
        assertThat(result.completeObservation()).isFalse();
    }

    private static DatasetRecord record(String sourceUrl, String excerpt, String fingerprint) {
        return new DatasetRecord(
                UUID.randomUUID(),
                "Title",
                "Org",
                "Remote",
                "https://example.com",
                sourceUrl,
                "Example",
                "WEB",
                excerpt,
                90,
                String.format("%064x", Math.abs(fingerprint.hashCode()))
        );
    }
}
