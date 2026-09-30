package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;
    private final TaskRunner runner;
    private final TaskEventHub events;

    public TaskService(CollectionTaskRepository tasks, DatasetRecordRepository records, TaskRunner runner, TaskEventHub events) {
        this.tasks = tasks;
        this.records = records;
        this.runner = runner;
        this.events = events;
    }

    public CollectionTask create(String prompt) {
        CollectionTask task = tasks.save(new CollectionTask(UUID.randomUUID(), prompt.trim()));
        runner.run(task.getId());
        return task;
    }

    public List<CollectionTask> list() {
        List<CollectionTask> all = tasks.findAll();
        all.sort(Comparator.comparing(CollectionTask::getCreatedAt).reversed());
        return all;
    }

    public CollectionTask get(UUID id) {
        return tasks.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    public List<DatasetRecord> records(UUID id) {
        get(id);
        return records.findByTaskIdOrderByQualityScoreDesc(id);
    }

    @Transactional
    public CollectionTask cancel(UUID id) {
        CollectionTask task = get(id);
        if (task.getStatus() != TaskStatus.COMPLETED && task.getStatus() != TaskStatus.FAILED && task.getStatus() != TaskStatus.CANCELLED) {
            task.cancel();
            task = tasks.save(task);
            events.publish(id, TaskEventResponse.from(task));
        }
        return task;
    }
}
