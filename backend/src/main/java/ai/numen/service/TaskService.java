package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.exception.WorkflowCapacityException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
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

    public TaskCreation create(String prompt, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        if (normalizedKey != null) {
            var existing = tasks.findByIdempotencyKey(normalizedKey);
            if (existing.isPresent()) return new TaskCreation(existing.get(), true);
        }

        CollectionTask task;
        try {
            task = tasks.saveAndFlush(new CollectionTask(UUID.randomUUID(), prompt.trim(), normalizedKey));
        } catch (DataIntegrityViolationException ex) {
            if (normalizedKey != null) {
                var raced = tasks.findByIdempotencyKey(normalizedKey);
                if (raced.isPresent()) return new TaskCreation(raced.get(), true);
            }
            throw ex;
        }

        try {
            runner.run(task.getId());
            return new TaskCreation(task, false);
        } catch (TaskRejectedException ex) {
            task.fail("Workflow capacity is temporarily exhausted. Retry shortly.");
            tasks.save(task);
            throw new WorkflowCapacityException("Workflow capacity is temporarily exhausted. Retry shortly.", ex);
        }
    }

    @Transactional(readOnly = true)
    public List<CollectionTask> list(int limit) {
        return tasks.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public CollectionTask get(UUID id) {
        return tasks.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<DatasetRecord> records(UUID id, String query, double minQuality, int limit) {
        get(id);
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return records.search(id, normalized, minQuality, PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public List<DatasetRecord> allRecords(UUID id) {
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

    private static String normalizeIdempotencyKey(String key) {
        if (key == null) return null;
        String normalized = key.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    public record TaskCreation(CollectionTask task, boolean replayed) { }
}
