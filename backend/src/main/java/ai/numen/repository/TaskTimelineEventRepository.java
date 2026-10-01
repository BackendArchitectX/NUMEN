package ai.numen.repository;

import ai.numen.entity.TaskTimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskTimelineEventRepository extends JpaRepository<TaskTimelineEvent, UUID> {
    List<TaskTimelineEvent> findByTaskIdOrderByOccurredAtAscIdAsc(UUID taskId);
}
