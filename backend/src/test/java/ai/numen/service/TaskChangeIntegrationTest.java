package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import ai.numen.repository.SourceCollectionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TaskChangeIntegrationTest {
    @Autowired private TaskService service;
    @Autowired private CollectionTaskRepository tasks;
    @Autowired private DatasetRecordRepository records;
    @Autowired private SourceCollectionAttemptRepository attempts;

    @MockBean private TaskRunner runner;

    @BeforeEach
    void clean() {
        attempts.deleteAll();
        records.deleteAll();
        tasks.deleteAll();
    }

    @Test
    void comparesOnlyEquivalentCompletedResearchAndUsesEvidenceHashes() {
        String source = "https://example.com/research";
        CollectionTask baseline = completedTask("Compare the supplied public source", source);
        tasks.saveAndFlush(baseline);
        records.saveAndFlush(record(baseline.getId(), source, "baseline evidence", "a"));

        CollectionTask current = completedTask("Compare the supplied public source", source);
        tasks.saveAndFlush(current);
        records.saveAndFlush(record(current.getId(), source, "changed evidence", "b"));

        TaskService.RunChangeSummary result = service.changes(current.getId());

        assertThat(result.status()).isEqualTo("AVAILABLE");
        assertThat(result.baselineTaskId()).isEqualTo(baseline.getId());
        assertThat(result.expectedSources()).isEqualTo(1);
        assertThat(result.comparedSources()).isEqualTo(1);
        assertThat(result.changedSources()).isEqualTo(1);
        assertThat(result.unchangedSources()).isZero();
        assertThat(result.completeObservation()).isTrue();
    }

    @Test
    void differentSourceScopeIsNotUsedAsBaseline() {
        CollectionTask baseline = completedTask("Compare the supplied public source", "https://a.example/research");
        tasks.saveAndFlush(baseline);

        CollectionTask current = completedTask("Compare the supplied public source", "https://b.example/research");
        tasks.saveAndFlush(current);

        TaskService.RunChangeSummary result = service.changes(current.getId());

        assertThat(result.status()).isEqualTo("NO_BASELINE");
        assertThat(result.baselineTaskId()).isNull();
        assertThat(result.completeObservation()).isFalse();
    }

    private static CollectionTask completedTask(String prompt, String sourceUrl) {
        CollectionTask task = new CollectionTask(UUID.randomUUID(), prompt, null, false, List.of(sourceUrl));
        task.begin();
        task.update(TaskStatus.PLANNING, "Planning", 5);
        task.update(TaskStatus.COLLECTING, "Collecting", 45);
        task.update(TaskStatus.PROCESSING, "Processing", 72);
        task.complete(1, 90);
        return task;
    }

    private static DatasetRecord record(UUID taskId, String sourceUrl, String excerpt, String fingerprintSeed) {
        return new DatasetRecord(
                taskId,
                "Research result",
                "Example",
                "Remote",
                "https://example.com",
                sourceUrl,
                "Example",
                "WEB",
                excerpt,
                90,
                String.format("%064x", Math.abs(fingerprintSeed.hashCode()))
        );
    }
}
