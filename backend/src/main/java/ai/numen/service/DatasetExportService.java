package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;

@Service
public class DatasetExportService {
    private final TaskService tasks;

    public DatasetExportService(TaskService tasks) {
        this.tasks = tasks;
    }

    public CsvExport export(UUID taskId) {
        CollectionTask task = tasks.get(taskId);
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("title,organization,location,website,source_url,source_name,source_type,record_heuristic_score,identity_fingerprint,evidence_hash,evidence_hash_algorithm,collected_at\r\n");

        for (DatasetRecord record : tasks.allRecords(taskId)) {
            csv.append(cell(record.getTitle())).append(',')
                    .append(cell(record.getOrganization())).append(',')
                    .append(cell(record.getLocation())).append(',')
                    .append(cell(record.getWebsite())).append(',')
                    .append(cell(record.getSourceUrl())).append(',')
                    .append(cell(record.getSourceName())).append(',')
                    .append(cell(record.getSourceType())).append(',')
                    .append(record.getQualityScore()).append(',')
                    .append(cell(record.getFingerprint())).append(',')
                    .append(cell(record.getEvidenceHash())).append(',')
                    .append(cell(record.getEvidenceHashAlgorithm())).append(',')
                    .append(record.getCollectedAt()).append("\r\n");
        }

        return new CsvExport("numen-" + task.getId() + ".csv", csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    static String cell(String value) {
        String raw = Objects.toString(value, "");
        String trimmed = raw.stripLeading();
        if (!trimmed.isEmpty() && isFormulaPrefix(trimmed.charAt(0))) raw = "'" + raw;
        return "\"" + raw.replace("\"", "\"\"") + "\"";
    }

    private static boolean isFormulaPrefix(char first) {
        return first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r';
    }

    public record CsvExport(String filename, byte[] content) { }
}
