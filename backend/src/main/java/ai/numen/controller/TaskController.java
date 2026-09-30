package ai.numen.controller;

import ai.numen.dto.CreateTaskRequest;
import ai.numen.dto.DatasetRecordResponse;
import ai.numen.dto.TaskResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.service.TaskEventHub;
import ai.numen.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {
    private final TaskService service;
    private final TaskEventHub events;

    public TaskController(TaskService service, TaskEventHub events) {
        this.service = service;
        this.events = events;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public TaskResponse create(@Valid @RequestBody CreateTaskRequest request) { return TaskResponse.from(service.create(request.prompt())); }

    @GetMapping
    public List<TaskResponse> list() { return service.list().stream().map(TaskResponse::from).toList(); }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable UUID id) { return TaskResponse.from(service.get(id)); }

    @GetMapping("/{id}/records")
    public List<DatasetRecordResponse> records(@PathVariable UUID id,
                                               @RequestParam(defaultValue = "") String q,
                                               @RequestParam(defaultValue = "0") double minQuality) {
        String needle = q.toLowerCase(Locale.ROOT).trim();
        return service.records(id).stream()
                .filter(record -> record.getQualityScore() >= minQuality)
                .filter(record -> needle.isBlank() || haystack(record).contains(needle))
                .map(DatasetRecordResponse::from)
                .toList();
    }

    @PostMapping("/{id}/cancel")
    public TaskResponse cancel(@PathVariable UUID id) { return TaskResponse.from(service.cancel(id)); }

    @GetMapping(path = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@PathVariable UUID id) {
        service.get(id);
        return events.subscribe(id);
    }

    @GetMapping(value = "/{id}/export.csv", produces = "text/csv")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) {
        CollectionTask task = service.get(id);
        StringBuilder csv = new StringBuilder("title,organization,location,website,source_url,source_name,source_type,quality_score,collected_at\n");
        for (DatasetRecord record : service.records(id)) {
            csv.append(cell(record.getTitle())).append(',')
                    .append(cell(record.getOrganization())).append(',')
                    .append(cell(record.getLocation())).append(',')
                    .append(cell(record.getWebsite())).append(',')
                    .append(cell(record.getSourceUrl())).append(',')
                    .append(cell(record.getSourceName())).append(',')
                    .append(cell(record.getSourceType())).append(',')
                    .append(record.getQualityScore()).append(',')
                    .append(record.getCollectedAt()).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"numen-" + task.getId() + ".csv\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String haystack(DatasetRecord record) {
        return String.join(" ", Objects.toString(record.getTitle(), ""), Objects.toString(record.getOrganization(), ""),
                Objects.toString(record.getLocation(), ""), Objects.toString(record.getExcerpt(), "")).toLowerCase(Locale.ROOT);
    }

    private static String cell(String value) { return "\"" + Objects.toString(value, "").replace("\"", "\"\"") + "\""; }
}
