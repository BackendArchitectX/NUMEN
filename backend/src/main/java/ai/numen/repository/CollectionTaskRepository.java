package ai.numen.repository;

import ai.numen.entity.CollectionTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, UUID> { }
