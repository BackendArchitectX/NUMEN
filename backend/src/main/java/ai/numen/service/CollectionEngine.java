package ai.numen.service;

import ai.numen.config.NumenProperties;
import ai.numen.connector.SourceCollectionRequest;
import ai.numen.connector.SourceConnector;
import ai.numen.domain.WorkflowPlan;
import ai.numen.entity.DatasetRecord;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CollectionEngine {
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s,;]+", Pattern.CASE_INSENSITIVE);

    private final List<SourceConnector> connectors;
    private final NumenProperties properties;

    public CollectionEngine(List<SourceConnector> connectors, NumenProperties properties) {
        this.connectors = List.copyOf(connectors);
        this.properties = properties;
    }

    public List<DatasetRecord> collect(UUID taskId, String prompt, WorkflowPlan plan) {
        List<String> urls = extractUrls(prompt).stream()
                .limit(properties.getMaxFetchUrls())
                .toList();

        SourceCollectionRequest request = new SourceCollectionRequest(taskId, prompt, plan, urls);
        List<SourceConnector> matching = connectors.stream()
                .filter(connector -> connector.supports(request))
                .toList();

        if (matching.size() != 1) {
            throw new IllegalStateException("Expected exactly one source connector but found " + matching.size());
        }

        return deduplicate(matching.get(0).collect(request));
    }

    private List<String> extractUrls(String prompt) {
        Matcher matcher = URL_PATTERN.matcher(prompt);
        List<String> urls = new ArrayList<>();
        while (matcher.find()) {
            urls.add(matcher.group().replaceAll("[.)]+$", ""));
        }
        return urls;
    }

    private List<DatasetRecord> deduplicate(List<DatasetRecord> records) {
        Map<String, DatasetRecord> unique = new LinkedHashMap<>();
        for (DatasetRecord record : records) {
            unique.putIfAbsent(record.getFingerprint(), record);
        }
        return new ArrayList<>(unique.values());
    }
}
