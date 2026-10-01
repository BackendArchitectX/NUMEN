package ai.numen.entity;

import ai.numen.domain.SourceCapability;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceCollectionAttemptTest {
    @Test
    void preservesFailureClassConnectorAndCapabilities() {
        SourceCollectionAttempt attempt = new SourceCollectionAttempt(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "https://example.com/data"
        );

        attempt.failed(
                SourceCollectionStatus.UNAUTHORIZED,
                "HTTP_403",
                "Source did not permit this collection request",
                "http-page",
                Set.of(SourceCapability.PUBLIC_HTTP, SourceCapability.EVIDENCE_CAPTURE)
        );

        assertThat(attempt.getStatus()).isEqualTo(SourceCollectionStatus.UNAUTHORIZED);
        assertThat(attempt.getConnectorId()).isEqualTo("http-page");
        assertThat(attempt.getCapabilities()).containsExactly("evidence-capture", "public-http");
    }

    @Test
    void refusesToPersistSuccessThroughFailurePath() {
        SourceCollectionAttempt attempt = new SourceCollectionAttempt(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "https://example.com/data"
        );

        assertThatThrownBy(() -> attempt.failed(
                SourceCollectionStatus.SUCCEEDED,
                null,
                null,
                "http-page",
                Set.of(SourceCapability.PUBLIC_HTTP)
        )).isInstanceOf(IllegalArgumentException.class);
    }
}
