package ai.numen.service;

import ai.numen.domain.SourceCapability;
import ai.numen.entity.SourceCollectionAttempt;
import ai.numen.entity.SourceCollectionStatus;
import ai.numen.repository.SourceCollectionAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SourceCollectionAttemptService {
    private final SourceCollectionAttemptRepository attempts;

    public SourceCollectionAttemptService(SourceCollectionAttemptRepository attempts) {
        this.attempts = attempts;
    }

    @Transactional
    public void succeeded(UUID taskId,
                          String sourceUrl,
                          String connectorId,
                          Set<SourceCapability> capabilities) {
        SourceCollectionAttempt attempt = attempts.findByTaskIdAndSourceKey(taskId, SourceCollectionAttempt.sourceKey(sourceUrl))
                .orElseGet(() -> new SourceCollectionAttempt(UUID.randomUUID(), taskId, sourceUrl));
        attempt.succeeded(connectorId, capabilities);
        attempts.save(attempt);
    }

    @Transactional
    public void failed(UUID taskId,
                       String sourceUrl,
                       SourceCollectionStatus status,
                       String errorCode,
                       String errorMessage,
                       String connectorId,
                       Set<SourceCapability> capabilities) {
        SourceCollectionAttempt attempt = attempts.findByTaskIdAndSourceKey(taskId, SourceCollectionAttempt.sourceKey(sourceUrl))
                .orElseGet(() -> new SourceCollectionAttempt(UUID.randomUUID(), taskId, sourceUrl));
        attempt.failed(status, errorCode, clip(errorMessage, 512), connectorId, capabilities);
        attempts.save(attempt);
    }

    @Transactional(readOnly = true)
    public List<SourceCollectionAttempt> forTask(UUID taskId) {
        return attempts.findByTaskIdOrderByAttemptedAtAsc(taskId);
    }

    private static String clip(String value, int max) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.length() <= max ? normalized : normalized.substring(0, max);
    }
}
