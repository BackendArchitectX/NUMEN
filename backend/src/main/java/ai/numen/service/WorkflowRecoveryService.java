package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import ai.numen.repository.CollectionTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WorkflowRecoveryService {
    private static final Logger log = LoggerFactory.getLogger(WorkflowRecoveryService.class);
    private static final List<TaskStatus> RECOVERABLE = List.of(
            TaskStatus.QUEUED,
            TaskStatus.PLANNING,
            TaskStatus.COLLECTING,
            TaskStatus.PROCESSING
    );

    private final CollectionTaskRepository tasks;
    private final TaskRunner runner;

    public WorkflowRecoveryService(CollectionTaskRepository tasks, TaskRunner runner) {
        this.tasks = tasks;
        this.runner = runner;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedWorkflows() {
        List<CollectionTask> interrupted = tasks.findByStatusInOrderByCreatedAtAsc(RECOVERABLE);
        if (interrupted.isEmpty()) return;

        log.warn("recovering_interrupted_workflows count={}", interrupted.size());

        for (CollectionTask task : interrupted) {
            try {
                runner.run(task.getId());
            } catch (TaskRejectedException ex) {
                task.fail("Workflow could not be recovered because execution capacity was exhausted. Submit it again.");
                tasks.save(task);
                log.warn("workflow_recovery_rejected taskId={}", task.getId());
            }
        }
    }
}
