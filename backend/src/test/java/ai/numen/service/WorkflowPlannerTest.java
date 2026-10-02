package ai.numen.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class WorkflowPlannerTest {
    private final WorkflowPlanner planner = new WorkflowPlanner();

    @Test
    void recognizesJobIntelligenceIntent() {
        var plan = planner.plan("Find backend job openings in India");
        assertThat(plan.useCase()).isEqualTo("JOB_INTELLIGENCE");
        assertThat(plan.stages()).contains("source-scope-validation", "collect", "validate", "deduplicate");
        assertThat(plan.safeguards()).contains(
                "private-network-block",
                "source-capability-contract",
                "partial-source-truth",
                "source-provenance"
        );
    }

    @Test
    void fallsBackToGeneralResearch() {
        var plan = planner.plan("Research public information about renewable energy");
        assertThat(plan.useCase()).isEqualTo("GENERAL_RESEARCH");
        assertThat(plan.fields()).containsExactly("title", "sourceUrl", "excerpt", "qualityScore");
    }

    @Test
    void intentClassificationUsesWholeTermsInsteadOfSubstringAccidents() {
        assertThat(planner.plan("Research jobless-rate methodology").useCase()).isEqualTo("GENERAL_RESEARCH");
        assertThat(planner.plan("Explain marketplace architecture").useCase()).isEqualTo("GENERAL_RESEARCH");
        assertThat(planner.plan("Summarize leadership principles").useCase()).isEqualTo("GENERAL_RESEARCH");
    }
}
