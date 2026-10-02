package ai.numen.entity;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DatasetRecordTest {
    @Test
    void evidenceHashTracksCapturedContentButDoesNotPretendToAuthenticateOrigin() {
        DatasetRecord first = record("https://source-a.example/page", "Evidence body", "identity-a");
        DatasetRecord sameContentDifferentOrigin = record("https://source-b.example/page", "Evidence body", "identity-b");
        DatasetRecord changedContent = record("https://source-a.example/page", "Evidence body changed", "identity-c");

        assertThat(first.getEvidenceHash()).hasSize(64);
        assertThat(first.getEvidenceHashAlgorithm()).isEqualTo("SHA-256 canonical-text-v1");
        assertThat(first.getEvidenceHash()).isEqualTo(sameContentDifferentOrigin.getEvidenceHash());
        assertThat(first.getEvidenceHash()).isNotEqualTo(changedContent.getEvidenceHash());
        assertThat(first.getFingerprint()).isNotEqualTo(sameContentDifferentOrigin.getFingerprint());
    }

    @Test
    void evidenceHashCanonicalizesWhitespaceAndBidiControls() {
        String normal = DatasetRecord.evidenceSnapshotHash("Title", "alpha beta");
        String noisy = DatasetRecord.evidenceSnapshotHash(" Title ", "alpha\u202E   beta");

        assertThat(noisy).isEqualTo(normal);
    }

    private static DatasetRecord record(String sourceUrl, String excerpt, String fingerprintSeed) {
        return new DatasetRecord(
                UUID.randomUUID(),
                "Title",
                "Org",
                "Remote",
                "https://example.com",
                sourceUrl,
                "Example",
                "WEB",
                excerpt,
                90,
                sha256(fingerprintSeed)
        );
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
