package ai.numen.connector;

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
}
