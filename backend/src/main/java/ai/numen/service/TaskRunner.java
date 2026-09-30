package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TaskRunner {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;
    private final WorkflowPlanner planner;
    private final CollectionEngine engine;
    private final TaskEventHub events;
    private final ObjectMapper objectMapper;

    public TaskRunner(CollectionTaskRepository tasks, DatasetRecordRepository records, WorkflowPlanner planner,
                      CollectionEngine engine, TaskEventHub events, ObjectMapper objectMapper) {
        this.tasks = tasks;
        this.records = records;
        this.planner = planner;
        this.engine = engine;
        this.events = events;
        this.objectMapper = objectMapper;
    }

    @Async("taskExecutor")
    public void run(UUID taskId) {
        CollectionTask task = tasks.findById(taskId).orElseThrow();
        try {
            task.begin();
            advance(task, TaskStatus.PLANNING, "Interpreting requirement", 10);
            WorkflowPlanner.Plan plan = planner.plan(task.getPrompt());
            task.setPlanJson(objectMapper.writeValueAsString(plan));
            advance(task, TaskStatus.PLANNING, "Designing collection workflow", 25);
            sleep(250);
            if (isCancelled(taskId)) return;

            advance(task, TaskStatus.COLLECTING, "Collecting permitted sources", 45);
            List<DatasetRecord> collected = engine.collect(taskId, task.getPrompt(), plan);
            if (isCancelled(taskId)) return;

            advance(task, TaskStatus.PROCESSING, "Validating and deduplicating", 72);
            records.deleteByTaskId(taskId);
            records.saveAll(collected);
            if (isCancelled(taskId)) return;

            advance(task, TaskStatus.PROCESSING, "Building provenance index", 90);
            double average = collected.stream().mapToDouble(DatasetRecord::getQualityScore).average().orElse(0);
            if (isCancelled(taskId)) return;

            task.complete(collected.size(), Math.round(average * 10.0) / 10.0);
            task = tasks.save(task);
            events.publish(taskId, TaskEventResponse.from(task));
        } catch (Exception ex) {
            CollectionTask latest = tasks.findById(taskId).orElse(task);
            if (latest.getStatus() == TaskStatus.CANCELLED) return;
            latest.fail(ex.getMessage() == null ? "Unexpected collection failure" : ex.getMessage());
            latest = tasks.save(latest);
            events.publish(taskId, TaskEventResponse.from(latest));
        }
    }

    private void advance(CollectionTask task, TaskStatus status, String stage, int progress) {
        task.update(status, stage, progress);
        CollectionTask saved = tasks.save(task);
        events.publish(saved.getId(), TaskEventResponse.from(saved));
    }

    private boolean isCancelled(UUID taskId) {
        return tasks.findById(taskId).map(value -> value.getStatus() == TaskStatus.CANCELLED).orElse(true);
    }

    private static void sleep(long milliseconds) {
        try { Thread.sleep(milliseconds); }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
    }
}
