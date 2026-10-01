package ai.numen.connector;

import ai.numen.domain.SourceCapability;
import ai.numen.entity.DatasetRecord;

import java.util.List;
import java.util.Set;

public interface SourceConnector {
    String id();
    Set<SourceCapability> capabilities();
    boolean supports(SourceCollectionRequest request);
    List<DatasetRecord> collect(SourceCollectionRequest request);
}
