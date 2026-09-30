package ai.numen.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class WorkflowPlannerTest {
    private final WorkflowPlanner planner = new WorkflowPlanner();

    @Test
    void recognizesJobIntelligenceIntent() {
        var plan = planner.plan("Find backend job openings in India");
        assertThat(plan.useCase()).isEqualTo("JOB_INTELLIGENCE");
        assertThat(plan.stages()).contains("collect", "validate", "deduplicate");
        assertThat(plan.safeguards()).contains("private-network-block", "source-provenance");
    }

    @Test
    void fallsBackToGeneralResearch() {
        assertThat(planner.plan("Research public information about renewable energy").useCase()).isEqualTo("GENERAL_RESEARCH");
    }
}
