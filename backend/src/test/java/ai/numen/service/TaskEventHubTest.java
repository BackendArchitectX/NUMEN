package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.TaskStatus;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class TaskEventHubTest {
    @Test
    void brokenSseListenerCannotEscapeIntoWorkflowPublisher() throws Exception {
        TaskEventHub hub = new TaskEventHub();
        UUID taskId = UUID.randomUUID();
        SseEmitter emitter = mock(SseEmitter.class);

        doThrow(new IOException("client disconnected"))
                .when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        doThrow(new IllegalStateException("async context already errored"))
                .when(emitter).complete();

        Map<UUID, List<SseEmitter>> listeners = listeners(hub);
        listeners.put(taskId, Collections.synchronizedList(new ArrayList<>(List.of(emitter))));

        TaskEventResponse payload = new TaskEventResponse(taskId, TaskStatus.PROCESSING, "Publishing", 90);

        assertThatCode(() -> hub.publish(taskId, payload)).doesNotThrowAnyException();
        assertThat(listeners).doesNotContainKey(taskId);
        verify(emitter, never()).complete();
    }

    @Test
    void invalidatedAsyncContextRuntimeFailureIsDropped() throws Exception {
        TaskEventHub hub = new TaskEventHub();
        UUID taskId = UUID.randomUUID();
        SseEmitter emitter = mock(SseEmitter.class);

        doThrow(new IllegalStateException("async response unusable"))
                .when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        Map<UUID, List<SseEmitter>> listeners = listeners(hub);
        listeners.put(taskId, Collections.synchronizedList(new ArrayList<>(List.of(emitter))));

        assertThatCode(() -> hub.publish(
                taskId,
                new TaskEventResponse(taskId, TaskStatus.COLLECTING, "Collecting", 45)
        )).doesNotThrowAnyException();

        assertThat(listeners).doesNotContainKey(taskId);
    }

    @SuppressWarnings("unchecked")
    private static Map<UUID, List<SseEmitter>> listeners(TaskEventHub hub) throws Exception {
        Field field = TaskEventHub.class.getDeclaredField("emitters");
        field.setAccessible(true);
        return (ConcurrentHashMap<UUID, List<SseEmitter>>) field.get(hub);
    }
}
