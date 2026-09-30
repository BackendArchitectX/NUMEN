package ai.numen.service;

import ai.numen.domain.*;
import ai.numen.repo.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TaskRunner {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;
    private final WorkflowPlanner planner;
    private final CollectionEngine engine;
    private final TaskEventHub events;
    private final ObjectMapper mapper;

    public TaskRunner(CollectionTaskRepository tasks, DatasetRecordRepository records, WorkflowPlanner planner, CollectionEngine engine, TaskEventHub events, ObjectMapper mapper) {
        this.tasks = tasks; this.records = records; this.planner = planner; this.engine = engine; this.events = events; this.mapper = mapper;
    }

    @Async
    public void run(UUID taskId) {
        CollectionTask task = tasks.findById(taskId).orElseThrow();
        try {
            task.begin();
            advance(task, TaskStatus.PLANNING, "Interpreting requirement", 10);
            WorkflowPlanner.Plan plan = planner.plan(task.getPrompt());
            task.setPlanJson(mapper.writeValueAsString(plan));
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
            double avg = collected.stream().mapToDouble(DatasetRecord::getQualityScore).average().orElse(0);
            if (isCancelled(taskId)) return;
            task.complete(collected.size(), Math.round(avg * 10.0) / 10.0);
            tasks.save(task);
            events.publish(taskId, snapshot(task));
        } catch (Exception ex) {
            CollectionTask latest = tasks.findById(taskId).orElse(task);
            if (latest.getStatus() == TaskStatus.CANCELLED) return;
            latest.fail(ex.getMessage() == null ? "Unexpected collection failure" : ex.getMessage());
            tasks.save(latest);
            events.publish(taskId, snapshot(latest));
        }
    }

    private void advance(CollectionTask task, TaskStatus status, String stage, int progress) {
        task.update(status, stage, progress);
        tasks.save(task);
        events.publish(task.getId(), snapshot(task));
    }

    private boolean isCancelled(UUID taskId) { return tasks.findById(taskId).map(t -> t.getStatus() == TaskStatus.CANCELLED).orElse(true); }
    private static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); } }
    private static Map<String, Object> snapshot(CollectionTask t) { return Map.of("id", t.getId(), "status", t.getStatus(), "stage", t.getStage(), "progress", t.getProgress()); }
}
