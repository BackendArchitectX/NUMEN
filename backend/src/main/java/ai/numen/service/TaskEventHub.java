package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TaskEventHub {
    private static final Logger log = LoggerFactory.getLogger(TaskEventHub.class);
    private static final long STREAM_TIMEOUT_MS = 300_000L;
    private static final long RECONNECT_MS = 2_000L;

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID taskId, TaskEventResponse initialState) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        List<SseEmitter> listeners = emitters.computeIfAbsent(
                taskId,
                ignored -> Collections.synchronizedList(new ArrayList<>())
        );
        listeners.add(emitter);

        Runnable cleanup = () -> remove(taskId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(ignored -> cleanup.run());

        try {
            emitter.send(SseEmitter.event()
                    .name("progress")
                    .reconnectTime(RECONNECT_MS)
                    .data(initialState));
        } catch (IOException | RuntimeException ex) {
            cleanup.run();
            safeCompleteWithError(emitter, ex);
        }

        return emitter;
    }

    public void publish(UUID taskId, TaskEventResponse payload) {
        List<SseEmitter> listeners = emitters.get(taskId);
        if (listeners == null) return;

        synchronized (listeners) {
            listeners.removeIf(emitter -> {
                try {
                    emitter.send(SseEmitter.event()
                            .name("progress")
                            .reconnectTime(RECONNECT_MS)
                            .data(payload));
                    return false;
                } catch (IOException | RuntimeException ex) {
                    log.debug("sse_listener_dropped taskId={} error={}", taskId, ex.getClass().getSimpleName());
                    return true;
                }
            });

            if (listeners.isEmpty()) {
                emitters.remove(taskId, listeners);
            }
        }
    }

    @PreDestroy
    void shutdown() {
        emitters.values().forEach(listeners -> {
            synchronized (listeners) {
                listeners.forEach(TaskEventHub::safeComplete);
                listeners.clear();
            }
        });
        emitters.clear();
    }

    private static void safeComplete(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (RuntimeException ignored) {
            // The servlet container may already have invalidated this async response.
        }
    }

    private static void safeCompleteWithError(SseEmitter emitter, Throwable error) {
        try {
            emitter.completeWithError(error);
        } catch (RuntimeException ignored) {
            // A failed initial write can invalidate AsyncContext before cleanup completes.
        }
    }

    private void remove(UUID taskId, SseEmitter emitter) {
        List<SseEmitter> listeners = emitters.get(taskId);
        if (listeners == null) return;

        synchronized (listeners) {
            listeners.remove(emitter);
            if (listeners.isEmpty()) {
                emitters.remove(taskId, listeners);
            }
        }
    }
}
