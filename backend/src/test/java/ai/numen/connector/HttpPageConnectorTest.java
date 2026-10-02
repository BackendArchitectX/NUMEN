package ai.numen.connector;

import ai.numen.entity.SourceCollectionStatus;
import org.jsoup.Jsoup;
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
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(302)).isEqualTo(SourceCollectionStatus.REJECTED);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(404)).isEqualTo(SourceCollectionStatus.UNAVAILABLE);
        assertThat(HttpPageConnector.collectionStatusForHttpStatus(503)).isEqualTo(SourceCollectionStatus.UNAVAILABLE);
    }

    @Test
    void rejectsObviousAccessBarriersWithoutTreatingThemAsEvidence() {
        assertThat(HttpPageConnector.accessBarrierReason(Jsoup.parse(
                "<html><title>Sign in</title><body><form><input type='password'></form></body></html>"
        ))).contains("sign-in");

        assertThat(HttpPageConnector.accessBarrierReason(Jsoup.parse(
                "<html><title>Checking your browser</title><body>Verify you are human before continuing.</body></html>"
        ))).contains("access interstitial");

        assertThat(HttpPageConnector.accessBarrierReason(Jsoup.parse(
                "<html><title>Public research</title><body><h1>Research results</h1><p>Public evidence content is available here.</p></body></html>"
        ))).isNull();
    }
}
