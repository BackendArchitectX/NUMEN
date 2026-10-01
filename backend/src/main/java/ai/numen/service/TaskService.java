package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.exception.IdempotencyConflictException;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.exception.WorkflowCapacityException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private final CollectionTaskRepository tasks;
    private final DatasetRecordRepository records;
    private final TaskRunner runner;
    private final TaskEventHub events;
    private final WorkflowStateService state;
    private final NumenProperties properties;

    public TaskService(CollectionTaskRepository tasks,
                       DatasetRecordRepository records,
                       TaskRunner runner,
                       TaskEventHub events,
                       WorkflowStateService state,
                       NumenProperties properties) {
        this.tasks = tasks;
        this.records = records;
        this.runner = runner;
        this.events = events;
        this.state = state;
        this.properties = properties;
    }

    public TaskCreation create(String prompt, boolean demoMode, String idempotencyKey) {
        return create(prompt, demoMode, List.of(), idempotencyKey);
    }

    public TaskCreation create(String prompt, boolean demoMode, List<String> sourceUrls, String idempotencyKey) {
        String normalizedPrompt = prompt.trim();
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        List<String> normalizedSources = normalizeSourceUrls(sourceUrls);

        if (demoMode && !normalizedSources.isEmpty()) {
            throw new IllegalArgumentException("Demo mode cannot be combined with live public source URLs");
        }
        if (normalizedSources.size() > properties.getMaxFetchUrls()) {
            throw new IllegalArgumentException("At most " + properties.getMaxFetchUrls() + " public source URLs are allowed per research run");
        }

        if (normalizedKey != null) {
            var existing = tasks.findByIdempotencyKey(normalizedKey);
            if (existing.isPresent()) return replay(existing.get(), normalizedPrompt, demoMode, normalizedSources);
        }

        CollectionTask task;
        try {
            task = state.create(UUID.randomUUID(), normalizedPrompt, normalizedKey, demoMode, normalizedSources);
        } catch (DataIntegrityViolationException ex) {
            if (normalizedKey != null) {
                var raced = tasks.findByIdempotencyKey(normalizedKey);
                if (raced.isPresent()) return replay(raced.get(), normalizedPrompt, demoMode, normalizedSources);
            }
            throw ex;
        }

        try {
            runner.run(task.getId());
            return new TaskCreation(task, false);
        } catch (TaskRejectedException ex) {
            CollectionTask failed = state.fail(task.getId(), "Workflow capacity is temporarily exhausted. Retry shortly.");
            events.publish(task.getId(), TaskEventResponse.from(failed));
            throw new WorkflowCapacityException("Workflow capacity is temporarily exhausted. Retry shortly.", ex);
        }
    }

    @Transactional(readOnly = true)
    public List<CollectionTask> list(int limit) {
        return tasks.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public CollectionTask get(UUID id) {
        return tasks.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<DatasetRecord> records(UUID id, String query, double minQuality, int limit) {
        get(id);
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return records.search(id, normalized, minQuality, PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public List<DatasetRecord> allRecords(UUID id) {
        get(id);
        return records.findByTaskIdOrderByQualityScoreDesc(id);
    }

    @Transactional(readOnly = true)
    public DatasetSummary summary(UUID id) {
        get(id);
        List<DatasetRecord> dataset = records.findByTaskIdOrderByQualityScoreDesc(id);

        Set<String> organizations = dataset.stream()
                .map(DatasetRecord::getOrganization)
                .filter(TaskService::hasText)
                .map(String::trim)
                .collect(Collectors.toSet());

        Set<String> locations = dataset.stream()
                .map(DatasetRecord::getLocation)
                .filter(TaskService::hasText)
                .map(String::trim)
                .collect(Collectors.toSet());

        Set<String> sources = dataset.stream()
                .map(TaskService::sourceKey)
                .filter(TaskService::hasText)
                .collect(Collectors.toSet());

        int evidenceLinked = (int) dataset.stream()
                .filter(record -> hasText(record.getSourceUrl()) && hasText(record.getExcerpt()))
                .count();

        int demoRecords = (int) dataset.stream()
                .filter(record -> "DEMO".equalsIgnoreCase(record.getSourceType()))
                .count();

        Instant latestCollectedAt = dataset.stream()
                .map(DatasetRecord::getCollectedAt)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        Map<String, Long> locationCounts = dataset.stream()
                .map(DatasetRecord::getLocation)
                .filter(TaskService::hasText)
                .map(String::trim)
                .collect(Collectors.groupingBy(value -> value, Collectors.counting()));

        List<ValueCount> topLocations = locationCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(3)
                .map(entry -> new ValueCount(entry.getKey(), entry.getValue()))
                .toList();

        return new DatasetSummary(
                dataset.size(),
                organizations.size(),
                locations.size(),
                sources.size(),
                evidenceLinked,
                demoRecords,
                latestCollectedAt,
                topLocations
        );
    }

    @Transactional(readOnly = true)
    public List<SourceSummary> sources(UUID id) {
        get(id);
        List<DatasetRecord> dataset = records.findByTaskIdOrderByQualityScoreDesc(id);

        Map<String, List<DatasetRecord>> grouped = dataset.stream()
                .collect(Collectors.groupingBy(
                        TaskService::sourceKey,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return grouped.values().stream()
                .map(group -> {
                    DatasetRecord first = group.get(0);
                    int evidence = (int) group.stream()
                            .filter(record -> hasText(record.getSourceUrl()) && hasText(record.getExcerpt()))
                            .count();
                    Instant latest = group.stream()
                            .map(DatasetRecord::getCollectedAt)
                            .filter(java.util.Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null);
                    boolean demo = group.stream().allMatch(record -> "DEMO".equalsIgnoreCase(record.getSourceType()));

                    return new SourceSummary(
                            hasText(first.getSourceName()) ? first.getSourceName().trim() : sourceKey(first),
                            first.getSourceUrl(),
                            first.getSourceType(),
                            group.size(),
                            evidence,
                            latest,
                            demo
                    );
                })
                .sorted(Comparator.comparingInt(SourceSummary::records).reversed()
                        .thenComparing(SourceSummary::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public List<TaskTimelineEvent> timeline(UUID id) {
        return state.timeline(id);
    }

    public CollectionTask cancel(UUID id) {
        CollectionTask task = state.cancel(id);
        events.publish(id, TaskEventResponse.from(task));
        return task;
    }

    private static TaskCreation replay(CollectionTask existing, String prompt, boolean demoMode, List<String> sourceUrls) {
        if (!existing.getPrompt().equals(prompt)
                || existing.isDemoMode() != demoMode
                || !existing.getSourceUrls().equals(sourceUrls)) {
            throw new IdempotencyConflictException(
                    "The Idempotency-Key was already used with a different research request");
        }
        return new TaskCreation(existing, true);
    }

    private static String normalizeIdempotencyKey(String key) {
        if (key == null) return null;
        String normalized = key.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static List<String> normalizeSourceUrls(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();

        List<String> normalized = new ArrayList<>();
        for (String value : values) {
            if (value == null) continue;
            String trimmed = value.trim();
            if (trimmed.isEmpty() || normalized.contains(trimmed)) continue;
            normalized.add(trimmed);
        }
        return List.copyOf(normalized);
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String sourceKey(DatasetRecord record) {
        if (hasText(record.getSourceUrl())) return record.getSourceUrl().trim();
        if (hasText(record.getSourceName())) return record.getSourceName().trim();
        if (hasText(record.getSourceType())) return record.getSourceType().trim();
        return record.getId().toString();
    }

    public record TaskCreation(CollectionTask task, boolean replayed) { }

    public record ValueCount(String value, long count) { }

    public record DatasetSummary(
            int totalRecords,
            int uniqueOrganizations,
            int uniqueLocations,
            int uniqueSources,
            int evidenceLinkedRecords,
            int demoRecords,
            Instant latestCollectedAt,
            List<ValueCount> topLocations) { }

    public record SourceSummary(
            String name,
            String url,
            String type,
            int records,
            int evidence,
            Instant latestCollectedAt,
            boolean demo) { }
}
