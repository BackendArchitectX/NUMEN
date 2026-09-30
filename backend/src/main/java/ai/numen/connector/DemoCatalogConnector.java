package ai.numen.connector;

import ai.numen.entity.DatasetRecord;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Component
public class DemoCatalogConnector implements SourceConnector {
    @Override
    public String id() {
        return "demo-catalog";
    }

    @Override
    public boolean supports(SourceCollectionRequest request) {
        return request.urls().isEmpty();
    }

    @Override
    public List<DatasetRecord> collect(SourceCollectionRequest request) {
        String[][] rows = switch (request.plan().useCase()) {
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
                    + request.plan().useCase().replace('_', ' ').toLowerCase(Locale.ROOT)
                    + " workflow. Prompt context: " + compact(request.prompt(), 120);
            double quality = 86 + (i % 4) * 3;
            String source = "urn:numen:demo:" + request.plan().useCase().toLowerCase(Locale.ROOT) + ":" + (i + 1);
            records.add(new DatasetRecord(
                    request.taskId(),
                    row[0],
                    row[1],
                    row[2],
                    row[3],
                    source,
                    "NUMEN Demo Catalog",
                    "DEMO",
                    excerpt,
                    quality,
                    sha256(row[0] + "|" + row[1] + "|" + row[2])
            ));
        }
        return records;
    }

    private static String compact(String value, int max) {
        String cleaned = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        return cleaned.length() <= max ? cleaned : cleaned.substring(0, max) + "…";
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
