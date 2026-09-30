package ai.numen.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {
    @Test
    void keepsSafeClientCorrelationId() {
        assertThat(CorrelationIdFilter.resolveCorrelationId("numen-demo_123")).isEqualTo("numen-demo_123");
    }

    @Test
    void replacesUnsafeCorrelationId() {
        String generated = CorrelationIdFilter.resolveCorrelationId("bad header with spaces");
        assertThat(generated).matches("[0-9a-f-]{36}");
    }

    @Test
    void createsCorrelationIdWhenMissing() {
        assertThat(CorrelationIdFilter.resolveCorrelationId(null)).matches("[0-9a-f-]{36}");
    }
}
