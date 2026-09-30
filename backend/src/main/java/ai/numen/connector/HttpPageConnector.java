package ai.numen.connector;

import ai.numen.config.NumenProperties;
import ai.numen.entity.DatasetRecord;
import ai.numen.exception.UserVisibleWorkflowException;
import ai.numen.security.UrlSafetyGuard;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
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
import java.util.concurrent.ThreadLocalRandom;

@Component
public class HttpPageConnector implements SourceConnector {
    private static final Logger log = LoggerFactory.getLogger(HttpPageConnector.class);

    private final UrlSafetyGuard safetyGuard;
    private final NumenProperties properties;

    public HttpPageConnector(UrlSafetyGuard safetyGuard, NumenProperties properties) {
        this.safetyGuard = safetyGuard;
        this.properties = properties;
    }

    @Override
    public String id() {
        return "http-page";
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
            try {
                records.add(fetchWithRetry(request.taskId(), raw));
            } catch (Exception ex) {
                log.warn("source_collection_failed taskId={} sourceHost={} error={}",
                        request.taskId(), safeHost(raw), ex.getClass().getSimpleName());
            }
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
                .userAgent("NUMEN/1.0 (+data-intelligence-demo)")
                .timeout(7_000)
                .maxBodySize(1_500_000)
                .followRedirects(false)
                .get();

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
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
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
