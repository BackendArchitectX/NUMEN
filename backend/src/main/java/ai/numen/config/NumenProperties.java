package ai.numen.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Validated
@ConfigurationProperties(prefix = "numen")
public class NumenProperties {
    private boolean httpFetchEnabled = true;

    @Min(1)
    @Max(32)
    private int maxFetchUrls = 8;

    @Min(1)
    @Max(4)
    private int maxFetchAttempts = 2;

    @Min(50)
    @Max(2000)
    private int retryBaseDelayMs = 250;

    @NotEmpty
    private List<@NotBlank String> allowedOrigins = new ArrayList<>(List.of(
            "http://localhost:5173",
            "http://127.0.0.1:5173"
    ));

    public boolean isHttpFetchEnabled() { return httpFetchEnabled; }
    public void setHttpFetchEnabled(boolean httpFetchEnabled) { this.httpFetchEnabled = httpFetchEnabled; }
    public int getMaxFetchUrls() { return maxFetchUrls; }
    public void setMaxFetchUrls(int maxFetchUrls) { this.maxFetchUrls = maxFetchUrls; }
    public int getMaxFetchAttempts() { return maxFetchAttempts; }
    public void setMaxFetchAttempts(int maxFetchAttempts) { this.maxFetchAttempts = maxFetchAttempts; }
    public int getRetryBaseDelayMs() { return retryBaseDelayMs; }
    public void setRetryBaseDelayMs(int retryBaseDelayMs) { this.retryBaseDelayMs = retryBaseDelayMs; }
    public List<String> getAllowedOrigins() { return allowedOrigins; }
    public void setAllowedOrigins(List<String> allowedOrigins) { this.allowedOrigins = allowedOrigins; }
}
