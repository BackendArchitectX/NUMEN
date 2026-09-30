package ai.numen.repo;

import ai.numen.domain.CollectionTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, UUID> {}
