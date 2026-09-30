package ai.numen.repository;

import ai.numen.entity.DatasetRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface DatasetRecordRepository extends JpaRepository<DatasetRecord, UUID> {
    List<DatasetRecord> findByTaskIdOrderByQualityScoreDesc(UUID taskId);
    @Transactional void deleteByTaskId(UUID taskId);
}
