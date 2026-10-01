package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.entity.TaskTimelineEventType;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import ai.numen.repository.TaskTimelineEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class WorkflowResultPublisher {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;
    private final TaskTimelineEventRepository timeline;

    public WorkflowResultPublisher(CollectionTaskRepository tasks,
                                   DatasetRecordRepository records,
                                   TaskTimelineEventRepository timeline) {
        this.tasks = tasks;
        this.records = records;
        this.timeline = timeline;
    }

    @Transactional
    public CollectionTask publish(UUID taskId, List<DatasetRecord> collected) {
        CollectionTask task = tasks.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));

        if (task.getStatus() == TaskStatus.CANCELLED) {
            return task;
        }

        records.deleteByTaskId(taskId);
        records.saveAllAndFlush(collected);

        double average = collected.stream()
                .mapToDouble(DatasetRecord::getQualityScore)
                .average()
                .orElse(0);

        task.complete(collected.size(), Math.round(average * 10.0) / 10.0);
        task = tasks.saveAndFlush(task);
        timeline.save(new TaskTimelineEvent(
                UUID.randomUUID(),
                task.getId(),
                TaskTimelineEventType.COMPLETED,
                task.getStatus(),
                task.getStage(),
                task.getProgress(),
                "Published " + collected.size() + " records",
                Instant.now()
        ));
        return task;
    }
}
