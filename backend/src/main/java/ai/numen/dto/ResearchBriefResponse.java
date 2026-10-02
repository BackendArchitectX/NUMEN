package ai.numen.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ResearchBriefResponse(
        UUID taskId,
        String question,
        String status,
        int findingCount,
        int contributingSources,
        List<Section> sections,
        String projectionVersion,
        int disagreementCount,
        List<Disagreement> disagreements) {

    public record Section(String key, String label, List<Finding> findings) { }

    public record Finding(String text, int supportingSources, List<Citation> citations) { }

    public record Disagreement(
            String sectionKey,
            String sectionLabel,
            String reason,
            Finding left,
            Finding right) { }

    public record Citation(
            UUID recordId,
            String title,
            String sourceName,
            String sourceUrl,
            String sourceType,
            String evidenceHash,
            String evidenceHashAlgorithm,
            Instant collectedAt) { }
}
