package ai.numen.connector;

import ai.numen.domain.WorkflowPlan;

import java.util.List;
import java.util.UUID;

public record SourceCollectionRequest(
        UUID taskId,
        String prompt,
        WorkflowPlan plan,
        List<String> urls,
        boolean demoMode
) {
    public SourceCollectionRequest {
        urls = List.copyOf(urls);
    }
}
