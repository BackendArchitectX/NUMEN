package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.connector.SourceCollectionRequest;
import ai.numen.connector.SourceConnector;
import ai.numen.domain.SourceCapability;
import ai.numen.domain.WorkflowPlan;
import ai.numen.entity.DatasetRecord;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionEngineCapabilityTest {
    @Test
    void refusesConnectorThatSupportsShapeButNotRequiredCapabilities() {
        SourceConnector incomplete = new SourceConnector() {
            @Override
            public String id() {
                return "incomplete-test";
            }

            @Override
            public Set<SourceCapability> capabilities() {
                return Set.of(SourceCapability.READ_RECORDS);
            }

            @Override
            public boolean supports(SourceCollectionRequest request) {
                return true;
            }

            @Override
            public List<DatasetRecord> collect(SourceCollectionRequest request) {
                throw new AssertionError("Connector without the required capability contract must not execute");
            }
        };

        WorkflowPlan plan = new WorkflowPlan(
                "GENERAL_RESEARCH",
                List.of("title", "sourceUrl"),
                List.of("collect", "publish"),
                List.of("source-capability-contract")
        );
        CollectionEngine engine = new CollectionEngine(List.of(incomplete), new NumenProperties());

        assertThatThrownBy(() -> engine.collect(
                UUID.randomUUID(),
                "Research the supplied public source with evidence",
                plan,
                false,
                List.of("https://example.com/research")
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("required capability contract");
    }
}
