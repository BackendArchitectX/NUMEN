package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.entity.TaskTimelineEventType;
import ai.numen.repository.TaskTimelineEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class WorkflowStateServiceIntegrationTest {
    @Autowired
    private WorkflowStateService state;

    @Autowired
    private TaskTimelineEventRepository timeline;

    @Test
    void persistsAuthoritativeLifecycleSnapshotsInTransitionOrder() {
        UUID taskId = UUID.randomUUID();

        state.create(taskId, "Collect traceable public intelligence", "timeline-integration-key");
        state.beginPlanning(taskId);
        state.storePlanAndAdvance(taskId, "{\"useCase\":\"test\"}");
        state.advance(taskId, TaskStatus.COLLECTING, "Collecting permitted sources", 45);
        CollectionTask cancelled = state.cancel(taskId);

        assertThat(cancelled.getStatus()).isEqualTo(TaskStatus.CANCELLED);

        List<TaskTimelineEvent> events = timeline.findByTaskIdOrderByOccurredAtAscIdAsc(taskId);
        assertThat(events)
                .extracting(TaskTimelineEvent::getEventType)
                .containsExactly(
                        TaskTimelineEventType.CREATED,
                        TaskTimelineEventType.STATE_CHANGED,
                        TaskTimelineEventType.STATE_CHANGED,
                        TaskTimelineEventType.STATE_CHANGED,
                        TaskTimelineEventType.CANCELLED
                );
        assertThat(events)
                .extracting(TaskTimelineEvent::getProgress)
                .containsExactly(0, 10, 25, 45, 45);
    }

    @Test
    void failureIsPersistedAsTerminalTimelineEvent() {
        UUID taskId = UUID.randomUUID();

        state.create(taskId, "Collect another traceable public dataset", "timeline-failure-key");
        state.beginPlanning(taskId);
        CollectionTask failed = state.fail(taskId, "Connector configuration is invalid");

        assertThat(failed.getStatus()).isEqualTo(TaskStatus.FAILED);
        assertThat(timeline.findByTaskIdOrderByOccurredAtAscIdAsc(taskId))
                .last()
                .satisfies(event -> {
                    assertThat(event.getEventType()).isEqualTo(TaskTimelineEventType.FAILED);
                    assertThat(event.getStatus()).isEqualTo(TaskStatus.FAILED);
                    assertThat(event.getDetail()).isEqualTo("Connector configuration is invalid");
                });
    }
}
