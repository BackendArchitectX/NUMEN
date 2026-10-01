package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.entity.TaskTimelineEventType;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.TaskTimelineEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class WorkflowStateService {
    private final CollectionTaskRepository tasks;
    private final TaskTimelineEventRepository timeline;

    public WorkflowStateService(CollectionTaskRepository tasks, TaskTimelineEventRepository timeline) {
        this.tasks = tasks;
        this.timeline = timeline;
    }

    @Transactional
    public CollectionTask create(UUID id, String prompt, String idempotencyKey) {
        return create(id, prompt, idempotencyKey, false);
    }

    @Transactional
    public CollectionTask create(UUID id, String prompt, String idempotencyKey, boolean demoMode) {
        return create(id, prompt, idempotencyKey, demoMode, List.of());
    }

    @Transactional
    public CollectionTask create(UUID id, String prompt, String idempotencyKey, boolean demoMode, List<String> sourceUrls) {
        CollectionTask task = tasks.saveAndFlush(new CollectionTask(id, prompt, idempotencyKey, demoMode, sourceUrls));
        String detail = demoMode
                ? "Demo research created"
                : sourceUrls.isEmpty() ? "Research created" : "Research created with " + sourceUrls.size() + " explicit source(s)";
        record(task, TaskTimelineEventType.CREATED, detail);
        return task;
    }

    @Transactional
    public CollectionTask beginPlanning(UUID taskId) {
        CollectionTask task = require(taskId);
        task.begin();
        task.update(TaskStatus.PLANNING, "Interpreting requirement", 10);
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.STATE_CHANGED, null);
        return task;
    }

    @Transactional
    public CollectionTask storePlanAndAdvance(UUID taskId, String planJson) {
        CollectionTask task = require(taskId);
        task.setPlanJson(planJson);
        task.update(TaskStatus.PLANNING, "Designing collection workflow", 25);
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.STATE_CHANGED, "Persisted execution plan");
        return task;
    }

    @Transactional
    public CollectionTask advance(UUID taskId, TaskStatus status, String stage, int progress) {
        CollectionTask task = require(taskId);
        task.update(status, stage, progress);
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.STATE_CHANGED, null);
        return task;
    }

    @Transactional
    public CollectionTask cancel(UUID taskId) {
        CollectionTask task = require(taskId);
        if (isTerminal(task.getStatus())) return task;
        task.cancel();
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.CANCELLED, "Cancelled by user");
        return task;
    }

    @Transactional
    public CollectionTask recover(UUID taskId) {
        CollectionTask task = require(taskId);
        task.recoverForRestart();
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.RECOVERED, "Recovered after application restart");
        return task;
    }

    @Transactional
    public CollectionTask fail(UUID taskId, String message) {
        CollectionTask task = require(taskId);
        if (isTerminal(task.getStatus())) return task;
        task.fail(message);
        task = tasks.saveAndFlush(task);
        record(task, TaskTimelineEventType.FAILED, message);
        return task;
    }

    @Transactional(readOnly = true)
    public CollectionTask get(UUID taskId) {
        return require(taskId);
    }

    @Transactional(readOnly = true)
    public boolean isCancelled(UUID taskId) {
        return tasks.findById(taskId)
                .map(task -> task.getStatus() == TaskStatus.CANCELLED)
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public List<TaskTimelineEvent> timeline(UUID taskId) {
        require(taskId);
        return timeline.findByTaskIdOrderByOccurredAtAscIdAsc(taskId);
    }

    private CollectionTask require(UUID taskId) {
        return tasks.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
    }

    private void record(CollectionTask task, TaskTimelineEventType eventType, String detail) {
        timeline.save(new TaskTimelineEvent(
                UUID.randomUUID(),
                task.getId(),
                eventType,
                task.getStatus(),
                task.getStage(),
                task.getProgress(),
                detail,
                Instant.now()
        ));
    }

    private static boolean isTerminal(TaskStatus status) {
        return status == TaskStatus.COMPLETED || status == TaskStatus.CANCELLED || status == TaskStatus.FAILED;
    }
}
