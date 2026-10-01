package ai.numen.service;

import ai.numen.domain.SourceCapability;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.SourceCollectionStatus;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
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

    @Autowired
    private SourceCollectionAttemptService sourceAttempts;

    @Test
    void derivesExactOutcomeAndSourceCoverageFromPersistedRecords() {
        UUID taskId = UUID.randomUUID();
        tasks.saveAndFlush(new CollectionTask(
                taskId,
                "Research backend engineering opportunities",
                null,
                false,
                List.of("https://example.com/jobs", "https://failed.example/jobs")
        ));

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

        Set<SourceCapability> webCapabilities = Set.of(
                SourceCapability.READ_RECORDS,
                SourceCapability.EVIDENCE_CAPTURE,
                SourceCapability.RETRY_SAFE_READ,
                SourceCapability.PARTIAL_FAILURE,
                SourceCapability.PUBLIC_HTTP
        );
        sourceAttempts.succeeded(taskId, "https://example.com/jobs", "http-page", webCapabilities);
        sourceAttempts.failed(
                taskId,
                "https://failed.example/jobs",
                SourceCollectionStatus.UNAVAILABLE,
                "SOURCE_UNREACHABLE",
                "Source could not be reached after the configured retry policy",
                "http-page",
                webCapabilities
        );

        TaskService.DatasetSummary summary = service.summary(taskId);

        assertThat(summary.totalRecords()).isEqualTo(3);
        assertThat(summary.uniqueOrganizations()).isEqualTo(2);
        assertThat(summary.uniqueLocations()).isEqualTo(2);
        assertThat(summary.uniqueSources()).isEqualTo(2);
        assertThat(summary.configuredSources()).isEqualTo(2);
        assertThat(summary.attemptedSources()).isEqualTo(2);
        assertThat(summary.successfulSources()).isEqualTo(1);
        assertThat(summary.failedSources()).isEqualTo(1);
        assertThat(summary.unavailableSources()).isEqualTo(1);
        assertThat(summary.unauthorizedSources()).isZero();
        assertThat(summary.rejectedSources()).isZero();
        assertThat(summary.rateLimitedSources()).isZero();
        assertThat(summary.notAttemptedSources()).isZero();
        assertThat(summary.sourceCoverageState()).isEqualTo("PARTIAL");
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
                .hasSize(3)
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

        assertThat(service.sources(taskId))
                .anySatisfy(source -> {
                    assertThat(source.url()).isEqualTo("https://failed.example/jobs");
                    assertThat(source.records()).isZero();
                    assertThat(source.collectionStatus()).isEqualTo("UNAVAILABLE");
                    assertThat(source.errorCode()).isEqualTo("SOURCE_UNREACHABLE");
                    assertThat(source.connectorId()).isEqualTo("http-page");
                    assertThat(source.capabilities()).contains("public-http", "partial-failure", "evidence-capture");
                    assertThat(source.configured()).isTrue();
                });

        TaskService.DatasetPage firstPage = service.recordPage(taskId, "", 0, 0, 2, "title", "asc");
        assertThat(firstPage.totalMatched()).isEqualTo(3);
        assertThat(firstPage.totalPages()).isEqualTo(2);
        assertThat(firstPage.records())
                .extracting(DatasetRecord::getTitle)
                .containsExactly("Backend Engineer", "Demo Research Item");

        TaskService.DatasetPage filteredPage = service.recordPage(taskId, "demo", 0, 0, 25, "qualityScore", "desc");
        assertThat(filteredPage.totalMatched()).isEqualTo(1);
        assertThat(filteredPage.records())
                .extracting(DatasetRecord::getTitle)
                .containsExactly("Demo Research Item");

    }
}
