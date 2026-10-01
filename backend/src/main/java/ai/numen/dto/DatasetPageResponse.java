package ai.numen.dto;

import ai.numen.service.TaskService;

import java.util.List;

public record DatasetPageResponse(
        List<DatasetRecordResponse> records,
        long totalMatched,
        int page,
        int pageSize,
        int totalPages) {

    public static DatasetPageResponse from(TaskService.DatasetPage datasetPage) {
        return new DatasetPageResponse(
                datasetPage.records().stream().map(DatasetRecordResponse::from).toList(),
                datasetPage.totalMatched(),
                datasetPage.page(),
                datasetPage.pageSize(),
                datasetPage.totalPages()
        );
    }
}
