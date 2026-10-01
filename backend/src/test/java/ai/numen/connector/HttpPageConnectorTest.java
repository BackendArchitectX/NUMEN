package ai.numen.connector;

import ai.numen.entity.SourceCollectionStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HttpPageConnectorTest {
    @Test
    void retriesOnlyTransientHttpStatuses() {
        assertThat(HttpPageConnector.isRetryableStatus(408)).isTrue();
        assertThat(HttpPageConnector.isRetryableStatus(429)).isTrue();
        assertThat(HttpPageConnector.isRetryableStatus(500)).isTrue();
        assertThat(HttpPageConnector.isRetryableStatus(503)).isTrue();

        assertThat(HttpPageConnector.isRetryableStatus(400)).isFalse();
        assertThat(HttpPageConnector.isRetryableStatus(403)).isFalse();
        assertThat(HttpPageConnector.isRetryableStatus(404)).isFalse();
    }

    @Test
    void classifiesHttpFailuresWithoutTurningThemIntoNegativeEvidence() {
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(401)).isEqualTo(SourceCollectionStatus.UNAUTHORIZED);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(403)).isEqualTo(SourceCollectionStatus.UNAUTHORIZED);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(429)).isEqualTo(SourceCollectionStatus.RATE_LIMITED);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(404)).isEqualTo(SourceCollectionStatus.UNAVAILABLE);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(503)).isEqualTo(SourceCollectionStatus.UNAVAILABLE);
    }
}
