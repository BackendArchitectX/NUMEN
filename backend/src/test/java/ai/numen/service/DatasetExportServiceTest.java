package ai.numen.service;

import ai.numen.entity.CollectionTask;
import ai.numen.entity.DatasetRecord;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DatasetExportServiceTest {
    @Test
    void exportNamesHeuristicAndIntegrityColumnsWithoutCallingThemTruthScores() {
        TaskService tasks = mock(TaskService.class);
        DatasetExportService exports = new DatasetExportService(tasks);
        UUID taskId = UUID.randomUUID();
        CollectionTask task = new CollectionTask(taskId, "Research public source");
        DatasetRecord record = new DatasetRecord(
                taskId,
                "Result",
                "Org",
                "Remote",
                "https://example.com",
                "https://example.com/source",
                "Example",
                "WEB",
                "Captured evidence",
                91,
                "a".repeat(64)
        );

        when(tasks.get(taskId)).thenReturn(task);
        when(tasks.allRecords(taskId)).thenReturn(List.of(record));

        String csv = new String(exports.export(taskId).content(), StandardCharsets.UTF_8);

        assertThat(csv).contains("captured_evidence");
        assertThat(csv).contains("\"Captured evidence\"");
        assertThat(csv).contains("record_heuristic_score");
        assertThat(csv).contains("identity_fingerprint");
        assertThat(csv).contains("evidence_hash");
        assertThat(csv).contains("evidence_hash_algorithm");
        assertThat(csv).doesNotContain(",quality_score,");
        assertThat(csv).contains(record.getEvidenceHash());
    }

    @Test
    void quotesCsvAndNeutralizesSpreadsheetFormulaPrefixes() {
        assertThat(DatasetExportService.cell("normal")).isEqualTo("\"normal\"");
        assertThat(DatasetExportService.cell("a\"b")).isEqualTo("\"a\"\"b\"");
        assertThat(DatasetExportService.cell("=SUM(A1:A2)")).isEqualTo("\"'=SUM(A1:A2)\"");
        assertThat(DatasetExportService.cell("  @command")).isEqualTo("\"'  @command\"");
    }
}
