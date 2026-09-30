package ai.numen.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UrlSafetyGuardTest {
    private final UrlSafetyGuard guard = new UrlSafetyGuard();

    @Test
    void blocksLoopbackAndNonHttpSchemes() {
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("http://127.0.0.1:8080/admin")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("file:///etc/passwd")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsPublicHttpsUrl() {
        assertThat(guard.requirePublicHttpUrl("https://example.com/data").getHost()).isEqualTo("example.com");
    }
}
