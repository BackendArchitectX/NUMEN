package ai.numen.repository;

import ai.numen.entity.SourceCollectionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SourceCollectionAttemptRepository extends JpaRepository<SourceCollectionAttempt, UUID> {
    Optional<SourceCollectionAttempt> findByTaskIdAndSourceUrl(UUID taskId, String sourceUrl);
    List<SourceCollectionAttempt> findByTaskIdOrderByAttemptedAtAsc(UUID taskId);
}
