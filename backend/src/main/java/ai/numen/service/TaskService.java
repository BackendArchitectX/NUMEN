package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.exception.IdempotencyConflictException;
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
    private final WorkflowStateService state;

    public TaskService(CollectionTaskRepository tasks,
                       DatasetRecordRepository records,
                       TaskRunner runner,
                       TaskEventHub events,
                       WorkflowStateService state) {
        this.tasks = tasks;
        this.records = records;
        this.runner = runner;
        this.events = events;
        this.state = state;
    }

    public TaskCreation create(String prompt, String idempotencyKey) {
        String normalizedPrompt = prompt.trim();
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        if (normalizedKey != null) {
            var existing = tasks.findByIdempotencyKey(normalizedKey);
            if (existing.isPresent()) return replay(existing.get(), normalizedPrompt);
        }

        CollectionTask task;
        try {
            task = state.create(UUID.randomUUID(), normalizedPrompt, normalizedKey);
        } catch (DataIntegrityViolationException ex) {
            if (normalizedKey != null) {
                var raced = tasks.findByIdempotencyKey(normalizedKey);
                if (raced.isPresent()) return replay(raced.get(), normalizedPrompt);
            }
            throw ex;
        }

        try {
            runner.run(task.getId());
            return new TaskCreation(task, false);
        } catch (TaskRejectedException ex) {
            CollectionTask failed = state.fail(task.getId(), "Workflow capacity is temporarily exhausted. Retry shortly.");
            events.publish(task.getId(), TaskEventResponse.from(failed));
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

    public List<TaskTimelineEvent> timeline(UUID id) {
        return state.timeline(id);
    }

    public CollectionTask cancel(UUID id) {
        CollectionTask task = state.cancel(id);
        events.publish(id, TaskEventResponse.from(task));
        return task;
    }

    private static TaskCreation replay(CollectionTask existing, String prompt) {
        if (!existing.getPrompt().equals(prompt)) {
            throw new IdempotencyConflictException(
                    "The Idempotency-Key was already used with a different workflow request");
        }
        return new TaskCreation(existing, true);
    }

    private static String normalizeIdempotencyKey(String key) {
        if (key == null) return null;
        String normalized = key.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    public record TaskCreation(CollectionTask task, boolean replayed) { }
}
