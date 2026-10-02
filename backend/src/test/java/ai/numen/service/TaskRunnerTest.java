package ai.numen.service;

import ai.numen.domain.WorkflowPlan;
import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.TaskStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TaskRunnerTest {
    @Test
    void subscriberDeliveryFailureCannotFailPersistedResearch() {
        WorkflowStateService state = mock(WorkflowStateService.class);
        WorkflowPlanner planner = mock(WorkflowPlanner.class);
        CollectionEngine engine = mock(CollectionEngine.class);
        WorkflowResultPublisher publisher = mock(WorkflowResultPublisher.class);
        TaskEventHub events = mock(TaskEventHub.class);

        UUID taskId = UUID.randomUUID();
        String prompt = "Research a public source and keep evidence attached";
        CollectionTask task = new CollectionTask(
                taskId,
                prompt,
                null,
                false,
                List.of("https://example.com/")
        );

        WorkflowPlan plan = new WorkflowPlan(
                "GENERAL_RESEARCH",
                List.of("title", "sourceUrl", "excerpt"),
                List.of("interpret", "collect", "publish"),
                List.of("source-provenance")
        );

        when(state.beginPlanning(taskId)).thenAnswer(invocation -> {
            task.begin();
            task.update(TaskStatus.PLANNING, "Interpreting requirement", 10);
            return task;
        });
        when(planner.plan(prompt)).thenReturn(plan);
        when(state.storePlanAndAdvance(eq(taskId), anyString())).thenAnswer(invocation -> {
            task.setPlanJson(invocation.getArgument(1));
            task.update(TaskStatus.PLANNING, "Designing collection workflow", 25);
            return task;
        });
        when(state.advance(eq(taskId), any(TaskStatus.class), anyString(), anyInt())).thenAnswer(invocation -> {
            task.update(invocation.getArgument(1), invocation.getArgument(2), invocation.getArgument(3));
            return task;
        });
        when(state.isCancelled(taskId)).thenReturn(false);
        when(engine.collect(eq(taskId), eq(prompt), eq(plan), eq(false), anyList())).thenReturn(List.of());
        when(publisher.publish(eq(taskId), anyList())).thenAnswer(invocation -> {
            task.complete(0, 0);
            return task;
        });

        doThrow(new IllegalStateException("browser SSE disconnected"))
                .when(events).publish(eq(taskId), any(TaskEventResponse.class));

        TaskRunner runner = new TaskRunner(
                state,
                planner,
                engine,
                publisher,
                events,
                new ObjectMapper()
        );

        runner.run(taskId);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(task.getRecordCount()).isZero();
        verify(publisher).publish(eq(taskId), anyList());
        verify(state, never()).fail(eq(taskId), anyString());
    }
}
