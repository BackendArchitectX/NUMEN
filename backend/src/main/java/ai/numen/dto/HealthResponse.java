package ai.numen.dto;

import java.time.Instant;

public record HealthResponse(String status, String service, String version, Instant time) {
    public static HealthResponse up() { return new HealthResponse("UP", "NUMEN", "0.1.0", Instant.now()); }
}
