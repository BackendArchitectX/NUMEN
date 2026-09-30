package ai.numen.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class WorkflowPlanner {
    public record Plan(String useCase, List<String> fields, List<String> stages, List<String> safeguards) { }

    public Plan plan(String prompt) {
        String normalized = prompt.toLowerCase(Locale.ROOT);
        String useCase = normalized.contains("job") || normalized.contains("hiring")
                ? "JOB_INTELLIGENCE"
                : normalized.contains("sponsor")
                ? "SPONSOR_DISCOVERY"
                : normalized.contains("lead") || normalized.contains("sales")
                ? "LEAD_INTELLIGENCE"
                : normalized.contains("market") || normalized.contains("competitor")
                ? "MARKET_INTELLIGENCE"
                : "GENERAL_RESEARCH";

        return new Plan(
                useCase,
                List.of("title", "organization", "location", "website", "sourceUrl", "excerpt", "qualityScore"),
                List.of("interpret", "source-discovery", "collect", "normalize", "validate", "deduplicate", "publish"),
                List.of("public-http(s)-only", "private-network-block", "source-provenance", "content-size-limit", "sha256-dedup")
        );
    }
}
