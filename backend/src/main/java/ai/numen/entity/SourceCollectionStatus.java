package ai.numen.entity;

public enum SourceCollectionStatus {
    SUCCEEDED,
    UNAVAILABLE,
    UNAUTHORIZED,
    REJECTED,
    RATE_LIMITED,
    FAILED;

    public boolean isSuccessful() {
        return this == SUCCEEDED;
    }

    public boolean isFailure() {
        return !isSuccessful();
    }
}
