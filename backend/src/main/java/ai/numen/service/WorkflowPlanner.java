package ai.numen.service;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class WorkflowPlanner {
    public record Plan(String useCase, List<String> fields, List<String> stages, List<String> safeguards) {}

    public Plan plan(String prompt) {
        String p = prompt.toLowerCase(Locale.ROOT);
        String useCase = p.contains("job") || p.contains("hiring") ? "JOB_INTELLIGENCE"
                : p.contains("sponsor") ? "SPONSOR_DISCOVERY"
                : p.contains("lead") || p.contains("sales") ? "LEAD_INTELLIGENCE"
                : p.contains("market") || p.contains("competitor") ? "MARKET_INTELLIGENCE"
                : "GENERAL_RESEARCH";
        return new Plan(
                useCase,
                List.of("title", "organization", "location", "website", "sourceUrl", "excerpt", "qualityScore"),
                List.of("interpret", "source-discovery", "collect", "normalize", "validate", "deduplicate", "publish"),
                List.of("public-http(s)-only", "private-network-block", "source-provenance", "content-size-limit", "sha256-dedup")
        );
    }
}
