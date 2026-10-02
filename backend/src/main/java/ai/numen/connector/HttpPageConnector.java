package ai.numen.connector;

import ai.numen.config.NumenProperties;
import ai.numen.domain.SourceCapability;
import ai.numen.entity.DatasetRecord;
import ai.numen.entity.SourceCollectionStatus;
import ai.numen.exception.UserVisibleWorkflowException;
import ai.numen.security.UrlSafetyGuard;
import ai.numen.service.SourceCollectionAttemptService;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.UnsupportedMimeTypeException;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class HttpPageConnector implements SourceConnector {
    private static final Logger log = LoggerFactory.getLogger(HttpPageConnector.class);

    private final UrlSafetyGuard safetyGuard;
    private final NumenProperties properties;
    private final SourceCollectionAttemptService attempts;

    public HttpPageConnector(UrlSafetyGuard safetyGuard,
                             NumenProperties properties,
                             SourceCollectionAttemptService attempts) {
        this.safetyGuard = safetyGuard;
        this.properties = properties;
        this.attempts = attempts;
    }

    @Override
    public String id() {
        return "http-page";
    }

    @Override
    public Set<SourceCapability> capabilities() {
        return Set.of(
                SourceCapability.READ_RECORDS,
                SourceCapability.EVIDENCE_CAPTURE,
                SourceCapability.RETRY_SAFE_READ,
                SourceCapability.PARTIAL_FAILURE,
                SourceCapability.PUBLIC_HTTP
        );
    }

    @Override
    public boolean supports(SourceCollectionRequest request) {
        return !request.urls().isEmpty();
    }

    @Override
    public List<DatasetRecord> collect(SourceCollectionRequest request) {
        if (!properties.isHttpFetchEnabled()) {
            throw new UserVisibleWorkflowException("Web collection is disabled for this deployment");
        }

        List<DatasetRecord> records = new ArrayList<>();
        for (String raw : request.urls()) {
            DatasetRecord record;
            try {
                record = fetchWithRetry(request.taskId(), raw);
            } catch (Exception ex) {
                attempts.failed(
                        request.taskId(),
                        raw,
                        collectionStatus(ex),
                        errorCode(ex),
                        publicFailureMessage(ex),
                        id(),
                        capabilities()
                );
                log.warn("source_collection_failed taskId={} sourceHost={} status={} error={}",
                        request.taskId(), safeHost(raw), collectionStatus(ex), ex.getClass().getSimpleName());
                continue;
            }

            attempts.succeeded(request.taskId(), raw, id(), capabilities());
            records.add(record);
        }

        if (records.isEmpty()) {
            throw new UserVisibleWorkflowException(
                    "No supplied source could be collected safely. Verify that each URL is public, reachable and permits direct HTTP access.");
        }
        return records;
    }

    private DatasetRecord fetchWithRetry(java.util.UUID taskId, String raw) throws IOException {
        int maxAttempts = properties.getMaxFetchAttempts();

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return fetch(taskId, raw);
            } catch (HttpStatusException ex) {
                if (!isRetryableStatus(ex.getStatusCode()) || attempt == maxAttempts) throw ex;
                log.info("source_collection_retry taskId={} sourceHost={} attempt={} status={}",
                        taskId, safeHost(raw), attempt, ex.getStatusCode());
            } catch (IOException ex) {
                if (attempt == maxAttempts) throw ex;
                log.info("source_collection_retry taskId={} sourceHost={} attempt={} error={}",
                        taskId, safeHost(raw), attempt, ex.getClass().getSimpleName());
            }

            backoff(attempt);
        }

        throw new IOException("Source collection attempts exhausted");
    }

    private DatasetRecord fetch(java.util.UUID taskId, String raw) throws IOException {
        URI uri = safetyGuard.requirePublicHttpUrl(raw);
        Document document = Jsoup.connect(uri.toString())
                .userAgent("NUMEN/1.0 (+public-source-research)")
                .timeout(7_000)
                .maxBodySize(1_500_000)
                .followRedirects(false)
                .get();

        String barrier = accessBarrierReason(document);
        if (barrier != null) {
            throw new SourceAccessBarrierException(barrier);
        }

        String title = clean(document.title());
        if (title.isBlank()) {
            title = clean(document.selectFirst("h1") == null ? uri.getHost() : document.selectFirst("h1").text());
        }

        String excerpt = clean(document.select("meta[name=description]").attr("content"));
        if (excerpt.isBlank()) excerpt = clean(document.body() == null ? "" : document.body().text());
        if (excerpt.length() > 420) excerpt = excerpt.substring(0, 420) + "…";

        double quality = score(title, uri.getHost(), excerpt, uri.toString());
        return new DatasetRecord(
                taskId,
                title,
                uri.getHost(),
                "Web",
                uri.toString(),
                uri.toString(),
                uri.getHost(),
                "WEB",
                excerpt,
                quality,
                sha256(title + "|" + uri)
        );
    }

    static boolean isRetryableStatus(int statusCode) {
        return statusCode == 408 || statusCode == 429 || statusCode >= 500;
    }

    private void backoff(int attempt) throws IOException {
        long base = properties.getRetryBaseDelayMs();
        long exponential = Math.min(5_000L, base * (1L << Math.max(0, attempt - 1)));
        long jitter = ThreadLocalRandom.current().nextLong(Math.max(1L, base));
        try {
            Thread.sleep(exponential + jitter);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IOException("Source retry interrupted", ex);
        }
    }


    static SourceCollectionStatus collectionStatusForHttpStatus(int statusCode) {
        if (statusCode == 401 || statusCode == 403) return SourceCollectionStatus.UNAUTHORIZED;
        if (statusCode == 429) return SourceCollectionStatus.RATE_LIMITED;
        if (statusCode >= 300 && statusCode < 400) return SourceCollectionStatus.REJECTED;
        return SourceCollectionStatus.UNAVAILABLE;
    }

    static String accessBarrierReason(Document document) {
        if (document == null) return "Source returned no parseable document";

        if (!document.select("input[type=password]").isEmpty()) {
            return "Source requires an interactive sign-in";
        }
        if (!document.select("[id*=captcha], [class*=captcha], iframe[src*=captcha], iframe[src*=challenge]").isEmpty()) {
            return "Source presented an automated-access challenge";
        }

        String title = clean(document.title()).toLowerCase(java.util.Locale.ROOT);
        String body = clean(document.body() == null ? "" : document.body().text()).toLowerCase(java.util.Locale.ROOT);
        if (body.isBlank() && title.isBlank()) {
            return "Source returned no usable public text";
        }

        String combined = title + " " + body;
        boolean compactInterstitial = body.length() <= 1_600;
        if (compactInterstitial && (
                combined.contains("verify you are human")
                        || combined.contains("checking your browser")
                        || combined.contains("access denied")
                        || combined.contains("sign in to continue")
                        || combined.contains("log in to continue")
                        || combined.contains("enable javascript and cookies")
                        || combined.contains("attention required")
        )) {
            return "Source returned an access interstitial instead of public evidence";
        }
        return null;
    }

    private static SourceCollectionStatus collectionStatus(Exception ex) {
        if (ex instanceof HttpStatusException http) {
            return collectionStatusForHttpStatus(http.getStatusCode());
        }
        if (ex instanceof SourceAccessBarrierException || ex instanceof UnsupportedMimeTypeException) {
            return SourceCollectionStatus.REJECTED;
        }
        if (ex instanceof IllegalArgumentException) return SourceCollectionStatus.REJECTED;
        if (ex instanceof IOException) return SourceCollectionStatus.UNAVAILABLE;
        return SourceCollectionStatus.FAILED;
    }

    private static String errorCode(Exception ex) {
        if (ex instanceof HttpStatusException http) {
            if (http.getStatusCode() >= 300 && http.getStatusCode() < 400) return "SOURCE_REDIRECT_REJECTED";
            return "HTTP_" + http.getStatusCode();
        }
        if (ex instanceof SourceAccessBarrierException) return "SOURCE_ACCESS_BARRIER";
        if (ex instanceof UnsupportedMimeTypeException) return "UNSUPPORTED_MEDIA_TYPE";
        if (ex instanceof IllegalArgumentException) return "SOURCE_REJECTED";
        if (ex instanceof IOException) return "SOURCE_UNREACHABLE";
        return "SOURCE_COLLECTION_FAILED";
    }

    private static String publicFailureMessage(Exception ex) {
        if (ex instanceof HttpStatusException http) {
            if (http.getStatusCode() == 401 || http.getStatusCode() == 403) {
                return "Source did not permit this collection request";
            }
            if (http.getStatusCode() == 429) {
                return "Source rate limit prevented collection during this run";
            }
            if (http.getStatusCode() >= 300 && http.getStatusCode() < 400) {
                return "Source redirected; redirects are not followed by the public-source safety policy";
            }
            return "Source returned HTTP " + http.getStatusCode();
        }
        if (ex instanceof SourceAccessBarrierException) return "Source presented an access barrier instead of usable public evidence";
        if (ex instanceof UnsupportedMimeTypeException) return "Source content type is not supported by this public-page connector";
        if (ex instanceof IllegalArgumentException) return "Source was rejected by the public-source safety policy";
        if (ex instanceof IOException) return "Source could not be reached after the configured retry policy";
        return "Source could not be collected";
    }

    private static String safeHost(String raw) {
        try {
            String host = URI.create(raw).getHost();
            return host == null ? "invalid" : host;
        } catch (IllegalArgumentException ex) {
            return "invalid";
        }
    }

    private static double score(String title, String organization, String excerpt, String url) {
        int score = 55;
        if (!title.isBlank()) score += 12;
        if (!organization.isBlank()) score += 8;
        if (excerpt.length() > 80) score += 10;
        if (url.startsWith("https://")) score += 10;
        return Math.min(100, score);
    }

    private static String clean(String value) {
        return value == null
                ? ""
                : value.replaceAll("[\\u202A-\\u202E\\u2066-\\u2069]", "")
                        .replaceAll("\\s+", " ")
                        .trim();
    }

    private static final class SourceAccessBarrierException extends IOException {
        private SourceAccessBarrierException(String message) {
            super(message);
        }
    }

    private static String sha256(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
