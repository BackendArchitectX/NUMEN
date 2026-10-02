package ai.numen.security;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UrlSafetyGuardTest {
    private final UrlSafetyGuard guard = new UrlSafetyGuard();

    @Test
    void blocksLoopbackNonHttpCredentialsAndNonStandardPorts() {
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("http://127.0.0.1:8080/admin")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("file:///etc/passwd")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("https://user:pass@example.com/data"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsafe or invalid source URL")
                .hasMessageNotContaining("user:pass");
        assertThatThrownBy(() -> guard.requirePublicHttpUrl("https://example.com:8443/data")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void blocksReservedAddressRanges() throws Exception {
        assertThat(UrlSafetyGuard.isNonPublic(InetAddress.getByName("100.64.0.1"))).isTrue();
        assertThat(UrlSafetyGuard.isNonPublic(InetAddress.getByName("198.18.0.1"))).isTrue();
        assertThat(UrlSafetyGuard.isNonPublic(InetAddress.getByName("2001:db8::1"))).isTrue();
        assertThat(UrlSafetyGuard.isNonPublic(InetAddress.getByName("fc00::1"))).isTrue();
    }

    @Test
    void acceptsPublicHttpsUrl() {
        assertThat(guard.requirePublicHttpUrl("https://example.com/data").getHost()).isEqualTo("example.com");
    }
}
