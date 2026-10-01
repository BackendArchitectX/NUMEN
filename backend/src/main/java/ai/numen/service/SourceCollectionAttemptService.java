package ai.numen.service;

import ai.numen.entity.SourceCollectionAttempt;
import ai.numen.repository.SourceCollectionAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SourceCollectionAttemptService {
    private final SourceCollectionAttemptRepository attempts;

    public SourceCollectionAttemptService(SourceCollectionAttemptRepository attempts) {
        this.attempts = attempts;
    }

    @Transactional
    public void succeeded(UUID taskId, String sourceUrl) {
        SourceCollectionAttempt attempt = attempts.findByTaskIdAndSourceUrl(taskId, sourceUrl)
                .orElseGet(() -> new SourceCollectionAttempt(UUID.randomUUID(), taskId, sourceUrl));
        attempt.succeeded();
        attempts.save(attempt);
    }

    @Transactional
    public void failed(UUID taskId, String sourceUrl, String errorCode, String errorMessage) {
        SourceCollectionAttempt attempt = attempts.findByTaskIdAndSourceUrl(taskId, sourceUrl)
                .orElseGet(() -> new SourceCollectionAttempt(UUID.randomUUID(), taskId, sourceUrl));
        attempt.failed(errorCode, clip(errorMessage, 512));
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
