package ai.numen.service;

import ai.numen.domain.WorkflowPlan;
import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.repository.CollectionTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TaskRunner {
    private final CollectionTaskRepository tasks;
    private final WorkflowPlanner planner;
    private final CollectionEngine engine;
    private final WorkflowResultPublisher publisher;
    private final TaskEventHub events;
    private final ObjectMapper objectMapper;

    public TaskRunner(CollectionTaskRepository tasks,
                      WorkflowPlanner planner,
                      CollectionEngine engine,
                      WorkflowResultPublisher publisher,
                      TaskEventHub events,
                      ObjectMapper objectMapper) {
        this.tasks = tasks;
        this.planner = planner;
        this.engine = engine;
        this.publisher = publisher;
        this.events = events;
        this.objectMapper = objectMapper;
    }

    @Async("taskExecutor")
    public void run(UUID taskId) {
        CollectionTask task = tasks.findById(taskId).orElseThrow();
        try {
            task.begin();
            task = advance(task, TaskStatus.PLANNING, "Interpreting requirement", 10);

            WorkflowPlan plan = planner.plan(task.getPrompt());
            task.setPlanJson(objectMapper.writeValueAsString(plan));
            task = advance(task, TaskStatus.PLANNING, "Designing collection workflow", 25);
            if (isCancelled(taskId)) return;

            task = advance(task, TaskStatus.COLLECTING, "Collecting permitted sources", 45);
            List<DatasetRecord> collected = engine.collect(taskId, task.getPrompt(), plan);
            if (isCancelled(taskId)) return;

            task = advance(task, TaskStatus.PROCESSING, "Validating and deduplicating", 72);
            if (isCancelled(taskId)) return;

            task = advance(task, TaskStatus.PROCESSING, "Publishing verified dataset", 90);
            if (isCancelled(taskId)) return;

            task = publisher.publish(taskId, collected);
            events.publish(taskId, TaskEventResponse.from(task));
        } catch (Exception ex) {
            CollectionTask latest = tasks.findById(taskId).orElse(task);
            if (latest.getStatus() == TaskStatus.CANCELLED) return;
            latest.fail(ex.getMessage() == null ? "Unexpected collection failure" : ex.getMessage());
            latest = tasks.save(latest);
            events.publish(taskId, TaskEventResponse.from(latest));
        }
    }

    private CollectionTask advance(CollectionTask task, TaskStatus status, String stage, int progress) {
        task.update(status, stage, progress);
        CollectionTask saved = tasks.save(task);
        events.publish(saved.getId(), TaskEventResponse.from(saved));
        return saved;
    }

    private boolean isCancelled(UUID taskId) {
        return tasks.findById(taskId)
                .map(value -> value.getStatus() == TaskStatus.CANCELLED)
                .orElse(true);
    }
}
