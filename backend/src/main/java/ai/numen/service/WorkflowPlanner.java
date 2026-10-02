package ai.numen.service;

import ai.numen.domain.WorkflowPlan;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class WorkflowPlanner {
    public WorkflowPlan plan(String prompt) {
        String normalized = prompt.toLowerCase(Locale.ROOT);
        String useCase = matchesAny(normalized, "job", "jobs", "hiring", "career", "careers", "vacancy", "vacancies", "opening", "openings")
                ? "JOB_INTELLIGENCE"
                : matchesAny(normalized, "sponsor", "sponsors", "sponsorship")
                ? "SPONSOR_DISCOVERY"
                : matchesAny(normalized, "lead", "leads", "sales", "prospect", "prospects")
                ? "LEAD_INTELLIGENCE"
                : matchesAny(normalized, "market", "markets", "competitor", "competitors", "competitive")
                ? "MARKET_INTELLIGENCE"
                : "GENERAL_RESEARCH";

        List<String> fields = "GENERAL_RESEARCH".equals(useCase)
                ? List.of("title", "sourceUrl", "excerpt", "qualityScore")
                : List.of("title", "organization", "location", "website", "sourceUrl", "excerpt", "qualityScore");

        return new WorkflowPlan(
                useCase,
                fields,
                List.of("interpret", "source-scope-validation", "collect", "normalize", "validate", "deduplicate", "publish"),
                List.of(
                        "public-http(s)-only",
                        "private-network-block",
                        "source-capability-contract",
                        "partial-source-truth",
                        "source-provenance",
                        "content-size-limit",
                        "sha256-dedup"
                )
        );
    }
    private static boolean matchesAny(String value, String... terms) {
        for (String term : terms) {
            if (Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(term) + "(?![\\p{L}\\p{N}])")
                    .matcher(value)
                    .find()) return true;
        }
        return false;
    }
}
