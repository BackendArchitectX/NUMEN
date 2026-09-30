package ai.numen.dto;

import java.time.Instant;

public record HealthResponse(String status, String service, String version, Instant time) {
    public static HealthResponse of(String status) {
        return new HealthResponse(status, "NUMEN", "0.1.0", Instant.now());
    }
}
