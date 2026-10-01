package ai.numen.repository;

import ai.numen.entity.DatasetRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface DatasetRecordRepository extends JpaRepository<DatasetRecord, UUID> {
    @Query(
            value = """
                    select record from DatasetRecord record
                    where record.taskId = :taskId
                      and record.qualityScore >= :minQuality
                      and (
                        :query = '' or
                        lower(coalesce(record.title, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.organization, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.location, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.excerpt, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.sourceName, '')) like concat('%', :query, '%')
                      )
                    """,
            countQuery = """
                    select count(record) from DatasetRecord record
                    where record.taskId = :taskId
                      and record.qualityScore >= :minQuality
                      and (
                        :query = '' or
                        lower(coalesce(record.title, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.organization, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.location, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.excerpt, '')) like concat('%', :query, '%') or
                        lower(coalesce(record.sourceName, '')) like concat('%', :query, '%')
                      )
                    """
    )
    Page<DatasetRecord> search(@Param("taskId") UUID taskId,
                               @Param("query") String query,
                               @Param("minQuality") double minQuality,
                               Pageable pageable);

    List<DatasetRecord> findByTaskIdOrderByQualityScoreDesc(UUID taskId);

    @Transactional
    void deleteByTaskId(UUID taskId);
}
