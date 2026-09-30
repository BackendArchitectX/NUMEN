package ai.numen.connector;

import ai.numen.entity.DatasetRecord;

import java.util.List;

public interface SourceConnector {
    String id();
    boolean supports(SourceCollectionRequest request);
    List<DatasetRecord> collect(SourceCollectionRequest request);
}
