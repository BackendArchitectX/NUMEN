package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.entity.DatasetRecord;
import ai.numen.security.UrlSafetyGuard;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CollectionEngine {
    private static final Logger log = LoggerFactory.getLogger(CollectionEngine.class);
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s,;]+", Pattern.CASE_INSENSITIVE);
    private final UrlSafetyGuard safetyGuard;
    private final NumenProperties properties;

    public CollectionEngine(UrlSafetyGuard safetyGuard, NumenProperties properties) {
        this.safetyGuard = safetyGuard;
        this.properties = properties;
    }

    public List<DatasetRecord> collect(UUID taskId, String prompt, WorkflowPlanner.Plan plan) {
        List<String> urls = extractUrls(prompt).stream().limit(properties.getMaxFetchUrls()).toList();
        if (urls.isEmpty()) return deduplicate(demoRecords(taskId, plan, prompt));
        if (!properties.isHttpFetchEnabled()) throw new IllegalStateException("Web collection is disabled for this deployment");

        List<DatasetRecord> records = new ArrayList<>();
        for (String raw : urls) {
            try {
                records.add(fetch(taskId, raw));
            } catch (Exception ex) {
                log.warn("source_collection_failed taskId={} sourceHost={} error={}",
                        taskId, safeHost(raw), ex.getClass().getSimpleName());
                // Multi-source workflows continue when one permitted source is unavailable.
            }
        }
        if (records.isEmpty()) {
            throw new IllegalStateException("No supplied source could be collected safely. Verify that each URL is public, reachable and permits direct HTTP access.");
        }
        return deduplicate(records);
    }

    private DatasetRecord fetch(UUID taskId, String raw) throws Exception {
        URI uri = safetyGuard.requirePublicHttpUrl(raw);
        Document document = Jsoup.connect(uri.toString())
                .userAgent("NUMEN/1.0 (+data-intelligence-demo)")
                .timeout(7_000)
                .maxBodySize(1_500_000)
                .followRedirects(false)
                .get();

        String title = clean(document.title());
        if (title.isBlank()) title = clean(document.selectFirst("h1") == null ? uri.getHost() : document.selectFirst("h1").text());
        String excerpt = clean(document.select("meta[name=description]").attr("content"));
        if (excerpt.isBlank()) excerpt = clean(document.body() == null ? "" : document.body().text());
        if (excerpt.length() > 420) excerpt = excerpt.substring(0, 420) + "…";

        double quality = score(title, uri.getHost(), excerpt, uri.toString());
        return new DatasetRecord(taskId, title, uri.getHost(), "Web", uri.toString(), uri.toString(), uri.getHost(),
                "WEB", excerpt, quality, sha256(title + "|" + uri));
    }

    private static String safeHost(String raw) {
        try {
            String host = URI.create(raw).getHost();
            return host == null ? "invalid" : host;
        } catch (IllegalArgumentException ex) {
            return "invalid";
        }
    }

    private List<String> extractUrls(String prompt) {
        Matcher matcher = URL_PATTERN.matcher(prompt);
        List<String> urls = new ArrayList<>();
        while (matcher.find()) urls.add(matcher.group().replaceAll("[.)]+$", ""));
        return urls;
    }

    private List<DatasetRecord> demoRecords(UUID taskId, WorkflowPlanner.Plan plan, String prompt) {
        String[][] rows = switch (plan.useCase()) {
            case "JOB_INTELLIGENCE" -> new String[][]{
                    {"Senior Backend Engineer", "Northstar Systems", "Bengaluru", "https://example.com/jobs/backend"},
                    {"Java Platform Engineer", "BluePeak Labs", "Pune", "https://example.org/careers/java"},
                    {"Distributed Systems Engineer", "OrbitWorks", "Remote", "https://example.net/jobs/distributed"},
                    {"Software Engineer II", "Riverstone Tech", "Hyderabad", "https://example.com/jobs/swe2"},
                    {"Backend Engineer", "QuantaGrid", "Remote", "https://example.org/jobs/backend-engineer"},
                    {"Platform Software Engineer", "Aster Cloud", "Bengaluru", "https://example.net/careers/platform"}
            };
            case "SPONSOR_DISCOVERY" -> new String[][]{
                    {"Technology Partner", "Nova Ventures", "India", "https://example.com/partners/nova"},
                    {"Innovation Sponsor", "Vertex Labs", "APAC", "https://example.org/sponsors/vertex"},
                    {"Developer Ecosystem Partner", "CloudArc", "Global", "https://example.net/ecosystem"}
            };
            case "LEAD_INTELLIGENCE" -> new String[][]{
                    {"Engineering Operations", "Acme FinTech", "Mumbai", "https://example.com/acme"},
                    {"Platform Modernization", "Nimbus Retail", "Bengaluru", "https://example.org/nimbus"},
                    {"Data Infrastructure", "Crest Logistics", "Pune", "https://example.net/crest"}
            };
            default -> new String[][]{
                    {"Research Signal", "Atlas Research", "Global", "https://example.com/research/atlas"},
                    {"Market Signal", "Vector Intelligence", "APAC", "https://example.org/insights/vector"},
                    {"Opportunity Signal", "SignalWorks", "India", "https://example.net/opportunities"}
            };
        };

        List<DatasetRecord> records = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            String[] row = rows[i];
            String excerpt = "Offline demo record generated for the interpreted "
                    + plan.useCase().replace('_', ' ').toLowerCase(Locale.ROOT)
                    + " workflow. Prompt context: " + compact(prompt, 120);
            double quality = 86 + (i % 4) * 3;
            String source = "urn:numen:demo:" + plan.useCase().toLowerCase(Locale.ROOT) + ":" + (i + 1);
            records.add(new DatasetRecord(taskId, row[0], row[1], row[2], row[3], source,
                    "NUMEN Demo Catalog", "DEMO", excerpt, quality,
                    sha256(row[0] + "|" + row[1] + "|" + row[2])));
        }
        return records;
    }

    private List<DatasetRecord> deduplicate(List<DatasetRecord> records) {
        Map<String, DatasetRecord> unique = new LinkedHashMap<>();
        for (DatasetRecord record : records) unique.putIfAbsent(record.getFingerprint(), record);
        return new ArrayList<>(unique.values());
    }

    private static double score(String title, String organization, String excerpt, String url) {
        int score = 55;
        if (!title.isBlank()) score += 12;
        if (!organization.isBlank()) score += 8;
        if (excerpt.length() > 80) score += 10;
        if (url.startsWith("https://")) score += 10;
        return Math.min(100, score);
    }

    private static String clean(String value) { return value == null ? "" : value.replaceAll("\\s+", " ").trim(); }
    private static String compact(String value, int max) {
        String cleaned = clean(value);
        return cleaned.length() <= max ? cleaned : cleaned.substring(0, max) + "…";
    }
    private static String sha256(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
