package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import ai.numen.repository.CollectionTaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowRecoveryServiceTest {
    @Mock
    private CollectionTaskRepository tasks;

    @Mock
    private TaskRunner runner;

    @Test
    void redispatchesInterruptedWorkflowAfterRestart() {
        UUID taskId = UUID.randomUUID();
        CollectionTask task = new CollectionTask(taskId, "Collect verified public intelligence");
        task.begin();
        task.update(TaskStatus.PLANNING, "Interpreting requirement", 10);
        task.update(TaskStatus.COLLECTING, "Collecting permitted sources", 45);

        when(tasks.findByStatusInOrderByCreatedAtAsc(List.of(
                TaskStatus.QUEUED,
                TaskStatus.PLANNING,
                TaskStatus.COLLECTING,
                TaskStatus.PROCESSING
        ))).thenReturn(List.of(task));

        new WorkflowRecoveryService(tasks, runner).recoverInterruptedWorkflows();

        assertThat(task.getStatus()).isEqualTo(TaskStatus.PLANNING);
        assertThat(task.getStage()).isEqualTo("Recovering after restart");
        assertThat(task.getProgress()).isEqualTo(5);
        verify(tasks).saveAndFlush(task);
        verify(runner).run(taskId);
    }
}
