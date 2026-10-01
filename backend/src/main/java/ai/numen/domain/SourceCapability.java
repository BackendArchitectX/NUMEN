package ai.numen.domain;

import java.util.Collection;
import java.util.List;

public enum SourceCapability {
    READ_RECORDS("read-records"),
    EVIDENCE_CAPTURE("evidence-capture"),
    RETRY_SAFE_READ("retry-safe-read"),
    PARTIAL_FAILURE("partial-failure"),
    PUBLIC_HTTP("public-http"),
    DEMO_DATA("demo-data"),
    DETERMINISTIC("deterministic");

    private final String apiName;

    SourceCapability(String apiName) {
        this.apiName = apiName;
    }

    public String apiName() {
        return apiName;
    }

    public static List<String> apiNames(Collection<SourceCapability> capabilities) {
        if (capabilities == null || capabilities.isEmpty()) return List.of();
        return capabilities.stream()
                .map(SourceCapability::apiName)
                .sorted()
                .toList();
    }
}
