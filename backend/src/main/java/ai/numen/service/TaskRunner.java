package ai.numen.service;

import ai.numen.domain.WorkflowPlan;
import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import ai.numen.exception.UserVisibleWorkflowException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TaskRunner {
    private static final Logger log = LoggerFactory.getLogger(TaskRunner.class);

    private final WorkflowStateService state;
    private final WorkflowPlanner planner;
    private final CollectionEngine engine;
    private final WorkflowResultPublisher publisher;
    private final TaskEventHub events;
    private final ObjectMapper objectMapper;

    public TaskRunner(WorkflowStateService state,
                      WorkflowPlanner planner,
                      CollectionEngine engine,
                      WorkflowResultPublisher publisher,
                      TaskEventHub events,
                      ObjectMapper objectMapper) {
        this.state = state;
        this.planner = planner;
        this.engine = engine;
        this.publisher = publisher;
        this.events = events;
        this.objectMapper = objectMapper;
    }

    @Async("taskExecutor")
    public void run(UUID taskId) {
        try {
            CollectionTask task = publish(state.beginPlanning(taskId));

            WorkflowPlan plan = planner.plan(task.getPrompt());
            task = publish(state.storePlanAndAdvance(taskId, objectMapper.writeValueAsString(plan)));
            if (state.isCancelled(taskId)) return;

            task = publish(state.advance(taskId, TaskStatus.COLLECTING, "Collecting permitted sources", 45));
            List<DatasetRecord> collected = engine.collect(taskId, task.getPrompt(), plan);
            if (state.isCancelled(taskId)) return;

            publish(state.advance(taskId, TaskStatus.PROCESSING, "Validating and deduplicating", 72));
            if (state.isCancelled(taskId)) return;

            publish(state.advance(taskId, TaskStatus.PROCESSING, "Publishing verified dataset", 90));
            if (state.isCancelled(taskId)) return;

            CollectionTask completed = publisher.publish(taskId, collected);
            events.publish(taskId, TaskEventResponse.from(completed));
        } catch (Exception ex) {
            log.error("workflow_execution_failed taskId={}", taskId, ex);
            CollectionTask latest = state.get(taskId);
            if (latest.getStatus() == TaskStatus.CANCELLED || latest.getStatus() == TaskStatus.COMPLETED) return;

            CollectionTask failed = state.fail(taskId, publicMessage(ex));
            events.publish(taskId, TaskEventResponse.from(failed));
        }
    }

    private CollectionTask publish(CollectionTask task) {
        events.publish(task.getId(), TaskEventResponse.from(task));
        return task;
    }

    private static String publicMessage(Exception ex) {
        if (ex instanceof UserVisibleWorkflowException && ex.getMessage() != null && !ex.getMessage().isBlank()) {
            return ex.getMessage();
        }
        return "Workflow failed due to an internal processing error. Retry the workflow and use server logs for diagnosis.";
    }
}
