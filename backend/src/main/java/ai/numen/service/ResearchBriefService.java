package ai.numen.service;

import ai.numen.dto.ResearchBriefResponse;
import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.TaskStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResearchBriefService {
    private static final Pattern FACET = Pattern.compile("(?i)(Purpose|Key capabilities|Common use cases):\\s*");
    private static final List<String> SECTION_ORDER = List.of("purpose", "capabilities", "use-cases", "relevant-evidence");
    private static final Map<String, String> SECTION_LABELS = Map.of(
            "purpose", "Purpose",
            "capabilities", "Key capabilities",
            "use-cases", "Common use cases",
            "relevant-evidence", "Relevant evidence"
    );

    private final TaskService tasks;
    private final ObjectMapper objectMapper;

    public ResearchBriefService(TaskService tasks, ObjectMapper objectMapper) {
        this.tasks = tasks;
        this.objectMapper = objectMapper;
    }

    public ResearchBriefResponse brief(UUID id) {
        CollectionTask task = tasks.get(id);
        if (task.getStatus() != TaskStatus.COMPLETED) {
            return new ResearchBriefResponse(task.getId(), task.getPrompt(), "CURRENT_NOT_COMPLETED", 0, 0, List.of());
        }
        if (!isGeneralResearch(task.getPlanJson())) {
            return new ResearchBriefResponse(task.getId(), task.getPrompt(), "NOT_APPLICABLE", 0, 0, List.of());
        }
        return project(task.getId(), task.getPrompt(), tasks.allRecords(id));
    }

    boolean isGeneralResearch(String planJson) {
        if (planJson == null || planJson.isBlank()) return false;
        try {
            return "GENERAL_RESEARCH".equals(objectMapper.readTree(planJson).path("useCase").asText());
        } catch (Exception ignored) {
            return false;
        }
    }

    static ResearchBriefResponse project(UUID taskId, String question, List<DatasetRecord> records) {
        Map<String, List<ClaimCandidate>> candidates = new LinkedHashMap<>();
        for (String key : SECTION_ORDER) candidates.put(key, new ArrayList<>());

        Set<String> contributingSources = new LinkedHashSet<>();
        for (DatasetRecord record : records == null ? List.<DatasetRecord>of() : records) {
            if (record == null) continue;
            String sourceKey = sourceKey(record);
            if (!sourceKey.isBlank()) contributingSources.add(sourceKey);

            for (Map.Entry<String, String> claim : claims(record.getExcerpt()).entrySet()) {
                String claimText = normalizeText(claim.getValue());
                if (claimText.isBlank() || !candidates.containsKey(claim.getKey())) continue;
                candidates.get(claim.getKey()).add(new ClaimCandidate(
                        claimText,
                        normalizeText(record.getTitle()),
                        sourceKey,
                        citation(record)
                ));
            }
        }

        List<ResearchBriefResponse.Section> projected = new ArrayList<>();
        int findingCount = 0;
        for (String key : SECTION_ORDER) {
            List<ClaimCandidate> sectionCandidates = candidates.get(key);
            sectionCandidates.sort(Comparator
                    .comparing((ClaimCandidate candidate) -> ClaimEquivalence.canonicalSurface(candidate.text()))
                    .thenComparing(ClaimCandidate::sourceKey)
                    .thenComparing(candidate -> candidate.citation().recordId().toString()));

            List<FindingAccumulator> groups = new ArrayList<>();
            for (ClaimCandidate candidate : sectionCandidates) {
                FindingAccumulator compatible = groups.stream()
                        .filter(group -> group.canAccept(candidate))
                        .findFirst()
                        .orElse(null);
                if (compatible == null) {
                    compatible = new FindingAccumulator(candidate);
                    groups.add(compatible);
                } else {
                    compatible.add(candidate);
                }
            }

            List<ResearchBriefResponse.Finding> findings = groups.stream()
                    .map(FindingAccumulator::toResponse)
                    .toList();
            if (findings.isEmpty()) continue;
            findingCount += findings.size();
            projected.add(new ResearchBriefResponse.Section(key, SECTION_LABELS.get(key), findings));
        }

        return new ResearchBriefResponse(
                taskId,
                question == null ? "" : question,
                findingCount == 0 ? "EMPTY" : "AVAILABLE",
                findingCount,
                contributingSources.size(),
                List.copyOf(projected)
        );
    }

    static Map<String, String> claims(String excerpt) {
        String text = normalizeText(excerpt);
        if (text.isBlank()) return Map.of();

        Matcher matcher = FACET.matcher(text);
        List<FacetMatch> matches = new ArrayList<>();
        while (matcher.find()) {
            matches.add(new FacetMatch(sectionKey(matcher.group(1)), matcher.end(), matcher.start()));
        }
        if (matches.isEmpty()) return Map.of("relevant-evidence", text);

        Map<String, String> projected = new LinkedHashMap<>();
        for (int i = 0; i < matches.size(); i++) {
            FacetMatch current = matches.get(i);
            int end = i + 1 < matches.size() ? matches.get(i + 1).markerStart() : text.length();
            if (end <= current.contentStart()) continue;
            String claim = normalizeText(text.substring(current.contentStart(), end));
            if (!claim.isBlank()) projected.putIfAbsent(current.key(), claim);
        }
        return projected.isEmpty() ? Map.of("relevant-evidence", text) : projected;
    }

    private static String sectionKey(String label) {
        String normalized = label.toLowerCase(Locale.ROOT);
        if (normalized.startsWith("purpose")) return "purpose";
        if (normalized.startsWith("key capabilities")) return "capabilities";
        if (normalized.startsWith("common use cases")) return "use-cases";
        return "relevant-evidence";
    }

    private static ResearchBriefResponse.Citation citation(DatasetRecord record) {
        return new ResearchBriefResponse.Citation(
                record.getId(),
                normalizeText(record.getTitle()),
                normalizeText(record.getSourceName()),
                normalizeText(record.getSourceUrl()),
                normalizeText(record.getSourceType()),
                normalizeText(record.getEvidenceHash()),
                normalizeText(record.getEvidenceHashAlgorithm()),
                record.getCollectedAt()
        );
    }

    private static String sourceKey(DatasetRecord record) {
        String url = normalizeText(record.getSourceUrl());
        return !url.isBlank() ? url : normalizeText(record.getSourceName());
    }

    private static String normalizeText(String value) {
        return value == null ? "" : value
                .replaceAll("[\\u202A-\\u202E\\u2066-\\u2069]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private record FacetMatch(String key, int contentStart, int markerStart) { }

    private record ClaimCandidate(
            String text,
            String title,
            String sourceKey,
            ResearchBriefResponse.Citation citation) { }

    private static final class FindingAccumulator {
        private String representativeText;
        private final List<ClaimCandidate> variants = new ArrayList<>();
        private final LinkedHashMap<UUID, ResearchBriefResponse.Citation> citations = new LinkedHashMap<>();

        private FindingAccumulator(ClaimCandidate initial) {
            this.representativeText = initial.text();
            add(initial);
        }

        private boolean canAccept(ClaimCandidate candidate) {
            return variants.stream().allMatch(existing -> ClaimEquivalence.equivalent(
                    existing.text(),
                    existing.title(),
                    candidate.text(),
                    candidate.title()
            ));
        }

        private void add(ClaimCandidate candidate) {
            representativeText = ClaimEquivalence.preferredRepresentative(representativeText, candidate.text());
            variants.add(candidate);
            citations.putIfAbsent(candidate.citation().recordId(), candidate.citation());
        }

        private ResearchBriefResponse.Finding toResponse() {
            List<ResearchBriefResponse.Citation> citationList = List.copyOf(citations.values());
            long supportingSources = citationList.stream()
                    .map(citation -> citation.sourceUrl() == null || citation.sourceUrl().isBlank()
                            ? citation.sourceName()
                            : citation.sourceUrl())
                    .filter(value -> value != null && !value.isBlank())
                    .distinct()
                    .count();
            return new ResearchBriefResponse.Finding(
                    representativeText,
                    Math.toIntExact(supportingSources),
                    citationList
            );
        }
    }
}
