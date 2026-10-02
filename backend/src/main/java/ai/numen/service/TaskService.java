package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.domain.SourceCapability;
import ai.numen.dto.TaskEventResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.SourceCollectionAttempt;
import ai.numen.entity.SourceCollectionStatus;
import ai.numen.entity.TaskTimelineEvent;
import ai.numen.exception.IdempotencyConflictException;
import ai.numen.exception.ResourceNotFoundException;
import ai.numen.exception.WorkflowCapacityException;
import ai.numen.repository.CollectionTaskRepository;
import ai.numen.repository.DatasetRecordRepository;
import ai.numen.security.SourceUrlIdentity;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
    private final SourceCollectionAttemptService sourceAttempts;

    public TaskService(CollectionTaskRepository tasks,
                       DatasetRecordRepository records,
                       TaskRunner runner,
                       TaskEventHub events,
                       WorkflowStateService state,
                       NumenProperties properties,
                       SourceCollectionAttemptService sourceAttempts) {
        this.tasks = tasks;
        this.records = records;
        this.runner = runner;
        this.events = events;
        this.state = state;
        this.properties = properties;
        this.sourceAttempts = sourceAttempts;
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
        Sort sort = Sort.by(Sort.Order.desc("qualityScore"), Sort.Order.asc("id"));
        return records.search(id, normalized, minQuality, PageRequest.of(0, limit, sort)).getContent();
    }

    @Transactional(readOnly = true)
    public DatasetPage recordPage(UUID id,
                                  String query,
                                  double minQuality,
                                  int page,
                                  int pageSize,
                                  String sortBy,
                                  String direction) {
        get(id);
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String property = sortableProperty(sortBy);
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(new Sort.Order(sortDirection, property), Sort.Order.asc("id"));
        Page<DatasetRecord> result = records.search(id, normalized, minQuality, PageRequest.of(page, pageSize, sort));

        return new DatasetPage(
                result.getContent(),
                result.getTotalElements(),
                result.getNumber(),
                result.getSize(),
                result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public List<DatasetRecord> allRecords(UUID id) {
        get(id);
        return records.findByTaskIdOrderByQualityScoreDesc(id);
    }

    @Transactional(readOnly = true)
    public DatasetSummary summary(UUID id) {
        CollectionTask task = get(id);
        List<DatasetRecord> dataset = records.findByTaskIdOrderByQualityScoreDesc(id);
        List<SourceCollectionAttempt> attempts = sourceAttempts.forTask(id);

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

        int evidenceHashedRecords = (int) dataset.stream()
                .filter(record -> hasText(record.getEvidenceHash()))
                .count();

        Map<String, Set<String>> evidenceHashSources = dataset.stream()
                .filter(record -> hasText(record.getEvidenceHash()))
                .collect(Collectors.groupingBy(
                        DatasetRecord::getEvidenceHash,
                        LinkedHashMap::new,
                        Collectors.mapping(TaskService::sourceKey, Collectors.toSet())
                ));
        int matchingEvidenceSnapshotGroups = (int) evidenceHashSources.values().stream()
                .filter(sourceKeys -> sourceKeys.stream().filter(TaskService::hasText).distinct().count() > 1)
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

        Set<String> configuredSourceUrls = new java.util.LinkedHashSet<>(task.getSourceUrls());
        attempts.stream().map(SourceCollectionAttempt::getSourceUrl).filter(TaskService::hasText).forEach(configuredSourceUrls::add);

        Map<String, SourceCollectionAttempt> attemptBySourceUrl = attempts.stream()
                .filter(attempt -> hasText(attempt.getSourceUrl()))
                .collect(Collectors.toMap(
                        SourceCollectionAttempt::getSourceUrl,
                        attempt -> attempt,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
        Set<String> datasetSourceUrls = dataset.stream()
                .map(DatasetRecord::getSourceUrl)
                .filter(TaskService::hasText)
                .map(String::trim)
                .collect(Collectors.toSet());
        long inferredHistoricalSuccesses = configuredSourceUrls.stream()
                .filter(url -> !attemptBySourceUrl.containsKey(url))
                .filter(datasetSourceUrls::contains)
                .count();

        int attemptedSources = attempts.size() + Math.toIntExact(inferredHistoricalSuccesses);
        int successfulSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.SUCCEEDED)
                .count() + Math.toIntExact(inferredHistoricalSuccesses);
        int unavailableSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.UNAVAILABLE)
                .count();
        int unauthorizedSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.UNAUTHORIZED)
                .count();
        int rejectedSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.REJECTED)
                .count();
        int rateLimitedSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.RATE_LIMITED)
                .count();
        int failedSources = (int) attempts.stream()
                .filter(attempt -> attempt.getStatus().isFailure())
                .count();
        int notAttemptedSources = Math.max(0, configuredSourceUrls.size() - attemptedSources);
        String sourceCoverageState = sourceCoverageState(
                task,
                dataset.size(),
                demoRecords,
                configuredSourceUrls.size(),
                successfulSources,
                failedSources,
                notAttemptedSources
        );

        return new DatasetSummary(
                dataset.size(),
                organizations.size(),
                locations.size(),
                sources.size(),
                configuredSourceUrls.size(),
                attemptedSources,
                successfulSources,
                failedSources,
                unavailableSources,
                unauthorizedSources,
                rejectedSources,
                rateLimitedSources,
                notAttemptedSources,
                sourceCoverageState,
                evidenceLinked,
                evidenceHashedRecords,
                matchingEvidenceSnapshotGroups,
                demoRecords,
                latestCollectedAt,
                topLocations
        );
    }

    @Transactional(readOnly = true)
    public List<SourceSummary> sources(UUID id) {
        CollectionTask task = get(id);
        List<DatasetRecord> dataset = records.findByTaskIdOrderByQualityScoreDesc(id);
        List<SourceCollectionAttempt> attempts = sourceAttempts.forTask(id);

        Map<String, List<DatasetRecord>> grouped = dataset.stream()
                .collect(Collectors.groupingBy(
                        TaskService::sourceKey,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<String, SourceCollectionAttempt> attemptByUrl = attempts.stream()
                .collect(Collectors.toMap(
                        SourceCollectionAttempt::getSourceUrl,
                        attempt -> attempt,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));

        java.util.LinkedHashSet<String> configuredUrls = new java.util.LinkedHashSet<>(task.getSourceUrls());
        configuredUrls.addAll(attemptByUrl.keySet());

        List<SourceSummary> summaries = new ArrayList<>();

        for (String url : configuredUrls) {
            List<DatasetRecord> group = grouped.remove(url);
            SourceCollectionAttempt attempt = attemptByUrl.get(url);

            if (group == null || group.isEmpty()) {
                Instant lastSuccessfulObservationAt = attempt != null
                        && attempt.getStatus() == SourceCollectionStatus.SUCCEEDED
                        ? attempt.getAttemptedAt()
                        : null;
                summaries.add(new SourceSummary(
                        sourceNameFromUrl(url),
                        url,
                        "WEB",
                        0,
                        0,
                        null,
                        lastSuccessfulObservationAt,
                        attempt == null ? "NOT_ATTEMPTED" : attempt.getStatus().name(),
                        attempt == null ? null : attempt.getErrorCode(),
                        attempt == null ? null : attempt.getErrorMessage(),
                        attempt == null ? null : attempt.getAttemptedAt(),
                        connectorId(attempt, "WEB"),
                        capabilities(attempt, "WEB"),
                        false,
                        true
                ));
                continue;
            }

            summaries.add(sourceSummary(group, attempt, true));
        }

        for (List<DatasetRecord> group : grouped.values()) {
            summaries.add(sourceSummary(group, attemptByUrl.get(sourceKey(group.get(0))), false));
        }

        return summaries.stream()
                .sorted(Comparator.comparingInt(SourceSummary::records).reversed()
                        .thenComparing(SourceSummary::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public RunChangeSummary changes(UUID id) {
        CollectionTask current = get(id);
        if (current.getStatus() != ai.numen.entity.TaskStatus.COMPLETED) {
            return RunChangeSummary.unavailable("CURRENT_NOT_COMPLETED");
        }

        CollectionTask baseline = findComparableBaseline(current);
        if (baseline == null) {
            return RunChangeSummary.unavailable("NO_BASELINE");
        }

        List<DatasetRecord> currentRecords = records.findByTaskIdOrderByQualityScoreDesc(current.getId());
        List<DatasetRecord> baselineRecords = records.findByTaskIdOrderByQualityScoreDesc(baseline.getId());
        List<SourceCollectionAttempt> currentAttempts = sourceAttempts.forTask(current.getId());
        List<SourceCollectionAttempt> baselineAttempts = sourceAttempts.forTask(baseline.getId());

        Set<String> expectedSourceKeys = new LinkedHashSet<>();
        expectedSourceKeys.addAll(normalizedSourceSet(current.getSourceUrls()));
        expectedSourceKeys.addAll(normalizedSourceSet(baseline.getSourceUrls()));
        currentAttempts.stream().map(SourceCollectionAttempt::getSourceUrl).filter(TaskService::hasText).map(String::trim).forEach(expectedSourceKeys::add);
        baselineAttempts.stream().map(SourceCollectionAttempt::getSourceUrl).filter(TaskService::hasText).map(String::trim).forEach(expectedSourceKeys::add);
        currentRecords.stream().map(TaskService::sourceKey).filter(TaskService::hasText).forEach(expectedSourceKeys::add);
        baselineRecords.stream().map(TaskService::sourceKey).filter(TaskService::hasText).forEach(expectedSourceKeys::add);

        Set<String> currentObserved = observedSourceKeys(currentRecords, currentAttempts, current.isDemoMode());
        Set<String> baselineObserved = observedSourceKeys(baselineRecords, baselineAttempts, baseline.isDemoMode());
        RunChangeAnalyzer.Analysis analysis = RunChangeAnalyzer.analyze(
                expectedSourceKeys,
                currentRecords,
                baselineRecords,
                currentObserved,
                baselineObserved
        );

        String status = analysis.completeObservation() ? "AVAILABLE" : "PARTIAL";
        return new RunChangeSummary(
                status,
                baseline.getId(),
                baseline.getCompletedAt(),
                analysis.expectedSources(),
                analysis.comparedSources(),
                analysis.changedSources(),
                analysis.unchangedSources(),
                analysis.newlyObservedSources(),
                analysis.unobservedCurrentSources(),
                analysis.unhashableSources(),
                analysis.completeObservation()
        );
    }

    private CollectionTask findComparableBaseline(CollectionTask current) {
        int page = 0;
        while (page < 20) {
            Page<CollectionTask> candidates = tasks.findByStatusAndDemoModeAndCreatedAtBeforeOrderByCreatedAtDesc(
                    ai.numen.entity.TaskStatus.COMPLETED,
                    current.isDemoMode(),
                    current.getCreatedAt(),
                    PageRequest.of(page, 50)
            );

            for (CollectionTask candidate : candidates.getContent()) {
                if (sameResearchIntent(current, candidate)) return candidate;
            }
            if (!candidates.hasNext()) return null;
            page++;
        }
        return null;
    }

    private static boolean sameResearchIntent(CollectionTask left, CollectionTask right) {
        if (!normalizePrompt(left.getPrompt()).equals(normalizePrompt(right.getPrompt()))) return false;
        return normalizedSourceSet(left.getSourceUrls()).equals(normalizedSourceSet(right.getSourceUrls()));
    }

    private static String normalizePrompt(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static Set<String> normalizedSourceSet(List<String> urls) {
        if (urls == null || urls.isEmpty()) return Set.of();
        return urls.stream()
                .filter(TaskService::hasText)
                .map(TaskService::canonicalSourceKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<String> observedSourceKeys(List<DatasetRecord> dataset,
                                                  List<SourceCollectionAttempt> attempts,
                                                  boolean demoMode) {
        Set<String> observed = new LinkedHashSet<>();
        if (demoMode) {
            dataset.stream().map(TaskService::sourceKey).filter(TaskService::hasText).forEach(observed::add);
            return observed;
        }

        Set<String> attemptedUrls = attempts.stream()
                .map(SourceCollectionAttempt::getSourceUrl)
                .filter(TaskService::hasText)
                .map(String::trim)
                .collect(Collectors.toSet());

        attempts.stream()
                .filter(attempt -> attempt.getStatus() == SourceCollectionStatus.SUCCEEDED)
                .map(SourceCollectionAttempt::getSourceUrl)
                .filter(TaskService::hasText)
                .map(String::trim)
                .forEach(observed::add);

        dataset.stream()
                .map(TaskService::sourceKey)
                .filter(TaskService::hasText)
                .filter(source -> !attemptedUrls.contains(source))
                .forEach(observed::add);
        return observed;
    }

    private static SourceSummary sourceSummary(List<DatasetRecord> group,
                                               SourceCollectionAttempt attempt,
                                               boolean configured) {
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
        String status = demo ? "DEMO" : attempt != null ? attempt.getStatus().name() : "SUCCEEDED";
        Instant lastSuccessfulObservationAt = latest;
        if (!demo
                && attempt != null
                && attempt.getStatus() == SourceCollectionStatus.SUCCEEDED
                && attempt.getAttemptedAt() != null
                && (lastSuccessfulObservationAt == null || attempt.getAttemptedAt().isAfter(lastSuccessfulObservationAt))) {
            lastSuccessfulObservationAt = attempt.getAttemptedAt();
        }

        return new SourceSummary(
                hasText(first.getSourceName()) ? first.getSourceName().trim() : sourceKey(first),
                first.getSourceUrl(),
                first.getSourceType(),
                group.size(),
                evidence,
                latest,
                lastSuccessfulObservationAt,
                status,
                attempt == null ? null : attempt.getErrorCode(),
                attempt == null ? null : attempt.getErrorMessage(),
                attempt == null ? latest : attempt.getAttemptedAt(),
                connectorId(attempt, first.getSourceType()),
                capabilities(attempt, first.getSourceType()),
                demo,
                configured
        );
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
            if (value == null || value.trim().isEmpty()) continue;
            String canonical = SourceUrlIdentity.normalizeForPersistence(value);
            if (!normalized.contains(canonical)) normalized.add(canonical);
        }
        return List.copyOf(normalized);
    }

    private static String sourceCoverageState(CollectionTask task,
                                              int totalRecords,
                                              int demoRecords,
                                              int configuredSources,
                                              int successfulSources,
                                              int failedSources,
                                              int notAttemptedSources) {
        if (task.isDemoMode()
                || (configuredSources == 0 && totalRecords > 0 && demoRecords == totalRecords)) {
            return "DEMO";
        }
        if (configuredSources == 0) return "NOT_APPLICABLE";
        if (successfulSources == configuredSources && failedSources == 0 && notAttemptedSources == 0) {
            return "COMPLETE";
        }
        if (successfulSources > 0) return "PARTIAL";
        return "NONE";
    }

    private static String connectorId(SourceCollectionAttempt attempt, String sourceType) {
        if (attempt != null && hasText(attempt.getConnectorId())) return attempt.getConnectorId().trim();
        if ("DEMO".equalsIgnoreCase(sourceType)) return "demo-catalog";
        if ("WEB".equalsIgnoreCase(sourceType)
                || "HTTP".equalsIgnoreCase(sourceType)
                || "HTTPS".equalsIgnoreCase(sourceType)) {
            return "http-page";
        }
        return "unknown";
    }

    private static List<String> capabilities(SourceCollectionAttempt attempt, String sourceType) {
        if (attempt != null && !attempt.getCapabilities().isEmpty()) return attempt.getCapabilities();
        if ("DEMO".equalsIgnoreCase(sourceType)) {
            return SourceCapability.apiNames(Set.of(
                    SourceCapability.DEMO_DATA,
                    SourceCapability.EVIDENCE_CAPTURE,
                    SourceCapability.DETERMINISTIC
            ));
        }
        if ("WEB".equalsIgnoreCase(sourceType)
                || "HTTP".equalsIgnoreCase(sourceType)
                || "HTTPS".equalsIgnoreCase(sourceType)) {
            return SourceCapability.apiNames(Set.of(
                    SourceCapability.READ_RECORDS,
                    SourceCapability.EVIDENCE_CAPTURE,
                    SourceCapability.RETRY_SAFE_READ,
                    SourceCapability.PARTIAL_FAILURE,
                    SourceCapability.PUBLIC_HTTP
            ));
        }
        return List.of();
    }

    private static String sortableProperty(String value) {
        if (value == null) return "qualityScore";
        return switch (value) {
            case "title" -> "title";
            case "organization" -> "organization";
            case "location" -> "location";
            case "sourceName" -> "sourceName";
            case "collectedAt" -> "collectedAt";
            case "qualityScore" -> "qualityScore";
            default -> "qualityScore";
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String sourceNameFromUrl(String value) {
        try {
            String host = URI.create(value).getHost();
            return host == null ? value : host;
        } catch (IllegalArgumentException ex) {
            return value;
        }
    }

    private static String sourceKey(DatasetRecord record) {
        if (hasText(record.getSourceUrl())) return canonicalSourceKey(record.getSourceUrl());
        if (hasText(record.getSourceName())) return record.getSourceName().trim();
        if (hasText(record.getSourceType())) return record.getSourceType().trim();
        return record.getId().toString();
    }

    private static String canonicalSourceKey(String value) {
        if (!hasText(value)) return "";
        try {
            return SourceUrlIdentity.normalizeForPersistence(value);
        } catch (IllegalArgumentException ex) {
            return value.trim();
        }
    }

    public record TaskCreation(CollectionTask task, boolean replayed) { }

    public record DatasetPage(
            List<DatasetRecord> records,
            long totalMatched,
            int page,
            int pageSize,
            int totalPages) { }

    public record ValueCount(String value, long count) { }

    public record DatasetSummary(
            int totalRecords,
            int uniqueOrganizations,
            int uniqueLocations,
            int uniqueSources,
            int configuredSources,
            int attemptedSources,
            int successfulSources,
            int failedSources,
            int unavailableSources,
            int unauthorizedSources,
            int rejectedSources,
            int rateLimitedSources,
            int notAttemptedSources,
            String sourceCoverageState,
            int evidenceLinkedRecords,
            int evidenceHashedRecords,
            int matchingEvidenceSnapshotGroups,
            int demoRecords,
            Instant latestCollectedAt,
            List<ValueCount> topLocations) { }

    public record RunChangeSummary(
            String status,
            UUID baselineTaskId,
            Instant baselineCompletedAt,
            int expectedSources,
            int comparedSources,
            int changedSources,
            int unchangedSources,
            int newlyObservedSources,
            int unobservedCurrentSources,
            int unhashableSources,
            boolean completeObservation) {
        private static RunChangeSummary unavailable(String status) {
            return new RunChangeSummary(status, null, null, 0, 0, 0, 0, 0, 0, 0, false);
        }
    }

    public record SourceSummary(
            String name,
            String url,
            String type,
            int records,
            int evidence,
            Instant latestCollectedAt,
            Instant lastSuccessfulObservationAt,
            String collectionStatus,
            String errorCode,
            String errorMessage,
            Instant lastAttemptedAt,
            String connectorId,
            List<String> capabilities,
            boolean demo,
            boolean configured) { }
}
