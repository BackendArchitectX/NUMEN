package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.connector.DemoCatalogConnector;
import ai.numen.domain.WorkflowPlan;
import ai.numen.exception.UserVisibleWorkflowException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionEngineDemoModeTest {
    private final NumenProperties properties = new NumenProperties();
    private final CollectionEngine engine = new CollectionEngine(List.of(new DemoCatalogConnector()), properties);
    private final WorkflowPlan plan = new WorkflowPlan(
            "JOB_INTELLIGENCE",
            List.of("title", "organization", "sourceUrl"),
            List.of("interpret", "collect", "publish"),
            List.of("source-provenance")
    );

    @Test
    void refusesToGenerateDemoRecordsWithoutExplicitOptIn() {
        assertThatThrownBy(() -> engine.collect(
                UUID.randomUUID(),
                "Find Java backend engineering roles in India",
                plan,
                false
        ))
                .isInstanceOf(UserVisibleWorkflowException.class)
                .hasMessageContaining("No public source URL was supplied")
                .hasMessageContaining("Demo mode");
    }

    @Test
    void generatesClearlyMarkedSampleRecordsWhenDemoModeIsExplicit() {
        var records = engine.collect(
                UUID.randomUUID(),
                "Find Java backend engineering roles in India",
                plan,
                true
        );

        assertThat(records).isNotEmpty();
        assertThat(records).allSatisfy(record -> {
            assertThat(record.getSourceType()).isEqualTo("DEMO");
            assertThat(record.getSourceName()).isEqualTo("NUMEN Demo Catalog");
            assertThat(record.getSourceUrl()).startsWith("urn:numen:demo:");
        });
    }
}
