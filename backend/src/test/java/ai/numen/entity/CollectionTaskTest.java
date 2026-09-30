package ai.numen.entity;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionTaskTest {
    @Test
    void enforcesWorkflowStateTransitionsAndProgress() {
        CollectionTask task = new CollectionTask(UUID.randomUUID(), "Collect traceable public intelligence");

        assertThatThrownBy(() -> task.update(TaskStatus.PROCESSING, "Skip", 50))
                .isInstanceOf(IllegalStateException.class);

        task.begin();
        task.update(TaskStatus.PLANNING, "Interpret", 10);
        assertThatThrownBy(() -> task.update(TaskStatus.PLANNING, "Regress", 5))
                .isInstanceOf(IllegalArgumentException.class);

        task.update(TaskStatus.PLANNING, "Plan", 25);
        task.update(TaskStatus.COLLECTING, "Collect", 45);
        task.update(TaskStatus.PROCESSING, "Validate", 72);
        task.update(TaskStatus.PROCESSING, "Publish", 90);
        task.complete(3, 92.5);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(task.getProgress()).isEqualTo(100);
        assertThatThrownBy(task::cancel).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void restartRecoveryUsesExplicitDomainTransition() {
        CollectionTask task = new CollectionTask(UUID.randomUUID(), "Collect traceable public intelligence");
        task.begin();
        task.update(TaskStatus.PLANNING, "Interpret", 10);
        task.update(TaskStatus.COLLECTING, "Collect", 45);

        task.recoverForRestart();

        assertThat(task.getStatus()).isEqualTo(TaskStatus.PLANNING);
        assertThat(task.getStage()).isEqualTo("Recovering after restart");
        assertThat(task.getProgress()).isEqualTo(5);
    }
}
