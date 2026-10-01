package ai.numen.controller;

import ai.numen.dto.CreateTaskRequest;
import ai.numen.dto.DatasetRecordResponse;
import ai.numen.dto.DatasetSummaryResponse;
import ai.numen.dto.SourceSummaryResponse;
import ai.numen.dto.TaskEventResponse;
import ai.numen.dto.TaskResponse;
import ai.numen.dto.TaskTimelineEventResponse;
import ai.numen.service.DatasetExportService;
import ai.numen.service.TaskEventHub;
import ai.numen.service.TaskService;
import ai.numen.entity.CollectionTask;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {
    private final TaskService service;
    private final TaskEventHub events;
    private final DatasetExportService exports;

    public TaskController(TaskService service, TaskEventHub events, DatasetExportService exports) {
        this.service = service;
        this.events = events;
        this.exports = exports;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(
            @Valid @RequestBody CreateTaskRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false)
            @Pattern(regexp = "[A-Za-z0-9._:-]{8,128}", message = "must contain 8-128 safe characters")
            String idempotencyKey) {
        TaskService.TaskCreation creation = service.create(request.prompt(), request.demoMode(), idempotencyKey);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creation.task().getId())
                .toUri();

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .location(location)
                .header("Idempotency-Replayed", Boolean.toString(creation.replayed()))
                .body(TaskResponse.from(creation.task()));
    }

    @GetMapping
    public List<TaskResponse> list(@RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return service.list(limit).stream().map(TaskResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable UUID id) {
        return TaskResponse.from(service.get(id));
    }

    @GetMapping("/{id}/records")
    public List<DatasetRecordResponse> records(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "") @Size(max = 128) String q,
            @RequestParam(defaultValue = "0") @DecimalMin("0.0") @DecimalMax("100.0") double minQuality,
            @RequestParam(defaultValue = "250") @Min(1) @Max(500) int limit) {
        return service.records(id, q, minQuality, limit).stream()
                .map(DatasetRecordResponse::from)
                .toList();
    }

    @GetMapping("/{id}/summary")
    public DatasetSummaryResponse summary(@PathVariable UUID id) {
        return DatasetSummaryResponse.from(service.summary(id));
    }

    @GetMapping("/{id}/sources")
    public List<SourceSummaryResponse> sources(@PathVariable UUID id) {
        return service.sources(id).stream()
                .map(SourceSummaryResponse::from)
                .toList();
    }

    @GetMapping("/{id}/timeline")
    public List<TaskTimelineEventResponse> timeline(@PathVariable UUID id) {
        return service.timeline(id).stream()
                .map(TaskTimelineEventResponse::from)
                .toList();
    }

    @PostMapping("/{id}/cancel")
    public TaskResponse cancel(@PathVariable UUID id) {
        return TaskResponse.from(service.cancel(id));
    }

    @GetMapping(path = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@PathVariable UUID id) {
        CollectionTask task = service.get(id);
        return events.subscribe(id, TaskEventResponse.from(task));
    }

    @GetMapping(value = "/{id}/export.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) {
        DatasetExportService.CsvExport export = exports.export(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + export.filename() + "\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(export.content());
    }
}
