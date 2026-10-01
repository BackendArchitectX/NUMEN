package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.entity.TaskTimelineEventType;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import ai.numen.repository.TaskTimelineEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class WorkflowResultPublisherIntegrationTest {
    @Autowired
    private WorkflowResultPublisher publisher;

    @Autowired
    private CollectionTaskRepository tasks;

    @Autowired
    private DatasetRecordRepository records;

    @Autowired
    private TaskTimelineEventRepository timeline;

    @Test
    void replacesDatasetAndCompletesWorkflowInOneTransaction() {
        UUID taskId = UUID.randomUUID();
        CollectionTask task = new CollectionTask(taskId, "Collect a verified public dataset");
        task.begin();
        task.update(TaskStatus.PLANNING, "Interpreting requirement", 10);
        task.update(TaskStatus.COLLECTING, "Collecting permitted sources", 45);
        task.update(TaskStatus.PROCESSING, "Publishing verified dataset", 90);
        tasks.saveAndFlush(task);

        records.saveAndFlush(new DatasetRecord(
                taskId,
                "Old signal",
                "Old Org",
                "Remote",
                "https://example.com/old",
                "urn:numen:test:old",
                "Test",
                "TEST",
                "stale",
                50,
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        ));

        DatasetRecord fresh = new DatasetRecord(
                taskId,
                "Fresh signal",
                "Fresh Org",
                "Remote",
                "https://example.com/fresh",
                "urn:numen:test:fresh",
                "Test",
                "TEST",
                "verified",
                96,
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        );

        CollectionTask completed = publisher.publish(taskId, List.of(fresh));

        assertThat(completed.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(completed.getProgress()).isEqualTo(100);
        assertThat(completed.getRecordCount()).isEqualTo(1);
        assertThat(completed.getAverageQuality()).isEqualTo(96.0);

        List<DatasetRecord> persisted = records.findByTaskIdOrderByQualityScoreDesc(taskId);
        assertThat(persisted).singleElement().extracting(DatasetRecord::getTitle).isEqualTo("Fresh signal");

        assertThat(timeline.findByTaskIdOrderByOccurredAtAscIdAsc(taskId))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.getEventType()).isEqualTo(TaskTimelineEventType.COMPLETED);
                    assertThat(event.getStatus()).isEqualTo(TaskStatus.COMPLETED);
                    assertThat(event.getProgress()).isEqualTo(100);
                    assertThat(event.getDetail()).isEqualTo("Published 1 records");
                });
    }
}
