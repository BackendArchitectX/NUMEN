package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class TaskSummaryIntegrationTest {
    @Autowired
    private TaskService service;

    @Autowired
    private CollectionTaskRepository tasks;

    @Autowired
    private DatasetRecordRepository records;

    @Test
    void derivesExactOutcomeAndSourceCoverageFromPersistedRecords() {
        UUID taskId = UUID.randomUUID();
        tasks.saveAndFlush(new CollectionTask(taskId, "Research backend engineering opportunities"));

        records.save(new DatasetRecord(
                taskId,
                "Backend Engineer",
                "Example Org",
                "Pune",
                "https://example.com",
                "https://example.com/jobs",
                "Example Careers",
                "WEB",
                "Captured public job evidence",
                95,
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        ));

        records.save(new DatasetRecord(
                taskId,
                "Software Engineer",
                "Example Org",
                "Pune",
                "https://example.com",
                "https://example.com/jobs",
                "Example Careers",
                "WEB",
                "",
                90,
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ));

        records.saveAndFlush(new DatasetRecord(
                taskId,
                "Demo Research Item",
                "Demo Org",
                "Bengaluru",
                "https://demo.invalid",
                "urn:numen:demo:catalog",
                "NUMEN Demo Catalog",
                "DEMO",
                "Explicit demo evidence",
                80,
                "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        ));

        TaskService.DatasetSummary summary = service.summary(taskId);

        assertThat(summary.totalRecords()).isEqualTo(3);
        assertThat(summary.uniqueOrganizations()).isEqualTo(2);
        assertThat(summary.uniqueLocations()).isEqualTo(2);
        assertThat(summary.uniqueSources()).isEqualTo(2);
        assertThat(summary.evidenceLinkedRecords()).isEqualTo(2);
        assertThat(summary.demoRecords()).isEqualTo(1);
        assertThat(summary.latestCollectedAt()).isNotNull();
        assertThat(summary.topLocations())
                .first()
                .satisfies(value -> {
                    assertThat(value.value()).isEqualTo("Pune");
                    assertThat(value.count()).isEqualTo(2);
                });

        assertThat(service.sources(taskId))
                .hasSize(2)
                .first()
                .satisfies(source -> {
                    assertThat(source.name()).isEqualTo("Example Careers");
                    assertThat(source.records()).isEqualTo(2);
                    assertThat(source.evidence()).isEqualTo(1);
                    assertThat(source.demo()).isFalse();
                });

        assertThat(service.sources(taskId))
                .anySatisfy(source -> {
                    assertThat(source.name()).isEqualTo("NUMEN Demo Catalog");
                    assertThat(source.records()).isEqualTo(1);
                    assertThat(source.evidence()).isEqualTo(1);
                    assertThat(source.demo()).isTrue();
                });
    }
}
