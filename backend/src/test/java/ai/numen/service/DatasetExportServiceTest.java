package ai.numen.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DatasetExportServiceTest {
    @Test
    void quotesCsvAndNeutralizesSpreadsheetFormulaPrefixes() {
        assertThat(DatasetExportService.cell("normal")).isEqualTo("\"normal\"");
        assertThat(DatasetExportService.cell("a\"b")).isEqualTo("\"a\"\"b\"");
        assertThat(DatasetExportService.cell("=SUM(A1:A2)")).isEqualTo("\"'=SUM(A1:A2)\"");
        assertThat(DatasetExportService.cell("  @command")).isEqualTo("\"'  @command\"");
    }
}
