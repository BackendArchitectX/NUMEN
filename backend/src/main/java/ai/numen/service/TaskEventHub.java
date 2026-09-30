package ai.numen.service;

import ai.numen.dto.TaskEventResponse;
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
    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID taskId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(taskId, ignored -> Collections.synchronizedList(new ArrayList<>())).add(emitter);
        Runnable cleanup = () -> emitters.getOrDefault(taskId, List.of()).remove(emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(ignored -> cleanup.run());
        return emitter;
    }

    public void publish(UUID taskId, TaskEventResponse payload) {
        List<SseEmitter> listeners = emitters.get(taskId);
        if (listeners == null) return;
        synchronized (listeners) {
            listeners.removeIf(emitter -> {
                try {
                    emitter.send(SseEmitter.event().name("progress").data(payload));
                    return false;
                } catch (IOException ex) {
                    emitter.complete();
                    return true;
                }
            });
        }
    }
}
