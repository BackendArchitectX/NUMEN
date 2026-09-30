package ai.numen.repo;

import ai.numen.domain.DatasetRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DatasetRecordRepository extends JpaRepository<DatasetRecord, UUID> {
    List<DatasetRecord> findByTaskIdOrderByQualityScoreDesc(UUID taskId);
    long countByTaskId(UUID taskId);
    void deleteByTaskId(UUID taskId);
}
