package ai.numen.entity;

import ai.numen.domain.SourceCapability;
import jakarta.persistence.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "source_collection_attempts")
public class SourceCollectionAttempt {
    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "source_url", nullable = false, length = 2048)
    private String sourceUrl;

    @Column(name = "source_key", nullable = false, length = 64)
    private String sourceKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SourceCollectionStatus status;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_message", length = 512)
    private String errorMessage;

    @Column(name = "connector_id", length = 64)
    private String connectorId;

    @Column(name = "capabilities", length = 512)
    private String capabilities;

    @Column(name = "attempted_at", nullable = false)
    private Instant attemptedAt;

    protected SourceCollectionAttempt() { }

    public SourceCollectionAttempt(UUID id, UUID taskId, String sourceUrl) {
        this.id = id;
        this.taskId = taskId;
        this.sourceUrl = sourceUrl;
        this.sourceKey = sourceKey(sourceUrl);
        this.status = SourceCollectionStatus.FAILED;
        this.attemptedAt = Instant.now();
    }

    public void succeeded(String connectorId, Set<SourceCapability> capabilities) {
        this.status = SourceCollectionStatus.SUCCEEDED;
        this.errorCode = null;
        this.errorMessage = null;
        applyConnector(connectorId, capabilities);
        this.attemptedAt = Instant.now();
    }

    public void failed(SourceCollectionStatus status,
                       String errorCode,
                       String errorMessage,
                       String connectorId,
                       Set<SourceCapability> capabilities) {
        if (status == null || status == SourceCollectionStatus.SUCCEEDED) {
            throw new IllegalArgumentException("Failure outcome must use a non-success source status");
        }
        this.status = status;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        applyConnector(connectorId, capabilities);
        this.attemptedAt = Instant.now();
    }

    private void applyConnector(String connectorId, Set<SourceCapability> capabilities) {
        this.connectorId = connectorId;
        this.capabilities = SourceCapability.apiNames(capabilities).stream()
                .collect(Collectors.joining(","));
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public String getSourceUrl() { return sourceUrl; }
    public String getSourceKey() { return sourceKey; }
    public SourceCollectionStatus getStatus() { return status; }
    public String getErrorCode() { return errorCode; }
    public String getErrorMessage() { return errorMessage; }
    public String getConnectorId() { return connectorId; }
    public Instant getAttemptedAt() { return attemptedAt; }

    public List<String> getCapabilities() {
        if (capabilities == null || capabilities.isBlank()) return List.of();
        return Arrays.stream(capabilities.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .sorted()
                .toList();
    }

    public static String sourceKey(String sourceUrl) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(sourceUrl.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
