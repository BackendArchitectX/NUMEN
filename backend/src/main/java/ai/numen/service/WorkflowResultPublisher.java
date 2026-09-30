package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WorkflowResultPublisher {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;

    public WorkflowResultPublisher(CollectionTaskRepository tasks, DatasetRecordRepository records) {
        this.tasks = tasks;
        this.records = records;
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
        return tasks.saveAndFlush(task);
    }
}
