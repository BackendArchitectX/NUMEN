package ai.numen.connector;

import ai.numen.entity.SourceCollectionStatus;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.UUID;

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
    void genericWebPageDoesNotInventOrganizationOrLocationMetadata() {
        var record = HttpPageConnector.recordFromDocument(
                UUID.randomUUID(),
                URI.create("https://example.com/"),
                Jsoup.parse("<html><title>Example Domain</title><body><p>Public documentation example.</p></body></html>")
        );

        assertThat(record.getTitle()).isEqualTo("Example Domain");
        assertThat(record.getOrganization()).isBlank();
        assertThat(record.getLocation()).isBlank();
        assertThat(record.getSourceName()).isEqualTo("example.com");
        assertThat(record.getSourceType()).isEqualTo("WEB");
        assertThat(record.getSourceUrl()).isEqualTo("https://example.com/");
        assertThat(record.getWebsite()).isEqualTo("https://example.com");
        assertThat(record.getQualityScore()).isEqualTo(77);
    }

    @Test
    void boundsPersistedWebMetadataWithoutTruncatingSourceProvenance() {
        String longTitle = "T".repeat(400);
        String longPath = "segment-".repeat(50);
        URI uri = URI.create("https://example.com/" + longPath);

        var record = HttpPageConnector.recordFromDocument(
                UUID.randomUUID(),
                uri,
                Jsoup.parse("<html><title>" + longTitle + "</title><body><p>Public research evidence with enough detail for collection.</p></body></html>")
        );

        assertThat(record.getTitle()).hasSize(255).endsWith("…");
        assertThat(record.getWebsite()).isEqualTo("https://example.com");
        assertThat(record.getSourceUrl()).isEqualTo(uri.toString()).hasSizeGreaterThan(255);
    }

    @Test
    void boundsContentAndAcceptsOnlyTextualResearchMedia() {
        assertThat(HttpPageConnector.isSupportedContentType("text/plain; charset=UTF-8")).isTrue();
        assertThat(HttpPageConnector.isSupportedContentType("text/html")).isTrue();
        assertThat(HttpPageConnector.isSupportedContentType("application/problem+json")).isTrue();
        assertThat(HttpPageConnector.isSupportedContentType("image/png")).isFalse();
        assertThat(HttpPageConnector.isSupportedContentType("application/pdf")).isFalse();

        assertThat(HttpPageConnector.exceedsBodyLimit(1_500_000)).isFalse();
        assertThat(HttpPageConnector.exceedsBodyLimit(1_500_001)).isTrue();
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
