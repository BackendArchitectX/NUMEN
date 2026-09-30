package ai.numen.domain;

import java.util.List;

public record WorkflowPlan(
        String useCase,
        List<String> fields,
        List<String> stages,
        List<String> safeguards
) { }
