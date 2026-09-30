package ai.numen.web;

import ai.numen.domain.*;
import ai.numen.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class TaskController {
    private final TaskService service;
    private final TaskEventHub events;

    public TaskController(TaskService service, TaskEventHub events) { this.service = service; this.events = events; }

    public record CreateTaskRequest(@NotBlank @Size(min = 10, max = 4000) String prompt) {}

    @GetMapping("/health")
    public Map<String, Object> health() { return Map.of("status", "UP", "service", "NUMEN", "time", Instant.now()); }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CollectionTask create(@Valid @RequestBody CreateTaskRequest request) { return service.create(request.prompt()); }

    @GetMapping("/tasks")
    public List<CollectionTask> list() { return service.list(); }

    @GetMapping("/tasks/{id}")
    public CollectionTask get(@PathVariable UUID id) { return service.get(id); }

    @GetMapping("/tasks/{id}/records")
    public List<DatasetRecord> records(@PathVariable UUID id,
                                       @RequestParam(defaultValue = "") String q,
                                       @RequestParam(defaultValue = "0") double minQuality) {
        String needle = q.toLowerCase(Locale.ROOT).trim();
        return service.records(id).stream()
                .filter(r -> r.getQualityScore() >= minQuality)
                .filter(r -> needle.isBlank() || haystack(r).contains(needle))
                .toList();
    }

    @PostMapping("/tasks/{id}/cancel")
    public CollectionTask cancel(@PathVariable UUID id) { return service.cancel(id); }

    @GetMapping(path = "/tasks/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@PathVariable UUID id) { service.get(id); return events.subscribe(id); }

    @GetMapping(value = "/tasks/{id}/export.csv", produces = "text/csv")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) {
        CollectionTask task = service.get(id);
        StringBuilder csv = new StringBuilder("title,organization,location,website,source_url,source_name,quality_score,collected_at\n");
        for (DatasetRecord r : service.records(id)) {
            csv.append(cell(r.getTitle())).append(',').append(cell(r.getOrganization())).append(',').append(cell(r.getLocation())).append(',')
                    .append(cell(r.getWebsite())).append(',').append(cell(r.getSourceUrl())).append(',').append(cell(r.getSourceName())).append(',')
                    .append(r.getQualityScore()).append(',').append(r.getCollectedAt()).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"numen-" + task.getId() + ".csv\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String haystack(DatasetRecord r) { return String.join(" ", Objects.toString(r.getTitle(), ""), Objects.toString(r.getOrganization(), ""), Objects.toString(r.getLocation(), ""), Objects.toString(r.getExcerpt(), "")).toLowerCase(Locale.ROOT); }
    private static String cell(String s) { return "\"" + Objects.toString(s, "").replace("\"", "\"\"") + "\""; }
}
