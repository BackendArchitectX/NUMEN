package ai.numen.repository;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, UUID> {
    List<CollectionTask> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<CollectionTask> findByIdempotencyKey(String idempotencyKey);
    List<CollectionTask> findByStatusInOrderByCreatedAtAsc(Collection<TaskStatus> statuses);
    Page<CollectionTask> findByStatusAndDemoModeAndCreatedAtBeforeOrderByCreatedAtDesc(
            TaskStatus status,
            boolean demoMode,
            Instant createdAt,
            Pageable pageable);
}
