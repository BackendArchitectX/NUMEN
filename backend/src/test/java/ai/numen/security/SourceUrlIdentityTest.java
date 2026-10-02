package ai.numen.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceUrlIdentityTest {
    @Test
    void canonicalizesSafePublicUrlIdentityBeforePersistence() {
        assertThat(SourceUrlIdentity.normalizeForPersistence(" HTTPS://Example.COM:443/a/../research#section "))
                .isEqualTo("https://example.com/research");
        assertThat(SourceUrlIdentity.normalizeForPersistence("http://Example.com"))
                .isEqualTo("http://example.com/");
    }

    @Test
    void preservesPublicIpv6LiteralIdentity() {
        assertThat(SourceUrlIdentity.normalizeForPersistence("https://[2606:4700:4700::1111]/dns"))
                .isEqualTo("https://[2606:4700:4700::1111]/dns");
    }

    @Test
    void rejectsCredentialBearingAndSignedUrlsBeforePersistence() {
        assertThatThrownBy(() -> SourceUrlIdentity.normalizeForPersistence("https://user:pass@example.com/research"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("user:pass");

        assertThatThrownBy(() -> SourceUrlIdentity.normalizeForPersistence("https://example.com/research?access_token=secret"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("secret");

        assertThatThrownBy(() -> SourceUrlIdentity.normalizeForPersistence("https://example.com/file?X-Amz-Signature=abc"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("abc");
    }

    @Test
    void auditReferenceRemovesCredentialsAndSensitiveQueryValues() {
        String safe = SourceUrlIdentity.safeAuditReference(
                "https://user:password@example.com/research?access_token=topsecret#fragment");

        assertThat(safe).isEqualTo("https://example.com/research");
        assertThat(safe).doesNotContain("password", "topsecret", "access_token");
    }

    @Test
    void preservesOrdinaryQueryParametersForSourceIdentity() {
        assertThat(SourceUrlIdentity.safeAuditReference("https://example.com/search?q=java&page=2"))
                .isEqualTo("https://example.com/search?q=java&page=2");
    }
}
